import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/domain/task'
import { STALE_GRACE_MS, dueEvents } from '../src/main/notifications/notificationRules'

const HOUR = 60 * 60 * 1000

function makeTask(overrides: Partial<Task> = {}): Task {
  const base = Date.parse('2026-07-20T10:00:00.000Z')
  return {
    id: 't1',
    projectId: 'p1',
    parentId: null,
    title: 'テスト',
    note: '',
    startAt: new Date(base).toISOString(),
    endAt: new Date(base + HOUR).toISOString(),
    progress: 0,
    status: 'todo',
    priority: 'mid',
    sortOrder: 0,
    reminderAt: null,
    createdAt: new Date(base).toISOString(),
    updatedAt: new Date(base).toISOString(),
    ...overrides
  }
}

function kinds(task: Task, now: number, leadMs = 0): string[] {
  return dueEvents(task, now, leadMs).map((e) => e.kind)
}

describe('dueEvents', () => {
  it('開始時刻に到達すると start が出る', () => {
    const task = makeTask()
    const now = Date.parse(task.startAt)
    expect(kinds(task, now)).toContain('start')
  })

  it('リードタイム分前で deadline が出る', () => {
    const task = makeTask()
    const leadMs = 30 * 60 * 1000
    const now = Date.parse(task.endAt) - leadMs
    expect(kinds(task, now, leadMs)).toContain('deadline')
  })

  it('終了時刻を過ぎると overdue が出る', () => {
    const task = makeTask()
    const now = Date.parse(task.endAt) + HOUR
    expect(kinds(task, now)).toContain('overdue')
  })

  it('完了タスクは start/deadline/overdue を出さない', () => {
    const task = makeTask({ status: 'done' })
    const now = Date.parse(task.endAt) + HOUR
    expect(kinds(task, now)).toEqual([])
  })

  it('reminderAt に到達すると reminder が出る', () => {
    const remind = Date.parse('2026-07-20T09:00:00.000Z')
    const task = makeTask({ reminderAt: new Date(remind).toISOString() })
    expect(kinds(task, remind)).toContain('reminder')
  })

  it('未来のイベントは出さない', () => {
    const task = makeTask()
    const now = Date.parse(task.startAt) - HOUR
    expect(kinds(task, now)).toEqual([])
  })

  it('古すぎる start はグレースで抑止するが overdue は出す', () => {
    const task = makeTask()
    const now = Date.parse(task.endAt) + STALE_GRACE_MS + HOUR
    const result = kinds(task, now)
    expect(result).toContain('overdue')
    expect(result).not.toContain('start')
  })

  it('key は「種別:時刻」で、時刻が変わると別キーになる', () => {
    const task = makeTask()
    const now = Date.parse(task.endAt) + HOUR
    const [overdue] = dueEvents(task, now).filter((e) => e.kind === 'overdue')
    expect(overdue.key).toBe(`overdue:${Date.parse(task.endAt)}`)
  })
})
