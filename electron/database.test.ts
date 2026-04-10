import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'

// Mock electron before importing database module
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return os.tmpdir()
      return os.tmpdir()
    },
  },
}))

import {
  initDatabase,
  resetDatabase,
  getUserProfile,
  saveUserProfile,
  getActivities,
  getActivity,
  saveActivity,
  deleteActivity,
  saveEvidence,
  deleteEvidence,
  getDeletedEvidences,
  restoreEvidence,
  permanentlyDeleteEvidence,
  getAlert,
  saveAlert,
  countActivities,
  countIncompleteActivities,
} from './database'

beforeEach(async () => {
  // Use sql.js (pure JS SQLite) to avoid better-sqlite3 Electron ABI mismatch
  await initDatabase({
    type: 'sqljs',
    database: new Uint8Array(0),
  } as any)
})

afterEach(async () => {
  await resetDatabase()
})

describe('UserProfile CRUD', () => {
  it('returns null when no profile exists', async () => {
    const profile = await getUserProfile()
    expect(profile).toBeNull()
  })

  it('creates and retrieves a profile', async () => {
    await saveUserProfile({
      full_name: 'MARIA SILVA',
      role: 'ENGENHEIRO DE SOFTWARE' as any,
      seniority_level: 'Pleno' as any,
      contract_identifier: 'CT-001',
      profile_type: 'Técnico',
      attendance_type: 'Remoto' as any,
      project_scope: 'Squad Alpha',
      correlating_activities: 'Desenvolvimento de software',
    })

    const profile = await getUserProfile()
    expect(profile).not.toBeNull()
    expect(profile!.full_name).toBe('MARIA SILVA')
    expect(profile!.role).toBe('ENGENHEIRO DE SOFTWARE')
    expect(profile!.seniority_level).toBe('Pleno')
  })

  it('updates an existing profile', async () => {
    await saveUserProfile({
      full_name: 'MARIA SILVA',
      role: 'ENGENHEIRO DE SOFTWARE' as any,
      seniority_level: 'Pleno' as any,
      contract_identifier: 'CT-001',
      profile_type: 'Técnico',
      attendance_type: 'Remoto' as any,
      project_scope: 'Squad Alpha',
      correlating_activities: 'Desenvolvimento de software',
    })

    await saveUserProfile({
      full_name: 'MARIA SANTOS SILVA',
    })

    const profile = await getUserProfile()
    expect(profile!.full_name).toBe('MARIA SANTOS SILVA')
    // Original fields preserved
    expect(profile!.role).toBe('ENGENHEIRO DE SOFTWARE')
  })
})

describe('Activity CRUD', () => {
  it('returns empty array for month with no activities', async () => {
    const activities = await getActivities('03/2026')
    expect(activities).toEqual([])
  })

  it('creates and retrieves an activity', async () => {
    const saved = await saveActivity({
      description: 'Implementar feature X',
      status: 'Em andamento',
      month_reference: '03/2026',
      date_start: '2026-03-01',
      date_end: '2026-03-15',
      order: 1,
    })

    expect(saved.id).toBeTruthy()
    expect(saved.description).toBe('Implementar feature X')

    const retrieved = await getActivity(saved.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.description).toBe('Implementar feature X')
    expect(retrieved!.status).toBe('Em andamento')
  })

  it('filters activities by month_reference', async () => {
    await saveActivity({
      description: 'Março A',
      status: 'Pendente',
      month_reference: '03/2026',
      order: 1,
    })
    await saveActivity({
      description: 'Abril A',
      status: 'Pendente',
      month_reference: '04/2026',
      order: 1,
    })

    const march = await getActivities('03/2026')
    expect(march.length).toBe(1)
    expect(march[0].description).toBe('Março A')

    const april = await getActivities('04/2026')
    expect(april.length).toBe(1)
    expect(april[0].description).toBe('Abril A')
  })

  it('updates an existing activity', async () => {
    const saved = await saveActivity({
      description: 'Original',
      status: 'Pendente',
      month_reference: '03/2026',
      order: 1,
    })

    await saveActivity({
      id: saved.id,
      description: 'Atualizado',
      status: 'Concluído',
      month_reference: '03/2026',
    })

    const retrieved = await getActivity(saved.id)
    expect(retrieved!.description).toBe('Atualizado')
    expect(retrieved!.status).toBe('Concluído')
  })

  it('deletes an activity and its evidences', async () => {
    const saved = await saveActivity({
      description: 'Para deletar',
      status: 'Pendente',
      month_reference: '03/2026',
      order: 1,
    })

    const deleted = await deleteActivity(saved.id)
    expect(deleted).toBe(true)

    const retrieved = await getActivity(saved.id)
    expect(retrieved).toBeNull()
  })

  it('returns false when deleting non-existent activity', async () => {
    const deleted = await deleteActivity('nonexistent-id')
    expect(deleted).toBe(false)
  })
})

