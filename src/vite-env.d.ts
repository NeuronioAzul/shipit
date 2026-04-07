/// <reference types="vite/client" />

export interface ElectronAPI {
  getUserProfile: () => Promise<UserProfileData | null>
  saveUserProfile: (data: Partial<UserProfileData>) => Promise<UserProfileData>
  getVersion: () => Promise<string>
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
  squad_project_application: string
  mode: 'dark' | 'light'
  last_updated?: string
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
