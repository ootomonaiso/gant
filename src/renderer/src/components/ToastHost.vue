<script setup lang="ts">
/** View（部品）: トーストの表示だけ。状態は ViewModel が持つ。 */
import { useToastViewModel } from '@renderer/viewmodels/useToastViewModel'

const toastVM = useToastViewModel()
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastVM.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        @click="toastVM.remove(toast.id)"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  min-width: 200px;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.toast--success {
  background: #1a7f47;
}
.toast--info {
  background: #3a6ea5;
}
.toast--error {
  background: #c0392b;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
