<script setup lang="ts">
/**
 * View（部品）: ガントチャート本体。
 * 描画とポインタ入力の受け渡しのみ。座標計算・ドラッグ確定は useGanttViewModel が担う。
 */
import { onMounted, ref } from 'vue'
import { useGanttViewModel } from '@renderer/viewmodels/useGanttViewModel'
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import { ZOOM_UNITS, UNIT_CONFIG } from '@renderer/gantt/timescale'
import type { Task } from '@shared/domain/task'

const vm = useGanttViewModel()
const taskVM = useTaskListViewModel()

const timelineEl = ref<HTMLElement | null>(null)
const labelsEl = ref<HTMLElement | null>(null)

const HANDLE_W = 6

// 縦スクロールをラベル列に同期させる（横はタイムラインのみスクロール）
function syncScroll(): void {
  if (timelineEl.value && labelsEl.value) {
    labelsEl.value.scrollTop = timelineEl.value.scrollTop
  }
}

function scrollToToday(): void {
  const el = timelineEl.value
  if (!el) return
  el.scrollLeft = Math.max(0, vm.todayX - el.clientWidth / 2)
}

onMounted(() => scrollToToday())

// --- ドラッグ（移動・リサイズ） ---
type DragMode = 'move' | 'resize-start' | 'resize-end'

