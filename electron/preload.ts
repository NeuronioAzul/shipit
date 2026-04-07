import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getUserProfile: () => ipcRenderer.invoke('db:getUserProfile'),
  saveUserProfile: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('db:saveUserProfile', data),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
})
