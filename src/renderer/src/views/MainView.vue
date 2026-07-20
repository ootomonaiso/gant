<script setup lang="ts">
/**
 * View（画面）: 全体レイアウトと ViewModel の結線のみ。
 * ロジックは持たず、ViewModel の状態を子 View に橋渡しする。
 */
import { onMounted, watch } from 'vue'
import { useProjectListViewModel } from '@renderer/viewmodels/useProjectListViewModel'
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import ProjectSidebar from '@renderer/components/ProjectSidebar.vue'
import TaskListView from '@renderer/components/TaskListView.vue'
import TaskEditorDialog from '@renderer/components/TaskEditorDialog.vue'

const projectVM = useProjectListViewModel()
const taskVM = useTaskListViewModel()

onMounted(() => projectVM.load())

// プロジェクト選択が変わったら、そのプロジェクトのタスクを読み込む。
watch(
  () => projectVM.selectedId,
  (id) => {
    if (id !== null) taskVM.load(id)
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-layout">
    <ProjectSidebar class="app-layout__sidebar" />
    <main class="app-layout__content">
      <TaskListView v-if="projectVM.selectedId !== null" />
      <div v-else class="empty-hint">
        左のサイドバーからプロジェクトを作成してください。
      </div>
    </main>

    <TaskEditorDialog />
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
}
.app-layout__sidebar {
  border-right: 1px solid var(--border);
  background: var(--surface);
  overflow-y: auto;
}
.app-layout__content {
  overflow: auto;
  padding: 20px 24px;
}
.empty-hint {
  color: var(--text-muted);
  margin-top: 40px;
  text-align: center;
}
</style>