function onPointerDown(task: Task, mode: DragMode, e: PointerEvent): void {
  e.stopPropagation()
  vm.startDrag(task, mode, e.clientX)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove(e: PointerEvent): void {
  vm.moveDrag(e.clientX)
}
function onPointerUp(): void {
  vm.endDrag()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function isOverdue(task: Task): boolean {
  return task.status !== 'done' && Date.parse(task.endAt) < Date.now()
}
</script>

<template>
  <div class="gantt">
    <!-- ツールバー: ズーム切替 + 今日へ -->
    <div class="gantt__toolbar">
      <div class="zoom">
        <button
          v-for="u in ZOOM_UNITS"
          :key="u"
          class="zoom__btn"
          :class="{ 'zoom__btn--active': vm.unit === u }"
          @click="vm.setUnit(u)"
        >
          {{ UNIT_CONFIG[u].label }}
        </button>
      </div>
      <button class="btn btn--ghost" @click="scrollToToday">今日へ</button>
    </div>

    <div class="gantt__body">
      <!-- 左: タスク名の固定列 -->
      <div ref="labelsEl" class="gantt__labels">
        <div class="gantt__labels-head" :style="{ height: vm.headerHeight + 'px' }">タスク</div>
        <div
          v-for="row in vm.rows"
          :key="row.task.id"
          class="gantt__label-row"
          :style="{ height: vm.rowHeight + 'px', paddingLeft: 8 + row.depth * 14 + 'px' }"
          @click="taskVM.openEditor(row.task)"
        >
          <button
            v-if="row.hasChildren"
            class="gantt__toggle"
            @click.stop="taskVM.toggleCollapse(row.task.id)"
          >
            {{ row.collapsed ? '▶' : '▼' }}
          </button>
          <span v-else class="gantt__toggle gantt__toggle--empty" />
          <span
            class="gantt__label-text"
            :class="{ 'gantt__label-text--done': row.task.status === 'done' }"
          >
            {{ row.task.title }}
          </span>
        </div>
      </div>

      <!-- 右: スクロールするタイムライン -->
      <div ref="timelineEl" class="gantt__timeline" @scroll="syncScroll">
        <!-- ヘッダ（時間軸・上段=大括り / 下段=目盛り） -->
        <svg
          class="gantt__header"
          :width="vm.totalWidth"
          :height="vm.headerHeight"
          :style="{ width: vm.totalWidth + 'px', height: vm.headerHeight + 'px' }"
        >
          <g>
            <g v-for="t in vm.ticks.major" :key="t.key">
              <line
                :x1="vm.xForTime(t.startMs)"
                :y1="0"
                :x2="vm.xForTime(t.startMs)"
                :y2="vm.headerHeight"
                class="axis-line axis-line--major"
              />
              <text :x="vm.xForTime(t.startMs) + 6" :y="16" class="axis-text axis-text--major">
                {{ t.label }}
              </text>
            </g>
            <g v-for="t in vm.ticks.minor" :key="t.key">
              <line
                :x1="vm.xForTime(t.startMs)"
                :y1="vm.headerHeight / 2"
                :x2="vm.xForTime(t.startMs)"
                :y2="vm.headerHeight"
                class="axis-line"
              />
              <text
                :x="(vm.xForTime(t.startMs) + vm.xForTime(t.endMs)) / 2"
                :y="vm.headerHeight - 8"
                class="axis-text"
                text-anchor="middle"
              >
                {{ t.label }}
              </text>
            </g>
          </g>
        </svg>

        <!-- ボディ（グリッド・今日ライン・バー） -->
        <svg
          class="gantt__grid"
          :width="vm.totalWidth"
          :height="vm.bodyHeight"
          :style="{ width: vm.totalWidth + 'px', height: vm.bodyHeight + 'px' }"
        >
          <defs>
            <marker
              id="gantt-arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" class="arrowhead" />
            </marker>
          </defs>

          <!-- 縦グリッド -->
          <line
            v-for="t in vm.ticks.minor"
            :key="t.key"
            :x1="vm.xForTime(t.startMs)"
            :y1="0"
            :x2="vm.xForTime(t.startMs)"
            :y2="vm.bodyHeight"
            class="grid-line"
          />
          <!-- 行の下線 -->
          <line
            v-for="(bar, i) in vm.bars"
            :key="'row' + bar.task.id"
            :x1="0"
            :y1="(i + 1) * vm.rowHeight"
            :x2="vm.totalWidth"
            :y2="(i + 1) * vm.rowHeight"
            class="grid-line grid-line--row"
          />

          <!-- 今日ライン -->
          <line :x1="vm.todayX" :y1="0" :x2="vm.todayX" :y2="vm.bodyHeight" class="today-line" />

          <!-- 依存の矢印（先行→後続） -->
          <path
            v-for="a in vm.arrows"
            :key="a.id"
            :d="`M ${a.x1} ${a.y1} H ${a.x1 + 12} V ${a.y2} H ${a.x2}`"
            class="dep-arrow"
            marker-end="url(#gantt-arrowhead)"
          />

          <!-- バー -->
          <g
            v-for="bar in vm.bars"
            :key="bar.task.id"
            class="bar"
            :class="{ 'bar--dragging': bar.dragging }"
            @dblclick="taskVM.openEditor(bar.task)"
          >
            <!-- 本体（移動） -->
            <rect
              :x="bar.x"
              :y="bar.y"
              :width="bar.width"
              :height="vm.barHeight"
              rx="4"
              class="bar__body"
              :class="[`bar__body--pri-${bar.task.priority}`, { 'bar__body--overdue': isOverdue(bar.task) }]"
              @pointerdown="onPointerDown(bar.task, 'move', $event)"
            />
            <!-- 進捗 -->
            <rect
              :x="bar.x"
              :y="bar.y"
              :width="bar.progressWidth"
              :height="vm.barHeight"
              rx="4"
              class="bar__progress"
              pointer-events="none"
            />
            <!-- タイトル -->
            <text :x="bar.x + 8" :y="bar.y + vm.barHeight / 2 + 4" class="bar__label" pointer-events="none">
              {{ bar.task.title }}
            </text>
            <!-- 左ハンドル（開始をリサイズ） -->
            <rect
              :x="bar.x"
              :y="bar.y"
              :width="HANDLE_W"
              :height="vm.barHeight"
              class="bar__handle"
              @pointerdown="onPointerDown(bar.task, 'resize-start', $event)"
            />
            <!-- 右ハンドル（終了をリサイズ） -->
            <rect
              :x="bar.x + bar.width - HANDLE_W"
              :y="bar.y"
              :width="HANDLE_W"
              :height="vm.barHeight"
              class="bar__handle"
              @pointerdown="onPointerDown(bar.task, 'resize-end', $event)"
            />
          </g>
        </svg>

        <div v-if="vm.rows.length === 0" class="gantt__empty">
          タスクがありません。「＋ タスク追加」から作成してください。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
}
.gantt__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.zoom {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.zoom__btn {
  border: none;
  background: var(--surface);
  color: var(--text-muted);
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 600;
}
.zoom__btn--active {
  background: var(--accent);
  color: #fff;
}

.gantt__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 200px 1fr;
}
.gantt__labels {
  overflow: hidden;
  border-right: 1px solid var(--border);
}
.gantt__labels-head {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
}
.gantt__label-row {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.gantt__label-row:hover {
  background: var(--surface-hover);
}
.gantt__toggle {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 9px;
  line-height: 16px;
}
.gantt__toggle--empty {
  cursor: default;
}
.gantt__label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gantt__label-text--done {
  color: var(--text-muted);
  text-decoration: line-through;
}

.gantt__timeline {
  overflow: auto;
  position: relative;
}
.gantt__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: block;
  background: var(--surface);
}
.gantt__grid {
  display: block;
}
.gantt__empty {
  position: absolute;
  top: 60px;
  left: 24px;
  color: var(--text-muted);
}

.axis-line {
  stroke: var(--border);
  stroke-width: 1;
}
.axis-line--major {
  stroke: var(--border);
}
.axis-text {
  fill: var(--text-muted);
  font-size: 11px;
}
.axis-text--major {
  fill: var(--text);
  font-size: 12px;
  font-weight: 600;
}
.grid-line {
  stroke: var(--border);
  stroke-width: 1;
  opacity: 0.6;
}
.grid-line--row {
  opacity: 0.5;
}
.today-line {
  stroke: #e5484d;
  stroke-width: 2;
  stroke-dasharray: 4 3;
}
.dep-arrow {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
}
.arrowhead {
  fill: var(--text-muted);
}

.bar__body {
  fill: var(--accent);
  cursor: grab;
}
.bar--dragging .bar__body {
  cursor: grabbing;
  opacity: 0.85;
}
.bar__body--pri-high {
  fill: #e5674d;
}
.bar__body--pri-mid {
  fill: #4f8cff;
}
.bar__body--pri-low {
  fill: #8a94a6;
}
.bar__body--overdue {
  stroke: #e5484d;
  stroke-width: 2;
}
.bar__progress {
  fill: rgba(0, 0, 0, 0.28);
}
.bar__label {
  fill: #fff;
  font-size: 12px;
  font-weight: 500;
}
.bar__handle {
  fill: transparent;
  cursor: ew-resize;
}
.bar:hover .bar__handle {
  fill: rgba(255, 255, 255, 0.5);
}
</style>
