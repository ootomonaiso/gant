/**
 * Model（永続化）: tasks テーブルへのアクセス。
 * SQL とスキーマの知識はこのクラスに閉じ込める。
 * 削除は soft delete。参照はすべて deleted_at IS NULL で絞る。
 */
import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { Task, NewTask, TaskPatch } from '@shared/domain/task'

interface TaskRow {
  id: string
  project_id: string
  parent_id: string | null
  title: string
  note: string
  start_at: string
  end_at: string
  progress: number
  status: string
  priority: string
  sort_order: number
  reminder_at: string | null
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
    reminderAt: row.reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class TaskRepository {
  constructor(private readonly db: Database) {}

  listByProject(projectId: string): Task[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at'
      )
      .all(projectId) as TaskRow[]
    return rows.map(toDomain)
  }

  /** 全プロジェクトの生存タスク。通知エンジンが使う。 */
  listAllActive(): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE deleted_at IS NULL')
      .all() as TaskRow[]
    return rows.map(toDomain)
  }

  getById(id: string): Task | null {
    const row = this.db
      .prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL')
      .get(id) as TaskRow | undefined
    return row ? toDomain(row) : null
  }

  create(input: NewTask): Task {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.db
      .prepare(
        `INSERT INTO tasks
           (id, project_id, parent_id, title, note, start_at, end_at,
            progress, status, priority, sort_order, reminder_at, created_at, updated_at)
         VALUES
           (@id, @projectId, @parentId, @title, @note, @startAt, @endAt,
            @progress, @status, @priority, @sortOrder, @reminderAt, @now, @now)`
      )
      .run({
        id,
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
        reminderAt: input.reminderAt ?? null,
        now
      })
    return this.getById(id)!
  }

  update(id: string, patch: TaskPatch): Task {
    const columns: Record<keyof TaskPatch, string> = {
      parentId: 'parent_id',
      title: 'title',
      note: 'note',
      startAt: 'start_at',
      endAt: 'end_at',
      progress: 'progress',
      status: 'status',
      priority: 'priority',
      sortOrder: 'sort_order',
      reminderAt: 'reminder_at'
    }

    const sets: string[] = []
    const params: Record<string, unknown> = { id, updated_at: new Date().toISOString() }

    for (const key of Object.keys(columns) as (keyof TaskPatch)[]) {
      const value = patch[key]
      if (value === undefined) continue // undefined は「変更なし」、null は「クリア」
      const column = columns[key]
      sets.push(`${column} = @${column}`)
      params[column] = value
    }
    sets.push('updated_at = @updated_at')

    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return this.getById(id)!
  }

  /** soft delete。 */
  remove(id: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, id)
  }
}
