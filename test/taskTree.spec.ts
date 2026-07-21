import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/domain/task'
import { buildTaskTree, descendantIds } from '@renderer/tree/taskTree'

let seq = 0
function task(id: string, parentId: string | null, sortOrder = seq++): Task {
  return {
    id,
    projectId: 'p1',
    parentId,
    title: id,
    note: '',
    startAt: '2026-07-20T00:00:00.000Z',
    endAt: '2026-07-20T01:00:00.000Z',
    progress: 0,
    status: 'todo',
    priority: 'mid',
    sortOrder,
    reminderAt: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z'
  }
}

describe('buildTaskTree', () => {
  it('親→子の順で深さを付ける', () => {
    const tasks = [task('a', null, 0), task('a1', 'a', 1), task('b', null, 2)]
    const rows = buildTaskTree(tasks, new Set())
    expect(rows.map((r) => [r.task.id, r.depth])).toEqual([
      ['a', 0],
      ['a1', 1],
      ['b', 0]
    ])
  })

  it('hasChildren を正しく判定する', () => {
    const tasks = [task('a', null, 0), task('a1', 'a', 1)]
    const rows = buildTaskTree(tasks, new Set())
    expect(rows.find((r) => r.task.id === 'a')?.hasChildren).toBe(true)
    expect(rows.find((r) => r.task.id === 'a1')?.hasChildren).toBe(false)
  })

  it('折りたたむと子孫を隠す', () => {
    const tasks = [task('a', null, 0), task('a1', 'a', 1), task('a1x', 'a1', 2)]
    const rows = buildTaskTree(tasks, new Set(['a']))
    expect(rows.map((r) => r.task.id)).toEqual(['a'])
    expect(rows[0].collapsed).toBe(true)
  })

  it('親が存在しないタスクはトップレベル扱い', () => {
    const tasks = [task('orphan', 'missing', 0)]
    const rows = buildTaskTree(tasks, new Set())
    expect(rows).toHaveLength(1)
    expect(rows[0].depth).toBe(0)
  })
})

describe('descendantIds', () => {
  it('子孫をすべて集める（自分は含まない）', () => {
    const tasks = [task('a', null, 0), task('a1', 'a', 1), task('a1x', 'a1', 2), task('b', null, 3)]
    const ids = descendantIds(tasks, 'a')
    expect([...ids].sort()).toEqual(['a1', 'a1x'])
  })
})
