/**
 * Gateway: ViewModel から見たエクスポート/インポートの入口。
 */
import type { BackupApi } from '@shared/ipc/contract'

export const backupGateway: BackupApi = window.api.backup
