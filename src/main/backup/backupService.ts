/**
 * エクスポート/インポートのドメインロジック（main プロセス）。
 * ファイル入出力そのものは IPC ハンドラ側（dialog + fs）が行い、
 * ここは「束の組み立て」と「束の取り込み」に徹する。
 *
 * インポートは常に新しい UUID を採番して追加する（既存データや再インポートと衝突しない）。
 * 参照（parentId / project / 依存）は新旧 ID の対応表で貼り替える。
 */
import type { Database } from 'better-sqlite3'
import type { BackupBundle, ImportResult } from '@shared/domain/backup'
import type { ProjectRepository } from '../data/repositories/projectRepository'
import type { TaskRepository } from '../data/repositories/taskRepository'
import type { DependencyRepository } from '../data/repositories/dependencyRepository'

export class BackupService {
  constructor(
    private readonly db: Database,
    private readonly projects: ProjectRepository,
    private readonly tasks: TaskRepository,
    private readonly dependencies: DependencyRepository
  ) {}

  export(): BackupBundle {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: this.projects.list(),
      tasks: this.tasks.listAllActive(),
      dependencies: this.dependencies.listAll()
    }
  }

  import(bundle: BackupBundle): ImportResult {
    const run = this.db.transaction((): ImportResult => {
      const projectIdMap = new Map<string, string>()
      for (const p of bundle.projects) {
        const created = this.projects.create({ name: p.name, color: p.color, sortOrder: p.sortOrder })
        projectIdMap.set(p.id, created.id)
      }

      // 1) 親なしで全タスクを作成し、旧→新 ID を記録。
      const taskIdMap = new Map<string, string>()
      for (const t of bundle.tasks) {
        const projectId = projectIdMap.get(t.projectId)
        if (!projectId) continue
        const created = this.tasks.create({
          projectId,
          parentId: null,
          title: t.title,
          note: t.note,
          startAt: t.startAt,
          endAt: t.endAt,
          progress: t.progress,
          status: t.status,
          priority: t.priority,
          sortOrder: t.sortOrder,
          reminderAt: t.reminderAt
        })
        taskIdMap.set(t.id, created.id)
      }

      // 2) 親子関係を貼り直す。
      for (const t of bundle.tasks) {
        if (!t.parentId) continue
        const id = taskIdMap.get(t.id)
        const parentId = taskIdMap.get(t.parentId)
        if (id && parentId) this.tasks.update(id, { parentId })
      }

      // 3) 依存を貼り直す。
      let dependencyCount = 0
      for (const d of bundle.dependencies) {
        const predecessorId = taskIdMap.get(d.predecessorId)
        const successorId = taskIdMap.get(d.successorId)
        if (predecessorId && successorId) {
          this.dependencies.create({ predecessorId, successorId, type: d.type })
          dependencyCount++
        }
      }

      return {
        projects: projectIdMap.size,
        tasks: taskIdMap.size,
        dependencies: dependencyCount
      }
    })

    return run()
  }
}
