/**
 * Model（永続化）: アプリ設定を userData/settings.json に読み書きする。
 * 端末ごとのローカル設定なので DB ではなく単純な JSON ファイルで持つ。
 */
import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/domain/settings'

let cache: AppSettings | null = null

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): AppSettings {
  if (cache) return cache
  let loaded: AppSettings = { ...DEFAULT_SETTINGS }
  try {
    if (existsSync(settingsFile())) {
      const parsed = JSON.parse(readFileSync(settingsFile(), 'utf-8'))
      loaded = { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    loaded = { ...DEFAULT_SETTINGS }
  }
  cache = loaded
  return loaded
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  cache = next
  writeFileSync(settingsFile(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}
