<script setup lang="ts">
/**
 * View（部品）: アプリ設定ダイアログ（通知 ON/OFF・リードタイム）。
 * open は親から v-model で制御する。値の保存は ViewModel のコマンドに委ねる。
 */
import { useSettingsViewModel } from '@renderer/viewmodels/useSettingsViewModel'

const open = defineModel<boolean>('open', { required: true })
const settingsVM = useSettingsViewModel()

function toggleEnabled(e: Event): void {
  settingsVM.update({ notificationsEnabled: (e.target as HTMLInputElement).checked })
}
function changeLead(e: Event): void {
  const minutes = Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
  settingsVM.update({ deadlineLeadMinutes: minutes })
}
</script>

<template>
  <div v-if="open" class="overlay" @click.self="open = false">
    <div class="dialog" role="dialog" aria-modal="true">
      <h2 class="dialog__title">設定</h2>

      <div class="form">
        <label class="switch">
          <input
            type="checkbox"
            :checked="settingsVM.settings.notificationsEnabled"
            @change="toggleEnabled"
          />
          <span>デスクトップ通知を有効にする</span>
        </label>

        <label class="field">
          <span class="field__label">期限通知のリードタイム（分）</span>
          <input
            class="input"
            type="number"
            min="0"
            :value="settingsVM.settings.deadlineLeadMinutes"
            :disabled="!settingsVM.settings.notificationsEnabled"
            @change="changeLead"
          />
          <span class="hint">終了時刻のこの分数だけ前に「期限が近い」通知を出します。</span>
        </label>
      </div>

      <div class="dialog__actions">
        <button type="button" class="btn btn--primary" @click="open = false">閉じる</button>
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
  z-index: 100;
}
.dialog {
  width: min(440px, 92vw);
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.dialog__title {
  margin: 0 0 16px;
  font-size: 18px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field__label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
