<script setup lang="ts">
/**
 * View（部品）: プロジェクト一覧・選択・追加。
 * 表示と入力の受け渡しのみ。状態と操作は ViewModel に委ねる。
 */
import { nextTick, ref } from 'vue'
import type { Project } from '@shared/domain/project'
import { useProjectListViewModel } from '@renderer/viewmodels/useProjectListViewModel'
import { useConfirmViewModel } from '@renderer/viewmodels/useConfirmViewModel'
import { useToastViewModel } from '@renderer/viewmodels/useToastViewModel'

const projectVM = useProjectListViewModel()
const confirmVM = useConfirmViewModel()
const toastVM = useToastViewModel()
const newName = ref('')

const emit = defineEmits<{ (e: 'open-settings'): void }>()

async function addProject(): Promise<void> {
  const name = newName.value.trim()
  if (!name) return
  await projectVM.create(name)
  newName.value = ''
  toastVM.push(`「${name}」を作成しました`)
}

async function removeProject(project: Project): Promise<void> {
  const ok = await confirmVM.ask(`プロジェクト「${project.name}」と配下のタスクを削除しますか？`)
  if (!ok) return
  await projectVM.remove(project.id)
  toastVM.push('プロジェクトを削除しました', 'info')
}

// --- 名前のインライン編集（ダブルクリック） ---
const editingId = ref<string | null>(null)
const editingName = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function startRename(project: Project): void {
  editingId.value = project.id
  editingName.value = project.name
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}
async function commitRename(): Promise<void> {
  const id = editingId.value
  if (id === null) return
  editingId.value = null
  await projectVM.rename(id, editingName.value)
}
function cancelRename(): void {
  editingId.value = null
}
</script>

<template>
  <aside class="sidebar">
    <h1 class="sidebar__title">プロジェクト</h1>

    <ul class="project-list">
      <li
        v-for="project in projectVM.projects"
        :key="project.id"
        class="project-item"
        :class="{ 'project-item--active': project.id === projectVM.selectedId }"
        @click="projectVM.select(project.id)"
      >
        <span class="project-item__dot" :style="{ background: project.color }" />
        <input
          v-if="editingId === project.id"
          ref="renameInput"
          v-model="editingName"
          class="project-item__edit"
          @click.stop
          @keyup.enter="commitRename"
          @keyup.esc="cancelRename"
          @blur="commitRename"
        />
        <span
          v-else
          class="project-item__name"
          title="ダブルクリックで名前を変更"
          @dblclick.stop="startRename(project)"
        >
          {{ project.name }}
        </span>
        <button
          class="project-item__delete"
          title="削除"
          @click.stop="removeProject(project)"
        >
          ×
        </button>
      </li>
    </ul>

    <p v-if="projectVM.isEmpty" class="sidebar__empty">まだプロジェクトがありません。</p>

    <form class="sidebar__add" @submit.prevent="addProject">
      <input
        v-model="newName"
        class="input"
        type="text"
        placeholder="新しいプロジェクト名"
      />
      <button class="btn btn--primary" type="submit">追加</button>
    </form>

    <button class="sidebar__settings" @click="emit('open-settings')">⚙ 設定</button>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 12px;
}
.sidebar__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  margin: 4px 8px 12px;
  text-transform: uppercase;
}
.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
}
.project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
}
.project-item:hover {
  background: var(--surface-hover);
}
.project-item--active {
  background: var(--accent-soft);
}
.project-item__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.project-item__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-item__edit {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 2px 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.project-item__delete {
  opacity: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.project-item:hover .project-item__delete {
  opacity: 1;
}
.sidebar__empty {
  color: var(--text-muted);
  font-size: 13px;
  padding: 0 10px;
}
.sidebar__add {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}
.sidebar__add .input {
  flex: 1;
  min-width: 0;
}
.sidebar__settings {
  margin-top: 10px;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
  font-size: 13px;
}
.sidebar__settings:hover {
  background: var(--surface-hover);
}
</style>
