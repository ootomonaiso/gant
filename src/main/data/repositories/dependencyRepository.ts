/**
 * Model（永続化）: dependencies テーブルへのアクセス。
 * 先行 → 後続の依存（FS）を扱う。削除は soft delete。
 */
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { Dependency, NewDependency } from '@shared/domain/dependency'

interface DependencyRow {
  id: string
  predecessor_id: string
  successor_id: string
  type: string
}

function toDomain(row: DependencyRow): Dependency {
  return {
    id: row.id,
    predecessorId: row.predecessor_id,
    successorId: row.successor_id,
    type: row.type as Dependency['type']
  }
}

export class DependencyRepository {
  constructor(private readonly db: Database) {}

  /** プロジェクト内で、両端のタスクが生存している依存だけを返す。 */
  listByProject(projectId: string): Dependency[] {
    const rows = this.db
      .prepare(
        `SELECT d.* FROM dependencies d
           JOIN tasks pred ON pred.id = d.predecessor_id
           JOIN tasks succ ON succ.id = d.successor_id
          WHERE succ.project_id = ?
            AND d.deleted_at IS NULL
            AND pred.deleted_at IS NULL
            AND succ.deleted_at IS NULL`
      )
      .all(projectId) as DependencyRow[]
    return rows.map(toDomain)
  }

  /** 全プロジェクトの生存依存（エクスポート用）。 */
  listAll(): Dependency[] {
    const rows = this.db
      .prepare(
        `SELECT d.* FROM dependencies d
           JOIN tasks pred ON pred.id = d.predecessor_id
           JOIN tasks succ ON succ.id = d.successor_id
          WHERE d.deleted_at IS NULL
            AND pred.deleted_at IS NULL
            AND succ.deleted_at IS NULL`
      )
      .all() as DependencyRow[]
    return rows.map(toDomain)
  }

  private getByPair(predecessorId: string, successorId: string): DependencyRow | undefined {
    return this.db
      .prepare('SELECT * FROM dependencies WHERE predecessor_id = ? AND successor_id = ?')
      .get(predecessorId, successorId) as DependencyRow | undefined
  }

  /** 作成。同じペアの soft-deleted 行があれば復活させる（UNIQUE 制約対策）。 */
  create(input: NewDependency): Dependency {
    const existing = this.getByPair(input.predecessorId, input.successorId)
    if (existing) {
      this.db.prepare('UPDATE dependencies SET deleted_at = NULL WHERE id = ?').run(existing.id)
      return toDomain(this.getByPair(input.predecessorId, input.successorId)!)
    }
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO dependencies (id, predecessor_id, successor_id, type, created_at)
         VALUES (@id, @predecessorId, @successorId, @type, @now)`
      )
      .run({
        id,
        predecessorId: input.predecessorId,
        successorId: input.successorId,
        type: input.type ?? 'FS',
        now: new Date().toISOString()
      })
    return toDomain(this.getByPair(input.predecessorId, input.successorId)!)
  }

  remove(id: string): void {
    this.db
      .prepare('UPDATE dependencies SET deleted_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id)
  }
}
