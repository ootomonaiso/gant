import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/domain/task'
import { deadlineState } from '@renderer/deadline/deadline'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function task(endAt: string, status: Task['status'] = 'todo'): Task {
  return {
    id: 't',
    projectId: 'p',
    parentId: null,
    title: 't',
    note: '',
    startAt: '2026-07-20T00:00:00.000Z',
    endAt,
    progress: 0,
    status,
    priority: 'mid',
    sortOrder: 0,
    reminderAt: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z'
  }
}

const now = Date.parse('2026-07-20T12:00:00.000Z')

describe('deadlineState', () => {
  it('終了が過去なら overdue', () => {
    expect(deadlineState(task(new Date(now - HOUR).toISOString()), now)).toBe('overdue')
  })

  it('24時間以内なら soon', () => {
    expect(deadlineState(task(new Date(now + 2 * HOUR).toISOString()), now)).toBe('soon')
  })

  it('先の予定は none', () => {
    expect(deadlineState(task(new Date(now + 3 * DAY).toISOString()), now)).toBe('none')
  })

  it('完了タスクは警告しない', () => {
    expect(deadlineState(task(new Date(now - HOUR).toISOString(), 'done'), now)).toBe('none')
  })
})
