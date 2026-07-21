<script setup lang="ts">
/**
 * View（部品）: タスクのリスト表示。
 * フェーズ1 の主画面。ガント（フェーズ2）もこの ViewModel を共有して追加する。
 */
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import { useConfirmViewModel } from '@renderer/viewmodels/useConfirmViewModel'
import { useToastViewModel } from '@renderer/viewmodels/useToastViewModel'
import type { Task, TaskPriority, TaskStatus } from '@shared/domain/task'

const taskVM = useTaskListViewModel()
const confirmVM = useConfirmViewModel()
const toastVM = useToastViewModel()

function toggleDone(task: Task): void {
  taskVM.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
}

async function removeTask(task: Task): Promise<void> {
  const ok = await confirmVM.ask(`タスク「${task.title}」を削除しますか？`)
  if (!ok) return
  await taskVM.remove(task.id)
  toastVM.push('タスクを削除しました', 'info')
}

// 表示用ラベル（プレゼンテーションの都合なので View 側に置く）
const statusLabel: Record<TaskStatus, string> = {
  todo: '未着手',
  doing: '進行中',
  done: '完了'
}
const priorityLabel: Record<TaskPriority, string> = {
  high: '高',
  mid: '中',
  low: '低'
}

function formatRange(startAt: string, endAt: string): string {
  const fmt = (iso: string): string =>
    new Date(iso).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  return `${fmt(startAt)} → ${fmt(endAt)}`
}
</script>

<template>
  <section class="task-view">
    <p v-if="taskVM.loading" class="task-view__hint">読み込み中…</p>
    <p v-else-if="taskVM.error" class="task-view__error">{{ taskVM.error }}</p>
    <p v-else-if="taskVM.isEmpty" class="task-view__hint">
      タスクがありません。「＋ タスク追加」から作成してください。
    </p>

    <table v-else class="task-table">
      <thead>
        <tr>
          <th class="task-table__check"></th>
          <th>タイトル</th>
          <th>状態</th>
          <th>優先度</th>
          <th>進捗</th>
          <th>期間</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in taskVM.visibleRows"
          :key="row.task.id"
          class="task-row"
          :class="{ 'task-row--done': row.task.status === 'done' }"
          @click="taskVM.openEditor(row.task)"
        >
          <td class="task-table__check" @click.stop>
            <input
              type="checkbox"
              :checked="row.task.status === 'done'"
              title="完了にする / 戻す"
              @change="toggleDone(row.task)"
            />
          </td>
          <td class="task-row__title">
            <span class="task-row__indent" :style="{ width: row.depth * 16 + 'px' }" />
            <button
              v-if="row.hasChildren"
              class="task-row__toggle"
              @click.stop="taskVM.toggleCollapse(row.task.id)"
            >
              {{ row.collapsed ? '▶' : '▼' }}
            </button>
            <span v-else class="task-row__toggle task-row__toggle--empty" />
            <span class="task-row__name">{{ row.task.title }}</span>
          </td>
          <td>
            <span class="badge" :class="`badge--${row.task.status}`">
              {{ statusLabel[row.task.status] }}
            </span>
          </td>
          <td>
            <span class="badge" :class="`badge--pri-${row.task.priority}`">
              {{ priorityLabel[row.task.priority] }}
            </span>
          </td>
          <td class="task-row__progress">
            <div class="progress">
              <div class="progress__bar" :style="{ width: `${row.task.progress}%` }" />
            </div>
            <span class="progress__label">{{ row.task.progress }}%</span>
          </td>
          <td class="task-row__range">{{ formatRange(row.task.startAt, row.task.endAt) }}</td>
          <td>
            <button
              class="btn btn--ghost"
              title="削除"
              @click.stop="removeTask(row.task)"
            >
              🗑
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.task-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.task-view__title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.task-view__hint {
  color: var(--text-muted);
}
.task-view__error {
  color: var(--danger);
}
.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.task-table th {
  text-align: left;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 12px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.task-row {
  cursor: pointer;
}
.task-row:hover {
  background: var(--surface-hover);
}
.task-table__check {
  width: 36px;
  text-align: center;
}
.task-row--done .task-row__name {
  text-decoration: line-through;
  color: var(--text-muted);
}
.task-row__title {
  white-space: nowrap;
}
.task-row__indent {
  display: inline-block;
  vertical-align: middle;
}
.task-row__toggle {
  display: inline-block;
  width: 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 9px;
  padding: 0;
}
.task-row__toggle--empty {
  cursor: default;
}
.task-row td {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.task-row__title {
  font-weight: 500;
}
.task-row__range {
  color: var(--text-muted);
  white-space: nowrap;
}
.task-row__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}
.progress {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
.progress__bar {
  height: 100%;
  background: var(--accent);
}
.progress__label {
  color: var(--text-muted);
  font-size: 12px;
  width: 34px;
  text-align: right;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.badge--todo {
  background: var(--surface-hover);
  color: var(--text-muted);
}
.badge--doing {
  background: var(--accent-soft);
  color: var(--accent);
}
.badge--done {
  background: #e3f6e8;
  color: #1a7f37;
}
.badge--pri-high {
  background: #fde8e8;
  color: #c0392b;
}
.badge--pri-mid {
  background: #fff4e0;
  color: #b8791a;
}
.badge--pri-low {
  background: var(--surface-hover);
  color: var(--text-muted);
}
</style>
