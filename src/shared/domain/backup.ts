/**
 * Model: エクスポート/インポートで受け渡すバックアップの束（JSON）。
 * version でフォーマットの互換性を管理する。
 */
import type { Project } from './project'
import type { Task } from './task'
import type { Dependency } from './dependency'

export interface BackupBundle {
  version: 1
  exportedAt: string
  projects: Project[]
  tasks: Task[]
  dependencies: Dependency[]
}

export interface ImportResult {
  projects: number
  tasks: number
  dependencies: number
}
