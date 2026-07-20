/**
 * ガントの「時間 ↔ 座標」変換とメモリ（目盛り）生成を担う純粋モジュール。
 * Vue にも Electron にも依存しないので単体テストしやすい。
 * ここには状態を持たせない（状態は useGanttViewModel が持つ）。
 */

export type ZoomUnit = 'hour' | 'day' | 'week' | 'month'

export const ZOOM_UNITS: ZoomUnit[] = ['hour', 'day', 'week', 'month']

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

interface UnitConfig {
  /** 1 ユニットあたりの表示幅(px) */
  unitPx: number
  /** 1 ユニットあたりの時間(ms)。px/ms の算出に使う概算値 */
  unitMs: number
  /** ドラッグ時のスナップ単位(ms) */
  snapMs: number
  /** 見出し用ラベル */
  label: string
}

export const UNIT_CONFIG: Record<ZoomUnit, UnitConfig> = {
  hour: { unitPx: 54, unitMs: HOUR, snapMs: 15 * MIN, label: '時' },
  day: { unitPx: 48, unitMs: DAY, snapMs: HOUR, label: '日' },
  week: { unitPx: 100, unitMs: 7 * DAY, snapMs: DAY, label: '週' },
  month: { unitPx: 130, unitMs: 30 * DAY, snapMs: DAY, label: '月' }
}

/** 表示範囲の左右に足す余白(ms) */
export function padMs(unit: ZoomUnit): number {
  switch (unit) {
    case 'hour':
      return 6 * HOUR
    case 'day':
      return 2 * DAY
    case 'week':
      return 7 * DAY
    case 'month':
      return 15 * DAY
  }
}

export function pxPerMs(unit: ZoomUnit): number {
  const c = UNIT_CONFIG[unit]
  return c.unitPx / c.unitMs
}

/** ドラッグ結果の時刻をローカルなグリッドにスナップする */
export function snap(ms: number, unit: ZoomUnit): number {
  const step = UNIT_CONFIG[unit].snapMs
  if (step >= DAY) {
    // 日以上はローカルの深夜0時にスナップ
    const d = new Date(ms)
    const base = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return ms - base > DAY / 2 ? base + DAY : base
  }
  // 15分・1時間は絶対値の丸めでローカル境界と一致する（JST は UTC+9:00 固定のため）
  return Math.round(ms / step) * step
}

export interface Tick {
  key: string
  label: string
  startMs: number
  endMs: number
}

export interface Ticks {
  /** 上段（大きな括り: 日 / 月 / 年） */
  major: Tick[]
  /** 下段（細かい目盛り: 時 / 日 / 週 / 月） */
  minor: Tick[]
}

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

function startOfDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
function startOfHour(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
}
function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms))
  const back = (d.getDay() + 6) % 7 // 月曜始まり
  d.setDate(d.getDate() - back)
  return d.getTime()
}
function startOfMonth(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}
function nextMonth(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
}
function startOfYear(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), 0, 1).getTime()
}
function nextYear(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear() + 1, 0, 1).getTime()
}

function monthMajors(startMs: number, endMs: number): Tick[] {
  const out: Tick[] = []
  for (let m = startOfMonth(startMs); m < endMs; m = nextMonth(m)) {
    const d = new Date(m)
    out.push({ key: `m${m}`, label: `${d.getFullYear()}年${d.getMonth() + 1}月`, startMs: m, endMs: nextMonth(m) })
  }
  return out
}

export function generateTicks(unit: ZoomUnit, startMs: number, endMs: number): Ticks {
  const minor: Tick[] = []
  let major: Tick[] = []

  switch (unit) {
    case 'hour': {
      for (let t = startOfHour(startMs); t < endMs; t += HOUR) {
        minor.push({ key: `h${t}`, label: `${new Date(t).getHours()}`, startMs: t, endMs: t + HOUR })
      }
      for (let d = startOfDay(startMs); d < endMs; d += DAY) {
        const dt = new Date(d)
        major.push({
          key: `d${d}`,
          label: `${dt.getMonth() + 1}/${dt.getDate()}(${WEEKDAY[dt.getDay()]})`,
          startMs: d,
          endMs: d + DAY
        })
      }
      break
    }
    case 'day': {
      for (let t = startOfDay(startMs); t < endMs; t += DAY) {
        minor.push({ key: `d${t}`, label: `${new Date(t).getDate()}`, startMs: t, endMs: t + DAY })
      }
      major = monthMajors(startMs, endMs)
      break
    }
    case 'week': {
      for (let t = startOfWeek(startMs); t < endMs; t += 7 * DAY) {
        const dt = new Date(t)
        minor.push({
          key: `w${t}`,
          label: `${dt.getMonth() + 1}/${dt.getDate()}`,
          startMs: t,
          endMs: t + 7 * DAY
        })
      }
      major = monthMajors(startMs, endMs)
      break
    }
    case 'month': {
      for (let m = startOfMonth(startMs); m < endMs; m = nextMonth(m)) {
        minor.push({ key: `mo${m}`, label: `${new Date(m).getMonth() + 1}月`, startMs: m, endMs: nextMonth(m) })
      }
      for (let y = startOfYear(startMs); y < endMs; y = nextYear(y)) {
        major.push({ key: `y${y}`, label: `${new Date(y).getFullYear()}年`, startMs: y, endMs: nextYear(y) })
      }
      break
    }
  }

  return { major, minor }
}
