/**
 * ViewModel: 破壊的操作の確認ダイアログ。
 * ask() が Promise<boolean> を返すので、呼び出し側は await で分岐できる。
 *   if (await confirm.ask('削除しますか？')) { ... }
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface AskOptions {
  confirmLabel?: string
  danger?: boolean
}

export const useConfirmViewModel = defineStore('confirm', () => {
  const visible = ref(false)
  const message = ref('')
  const confirmLabel = ref('削除')
  const danger = ref(true)
  let resolver: ((value: boolean) => void) | null = null

  function ask(msg: string, options: AskOptions = {}): Promise<boolean> {
    message.value = msg
    confirmLabel.value = options.confirmLabel ?? '削除'
    danger.value = options.danger ?? true
    visible.value = true
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function decide(value: boolean): void {
    visible.value = false
    resolver?.(value)
    resolver = null
  }

  return { visible, message, confirmLabel, danger, ask, decide }
})
