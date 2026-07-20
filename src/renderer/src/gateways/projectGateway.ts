/**
 * Gateway: ViewModel から見た Model への唯一の入口（projects）。
 * `window.api` の詳細を ViewModel から隠す。テスト時はこのモジュールをモックする。
 */
import type { ProjectApi } from '@shared/ipc/contract'

export const projectGateway: ProjectApi = window.api.projects
