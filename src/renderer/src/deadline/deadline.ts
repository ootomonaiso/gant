/**
 * タスクの期限状態（超過 / 間近 / なし）を求める純粋ロジック。
 * リスト・カンバンのビジュアル警告に使う。完了タスクは警告しない。
 */
import type { Task } from '@shared/domain/task'

export type DeadlineState = 'overdue' | 'soon' | 'none'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * @param soonMs これ以内に終了時刻が来ると「間近」（既定 24 時間）
 */
export function deadlineState(task: Task, now: number, soonMs = DAY_MS): DeadlineState {
  if (task.status === 'done') return 'none'
  const end = Date.parse(task.endAt)
  if (Number.isNaN(end)) return 'none'
  if (end < now) return 'overdue'
  if (end - now <= soonMs) return 'soon'
  return 'none'
}
