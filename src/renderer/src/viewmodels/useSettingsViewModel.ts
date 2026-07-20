/**
 * ViewModel: アプリ設定（通知の ON/OFF・リードタイム）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/domain/settings'
import { settingsGateway } from '@renderer/gateways/settingsGateway'

export const useSettingsViewModel = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    try {
      settings.value = await settingsGateway.get()
    } finally {
      loading.value = false
    }
  }

  async function update(patch: Partial<AppSettings>): Promise<void> {
    settings.value = await settingsGateway.update(patch)
  }

  return { settings, loading, load, update }
})
