/**
 * 境界: renderer から見た Model への API 契約。
 * preload はこの `AppApi` を実装して `window.api` として公開し、
 * renderer（Gateway）は同じ型を通じてアクセスする。
 * これにより「片方だけ変更して壊れる」事故を型検査で防ぐ。
 */
import type { Project, NewProject, ProjectPatch } from '../domain/project'
import type { Task, NewTask, TaskPatch } from '../domain/task'
import type { Dependency, NewDependency } from '../domain/dependency'
import type { AppSettings } from '../domain/settings'

export interface ProjectApi {
  list(): Promise<Project[]>
  create(input: NewProject): Promise<Project>
  update(id: string, patch: ProjectPatch): Promise<Project>
  remove(id: string): Promise<void>
}

export interface TaskApi {
  listByProject(projectId: string): Promise<Task[]>
  create(input: NewTask): Promise<Task>
  update(id: string, patch: TaskPatch): Promise<Task>
  remove(id: string): Promise<void>
}

export interface DependencyApi {
  listByProject(projectId: string): Promise<Dependency[]>
  create(input: NewDependency): Promise<Dependency>
  remove(id: string): Promise<void>
}

export interface SettingsApi {
  get(): Promise<AppSettings>
  update(patch: Partial<AppSettings>): Promise<AppSettings>
}

export interface AppApi {
  projects: ProjectApi
  tasks: TaskApi
  dependencies: DependencyApi
  settings: SettingsApi
  /**
   * 通知クリックの購読。コールバックにタスク ID が渡る。
   * 戻り値を呼ぶと購読解除。
   */
  onNotificationClicked(callback: (taskId: string) => void): () => void
}
