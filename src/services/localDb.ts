import type { ActivityData, EvidenceData } from '../vite-env'

const ACTIVITIES_KEY = 'shipit-activities'

function getStoredActivities(): ActivityData[] {
  const raw = localStorage.getItem(ACTIVITIES_KEY)
  return raw ? JSON.parse(raw) : []
}

function setStoredActivities(activities: ActivityData[]) {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities))
}

function generateId(): string {
  return crypto.randomUUID()
}

export const localDb = {
  getActivities(monthReference: string): ActivityData[] {
    return getStoredActivities()
      .filter((a) => a.month_reference === monthReference)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },

  getActivity(id: string): ActivityData | null {
    return getStoredActivities().find((a) => a.id === id) ?? null
  },

  saveActivity(data: Partial<ActivityData>): ActivityData {
    const all = getStoredActivities()

    if (data.id) {
      const idx = all.findIndex((a) => a.id === data.id)
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...data, last_updated: new Date().toISOString() }
        setStoredActivities(all)
        return all[idx]
      }
    }

    const activity: ActivityData = {
      id: generateId(),
      order: all.filter((a) => a.month_reference === data.month_reference).length + 1,
      description: '',
      date_start: null,
      date_end: null,
      link_ref: null,
      status: 'Pendente',
      month_reference: data.month_reference || getCurrentMonthRef(),
      attendance_type: null,
      project_scope: null,
      last_updated: new Date().toISOString(),
      evidences: [],
      ...data,
    }
    all.push(activity)
    setStoredActivities(all)
    return activity
  },

  deleteActivity(id: string): boolean {
    const all = getStoredActivities()
    const filtered = all.filter((a) => a.id !== id)
    if (filtered.length === all.length) return false
    setStoredActivities(filtered)
    return true
  },

  reorderActivities(items: { id: string; order: number }[]) {
    const all = getStoredActivities()
    for (const item of items) {
      const a = all.find((x) => x.id === item.id)
      if (a) a.order = item.order
    }
    setStoredActivities(all)
  },

  saveEvidence(activityId: string, fileDataUrl: string, caption: string | null): EvidenceData {
    const all = getStoredActivities()
    const activity = all.find((a) => a.id === activityId)
    if (!activity) throw new Error('Activity not found')

    const evidence: EvidenceData = {
      id: generateId(),
      activity_id: activityId,
      file_path: fileDataUrl,
      caption,
      sort_index: activity.evidences?.length ?? 0,
      date_added: new Date().toISOString(),
    }

    if (!activity.evidences) activity.evidences = []
    activity.evidences.push(evidence)
    setStoredActivities(all)
    return evidence
  },

  updateEvidenceCaption(id: string, caption: string): EvidenceData | null {
    const all = getStoredActivities()
    for (const activity of all) {
      const ev = activity.evidences?.find((e) => e.id === id)
      if (ev) {
        ev.caption = caption
        setStoredActivities(all)
        return ev
      }
    }
    return null
  },

  deleteEvidence(id: string): boolean {
    const all = getStoredActivities()
    for (const activity of all) {
      if (!activity.evidences) continue
      const idx = activity.evidences.findIndex((e) => e.id === id)
      if (idx >= 0) {
        activity.evidences.splice(idx, 1)
        setStoredActivities(all)
        return true
      }
    }
    return false
  },
}

export function getCurrentMonthRef(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return `${mm}/${yyyy}`
}
