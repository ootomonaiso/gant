/**
 * 境界: preload。contextBridge で型付き API (`AppApi`) を renderer に公開する。
 * ここは「チャンネルへ invoke するだけ」の薄い層に保つ（ロジックを書かない）。
 */
import { contextBridge, ipcRenderer } from 'electron'
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
  }
}

contextBridge.exposeInMainWorld('api', api)
