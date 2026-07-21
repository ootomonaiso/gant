/**
 * ViewModel: 画面右下に出す一時的なトースト（操作フィードバック）。
 * View 非依存。push すると一定時間後に自動で消える。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'info' | 'error'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const DEFAULT_DURATION_MS = 2600

export const useToastViewModel = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let seq = 0

  function push(message: string, type: ToastType = 'success', durationMs = DEFAULT_DURATION_MS): void {
    const id = ++seq
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), durationMs)
  }

  function remove(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, push, remove }
})
