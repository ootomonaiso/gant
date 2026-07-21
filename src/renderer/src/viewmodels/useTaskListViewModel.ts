/**
 * ViewModel: 選択中プロジェクトのタスク一覧と編集状態。
 * View 非依存。IPC の詳細は Gateway に閉じているので、Gateway を差し替えれば単体テスト可能。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Task, TaskPatch } from '@shared/domain/task'
import { taskGateway } from '@renderer/gateways/taskGateway'
import { buildTaskTree } from '@renderer/tree/taskTree'

/** 新規タスクの既定期間（1 時間） */
const DEFAULT_DURATION_MS = 60 * 60 * 1000

export const useTaskListViewModel = defineStore('taskList', () => {
  // --- 状態 ---
  const tasks = ref<Task[]>([])
  const projectId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 編集ダイアログで開いているタスク（null なら閉じている） */
  const editingTask = ref<Task | null>(null)
  /** 折りたたみ中のタスク ID */
  const collapsedIds = ref<Set<string>>(new Set())

  // --- 派生値 ---
  const sortedTasks = computed(() =>
    [...tasks.value].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
  )
  /** 親子ツリーを表示順（深さ付き）に平坦化。折りたたみを反映。 */
  const visibleRows = computed(() => buildTaskTree(sortedTasks.value, collapsedIds.value))
  const isEmpty = computed(() => !loading.value && tasks.value.length === 0)

  // --- コマンド ---
  async function load(pid: string): Promise<void> {
    projectId.value = pid
    loading.value = true
    error.value = null
    try {
      tasks.value = await taskGateway.listByProject(pid)
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  /** 既定値で 1 件作成し、そのまま編集ダイアログを開く。 */
  async function createDefault(): Promise<void> {
    if (projectId.value === null) return
    const start = new Date()
    const end = new Date(start.getTime() + DEFAULT_DURATION_MS)
    const created = await taskGateway.create({
      projectId: projectId.value,
      parentId: null,
      title: '新しいタスク',
      note: '',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      progress: 0,
      status: 'todo',
      priority: 'mid',
      sortOrder: tasks.value.length,
      reminderAt: null
    })
    tasks.value.push(created)
    editingTask.value = created
  }

  async function update(id: string, patch: TaskPatch): Promise<void> {
    const updated = await taskGateway.update(id, patch)
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index >= 0) tasks.value[index] = updated
    if (editingTask.value?.id === id) editingTask.value = updated
  }

  async function remove(id: string): Promise<void> {
    await taskGateway.remove(id)
    tasks.value = tasks.value.filter((t) => t.id !== id)
    if (editingTask.value?.id === id) editingTask.value = null
  }

  function openEditor(task: Task): void {
    editingTask.value = task
  }

  /** 通知クリックなどから ID 指定で編集を開く（当該プロジェクトを表示中のときのみ有効）。 */
  function openEditorById(id: string): boolean {
    const task = tasks.value.find((t) => t.id === id)
    if (!task) return false
    editingTask.value = task
    return true
  }

  function closeEditor(): void {
    editingTask.value = null
  }

  function toggleCollapse(id: string): void {
    const next = new Set(collapsedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    collapsedIds.value = next
  }

  return {
    tasks,
    projectId,
    loading,
    error,
    editingTask,
    collapsedIds,
    sortedTasks,
    visibleRows,
    isEmpty,
    load,
    createDefault,
    update,
    remove,
    openEditor,
    openEditorById,
    closeEditor,
    toggleCollapse
  }
})
