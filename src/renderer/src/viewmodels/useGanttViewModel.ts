/**
 * ViewModel: ガントチャートの状態と計算。
 * - ズーム単位、表示範囲、時間↔座標変換、目盛り、バー座標を提供する。
 * - ドラッグ中は一時状態（プレビュー）を持ち、確定時に taskVM 経由で保存する。
 * View（GanttChart.vue）は DOM 描画とポインタ入力の受け渡しだけを行う。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task } from '@shared/domain/task'
import { useTaskListViewModel } from './useTaskListViewModel'
import { useDependencyViewModel } from './useDependencyViewModel'
import { generateTicks, padMs, pxPerMs, type ZoomUnit } from '@renderer/gantt/timescale'
import { applyDrag, type DragMode } from '@renderer/gantt/drag'

const DAY = 24 * 60 * 60 * 1000
const ROW_H = 40
const HEADER_H = 48
const BAR_PAD = 8

interface DragState {
  taskId: string
  mode: DragMode
  originClientX: number
  origStartMs: number
  origEndMs: number
  startMs: number
  endMs: number
}

export interface GanttBar {
  task: Task
  x: number
  y: number
  width: number
  progressWidth: number
  dragging: boolean
}

export interface GanttArrow {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export const useGanttViewModel = defineStore('gantt', () => {
  const taskVM = useTaskListViewModel()
  const depVM = useDependencyViewModel()

  // --- 状態 ---
  const unit = ref<ZoomUnit>('day')
  const drag = ref<DragState | null>(null)

  // --- レイアウト定数（View と共有） ---
  const rowHeight = ROW_H
  const headerHeight = HEADER_H
  const barHeight = ROW_H - 2 * BAR_PAD

  // --- 派生値 ---
  // 表示範囲は全タスクから（折りたたんでも時間軸の広がりは保つ）。
  const allTasks = computed(() => taskVM.sortedTasks)
  // 描画する行は「見えているツリー行」（折りたたみ・深さ反映）。
  const rows = computed(() => taskVM.visibleRows)

  const range = computed(() => {
    const list = allTasks.value
    const now = Date.now()
    if (list.length === 0) return { startMs: now - 3 * DAY, endMs: now + 7 * DAY }
    let min = Infinity
    let max = -Infinity
    for (const t of list) {
      min = Math.min(min, Date.parse(t.startAt))
      max = Math.max(max, Date.parse(t.endAt))
    }
    const pad = padMs(unit.value)
    return { startMs: min - pad, endMs: max + pad }
  })

  const scale = computed(() => pxPerMs(unit.value))
  const originMs = computed(() => range.value.startMs)

  function xForTime(ms: number): number {
    return (ms - originMs.value) * scale.value
  }
  function timeForX(px: number): number {
    return originMs.value + px / scale.value
  }

  const totalWidth = computed(() => Math.max(600, xForTime(range.value.endMs)))
  const bodyHeight = computed(() => rows.value.length * ROW_H)
  const ticks = computed(() => generateTicks(unit.value, range.value.startMs, range.value.endMs))
  const todayX = computed(() => xForTime(Date.now()))

  const bars = computed<GanttBar[]>(() =>
    rows.value.map((row, i) => {
      const task = row.task
      const d = drag.value?.taskId === task.id ? drag.value : null
      const startMs = d ? d.startMs : Date.parse(task.startAt)
      const endMs = d ? d.endMs : Date.parse(task.endAt)
      const x = xForTime(startMs)
      // 短いタスクでも見えて掴めるよう最小幅を確保する。
      const width = Math.max(8, xForTime(endMs) - x)
      return {
        task,
        x,
        y: i * ROW_H + BAR_PAD,
        width,
        progressWidth: width * (task.progress / 100),
        dragging: Boolean(d)
      }
    })
  )

  // 依存の矢印。両端のバーが見えているものだけ描く。
  const arrows = computed<GanttArrow[]>(() => {
    const barById = new Map(bars.value.map((b) => [b.task.id, b]))
    const mid = barHeight / 2
    const result: GanttArrow[] = []
    for (const dep of depVM.dependencies) {
      const from = barById.get(dep.predecessorId)
      const to = barById.get(dep.successorId)
      if (!from || !to) continue
      result.push({
        id: dep.id,
        x1: from.x + from.width,
        y1: from.y + mid,
        x2: to.x,
        y2: to.y + mid
      })
    }
    return result
  })

  // --- コマンド ---
  function setUnit(u: ZoomUnit): void {
    unit.value = u
  }

  function startDrag(task: Task, mode: DragMode, clientX: number): void {
    const s = Date.parse(task.startAt)
    const e = Date.parse(task.endAt)
    drag.value = {
      taskId: task.id,
      mode,
      originClientX: clientX,
      origStartMs: s,
      origEndMs: e,
      startMs: s,
      endMs: e
    }
  }

  function moveDrag(clientX: number): void {
    const d = drag.value
    if (!d) return
    const deltaMs = (clientX - d.originClientX) / scale.value
    const result = applyDrag(d.mode, d.origStartMs, d.origEndMs, deltaMs, unit.value)
    d.startMs = result.startMs
    d.endMs = result.endMs
  }

  async function endDrag(): Promise<void> {
    const d = drag.value
    if (!d) return
    const changed = d.startMs !== d.origStartMs || d.endMs !== d.origEndMs
    drag.value = null
    if (changed) {
      await taskVM.update(d.taskId, {
        startAt: new Date(d.startMs).toISOString(),
        endAt: new Date(d.endMs).toISOString()
      })
    }
  }

  return {
    unit,
    drag,
    rowHeight,
    headerHeight,
    barHeight,
    rows,
    range,
    scale,
    ticks,
    todayX,
    totalWidth,
    bodyHeight,
    bars,
    arrows,
    xForTime,
    timeForX,
    setUnit,
    startDrag,
    moveDrag,
    endDrag
  }
})
