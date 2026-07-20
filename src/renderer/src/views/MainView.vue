<script setup lang="ts">
/**
 * View（画面）: 全体レイアウトと ViewModel の結線のみ。
 * ロジックは持たず、ViewModel の状態を子 View に橋渡しする。
 */
import { onMounted, ref, watch } from 'vue'
import { useProjectListViewModel } from '@renderer/viewmodels/useProjectListViewModel'
import { useTaskListViewModel } from '@renderer/viewmodels/useTaskListViewModel'
import ProjectSidebar from '@renderer/components/ProjectSidebar.vue'
import TaskListView from '@renderer/components/TaskListView.vue'
import TaskEditorDialog from '@renderer/components/TaskEditorDialog.vue'
import GanttChart from '@renderer/components/gantt/GanttChart.vue'

type ViewKind = 'gantt' | 'list'

const projectVM = useProjectListViewModel()
const taskVM = useTaskListViewModel()
const currentView = ref<ViewKind>('gantt')

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
      <template v-if="projectVM.selectedId !== null">
        <header class="content-header">
          <h2 class="content-header__title">{{ projectVM.selectedProject?.name }}</h2>
          <div class="view-tabs">
            <button
              class="view-tabs__btn"
              :class="{ 'view-tabs__btn--active': currentView === 'gantt' }"
              @click="currentView = 'gantt'"
            >
              ガント
            </button>
            <button
              class="view-tabs__btn"
              :class="{ 'view-tabs__btn--active': currentView === 'list' }"
              @click="currentView = 'list'"
            >
              リスト
            </button>
          </div>
          <button class="btn btn--primary" @click="taskVM.createDefault()">＋ タスク追加</button>
        </header>

        <div class="content-body">
          <GanttChart v-if="currentView === 'gantt'" />
          <TaskListView v-else />
        </div>
      </template>

      <div v-else class="empty-hint">左のサイドバーからプロジェクトを作成してください。</div>
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 20px;
}
.content-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}
.content-header__title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.view-tabs {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.view-tabs__btn {
  border: none;
  background: var(--surface);
  color: var(--text-muted);
  padding: 6px 16px;
  cursor: pointer;
  font-weight: 600;
}
.view-tabs__btn--active {
  background: var(--accent);
  color: #fff;
}
.content-header .btn--primary {
  margin-left: auto;
}
.content-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.empty-hint {
  color: var(--text-muted);
  margin-top: 40px;
  text-align: center;
}
</style>
