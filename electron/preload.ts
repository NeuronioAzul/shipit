import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Profile
  getUserProfile: () => ipcRenderer.invoke('db:getUserProfile'),
  saveUserProfile: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('db:saveUserProfile', data),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Activities
  getActivities: (monthReference: string) =>
    ipcRenderer.invoke('db:getActivities', monthReference),
  getActivity: (id: string) => ipcRenderer.invoke('db:getActivity', id),
  saveActivity: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('db:saveActivity', data),
  deleteActivity: (id: string) => ipcRenderer.invoke('db:deleteActivity', id),
  reorderActivities: (items: { id: string; order: number }[]) =>
    ipcRenderer.invoke('db:reorderActivities', items),

  // Evidences
  saveEvidence: (activityId: string, sourcePath: string, caption: string | null) =>
    ipcRenderer.invoke('db:saveEvidence', activityId, sourcePath, caption),
  saveEvidenceFromBuffer: (
    activityId: string,
    buffer: ArrayBuffer,
    extension: string,
    caption: string | null
  ) => ipcRenderer.invoke('db:saveEvidenceFromBuffer', activityId, buffer, extension, caption),
  updateEvidenceCaption: (id: string, caption: string) =>
    ipcRenderer.invoke('db:updateEvidenceCaption', id, caption),
  deleteEvidence: (id: string) => ipcRenderer.invoke('db:deleteEvidence', id),
  getDeletedEvidences: () => ipcRenderer.invoke('db:getDeletedEvidences'),
  restoreEvidence: (id: string) => ipcRenderer.invoke('db:restoreEvidence', id),
  permanentlyDeleteEvidence: (id: string) => ipcRenderer.invoke('db:permanentlyDeleteEvidence', id),
  getEvidenceFilePath: (id: string) =>
    ipcRenderer.invoke('db:getEvidenceFilePath', id),
  reorderEvidences: (items: { id: string; sort_index: number }[]) =>
    ipcRenderer.invoke('db:reorderEvidences', items),

  // Dialogs
  selectImages: () => ipcRenderer.invoke('app:selectImages'),

  // Reports
  generateReport: (monthReference: string) =>
    ipcRenderer.invoke('app:generateReport', monthReference),
  openFileInFolder: (filePath: string) =>
    ipcRenderer.invoke('app:openFileInFolder', filePath),
  getReports: (monthReference: string) =>
    ipcRenderer.invoke('db:getReports', monthReference),

  // Tray
  setTrayStatus: (status: 'default' | 'green' | 'yellow' | 'red') =>
    ipcRenderer.invoke('app:setTrayStatus', status),

  // App Settings
  getSettings: () => ipcRenderer.invoke('app:getSettings'),
  saveSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke('app:saveSettings', partial),
  selectDirectory: () => ipcRenderer.invoke('app:selectDirectory'),
  getDefaultReportsDir: () => ipcRenderer.invoke('app:getDefaultReportsDir'),

  // Sounds
  listSounds: () => ipcRenderer.invoke('app:listSounds'),
  getSoundPath: (filename: string) => ipcRenderer.invoke('app:getSoundPath', filename),
  playSound: (filename: string) => ipcRenderer.invoke('app:playSound', filename),
  onPlaySoundData: (callback: (dataUrl: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, dataUrl: string) => callback(dataUrl)
    ipcRenderer.on('app:playSoundData', handler)
    return () => { ipcRenderer.removeListener('app:playSoundData', handler) }
  },

  // Auto-launch
  getAutoLaunch: () => ipcRenderer.invoke('app:getAutoLaunch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('app:setAutoLaunch', enabled),

  // Alerts
  getAlert: () => ipcRenderer.invoke('db:getAlert'),
  saveAlert: (data: Record<string, unknown>) => ipcRenderer.invoke('db:saveAlert', data),

  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke('app:checkForUpdate'),
  installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
  onUpdateStatus: (callback: (data: { status: string; version?: string; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; version?: string; error?: string }) => callback(data)
    ipcRenderer.on('app:updateStatus', handler)
    return () => { ipcRenderer.removeListener('app:updateStatus', handler) }
  },

  // Navigation (main → renderer)
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('app:navigate', handler)
    return () => { ipcRenderer.removeListener('app:navigate', handler) }
  },

  // Window Controls
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on('window:maximized-change', handler)
    return () => { ipcRenderer.removeListener('window:maximized-change', handler) }
  },
})
