<script setup lang="ts">
/**
 * View（部品）: タスクのリスト表示。
 * フェーズ1 の主画面。ガント（フェーズ2）もこの ViewModel を共有して追加する。
 */
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import type { TaskPriority, TaskStatus } from '@shared/domain/task'

const taskVM = useTaskListViewModel()

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
          v-for="task in taskVM.sortedTasks"
          :key="task.id"
          class="task-row"
          @click="taskVM.openEditor(task)"
        >
          <td class="task-row__title">{{ task.title }}</td>
          <td>
            <span class="badge" :class="`badge--${task.status}`">
              {{ statusLabel[task.status] }}
            </span>
          </td>
          <td>
            <span class="badge" :class="`badge--pri-${task.priority}`">
              {{ priorityLabel[task.priority] }}
            </span>
          </td>
          <td class="task-row__progress">
            <div class="progress">
              <div class="progress__bar" :style="{ width: `${task.progress}%` }" />
            </div>
            <span class="progress__label">{{ task.progress }}%</span>
          </td>
          <td class="task-row__range">{{ formatRange(task.startAt, task.endAt) }}</td>
          <td>
            <button
              class="btn btn--ghost"
              title="削除"
              @click.stop="taskVM.remove(task.id)"
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
