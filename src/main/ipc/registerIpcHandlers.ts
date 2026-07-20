/**
 * 境界: IPC チャンネルと Repository メソッドの割り当て。
 * ここにはビジネスロジックを書かない。「受け取って Repository に渡し、結果を返す」だけ。
 */
import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc/channels'
import type { NewProject, ProjectPatch } from '@shared/domain/project'
import type { NewTask, TaskPatch } from '@shared/domain/task'
import { getDatabase } from '../data/database'
import { ProjectRepository } from '../data/repositories/projectRepository'
import { TaskRepository } from '../data/repositories/taskRepository'

export function registerIpcHandlers(): void {
  const db = getDatabase()
  const projects = new ProjectRepository(db)
  const tasks = new TaskRepository(db)

  // --- projects ---
  ipcMain.handle(IpcChannels.projectList, () => projects.list())
  ipcMain.handle(IpcChannels.projectCreate, (_e, input: NewProject) => projects.create(input))
  ipcMain.handle(IpcChannels.projectUpdate, (_e, id: number, patch: ProjectPatch) =>
    projects.update(id, patch)
  )
  ipcMain.handle(IpcChannels.projectRemove, (_e, id: number) => projects.remove(id))

  // --- tasks ---
  ipcMain.handle(IpcChannels.taskListByProject, (_e, projectId: number) =>
    tasks.listByProject(projectId)
  )
  ipcMain.handle(IpcChannels.taskCreate, (_e, input: NewTask) => tasks.create(input))
  ipcMain.handle(IpcChannels.taskUpdate, (_e, id: number, patch: TaskPatch) =>
    tasks.update(id, patch)
  )
  ipcMain.handle(IpcChannels.taskRemove, (_e, id: number) => tasks.remove(id))
}
