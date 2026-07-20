/**
 * 境界: renderer から見た Model への API 契約。
 * preload はこの `AppApi` を実装して `window.api` として公開し、
 * renderer（Gateway）は同じ型を通じてアクセスする。
 * これにより「片方だけ変更して壊れる」事故を型検査で防ぐ。
 */
import type { Project, NewProject, ProjectPatch } from '../domain/project'
import type { Task, NewTask, TaskPatch } from '../domain/task'

export interface ProjectApi {
  list(): Promise<Project[]>
  create(input: NewProject): Promise<Project>
  update(id: number, patch: ProjectPatch): Promise<Project>
  remove(id: number): Promise<void>
}

export interface TaskApi {
  listByProject(projectId: number): Promise<Task[]>
  create(input: NewTask): Promise<Task>
  update(id: number, patch: TaskPatch): Promise<Task>
  remove(id: number): Promise<void>
}

export interface AppApi {
  projects: ProjectApi
  tasks: TaskApi
}
