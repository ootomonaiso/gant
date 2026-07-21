/**
 * Gateway: ViewModel から見た Model への入口（dependencies）。
 */
import type { DependencyApi } from '@shared/ipc/contract'

export const dependencyGateway: DependencyApi = window.api.dependencies
