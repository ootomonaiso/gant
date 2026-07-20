<script setup lang="ts">
/**
 * View（部品）: プロジェクト一覧・選択・追加。
 * 表示と入力の受け渡しのみ。状態と操作は ViewModel に委ねる。
 */
import { ref } from 'vue'
import { useProjectListViewModel } from '@renderer/viewmodels/useProjectListViewModel'

const projectVM = useProjectListViewModel()
const newName = ref('')

async function addProject(): Promise<void> {
  await projectVM.create(newName.value)
  newName.value = ''
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
        <span class="project-item__name">{{ project.name }}</span>
        <button
          class="project-item__delete"
          title="削除"
          @click.stop="projectVM.remove(project.id)"
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
</style>
