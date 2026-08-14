<script setup lang="ts">
/**
 * View（部品）: カンバンボード。状態列にカードを並べ、ドラッグで状態を変更する。
 * データ取得・更新は ViewModel に委ねる。
 */
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import { deadlineState, type DeadlineState } from '@renderer/deadline/deadline'
import { STATUS_LABEL, PRIORITY_LABEL, DEADLINE_LABEL } from '@renderer/presentation/labels'
import { TASK_STATUSES, type Task, type TaskStatus } from '@shared/domain/task'

const taskVM = useTaskListViewModel()

function tasksIn(status: TaskStatus): Task[] {
  return taskVM.filteredTasks.filter((t) => t.status === status)
}

function dstate(task: Task): DeadlineState {
  return deadlineState(task, Date.now())
}

function onDragStart(task: Task, e: DragEvent): void {
  e.dataTransfer?.setData('text/plain', task.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop(status: TaskStatus, e: DragEvent): void {
  const id = e.dataTransfer?.getData('text/plain')
  if (id) taskVM.update(id, { status })
}
</script>

<template>
  <div class="kanban">
    <section
      v-for="status in TASK_STATUSES"
      :key="status"
      class="kanban__col"
      @dragover.prevent
      @drop="onDrop(status, $event)"
    >
      <header class="kanban__col-head">
        <span>{{ STATUS_LABEL[status] }}</span>
        <span class="kanban__count">{{ tasksIn(status).length }}</span>
      </header>

      <div class="kanban__cards">
        <article
          v-for="task in tasksIn(status)"
          :key="task.id"
          class="card"
          draggable="true"
          @dragstart="onDragStart(task, $event)"
          @click="taskVM.openEditor(task)"
        >
          <div class="card__title">{{ task.title }}</div>
          <div class="card__meta">
            <span class="badge" :class="`badge--pri-${task.priority}`">
              {{ PRIORITY_LABEL[task.priority] }}
            </span>
            <span v-if="dstate(task) !== 'none'" class="badge" :class="`badge--${dstate(task)}`">
              {{ DEADLINE_LABEL[dstate(task)] }}
            </span>
            <span class="card__progress">{{ task.progress }}%</span>
          </div>
        </article>

        <p v-if="tasksIn(status).length === 0" class="kanban__empty">なし</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kanban {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  height: 100%;
}
.kanban__col {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  min-height: 0;
}
.kanban__col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}
.kanban__count {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 13px;
}
.kanban__cards {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}
.card:hover {
  border-color: var(--accent);
}
.card__title {
  font-weight: 500;
  margin-bottom: 8px;
}
.card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card__progress {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 12px;
}
.kanban__empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  margin: 8px 0;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.badge--pri-high {
  background: #fde8e8;
  color: #c0392b;
}
.badge--pri-mid {
  background: #e7efff;
  color: #4f8cff;
}
.badge--pri-low {
  background: var(--surface-hover);
  color: var(--text-muted);
}
.badge--overdue {
  background: #fde8e8;
  color: #c0392b;
}
.badge--soon {
  background: #fff4e0;
  color: #b8791a;
}
</style>
