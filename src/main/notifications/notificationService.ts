/**
 * 通知エンジン（main プロセス）。
 * 1 分ごとに生存タスクを走査し、発火すべき通知（notificationRules.dueEvents）を
 * OS のデスクトップ通知として出す。判定ロジックは持たず、重複チェックと実発火に徹する。
 *
 * 重複防止: notification_log(task_id, key) に記録。key は「種別:対象時刻(ms)」なので、
 * タスクの時刻を動かすと key が変わり再通知される。
 */
import { Notification, type BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'
import { IpcChannels } from '@shared/ipc/channels'
import type { TaskRepository } from '../data/repositories/taskRepository'
import { getSettings } from '../settings/settingsStore'
import { dueEvents, messageFor } from './notificationRules'

// 既定 60 秒。テストなどで短縮したいときは環境変数で上書きできる。
const CHECK_INTERVAL_MS = Number(process.env.GANT_NOTIFY_INTERVAL_MS) || 60_000

export class NotificationService {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly db: Database,
    private readonly tasks: TaskRepository,
    private readonly getWindow: () => BrowserWindow | null
  ) {}

  start(): void {
    this.check()
    this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private check(): void {
    const settings = getSettings()
    if (!settings.notificationsEnabled) return
    if (!Notification.isSupported()) return

    const now = Date.now()
    const leadMs = settings.deadlineLeadMinutes * 60_000

    for (const task of this.tasks.listAllActive()) {
      for (const ev of dueEvents(task, now, leadMs)) {
        if (this.hasFired(task.id, ev.key)) continue
        this.fire(task.id, messageFor(ev.kind, task.title))
        this.markFired(task.id, ev.key)
      }
    }
  }

  private hasFired(taskId: string, key: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM notification_log WHERE task_id = ? AND key = ?')
      .get(taskId, key)
    return Boolean(row)
  }

  private markFired(taskId: string, key: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO notification_log (task_id, key, fired_at) VALUES (?, ?, ?)')
      .run(taskId, key, new Date().toISOString())
  }

  private fire(taskId: string, msg: { title: string; body: string }): void {
    const notification = new Notification({ title: msg.title, body: msg.body })
    notification.on('click', () => {
      const window = this.getWindow()
      if (!window) return
      if (window.isMinimized()) window.restore()
      window.focus()
      window.webContents.send(IpcChannels.notificationClicked, taskId)
    })
    notification.show()
  }
}
