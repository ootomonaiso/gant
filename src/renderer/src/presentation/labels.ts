/**
 * 列挙値 → 日本語表示ラベルの対応。プレゼンテーション（View 層）の関心事なので
 * ここ（renderer）に集約する。ドメイン型を各 View で個別に和訳すると表記がずれるため、
 * 一覧・カンバン・フィルタ・編集ダイアログはすべてこの一箇所を参照する。
 */
import type { TaskStatus, TaskPriority } from '@shared/domain/task'
import type { DeadlineState } from '@renderer/deadline/deadline'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  done: '完了'
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: '高',
  mid: '中',
  low: '低'
}

/** 期限状態のバッジ文言。'none'（警告なし）は空文字なので、そのまま引いても表示されない。 */
export const DEADLINE_LABEL: Record<DeadlineState, string> = {
  overdue: '超過',
  soon: '間近',
  none: ''
}
