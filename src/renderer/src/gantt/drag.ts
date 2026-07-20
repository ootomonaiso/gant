/**
 * ガントのバードラッグ（移動・端リサイズ）で新しい開始/終了時刻を求める純粋ロジック。
 * View（ポインタ入力）にも Pinia にも依存しないので単体テストしやすい。
 */
import { snap, UNIT_CONFIG, type ZoomUnit } from './timescale'

export type DragMode = 'move' | 'resize-start' | 'resize-end'

export interface DragTimes {
  startMs: number
  endMs: number
}

/**
 * @param deltaMs ドラッグ量（ピクセル差を ms に換算した値）
 */
export function applyDrag(
  mode: DragMode,
  origStartMs: number,
  origEndMs: number,
  deltaMs: number,
  unit: ZoomUnit
): DragTimes {
  const minDur = UNIT_CONFIG[unit].snapMs

  if (mode === 'move') {
    const startMs = snap(origStartMs + deltaMs, unit)
    return { startMs, endMs: startMs + (origEndMs - origStartMs) }
  }

  if (mode === 'resize-start') {
    let startMs = snap(origStartMs + deltaMs, unit)
    if (startMs > origEndMs - minDur) startMs = origEndMs - minDur
    return { startMs, endMs: origEndMs }
  }

  // resize-end
  let endMs = snap(origEndMs + deltaMs, unit)
  if (endMs < origStartMs + minDur) endMs = origStartMs + minDur
  return { startMs: origStartMs, endMs }
}
