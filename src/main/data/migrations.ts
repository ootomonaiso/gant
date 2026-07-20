/**
 * Model（永続化）: スキーマのバージョン管理。
 * SQLite の `user_version` プラグマを進捗カウンタとして使い、
 * 未適用のマイグレーションだけをトランザクション内で順に適用する。
 *
 * スキーマを変更するときは、既存の up を編集せず「新しい version を追加」する。
 *
 * 【複数人・複数端末同期への備え】
 * - 主キーは UUID（TEXT）。端末をまたいでも衝突しない。
 * - 全テーブルに updated_at と deleted_at を持たせる（soft delete）。
 *   物理削除せず deleted_at に印を付けることで、将来「削除も含めた差分同期」ができる。
 * - 参照整合性の ON DELETE CASCADE は物理削除用の保険。通常は Repository が soft delete でカスケードする。
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
          id         TEXT    PRIMARY KEY,
          name       TEXT    NOT NULL,
          color      TEXT    NOT NULL DEFAULT '#4f8cff',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT    NOT NULL,
          updated_at TEXT    NOT NULL,
          deleted_at TEXT
        );

        CREATE TABLE tasks (
          id          TEXT    PRIMARY KEY,
          project_id  TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          parent_id   TEXT             REFERENCES tasks(id)    ON DELETE CASCADE,
          title       TEXT    NOT NULL,
          note        TEXT    NOT NULL DEFAULT '',
          start_at    TEXT    NOT NULL,
          end_at      TEXT    NOT NULL,
          progress    INTEGER NOT NULL DEFAULT 0,
          status      TEXT    NOT NULL DEFAULT 'todo',
          priority    TEXT    NOT NULL DEFAULT 'mid',
          sort_order  INTEGER NOT NULL DEFAULT 0,
          reminder_at TEXT,
          created_at  TEXT    NOT NULL,
          updated_at  TEXT    NOT NULL,
          deleted_at  TEXT
        );

        CREATE TABLE dependencies (
          id             TEXT PRIMARY KEY,
          predecessor_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          successor_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          type           TEXT NOT NULL DEFAULT 'FS',
          created_at     TEXT NOT NULL,
          deleted_at     TEXT,
          UNIQUE (predecessor_id, successor_id)
        );

        -- 通知の重複発火を防ぐログ（task_id + key で一意）。
        -- key は「種別:対象時刻」なので、期限を動かすと再通知される。
        CREATE TABLE notification_log (
          task_id  TEXT NOT NULL,
          key      TEXT NOT NULL,
          fired_at TEXT NOT NULL,
          PRIMARY KEY (task_id, key)
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
