/**
 * 共通: window の keydown を購読/解除する薄いユーティリティ。
 * ダイアログの Esc クローズなどで使う。
 */
import { onMounted, onUnmounted } from 'vue'

export function useWindowKeydown(handler: (e: KeyboardEvent) => void): void {
  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
