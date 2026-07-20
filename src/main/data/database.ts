/**
 * Model（永続化）: SQLite 接続の生成と保持。
 * renderer からはここに直接触れない。IPC ハンドラ経由でのみ Repository を使う。
 */
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

/**
 * DB を取得（未生成なら初期化してマイグレーションを実行）。
 * 保存先は OS のユーザーデータ領域（userData）。単一ファイルなのでバックアップも容易。
 */
export function getDatabase(): Database.Database {
  if (db) return db

  const file = join(app.getPath('userData'), 'gant.db')
  const connection = new Database(file)
  connection.pragma('journal_mode = WAL')
  connection.pragma('foreign_keys = ON')
  runMigrations(connection)

  db = connection
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
