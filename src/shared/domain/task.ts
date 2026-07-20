/**
 * Model: タスクのドメイン型。
 * 日時は「時間単位まで」を扱うため ISO 8601 文字列で保持する。
 */

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'high' | 'mid' | 'low'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done']
export const TASK_PRIORITIES: TaskPriority[] = ['high', 'mid', 'low']

export interface Task {
  id: number
  projectId: number
  /** サブタスクの親。トップレベルなら null */
  parentId: number | null
  title: string
  note: string
  /** 開始日時（ISO 8601） */
  startAt: string
  /** 終了日時（ISO 8601） */
  endAt: string
  /** 進捗率 0–100 */
  progress: number
  status: TaskStatus
  priority: TaskPriority
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 新規作成時の入力。id / createdAt / updatedAt は Repository が採番する。 */
export interface NewTask {
  projectId: number
  parentId?: number | null
  title: string
  note?: string
  startAt: string
  endAt: string
  progress?: number
  status?: TaskStatus
  priority?: TaskPriority
  sortOrder?: number
}

/** 部分更新。指定したフィールドだけを更新する。 */
export interface TaskPatch {
  parentId?: number | null
  title?: string
  note?: string
  startAt?: string
  endAt?: string
  progress?: number
  status?: TaskStatus
  priority?: TaskPriority
  sortOrder?: number
}
