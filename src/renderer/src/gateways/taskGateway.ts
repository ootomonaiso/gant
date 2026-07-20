/**
 * Gateway: ViewModel から見た Model への唯一の入口（tasks）。
 */
import type { TaskApi } from '@shared/ipc/contract'

export const taskGateway: TaskApi = window.api.tasks
