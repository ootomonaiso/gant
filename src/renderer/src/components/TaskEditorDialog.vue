<script setup lang="ts">
/**
 * View（部品）: タスク編集ダイアログ。
 * editingTask（ViewModel の状態）が非 null のときだけ表示する。
 * 入力はローカルなフォームに複製し、保存時に ViewModel のコマンドへ渡す。
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import { useDependencyViewModel } from '@renderer/viewmodels/useDependencyViewModel'
import { useToastViewModel } from '@renderer/viewmodels/useToastViewModel'
import { useWindowKeydown } from '@renderer/composables/useWindowKeydown'
import { descendantIds } from '@renderer/tree/taskTree'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus
} from '@shared/domain/task'

const taskVM = useTaskListViewModel()
const dependencyVM = useDependencyViewModel()
const toastVM = useToastViewModel()
const titleInput = ref<HTMLInputElement | null>(null)

interface FormState {
  title: string
  note: string
  status: TaskStatus
  priority: TaskPriority
  progress: number
  startAt: string // datetime-local 形式（ローカル時刻）
  endAt: string
  reminderAt: string // 空文字なら「リマインダーなし」
  parentId: string // 空文字なら「トップレベル」
}

const form = reactive<FormState>({
  title: '',
  note: '',
  status: 'todo',
  priority: 'mid',
  progress: 0,
  startAt: '',
  endAt: '',
  reminderAt: '',
  parentId: ''
})

// 親候補: 自分自身とその子孫を除く（循環防止）。
const parentCandidates = computed<Task[]>(() => {
  const task = taskVM.editingTask
  if (!task) return []
  const banned = descendantIds(taskVM.tasks, task.id)
  banned.add(task.id)
  return taskVM.tasks.filter((t) => !banned.has(t.id))
})

// 先行タスク候補: 自分以外のタスク。
const predecessorCandidates = computed<Task[]>(() => {
  const task = taskVM.editingTask
  if (!task) return []
  return taskVM.tasks.filter((t) => t.id !== task.id)
})

function isPredecessor(candidateId: string): boolean {
  const task = taskVM.editingTask
  return task ? Boolean(dependencyVM.between(candidateId, task.id)) : false
}

async function togglePredecessor(candidateId: string): Promise<void> {
  const task = taskVM.editingTask
  if (!task) return
  const existing = dependencyVM.between(candidateId, task.id)
  if (existing) await dependencyVM.remove(existing.id)
  else await dependencyVM.add(candidateId, task.id)
}

const statusLabel: Record<TaskStatus, string> = { todo: '未着手', doing: '進行中', done: '完了' }
const priorityLabel: Record<TaskPriority, string> = { high: '高', mid: '中', low: '低' }

// ISO 8601 ↔ datetime-local(ローカル時刻) の変換
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}
function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

// 開いているタスクが変わったらフォームに複製する。
watch(
  () => taskVM.editingTask,
  (task) => {
    if (!task) return
    form.title = task.title
    form.note = task.note
    form.status = task.status
    form.priority = task.priority
    form.progress = task.progress
    form.startAt = isoToLocalInput(task.startAt)
    form.endAt = isoToLocalInput(task.endAt)
    form.reminderAt = task.reminderAt ? isoToLocalInput(task.reminderAt) : ''
    form.parentId = task.parentId ?? ''
    // 開いた直後にタイトルへフォーカスして全選択（すぐ入力できる）。
    nextTick(() => {
      titleInput.value?.focus()
      titleInput.value?.select()
    })
  },
  { immediate: true }
)

useWindowKeydown((e) => {
  if (taskVM.editingTask && e.key === 'Escape') taskVM.closeEditor()
})

async function save(): Promise<void> {
  const task = taskVM.editingTask
  if (!task) return

  const startIso = localInputToIso(form.startAt)
  let endIso = localInputToIso(form.endAt)
  // 終了が開始以前なら開始 +15 分に自動補正（バーが潰れないように）。
  if (Date.parse(endIso) <= Date.parse(startIso)) {
    endIso = new Date(Date.parse(startIso) + 15 * 60 * 1000).toISOString()
    toastVM.push('終了が開始より後になるよう調整しました', 'info')
  }

  await taskVM.update(task.id, {
    title: form.title.trim() || '無題',
    note: form.note,
    status: form.status,
    priority: form.priority,
    progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
    startAt: startIso,
    endAt: endIso,
    reminderAt: form.reminderAt ? localInputToIso(form.reminderAt) : null,
    parentId: form.parentId ? form.parentId : null
  })
  taskVM.closeEditor()
  toastVM.push('保存しました')
}
</script>

<template>
  <div v-if="taskVM.editingTask" class="overlay" @click.self="taskVM.closeEditor()">
    <div class="dialog" role="dialog" aria-modal="true">
      <h2 class="dialog__title">タスクの編集</h2>

      <form class="form" @submit.prevent="save">
        <label class="field">
          <span class="field__label">タイトル</span>
          <input ref="titleInput" v-model="form.title" class="input" type="text" />
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field__label">状態</span>
            <select v-model="form.status" class="input">
              <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ statusLabel[s] }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">優先度</span>
            <select v-model="form.priority" class="input">
              <option v-for="p in TASK_PRIORITIES" :key="p" :value="p">
                {{ priorityLabel[p] }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="field__label">進捗 (%)</span>
            <input v-model.number="form.progress" class="input" type="number" min="0" max="100" />
          </label>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field__label">開始</span>
            <input v-model="form.startAt" class="input" type="datetime-local" />
          </label>
          <label class="field">
            <span class="field__label">終了</span>
            <input v-model="form.endAt" class="input" type="datetime-local" />
          </label>
        </div>

        <label class="field">
          <span class="field__label">リマインダー（任意）</span>
          <div class="reminder-row">
            <input v-model="form.reminderAt" class="input reminder-row__input" type="datetime-local" />
            <button
              v-if="form.reminderAt"
              type="button"
              class="btn btn--ghost"
              @click="form.reminderAt = ''"
            >
              クリア
            </button>
          </div>
        </label>

        <label class="field">
          <span class="field__label">親タスク（サブタスクにする）</span>
          <select v-model="form.parentId" class="input">
            <option value="">なし（トップレベル）</option>
            <option v-for="t in parentCandidates" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
        </label>

        <div class="field">
          <span class="field__label">先行タスク（このタスクの前に終わらせる）</span>
          <div v-if="predecessorCandidates.length === 0" class="pred-empty">
            他にタスクがありません。
          </div>
          <div v-else class="pred-list">
            <label v-for="t in predecessorCandidates" :key="t.id" class="pred-item">
              <input
                type="checkbox"
                :checked="isPredecessor(t.id)"
                @change="togglePredecessor(t.id)"
              />
              <span>{{ t.title }}</span>
            </label>
          </div>
        </div>

        <label class="field">
          <span class="field__label">メモ</span>
          <textarea v-model="form.note" class="input" rows="3" />
        </label>

        <div class="dialog__actions">
          <button type="button" class="btn btn--ghost" @click="taskVM.closeEditor()">
            キャンセル
          </button>
          <button type="submit" class="btn btn--primary">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  width: min(560px, 92vw);
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.dialog__title {
  margin: 0 0 16px;
  font-size: 18px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.field__label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}
.field-row {
  display: flex;
  gap: 12px;
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.reminder-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.reminder-row__input {
  flex: 1;
}
.pred-list {
  max-height: 140px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pred-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}
.pred-empty {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
