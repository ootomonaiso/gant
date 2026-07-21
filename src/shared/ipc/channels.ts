/**
 * 境界: IPC チャンネル名の「唯一の真実」。
 * main（ハンドラ登録）と preload（呼び出し）の双方がここを参照し、
 * 文字列リテラルの直書きによる不整合を防ぐ。
 */
export const IpcChannels = {
  projectList: 'projects:list',
  projectCreate: 'projects:create',
  projectUpdate: 'projects:update',
  projectRemove: 'projects:remove',

  taskListByProject: 'tasks:listByProject',
  taskCreate: 'tasks:create',
  taskUpdate: 'tasks:update',
  taskRemove: 'tasks:remove',

  dependencyListByProject: 'dependencies:listByProject',
  dependencyCreate: 'dependencies:create',
  dependencyRemove: 'dependencies:remove',

  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',

  backupExport: 'backup:export',
  backupImport: 'backup:import',

  /** main → renderer: 通知クリック時にタスク ID を渡す */
  notificationClicked: 'notification:clicked'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
