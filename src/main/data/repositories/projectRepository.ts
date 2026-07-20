/**
 * Model（永続化）: projects テーブルへのアクセス。
 * SQL とスキーマの知識はこのクラスに閉じ込める。
 * DB 行（snake_case）↔ ドメイン型（camelCase）の変換もここだけで行う。
 *
 * 削除は物理削除ではなく soft delete（deleted_at に印）。参照はすべて deleted_at IS NULL で絞る。
 */
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { Project, NewProject, ProjectPatch } from '@shared/domain/project'

interface ProjectRow {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

function toDomain(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class ProjectRepository {
  constructor(private readonly db: Database) {}

  list(): Project[] {
    const rows = this.db
      .prepare('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY sort_order, created_at')
      .all() as ProjectRow[]
    return rows.map(toDomain)
  }

  getById(id: string): Project | null {
    const row = this.db
      .prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL')
      .get(id) as ProjectRow | undefined
    return row ? toDomain(row) : null
  }

  create(input: NewProject): Project {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO projects (id, name, color, sort_order, created_at, updated_at)
         VALUES (@id, @name, @color, @sortOrder, @now, @now)`
      )
      .run({
        id,
        name: input.name,
        color: input.color ?? '#4f8cff',
        sortOrder: input.sortOrder ?? 0,
        now
      })
    return this.getById(id)!
  }

  update(id: string, patch: ProjectPatch): Project {
    const columns: Record<keyof ProjectPatch, string> = {
      name: 'name',
      color: 'color',
      sortOrder: 'sort_order'
    }

    const sets: string[] = []
    const params: Record<string, unknown> = { id, updated_at: new Date().toISOString() }

    for (const key of Object.keys(columns) as (keyof ProjectPatch)[]) {
      const value = patch[key]
      if (value === undefined) continue
      const column = columns[key]
      sets.push(`${column} = @${column}`)
      params[column] = value
    }
    sets.push('updated_at = @updated_at')

    this.db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return this.getById(id)!
  }

  /** soft delete。配下のタスクもまとめて印を付ける。 */
  remove(id: string): void {
    const now = new Date().toISOString()
    const cascade = this.db.transaction(() => {
      this.db
        .prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL')
        .run(now, now, id)
      this.db
        .prepare('UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .run(now, now, id)
    })
    cascade()
  }
}
