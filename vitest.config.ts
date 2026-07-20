import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// フレームワーク非依存の純粋ロジック（timescale / drag / notificationRules）を
// Node 環境で単体テストする。better-sqlite3 や Electron には触れない。
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts']
  }
})
