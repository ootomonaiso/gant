/**
 * Model（永続化）: tasks テーブルへのアクセス。
 * SQL とスキーマの知識はこのクラスに閉じ込める。
 */
import type { Database } from 'better-sqlite3'
import type { Task, NewTask, TaskPatch } from '@shared/domain/task'

interface TaskRow {
  id: number
  project_id: number
  parent_id: number | null
  title: string
  note: string
  start_at: string
  end_at: string
  progress: number
  status: string
  priority: string
  sort_order: number
  created_at: string
  updated_at: string
}

function toDomain(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    title: row.title,
    note: row.note,
    startAt: row.start_at,
    endAt: row.end_at,
    progress: row.progress,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class TaskRepository {
  constructor(private readonly db: Database) {}

  listByProject(projectId: number): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order, id')
      .all(projectId) as TaskRow[]
    return rows.map(toDomain)
  }

  getById(id: number): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
      | TaskRow
      | undefined
    return row ? toDomain(row) : null
  }

  create(input: NewTask): Task {
    const now = new Date().toISOString()
    const info = this.db
      .prepare(
        `INSERT INTO tasks
           (project_id, parent_id, title, note, start_at, end_at,
            progress, status, priority, sort_order, created_at, updated_at)
         VALUES
           (@projectId, @parentId, @title, @note, @startAt, @endAt,
            @progress, @status, @priority, @sortOrder, @now, @now)`
      )
      .run({
        projectId: input.projectId,
        parentId: input.parentId ?? null,
        title: input.title,
        note: input.note ?? '',
        startAt: input.startAt,
        endAt: input.endAt,
        progress: input.progress ?? 0,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'mid',
        sortOrder: input.sortOrder ?? 0,
        now
      })
    return this.getById(Number(info.lastInsertRowid))!
  }

  update(id: number, patch: TaskPatch): Task {
    const columns: Record<keyof TaskPatch, string> = {
      parentId: 'parent_id',
      title: 'title',
      note: 'note',
      startAt: 'start_at',
      endAt: 'end_at',
      progress: 'progress',
      status: 'status',
      priority: 'priority',
      sortOrder: 'sort_order'
    }

    const sets: string[] = []
    const params: Record<string, unknown> = { id, updated_at: new Date().toISOString() }

    for (const key of Object.keys(columns) as (keyof TaskPatch)[]) {
      const value = patch[key]
      if (value === undefined) continue
      const column = columns[key]
      sets.push(`${column} = @${column}`)
      params[column] = value
    }
    sets.push('updated_at = @updated_at')

    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return this.getById(id)!
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }
}
