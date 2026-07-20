/**
 * 通知エンジン（main プロセス）。
 * 1 分ごとに生存タスクを走査し、該当する通知を OS のデスクトップ通知として発火する。
 *
 * 発火条件（設定でリードタイム変更可）:
 *  - start    : 開始時刻に到達（未完了）
 *  - deadline : 終了時刻の「リードタイム分前」に到達（未完了）
 *  - overdue  : 終了時刻を超過（未完了）
 *  - reminder : タスク個別のリマインダー時刻に到達
 *
 * 重複防止: notification_log(task_id, key) に記録。key は「種別:対象時刻(ms)」なので、
 * タスクの時刻を動かすと key が変わり再通知される。
 * 起動時の古いイベント連発を防ぐため、overdue 以外は STALE_GRACE 以内のものだけ発火する。
 */
import { Notification, type BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'
import { IpcChannels } from '@shared/ipc/channels'
import type { TaskRepository } from '../data/repositories/taskRepository'
import { getSettings } from '../settings/settingsStore'

const CHECK_INTERVAL_MS = 60_000
const STALE_GRACE_MS = 6 * 60 * 60 * 1000

type NotifyKind = 'start' | 'deadline' | 'overdue' | 'reminder'

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
      const events: { kind: NotifyKind; at: number }[] = []

      if (task.status !== 'done') {
        events.push({ kind: 'start', at: Date.parse(task.startAt) })
        events.push({ kind: 'deadline', at: Date.parse(task.endAt) - leadMs })
        events.push({ kind: 'overdue', at: Date.parse(task.endAt) })
      }
      if (task.reminderAt) {
        events.push({ kind: 'reminder', at: Date.parse(task.reminderAt) })
      }

      for (const ev of events) {
        if (Number.isNaN(ev.at) || ev.at > now) continue
        if (ev.kind !== 'overdue' && now - ev.at > STALE_GRACE_MS) continue

        const key = `${ev.kind}:${ev.at}`
        if (this.hasFired(task.id, key)) continue

        this.fire(task.id, this.message(ev.kind, task.title))
        this.markFired(task.id, key)
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

  private message(kind: NotifyKind, title: string): { title: string; body: string } {
    switch (kind) {
      case 'start':
        return { title: 'タスク開始', body: `「${title}」の開始時刻です` }
      case 'deadline':
        return { title: '期限が近づいています', body: `「${title}」` }
      case 'overdue':
        return { title: '期限超過', body: `「${title}」が期限を過ぎています` }
      case 'reminder':
        return { title: 'リマインダー', body: `「${title}」` }
    }
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
