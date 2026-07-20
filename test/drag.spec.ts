import { describe, expect, it } from 'vitest'
import { applyDrag } from '@renderer/gantt/drag'

const HOUR = 60 * 60 * 1000

// 日単位ズームのスナップは 1 時間。JST は UTC+9:00 固定なので、
// 絶対値の時間丸めがローカルの時境界と一致する。
const start = Date.parse('2026-07-20T10:00:00.000Z') // 時境界
const end = start + 2 * HOUR

describe('applyDrag（日単位ズーム / スナップ=1時間）', () => {
  it('move は期間を保ったまま平行移動する', () => {
    const r = applyDrag('move', start, end, 2 * HOUR, 'day')
    expect(r.startMs).toBe(start + 2 * HOUR)
    expect(r.endMs - r.startMs).toBe(end - start)
  })

  it('move はスナップされる（30分ドラッグ→1時間に丸め）', () => {
    const r = applyDrag('move', start, end, 30 * 60 * 1000, 'day')
    expect(r.startMs).toBe(start + HOUR)
  })

  it('resize-end は終了だけ動かし、開始は不変', () => {
    const r = applyDrag('resize-end', start, end, HOUR, 'day')
    expect(r.startMs).toBe(start)
    expect(r.endMs).toBe(end + HOUR)
  })

  it('resize-end は最小期間（1時間）を下回らない', () => {
    const r = applyDrag('resize-end', start, end, -10 * HOUR, 'day')
    expect(r.startMs).toBe(start)
    expect(r.endMs).toBe(start + HOUR)
  })

  it('resize-start は最小期間を下回らない', () => {
    const r = applyDrag('resize-start', start, end, 10 * HOUR, 'day')
    expect(r.endMs).toBe(end)
    expect(r.startMs).toBe(end - HOUR)
  })
})
