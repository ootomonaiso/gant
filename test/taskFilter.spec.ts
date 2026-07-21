import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/domain/task'
import { isFilterActive, matchesFilter, type FilterCriteria } from '@renderer/filter/taskFilter'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't',
    projectId: 'p',
    parentId: null,
    title: '設計レビュー',
    note: '重要',
    startAt: '2026-07-20T00:00:00.000Z',
    endAt: '2026-07-20T01:00:00.000Z',
    progress: 0,
    status: 'todo',
    priority: 'mid',
    sortOrder: 0,
    reminderAt: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    ...overrides
  }
}

const empty: FilterCriteria = { query: '', statuses: [], priorities: [] }

describe('matchesFilter', () => {
  it('空条件はすべて通す', () => {
    expect(matchesFilter(task(), empty)).toBe(true)
  })

  it('状態で絞る', () => {
    expect(matchesFilter(task({ status: 'todo' }), { ...empty, statuses: ['done'] })).toBe(false)
    expect(matchesFilter(task({ status: 'done' }), { ...empty, statuses: ['done'] })).toBe(true)
  })

  it('優先度で絞る', () => {
    expect(matchesFilter(task({ priority: 'low' }), { ...empty, priorities: ['high'] })).toBe(false)
  })

  it('キーワードはタイトルとメモを対象に大文字小文字を無視', () => {
    expect(matchesFilter(task({ title: 'Deploy' }), { ...empty, query: 'deploy' })).toBe(true)
    expect(matchesFilter(task({ note: 'メモにReview' }), { ...empty, query: 'review' })).toBe(true)
    expect(matchesFilter(task(), { ...empty, query: '存在しない' })).toBe(false)
  })

  it('条件は AND で結合', () => {
    const t = task({ status: 'todo', priority: 'high', title: 'API 実装' })
    expect(matchesFilter(t, { query: 'api', statuses: ['todo'], priorities: ['high'] })).toBe(true)
    expect(matchesFilter(t, { query: 'api', statuses: ['done'], priorities: ['high'] })).toBe(false)
  })
})

describe('isFilterActive', () => {
  it('空なら false', () => {
    expect(isFilterActive(empty)).toBe(false)
  })
  it('いずれか指定で true', () => {
    expect(isFilterActive({ ...empty, query: 'x' })).toBe(true)
    expect(isFilterActive({ ...empty, statuses: ['todo'] })).toBe(true)
  })
})
