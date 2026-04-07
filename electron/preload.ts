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
  getEvidenceFilePath: (id: string) =>
    ipcRenderer.invoke('db:getEvidenceFilePath', id),

  // Dialogs
  selectImages: () => ipcRenderer.invoke('app:selectImages'),
})
