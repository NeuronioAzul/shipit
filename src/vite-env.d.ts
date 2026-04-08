/// <reference types="vite/client" />

export interface ElectronAPI {
  // Profile
  getUserProfile: () => Promise<UserProfileData | null>
  saveUserProfile: (data: Partial<UserProfileData>) => Promise<UserProfileData>
  getVersion: () => Promise<string>

  // Activities
  getActivities: (monthReference: string) => Promise<ActivityData[]>
  getActivity: (id: string) => Promise<ActivityData | null>
  saveActivity: (data: Partial<ActivityData>) => Promise<ActivityData>
  deleteActivity: (id: string) => Promise<boolean>
  reorderActivities: (items: { id: string; order: number }[]) => Promise<void>

  // Evidences
  saveEvidence: (activityId: string, sourcePath: string, caption: string | null) => Promise<EvidenceData>
  saveEvidenceFromBuffer: (activityId: string, buffer: ArrayBuffer, extension: string, caption: string | null) => Promise<EvidenceData>
  updateEvidenceCaption: (id: string, caption: string) => Promise<EvidenceData | null>
  deleteEvidence: (id: string) => Promise<boolean>
  getEvidenceFilePath: (id: string) => Promise<string | null>

  // Reports
  generateReport: (monthReference: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  openFileInFolder: (filePath: string) => Promise<void>
  getReports: (monthReference: string) => Promise<ReportData[]>

  // Dialogs
  selectImages: () => Promise<string[]>

  // Tray
  setTrayStatus: (status: 'default' | 'green' | 'yellow' | 'red') => Promise<void>

  // App Settings
  getSettings: () => Promise<AppSettings>
  saveSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  selectDirectory: () => Promise<string | null>
  getDefaultReportsDir: () => Promise<string>

  // Sounds
  listSounds: () => Promise<string[]>
  getSoundPath: (filename: string) => Promise<string | null>
  playSound: (filename: string) => Promise<boolean>
  onPlaySoundData: (callback: (dataUrl: string) => void) => () => void

  // Auto-launch
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<boolean>

  // Navigation (main → renderer)
  onNavigate: (callback: (path: string) => void) => () => void
}

export interface AppSettings {
  reportsDirectory?: string
  alertSound?: string
}

export interface UserProfileData {
  id?: number
  full_name: string
  role: string
  seniority_level: string
  contract_identifier: string
  profile_type: string
  correlating_activities: string
  attendance_type: string
  project_scope: string
  last_updated?: string
}

export type ActivityStatus = 'Em andamento' | 'Concluído' | 'Cancelado' | 'Pendente'
export type AttendanceType = 'Presencial' | 'Remoto' | 'Híbrido'

export interface ActivityData {
  id: string
  order: number
  description: string
  date_start: string | null
  date_end: string | null
  link_ref: string | null
  status: ActivityStatus
  month_reference: string
  attendance_type: AttendanceType | null
  project_scope: string | null
  last_updated: string
  evidences?: EvidenceData[]
}

export interface EvidenceData {
  id: string
  activity_id: string
  file_path: string
  caption: string | null
  sort_index: number
  date_added: string
}

export interface ReportData {
  id: string
  month_reference: string
  file_path: string
  report_name: string
  date_generated: string
  status: 'Gerado' | 'Falha' | 'Excluído'
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
