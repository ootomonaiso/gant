/**
 * Model（永続化）: スキーマのバージョン管理。
 * SQLite の `user_version` プラグマを進捗カウンタとして使い、
 * 未適用のマイグレーションだけをトランザクション内で順に適用する。
 *
 * スキーマを変更するときは、既存の up を編集せず「新しい version を追加」する。
 * こうすると既存ユーザーの DB も安全に前進できる。
 */
import type Database from 'better-sqlite3'

interface Migration {
  version: number
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE projects (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          color      TEXT    NOT NULL DEFAULT '#4f8cff',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT    NOT NULL,
          updated_at TEXT    NOT NULL
        );

        CREATE TABLE tasks (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          parent_id  INTEGER          REFERENCES tasks(id)    ON DELETE CASCADE,
          title      TEXT    NOT NULL,
          note       TEXT    NOT NULL DEFAULT '',
          start_at   TEXT    NOT NULL,
          end_at     TEXT    NOT NULL,
          progress   INTEGER NOT NULL DEFAULT 0,
          status     TEXT    NOT NULL DEFAULT 'todo',
          priority   TEXT    NOT NULL DEFAULT 'mid',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT    NOT NULL,
          updated_at TEXT    NOT NULL
        );

        CREATE TABLE dependencies (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          predecessor_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          successor_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          type            TEXT    NOT NULL DEFAULT 'FS',
          UNIQUE (predecessor_id, successor_id)
        );

        CREATE INDEX idx_tasks_project ON tasks(project_id);
        CREATE INDEX idx_tasks_parent  ON tasks(parent_id);
      `)
    }
  }
]

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number

  for (const migration of migrations) {
    if (migration.version <= current) continue
    const apply = db.transaction(() => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    })
    apply()
  }
}
