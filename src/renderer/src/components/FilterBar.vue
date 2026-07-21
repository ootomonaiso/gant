<script setup lang="ts">
/** View（部品）: 絞り込みバー（全ビュー共通）。状態は ViewModel が持つ。 */
import { useTaskFilterViewModel } from '@renderer/viewmodels/useTaskFilterViewModel'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus
} from '@shared/domain/task'

const filterVM = useTaskFilterViewModel()

const statusLabel: Record<TaskStatus, string> = { todo: '未着手', doing: '進行中', done: '完了' }
const priorityLabel: Record<TaskPriority, string> = { high: '高', mid: '中', low: '低' }
</script>

<template>
  <div class="filter-bar">
    <input
      v-model="filterVM.query"
      class="input filter-bar__search"
      type="search"
      placeholder="タイトル・メモを検索"
    />

    <div class="chips">
      <button
        v-for="s in TASK_STATUSES"
        :key="s"
        class="chip"
        :class="{ 'chip--on': filterVM.statuses.includes(s) }"
        @click="filterVM.toggleStatus(s)"
      >
        {{ statusLabel[s] }}
      </button>
    </div>

    <div class="chips">
      <button
        v-for="p in TASK_PRIORITIES"
        :key="p"
        class="chip"
        :class="{ 'chip--on': filterVM.priorities.includes(p) }"
        @click="filterVM.togglePriority(p)"
      >
        優先度{{ priorityLabel[p] }}
      </button>
    </div>

    <button v-if="filterVM.active" class="btn btn--ghost" @click="filterVM.clear()">
      クリア
    </button>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.filter-bar__search {
  min-width: 220px;
}
.chips {
  display: inline-flex;
  gap: 6px;
}
.chip {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
}
.chip--on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
