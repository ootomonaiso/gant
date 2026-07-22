/**
 * 実機 e2e（通知）。通知エンジンのチェック間隔を短縮して起動し、
 * 過去リマインダー付きのタスクを作成 → 発火して notification_log に記録されることを、
 * main プロセス側で SQLite を直接読んで確認する。
 *
 *   npm run build && node e2e/notify.mjs
 */
import { _electron as electron } from 'playwright'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const root = path.dirname(fileURLToPath(import.meta.url)).replace(/e2e$/, '')
const mainPath = path.join(root, 'out', 'main', 'index.js')
const userDataDir = mkdtempSync(path.join(tmpdir(), 'gant-notify-'))

function localInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

async function main() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    cwd: root,
    env: { ...process.env, GANT_NOTIFY_INTERVAL_MS: '2000' } // 2秒間隔でチェック
  })
  const win = await app.firstWindow()
  await win.waitForSelector('.app-layout')

  await win.fill('input[placeholder="新しいプロジェクト名"]', '通知')
  await win.click('.sidebar__add button:has-text("追加")')
  await win.waitForSelector('.content-header')

  await win.click('button:has-text("＋ タスク追加")')
  await win.waitForSelector('.dialog input[type="text"]')
  await win.fill('.dialog input[type="text"]', 'リマインド確認')
  const remind = new Date(Date.now() - 2 * 60 * 1000) // 2分前
  await win.fill('.field:has-text("リマインダー") input[type="datetime-local"]', localInput(remind))
  await win.click('.dialog button:has-text("保存")')
  await win.waitForSelector('.dialog', { state: 'detached' })

  // 数回のチェック間隔ぶん待つ
  await win.waitForTimeout(8000)

  // main プロセスで、アプリ自身の DB ハンドル（テスト時に露出）から notification_log を読む
  const count = await app.evaluate(() => {
    const db = globalThis.__gantDb
    if (!db) return -1
    return db
      .prepare("SELECT COUNT(*) AS c FROM notification_log WHERE key LIKE 'reminder:%'")
      .get().c
  })

  const ok = count > 0
  console.log(`${ok ? 'PASS' : 'FAIL'}  リマインダー通知が発火し notification_log に記録 (rows=${count})`)
  await app.close()
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('NOTIFY E2E ERROR:', e)
  process.exit(1)
})
