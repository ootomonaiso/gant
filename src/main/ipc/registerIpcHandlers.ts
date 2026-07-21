/**
 * 境界: IPC チャンネルと Repository / 設定ストアの割り当て。
 * ここにはビジネスロジックを書かない。「受け取って渡し、結果を返す」だけ。
 */
import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc/channels'
import type { NewProject, ProjectPatch } from '@shared/domain/project'
import type { NewTask, TaskPatch } from '@shared/domain/task'
import type { NewDependency } from '@shared/domain/dependency'
import type { AppSettings } from '@shared/domain/settings'
import { getDatabase } from '../data/database'
import { ProjectRepository } from '../data/repositories/projectRepository'
import { TaskRepository } from '../data/repositories/taskRepository'
import { DependencyRepository } from '../data/repositories/dependencyRepository'
import { getSettings, updateSettings } from '../settings/settingsStore'

export function registerIpcHandlers(): void {
  const db = getDatabase()
  const projects = new ProjectRepository(db)
  const tasks = new TaskRepository(db)
  const dependencies = new DependencyRepository(db)

  // --- projects ---
  ipcMain.handle(IpcChannels.projectList, () => projects.list())
  ipcMain.handle(IpcChannels.projectCreate, (_e, input: NewProject) => projects.create(input))
  ipcMain.handle(IpcChannels.projectUpdate, (_e, id: string, patch: ProjectPatch) =>
    projects.update(id, patch)
  )
  ipcMain.handle(IpcChannels.projectRemove, (_e, id: string) => projects.remove(id))

  // --- tasks ---
  ipcMain.handle(IpcChannels.taskListByProject, (_e, projectId: string) =>
    tasks.listByProject(projectId)
  )
  ipcMain.handle(IpcChannels.taskCreate, (_e, input: NewTask) => tasks.create(input))
  ipcMain.handle(IpcChannels.taskUpdate, (_e, id: string, patch: TaskPatch) =>
    tasks.update(id, patch)
  )
  ipcMain.handle(IpcChannels.taskRemove, (_e, id: string) => tasks.remove(id))

  // --- dependencies ---
  ipcMain.handle(IpcChannels.dependencyListByProject, (_e, projectId: string) =>
    dependencies.listByProject(projectId)
  )
  ipcMain.handle(IpcChannels.dependencyCreate, (_e, input: NewDependency) =>
    dependencies.create(input)
  )
  ipcMain.handle(IpcChannels.dependencyRemove, (_e, id: string) => dependencies.remove(id))

  // --- settings ---
  ipcMain.handle(IpcChannels.settingsGet, () => getSettings())
  ipcMain.handle(IpcChannels.settingsUpdate, (_e, patch: Partial<AppSettings>) =>
    updateSettings(patch)
  )
}
