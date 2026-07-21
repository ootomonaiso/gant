/**
 * 境界: IPC チャンネルと Repository / 設定ストアの割り当て。
 * ここにはビジネスロジックを書かない。「受け取って渡し、結果を返す」だけ。
 */
import { dialog, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { IpcChannels } from '@shared/ipc/channels'
import type { NewProject, ProjectPatch } from '@shared/domain/project'
import type { NewTask, TaskPatch } from '@shared/domain/task'
import type { NewDependency } from '@shared/domain/dependency'
import type { AppSettings } from '@shared/domain/settings'
import type { BackupBundle } from '@shared/domain/backup'
import { getDatabase } from '../data/database'
import { ProjectRepository } from '../data/repositories/projectRepository'
import { TaskRepository } from '../data/repositories/taskRepository'
import { DependencyRepository } from '../data/repositories/dependencyRepository'
import { BackupService } from '../backup/backupService'
import { getSettings, updateSettings } from '../settings/settingsStore'

function isValidBundle(value: unknown): value is BackupBundle {
  const b = value as Partial<BackupBundle> | null
  return (
    !!b &&
    b.version === 1 &&
    Array.isArray(b.projects) &&
    Array.isArray(b.tasks) &&
    Array.isArray(b.dependencies)
  )
}

export function registerIpcHandlers(): void {
  const db = getDatabase()
  const projects = new ProjectRepository(db)
  const tasks = new TaskRepository(db)
  const dependencies = new DependencyRepository(db)
  const backup = new BackupService(db, projects, tasks, dependencies)

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

  // --- backup (エクスポート / インポート) ---
  ipcMain.handle(IpcChannels.backupExport, async () => {
    const stamp = new Date().toISOString().slice(0, 10)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'バックアップをエクスポート',
      defaultPath: `gant-backup-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { canceled: true }
    writeFileSync(filePath, JSON.stringify(backup.export(), null, 2), 'utf-8')
    return { canceled: false, path: filePath }
  })

  ipcMain.handle(IpcChannels.backupImport, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'バックアップをインポート',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) return { canceled: true }
    try {
      const parsed = JSON.parse(readFileSync(filePaths[0], 'utf-8'))
      if (!isValidBundle(parsed)) return { canceled: false, error: '不正なバックアップ形式です' }
      return { canceled: false, imported: backup.import(parsed) }
    } catch (e) {
      return { canceled: false, error: String(e) }
    }
  })
}
