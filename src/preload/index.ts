/**
 * 境界: preload。contextBridge で型付き API (`AppApi`) を renderer に公開する。
 * ここは「チャンネルへ invoke する / イベントを購読する」だけの薄い層に保つ（ロジックを書かない）。
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannels } from '@shared/ipc/channels'
import type { AppApi } from '@shared/ipc/contract'

const api: AppApi = {
  projects: {
    list: () => ipcRenderer.invoke(IpcChannels.projectList),
    create: (input) => ipcRenderer.invoke(IpcChannels.projectCreate, input),
    update: (id, patch) => ipcRenderer.invoke(IpcChannels.projectUpdate, id, patch),
    remove: (id) => ipcRenderer.invoke(IpcChannels.projectRemove, id)
  },
  tasks: {
    listByProject: (projectId) => ipcRenderer.invoke(IpcChannels.taskListByProject, projectId),
    create: (input) => ipcRenderer.invoke(IpcChannels.taskCreate, input),
    update: (id, patch) => ipcRenderer.invoke(IpcChannels.taskUpdate, id, patch),
    remove: (id) => ipcRenderer.invoke(IpcChannels.taskRemove, id)
  },
  dependencies: {
    listByProject: (projectId) =>
      ipcRenderer.invoke(IpcChannels.dependencyListByProject, projectId),
    create: (input) => ipcRenderer.invoke(IpcChannels.dependencyCreate, input),
    remove: (id) => ipcRenderer.invoke(IpcChannels.dependencyRemove, id)
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcChannels.settingsGet),
    update: (patch) => ipcRenderer.invoke(IpcChannels.settingsUpdate, patch)
  },
  onNotificationClicked: (callback) => {
    const listener = (_e: IpcRendererEvent, taskId: string): void => callback(taskId)
    ipcRenderer.on(IpcChannels.notificationClicked, listener)
    return () => ipcRenderer.removeListener(IpcChannels.notificationClicked, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
