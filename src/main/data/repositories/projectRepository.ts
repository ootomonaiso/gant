/**
 * Model（永続化）: projects テーブルへのアクセス。
 * SQL とスキーマの知識はこのクラスに閉じ込める。
 * DB 行（snake_case）↔ ドメイン型（camelCase）の変換もここだけで行う。
 */
import type { Database } from 'better-sqlite3'
import type { Project, NewProject, ProjectPatch } from '@shared/domain/project'

interface ProjectRow {
  id: number
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
      .prepare('SELECT * FROM projects ORDER BY sort_order, id')
      .all() as ProjectRow[]
    return rows.map(toDomain)
  }

  getById(id: number): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
      | ProjectRow
      | undefined
    return row ? toDomain(row) : null
  }

  create(input: NewProject): Project {
    const now = new Date().toISOString()
    const info = this.db
      .prepare(
        `INSERT INTO projects (name, color, sort_order, created_at, updated_at)
         VALUES (@name, @color, @sortOrder, @now, @now)`
      )
      .run({
        name: input.name,
        color: input.color ?? '#4f8cff',
        sortOrder: input.sortOrder ?? 0,
        now
      })
    return this.getById(Number(info.lastInsertRowid))!
  }

  update(id: number, patch: ProjectPatch): Project {
    // camelCase(パッチ) → snake_case(列) の対応表。ここにある列だけ更新可能。
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

  remove(id: number): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }
}
