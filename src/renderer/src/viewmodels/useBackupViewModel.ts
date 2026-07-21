/**
 * ViewModel: エクスポート/インポートの操作。
 * 成否をトーストで知らせ、インポート後はプロジェクト一覧を読み直す。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { backupGateway } from '@renderer/gateways/backupGateway'
import { useProjectListViewModel } from './useProjectListViewModel'
import { useToastViewModel } from './useToastViewModel'

export const useBackupViewModel = defineStore('backup', () => {
  const projectVM = useProjectListViewModel()
  const toast = useToastViewModel()
  const busy = ref(false)

  async function exportData(): Promise<void> {
    busy.value = true
    try {
      const result = await backupGateway.export()
      if (!result.canceled) toast.push('エクスポートしました')
    } catch (e) {
      toast.push(`エクスポートに失敗: ${String(e)}`, 'error')
    } finally {
      busy.value = false
    }
  }

  async function importData(): Promise<void> {
    busy.value = true
    try {
      const result = await backupGateway.import()
      if (result.canceled) return
      if (result.error) {
        toast.push(result.error, 'error')
        return
      }
      if (result.imported) {
        await projectVM.load()
        const { projects, tasks } = result.imported
        toast.push(`インポート完了: プロジェクト ${projects} / タスク ${tasks} 件`)
      }
    } catch (e) {
      toast.push(`インポートに失敗: ${String(e)}`, 'error')
    } finally {
      busy.value = false
    }
  }

  return { busy, exportData, importData }
})
