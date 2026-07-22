/**
 * Electron main プロセスのエントリ。
 * ウィンドウ生成・ライフサイクル・IPC 登録・通知エンジン起動を担う。
 */
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { closeDatabase, getDatabase } from './data/database'
import { TaskRepository } from './data/repositories/taskRepository'
import { NotificationService } from './notifications/notificationService'

let mainWindow: BrowserWindow | null = null
let notificationService: NotificationService | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // セキュリティ既定: renderer から Node/Electron を直接触らせない。
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // dev では electron-vite が用意する URL を、production ではビルド済み HTML を読む。
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  // 通知エンジンを起動（1 分ごとにタスクを走査）。
  const db = getDatabase()
  notificationService = new NotificationService(db, new TaskRepository(db), () => mainWindow)
  notificationService.start()

  // テスト時（通知間隔を env で上書きしているとき）だけ、DB を検査用に露出する。
  if (process.env.GANT_NOTIFY_INTERVAL_MS) {
    ;(globalThis as unknown as { __gantDb?: unknown }).__gantDb = db
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  notificationService?.stop()
  closeDatabase()
})
