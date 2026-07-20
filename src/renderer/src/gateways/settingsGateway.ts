/**
 * Gateway: ViewModel から見た設定への入口。
 */
import type { SettingsApi } from '@shared/ipc/contract'

export const settingsGateway: SettingsApi = window.api.settings
