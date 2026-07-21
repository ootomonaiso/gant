<script setup lang="ts">
/** View（部品）: 確認ダイアログの表示だけ。決定は ViewModel の decide に委ねる。 */
import { useConfirmViewModel } from '@renderer/viewmodels/useConfirmViewModel'
import { useWindowKeydown } from '@renderer/composables/useWindowKeydown'

const confirmVM = useConfirmViewModel()

useWindowKeydown((e) => {
  if (!confirmVM.visible) return
  if (e.key === 'Escape') confirmVM.decide(false)
  else if (e.key === 'Enter') confirmVM.decide(true)
})
</script>

<template>
  <div v-if="confirmVM.visible" class="overlay" @click.self="confirmVM.decide(false)">
    <div class="dialog" role="alertdialog" aria-modal="true">
      <p class="dialog__message">{{ confirmVM.message }}</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" @click="confirmVM.decide(false)">
          キャンセル
        </button>
        <button
          type="button"
          class="btn"
          :class="confirmVM.danger ? 'btn--danger' : 'btn--primary'"
          @click="confirmVM.decide(true)"
        >
          {{ confirmVM.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
}
.dialog {
  width: min(420px, 92vw);
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.dialog__message {
  margin: 0 0 20px;
  line-height: 1.6;
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
