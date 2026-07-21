/**
 * ViewModel: タスクの絞り込み条件（全ビュー共通）。
 * View 非依存。taskVM がこの条件を使って表示対象を絞る。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { TaskPriority, TaskStatus } from '@shared/domain/task'
import { isFilterActive, type FilterCriteria } from '@renderer/filter/taskFilter'

export const useTaskFilterViewModel = defineStore('taskFilter', () => {
  const query = ref('')
  const statuses = ref<TaskStatus[]>([])
  const priorities = ref<TaskPriority[]>([])

  const criteria = computed<FilterCriteria>(() => ({
    query: query.value,
    statuses: statuses.value,
    priorities: priorities.value
  }))
  const active = computed(() => isFilterActive(criteria.value))

  function toggleStatus(s: TaskStatus): void {
    statuses.value = statuses.value.includes(s)
      ? statuses.value.filter((x) => x !== s)
      : [...statuses.value, s]
  }
  function togglePriority(p: TaskPriority): void {
    priorities.value = priorities.value.includes(p)
      ? priorities.value.filter((x) => x !== p)
      : [...priorities.value, p]
  }
  function clear(): void {
    query.value = ''
    statuses.value = []
    priorities.value = []
  }

  return { query, statuses, priorities, criteria, active, toggleStatus, togglePriority, clear }
})
