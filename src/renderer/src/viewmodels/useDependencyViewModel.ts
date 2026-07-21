/**
 * ViewModel: 選択中プロジェクトの依存関係。
 * View 非依存。ガントの矢印描画と、編集ダイアログの先行タスク設定が参照する。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Dependency } from '@shared/domain/dependency'
import { dependencyGateway } from '@renderer/gateways/dependencyGateway'

export const useDependencyViewModel = defineStore('dependency', () => {
  const dependencies = ref<Dependency[]>([])

  async function load(projectId: string): Promise<void> {
    dependencies.value = await dependencyGateway.listByProject(projectId)
  }

  function between(predecessorId: string, successorId: string): Dependency | undefined {
    return dependencies.value.find(
      (d) => d.predecessorId === predecessorId && d.successorId === successorId
    )
  }

  /** 先行タスクを追加（自己参照・重複は無視）。 */
  async function add(predecessorId: string, successorId: string): Promise<void> {
    if (predecessorId === successorId) return
    if (between(predecessorId, successorId)) return
    const created = await dependencyGateway.create({ predecessorId, successorId })
    dependencies.value.push(created)
  }

  async function remove(id: string): Promise<void> {
    await dependencyGateway.remove(id)
    dependencies.value = dependencies.value.filter((d) => d.id !== id)
  }

  return { dependencies, load, between, add, remove }
})
