/**
 * 通知の「いつ・何を出すか」を決める純粋ロジック。
 * DB にも Electron にも依存しないので単体テストしやすい。
 * NotificationService はこの結果を受けて、重複チェックと実発火だけを行う。
 */
import type { Task } from '@shared/domain/task'

export type NotifyKind = 'start' | 'deadline' | 'overdue' | 'reminder'

/** 起動時に古いイベントを連発しないためのグレース（overdue は対象外＝古くても1回出す） */
export const STALE_GRACE_MS = 6 * 60 * 60 * 1000

export interface DueEvent {
  kind: NotifyKind
  /** 対象時刻(ms) */
  at: number
  /** 重複防止キー。時刻が変わると別イベント扱いになり再通知される */
  key: string
}

/**
 * 指定時刻 now の時点で発火すべきイベント一覧を返す。
 * @param leadMs 期限通知のリードタイム(ms)
 */
export function dueEvents(task: Task, now: number, leadMs: number): DueEvent[] {
  const candidates: { kind: NotifyKind; at: number }[] = []

  if (task.status !== 'done') {
    candidates.push({ kind: 'start', at: Date.parse(task.startAt) })
    candidates.push({ kind: 'deadline', at: Date.parse(task.endAt) - leadMs })
    candidates.push({ kind: 'overdue', at: Date.parse(task.endAt) })
  }
  if (task.reminderAt) {
    candidates.push({ kind: 'reminder', at: Date.parse(task.reminderAt) })
  }

  const due: DueEvent[] = []
  for (const c of candidates) {
    if (Number.isNaN(c.at) || c.at > now) continue
    if (c.kind !== 'overdue' && now - c.at > STALE_GRACE_MS) continue
    due.push({ kind: c.kind, at: c.at, key: `${c.kind}:${c.at}` })
  }
  return due
}

export function messageFor(kind: NotifyKind, title: string): { title: string; body: string } {
  switch (kind) {
    case 'start':
      return { title: 'タスク開始', body: `「${title}」の開始時刻です` }
    case 'deadline':
      return { title: '期限が近づいています', body: `「${title}」` }
    case 'overdue':
      return { title: '期限超過', body: `「${title}」が期限を過ぎています` }
    case 'reminder':
      return { title: 'リマインダー', body: `「${title}」` }
  }
}
