import { describe, expect, it } from 'vitest'
import { generateTicks, pxPerMs, snap } from '@renderer/gantt/timescale'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

describe('pxPerMs', () => {
  it('すべてのズームで正の値', () => {
    for (const u of ['hour', 'day', 'week', 'month'] as const) {
      expect(pxPerMs(u)).toBeGreaterThan(0)
    }
  })
})

describe('snap', () => {
  it('時単位は 15 分に丸める', () => {
    const base = Date.parse('2026-07-20T10:00:00.000Z')
    expect(snap(base + 7 * 60 * 1000, 'hour')).toBe(base) // +7分→0分側
    expect(snap(base + 8 * 60 * 1000, 'hour')).toBe(base + 15 * 60 * 1000) // +8分→15分側
  })

  it('日単位は 1 時間に丸める', () => {
    const base = new Date(2026, 6, 20, 10, 0, 0).getTime()
    expect(snap(base + 20 * 60 * 1000, 'day')).toBe(base) // +20分→10時側
    expect(snap(base + 40 * 60 * 1000, 'day')).toBe(base + HOUR) // +40分→11時側
  })

  it('週・月単位はローカルの深夜0時に丸める', () => {
    const afternoon = new Date(2026, 6, 20, 13, 0, 0).getTime()
    const nextMidnight = new Date(2026, 6, 21, 0, 0, 0).getTime()
    expect(snap(afternoon, 'week')).toBe(nextMidnight)
    const morning = new Date(2026, 6, 20, 9, 0, 0).getTime()
    const sameMidnight = new Date(2026, 6, 20, 0, 0, 0).getTime()
    expect(snap(morning, 'month')).toBe(sameMidnight)
  })
})

describe('generateTicks', () => {
  it('日単位: 範囲内の目盛りと月の大括りを返す', () => {
    const startMs = Date.parse('2026-07-20T00:00:00.000Z')
    const { major, minor } = generateTicks('day', startMs, startMs + 3 * DAY)
    expect(minor.length).toBeGreaterThanOrEqual(3)
    expect(major.length).toBeGreaterThanOrEqual(1)
  })

  it('時単位: 1時間ごとの目盛りを返す', () => {
    const startMs = Date.parse('2026-07-20T00:00:00.000Z')
    const { minor } = generateTicks('hour', startMs, startMs + 5 * HOUR)
    expect(minor.length).toBeGreaterThanOrEqual(5)
  })
})
