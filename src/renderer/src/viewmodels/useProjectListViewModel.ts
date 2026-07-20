/**
 * ViewModel: プロジェクト一覧と選択状態。
 * View 非依存（DOM を知らない）。状態 + 派生値 + コマンドのみを公開する。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Project } from '@shared/domain/project'
import { projectGateway } from '@renderer/gateways/projectGateway'

export const useProjectListViewModel = defineStore('projectList', () => {
  // --- 状態 ---
  const projects = ref<Project[]>([])
  const selectedId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- 派生値 ---
  const selectedProject = computed(
    () => projects.value.find((p) => p.id === selectedId.value) ?? null
  )
  const isEmpty = computed(() => !loading.value && projects.value.length === 0)

  // --- コマンド ---
  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      projects.value = await projectGateway.list()
      if (selectedId.value === null && projects.value.length > 0) {
        selectedId.value = projects.value[0].id
      }
    } catch (e) {
      error.value = String(e)
    } finally {
      loading.value = false
    }
  }

  async function create(name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await projectGateway.create({
      name: trimmed,
      sortOrder: projects.value.length
    })
    projects.value.push(created)
    selectedId.value = created.id
  }

  async function rename(id: string, name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = await projectGateway.update(id, { name: trimmed })
    replace(updated)
  }

  async function remove(id: string): Promise<void> {
    await projectGateway.remove(id)
    projects.value = projects.value.filter((p) => p.id !== id)
    if (selectedId.value === id) {
      selectedId.value = projects.value[0]?.id ?? null
    }
  }

  function select(id: string): void {
    selectedId.value = id
  }

  function replace(project: Project): void {
    const index = projects.value.findIndex((p) => p.id === project.id)
    if (index >= 0) projects.value[index] = project
  }

  return {
    projects,
    selectedId,
    loading,
    error,
    selectedProject,
    isEmpty,
    load,
    create,
    rename,
    remove,
    select
  }
})
