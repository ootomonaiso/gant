/**
 * 実機 e2e ドライバ（Playwright + Electron）。
 * ビルド済みアプリを本物の SQLite ごと起動して UI を操作し、
 * 各ビューのスクリーンショットを撮る。userData は使い捨ての一時ディレクトリ。
 *
 *   npm run build && node e2e/run.mjs
 */
import { _electron as electron } from 'playwright'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const electronPath = require('electron')

const root = path.dirname(fileURLToPath(import.meta.url)).replace(/e2e$/, '')
const mainPath = path.join(root, 'out', 'main', 'index.js')
const userDataDir = mkdtempSync(path.join(tmpdir(), 'gant-e2e-'))
const shotsDir = process.env.SHOTS_DIR || path.join(root, 'e2e', 'shots')
mkdirSync(shotsDir, { recursive: true })

const results = []
function check(name, cond) {
  results.push({ name, ok: !!cond })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
}

async function addTask(win, fill) {
  await win.click('button:has-text("＋ タスク追加")')
  await win.waitForSelector('.dialog input[type="text"]')
  await fill(win)
  await win.click('.dialog button:has-text("保存")')
  await win.waitForSelector('.dialog', { state: 'detached' })
}

async function main() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    cwd: root
  })
  const win = await app.firstWindow()
  win.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  win.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text())
  })

  await win.waitForSelector('.app-layout')

  // --- プロジェクト作成 ---
  await win.fill('input[placeholder="新しいプロジェクト名"]', 'デモ')
  await win.click('.sidebar__add button:has-text("追加")')
  await win.waitForSelector('.content-header')
  check('プロジェクト作成でヘッダ表示', await win.isVisible('.content-header'))

  // --- タスク作成 ---
  await addTask(win, async (w) => {
    await w.fill('.dialog input[type="text"]', '設計')
    await w.selectOption('.field:has-text("状態") select', { label: '完了' })
  })
  await addTask(win, async (w) => {
    await w.fill('.dialog input[type="text"]', '実装')
    await w.selectOption('.field:has-text("状態") select', { label: '進行中' })
    await w.selectOption('.field:has-text("優先度") select', { label: '高' })
    await w.selectOption('.field:has-text("親タスク") select', { label: '設計' })
    await w.check('.pred-item:has-text("設計") input[type="checkbox"]')
  })
  await addTask(win, async (w) => {
    await w.fill('.dialog input[type="text"]', 'テスト')
  })
  await addTask(win, async (w) => {
    await w.fill('.dialog input[type="text"]', 'レビュー')
    await w.selectOption('.field:has-text("優先度") select', { label: '高' })
    // 開始・終了とも過去にして「超過」を発生させる。
    await w.fill('.field:has-text("開始") input[type="datetime-local"]', '2020-01-01T08:00')
    await w.fill('.field:has-text("終了") input[type="datetime-local"]', '2020-01-01T09:00')
  })

  // --- リストビュー ---
  await win.click('.view-tabs__btn:has-text("リスト")')
  await win.waitForSelector('.task-table')
  const rowCount = await win.locator('.task-row').count()
  check('リストに4行（階層含む）', rowCount === 4)
  check('「超過」バッジがある', await win.isVisible('.badge--overdue'))
  check('「間近」バッジがある', await win.isVisible('.badge--soon'))
  await win.screenshot({ path: path.join(shotsDir, '1-list.png') })

  // --- 折りたたみ（設計の子=実装が消える） ---
  await win.click('.task-row:has-text("設計") .task-row__toggle')
  await win.waitForTimeout(200)
  const afterCollapse = await win.locator('.task-row').count()
  check('折りたたみで行が減る', afterCollapse === 3)
  await win.click('.task-row:has-text("設計") .task-row__toggle') // 展開して戻す

  // --- ガントビュー ---
  await win.click('.view-tabs__btn:has-text("ガント")')
  await win.waitForSelector('.gantt')
  const barCount = await win.locator('.bar__body').count()
  check('ガントにバーが4本', barCount === 4)
  const arrowCount = await win.locator('.dep-arrow').count()
  check('依存の矢印が1本', arrowCount === 1)
  await win.screenshot({ path: path.join(shotsDir, '2-gantt.png') })

  // --- カンバンビュー + ドラッグ&ドロップ ---
  await win.click('.view-tabs__btn:has-text("カンバン")')
  await win.waitForSelector('.kanban')
  const doneColBefore = await win.locator('.kanban__col:has-text("完了") .card').count()
  // 「テスト」カード（未着手）を「完了」列へ
  const card = win.locator('.card:has-text("テスト")')
  const doneCol = win.locator('.kanban__col:has-text("完了")')
  await card.dragTo(doneCol)
  await win.waitForTimeout(400)
  const doneColAfter = await win.locator('.kanban__col:has-text("完了") .card').count()
  check('カンバンD&Dで完了列が増える', doneColAfter === doneColBefore + 1)
  await win.screenshot({ path: path.join(shotsDir, '3-kanban.png') })

  await app.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`)
  console.log(`shots: ${shotsDir}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('E2E ERROR:', e)
  process.exit(1)
})
