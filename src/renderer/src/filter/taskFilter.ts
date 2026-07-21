/**
 * タスクの絞り込み判定（キーワード / 状態 / 優先度）の純粋ロジック。
 * Vue にも Pinia にも依存しないので単体テストできる。
 */
import type { Task, TaskPriority, TaskStatus } from '@shared/domain/task'

export interface FilterCriteria {
  query: string
  /** 空配列なら「すべて」 */
  statuses: TaskStatus[]
  /** 空配列なら「すべて」 */
  priorities: TaskPriority[]
}

export function matchesFilter(task: Task, criteria: FilterCriteria): boolean {
  if (criteria.statuses.length > 0 && !criteria.statuses.includes(task.status)) return false
  if (criteria.priorities.length > 0 && !criteria.priorities.includes(task.priority)) return false

  const q = criteria.query.trim().toLowerCase()
  if (q) {
    const haystack = `${task.title} ${task.note}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

export function isFilterActive(criteria: FilterCriteria): boolean {
  return criteria.query.trim() !== '' || criteria.statuses.length > 0 || criteria.priorities.length > 0
}