describe('Evidence operations', () => {
  let testDir: string
  let activityId: string

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-db-test-'))

    const activity = await saveActivity({
      description: 'Atividade com evidência',
      status: 'Em andamento',
      month_reference: '03/2026',
      order: 1,
    })
    activityId = activity.id
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('saves evidence with file copy', async () => {
    const sourcePath = path.join(testDir, 'test.png')
    fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4E, 0x47])) // minimal PNG header

    const ev = await saveEvidence(activityId, sourcePath, 'Screenshot de teste')
    expect(ev.id).toBeTruthy()
    expect(ev.activity_id).toBe(activityId)
    expect(ev.caption).toBe('Screenshot de teste')
    expect(fs.existsSync(ev.file_path)).toBe(true)
  })

  it('soft-deletes evidence (sets deleted_at)', async () => {
    const sourcePath = path.join(testDir, 'test.png')
    fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const ev = await saveEvidence(activityId, sourcePath, null)
    const deleted = await deleteEvidence(ev.id)
    expect(deleted).toBe(true)

    // Should appear in deleted evidences
    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(1)
    expect(deletedList[0].id).toBe(ev.id)
  })

  it('excludes soft-deleted evidences from activity', async () => {
    const sourcePath = path.join(testDir, 'test.png')
    fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const ev = await saveEvidence(activityId, sourcePath, null)
    await deleteEvidence(ev.id)

    // Activity's evidences should not include deleted ones
    const activity = await getActivity(activityId)
    expect(activity!.evidences.length).toBe(0)
  })

  it('restores a soft-deleted evidence', async () => {
    const sourcePath = path.join(testDir, 'test.png')
    fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const ev = await saveEvidence(activityId, sourcePath, 'Restaurável')
    await deleteEvidence(ev.id)

    const restored = await restoreEvidence(ev.id)
    expect(restored).toBe(true)

    // Should no longer appear in deleted
    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(0)
  })

  it('permanently deletes evidence and removes file', async () => {
    const sourcePath = path.join(testDir, 'test.png')
    fs.writeFileSync(sourcePath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const ev = await saveEvidence(activityId, sourcePath, null)
    await deleteEvidence(ev.id) // soft delete first

    const result = await permanentlyDeleteEvidence(ev.id)
    expect(result).toBe(true)

    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(0)
  })

  it('returns false when deleting non-existent evidence', async () => {
    const deleted = await deleteEvidence('nonexistent-id')
    expect(deleted).toBe(false)
  })
})

describe('Alert operations', () => {
  it('returns null when no alert exists', async () => {
    const alert = await getAlert()
    expect(alert).toBeNull()
  })

  it('creates alert linked to profile', async () => {
    await saveUserProfile({
      full_name: 'TESTE',
      role: 'ENGENHEIRO DE SOFTWARE' as any,
      seniority_level: 'Pleno' as any,
      contract_identifier: 'CT-001',
      profile_type: 'Técnico',
      attendance_type: 'Remoto' as any,
      project_scope: 'Squad Alpha',
      correlating_activities: 'Dev',
    })

    await saveAlert({
      alert_enabled: true,
      alert_time: '10:00',
      alert_message: 'Lembrete customizado',
    })

    const alert = await getAlert()
    expect(alert).not.toBeNull()
    expect(alert!.alert_enabled).toBe(true)
    expect(alert!.alert_time).toBe('10:00')
    expect(alert!.alert_message).toBe('Lembrete customizado')
  })

  it('updates existing alert', async () => {
    await saveUserProfile({
      full_name: 'TESTE',
      role: 'ENGENHEIRO DE SOFTWARE' as any,
      seniority_level: 'Pleno' as any,
      contract_identifier: 'CT-001',
      profile_type: 'Técnico',
      attendance_type: 'Remoto' as any,
      project_scope: 'Squad Alpha',
      correlating_activities: 'Dev',
    })

    await saveAlert({ alert_enabled: true, alert_time: '09:00' })
    await saveAlert({ alert_time: '14:00' })

    const alert = await getAlert()
    expect(alert!.alert_time).toBe('14:00')
  })
})

describe('Counting helpers', () => {
  it('counts total activities for a month', async () => {
    await saveActivity({ description: 'A', status: 'Pendente', month_reference: '03/2026', order: 1 })
    await saveActivity({ description: 'B', status: 'Concluído', month_reference: '03/2026', order: 2 })
    await saveActivity({ description: 'C', status: 'Em andamento', month_reference: '03/2026', order: 3 })

    expect(await countActivities('03/2026')).toBe(3)
    expect(await countActivities('04/2026')).toBe(0)
  })

  it('counts incomplete activities (not Concluído)', async () => {
    await saveActivity({ description: 'A', status: 'Pendente', month_reference: '03/2026', order: 1 })
    await saveActivity({ description: 'B', status: 'Concluído', month_reference: '03/2026', order: 2 })
    await saveActivity({ description: 'C', status: 'Em andamento', month_reference: '03/2026', order: 3 })

    expect(await countIncompleteActivities('03/2026')).toBe(2)
  })
})
