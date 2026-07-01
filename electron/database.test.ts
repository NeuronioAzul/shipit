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
  searchActivities,
  saveActivity,
  deleteActivity,
  reorderActivities,
  saveEvidence,
  deleteEvidence,
  getDeletedEvidences,
  restoreEvidence,
  permanentlyDeleteEvidence,
  getAlert,
  saveAlert,
  countActivities,
  countIncompleteActivities,
  getDb,
  getReportPayload,
  saveTextEvidence,
  updateTextEvidence,
  updateEvidenceCaption,
} from './database.ts'
import { Activity } from './entities/Activity'

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
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    })

    const profile = await getUserProfile()
    expect(profile).not.toBeNull()
    expect(profile!.full_name).toBe('MARIA SILVA')
    expect(profile!.role).toBe('ENGENHEIRO DE SOFTWARE')
    expect(profile!.seniority_level).toBe('Pleno')
    expect(profile!.daily_availability).toBe(8)
    expect(profile!.monthly_availability).toBe(168)
    expect(profile!.minimum_effort_hours).toBe(40)
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
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    })

    await saveUserProfile({
      full_name: 'MARIA SANTOS SILVA',
      daily_availability: 6,
    })

    const profile = await getUserProfile()
    expect(profile!.full_name).toBe('MARIA SANTOS SILVA')
    // Original fields preserved
    expect(profile!.role).toBe('ENGENHEIRO DE SOFTWARE')
    expect(profile!.daily_availability).toBe(6)
    expect(profile!.monthly_availability).toBe(168)
    expect(profile!.minimum_effort_hours).toBe(40)
  })

  it('includes availability fields in report payload profile', async () => {
    await saveUserProfile({
      full_name: 'MARIA SILVA',
      role: 'ENGENHEIRO DE SOFTWARE' as any,
      seniority_level: 'Pleno' as any,
      contract_identifier: 'CT-001',
      profile_type: 'Técnico',
      attendance_type: 'Remoto' as any,
      project_scope: 'Squad Alpha',
      correlating_activities: 'Desenvolvimento de software',
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    })

    await saveActivity({
      description: 'Atividade relatório disponibilidade',
      status: 'Concluído',
      month_reference: '03/2026',
      order: 1,
    })

    const payload = await getReportPayload('03/2026')

    expect(payload.profile?.daily_availability).toBe(8)
    expect(payload.profile?.monthly_availability).toBe(168)
    expect(payload.profile?.minimum_effort_hours).toBe(40)
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

  it('persists, updates and clears the environment field', async () => {
    const saved = await saveActivity({
      description: 'Atividade com ambiente',
      status: 'Concluído',
      month_reference: '03/2026',
      environment: 'Produção',
      order: 1,
    })
    expect(saved.environment).toBe('Produção')

    const updated = await saveActivity({ id: saved.id, environment: 'Homologação' })
    expect(updated.environment).toBe('Homologação')

    const cleared = await saveActivity({ id: saved.id, environment: null })
    expect(cleared.environment).toBeNull()

    const retrieved = await getActivity(saved.id)
    expect(retrieved!.environment).toBeNull()
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

  it('appends new activities without explicit order in creation order', async () => {
    await saveActivity({
      description: 'Primeira criação',
      status: 'Pendente',
      month_reference: '03/2026',
    })
    await saveActivity({
      description: 'Segunda criação',
      status: 'Pendente',
      month_reference: '03/2026',
    })
    await saveActivity({
      description: 'Terceira criação',
      status: 'Pendente',
      month_reference: '03/2026',
    })

    const activities = await getActivities('03/2026')

    expect(activities.map((activity) => activity.description)).toEqual([
      'Primeira criação',
      'Segunda criação',
      'Terceira criação',
    ])
    expect(activities.map((activity) => activity.order)).toEqual([1, 2, 3])
  })

  it('normalizes legacy null-order activities by UUID v7 creation fallback', async () => {
    const repo = (await getDb()).getRepository(Activity)
    await repo.save([
      {
        id: '019746ab-0000-7000-8000-000000000003',
        description: 'Legada terceira',
        status: 'Pendente' as const,
        month_reference: '03/2026',
        order: null,
      },
      {
        id: '019746ab-0000-7000-8000-000000000001',
        description: 'Legada primeira',
        status: 'Pendente' as const,
        month_reference: '03/2026',
        order: null,
      },
      {
        id: '019746ab-0000-7000-8000-000000000002',
        description: 'Legada segunda',
        status: 'Pendente' as const,
        month_reference: '03/2026',
        order: null,
      },
    ])

    const activities = await getActivities('03/2026')

    expect(activities.map((activity) => activity.description)).toEqual([
      'Legada primeira',
      'Legada segunda',
      'Legada terceira',
    ])
    expect(activities.map((activity) => activity.order)).toEqual([1, 2, 3])
  })

  it('keeps drag-and-drop reorder authoritative after activity updates', async () => {
    const first = await saveActivity({ description: 'A', status: 'Pendente', month_reference: '03/2026' })
    const second = await saveActivity({ description: 'B', status: 'Pendente', month_reference: '03/2026' })
    const third = await saveActivity({ description: 'C', status: 'Pendente', month_reference: '03/2026' })

    await reorderActivities([
      { id: third.id, order: 0 },
      { id: first.id, order: 1 },
      { id: second.id, order: 2 },
    ])
    await saveActivity({
      id: first.id,
      description: 'A atualizada',
      status: 'Concluído',
      month_reference: '03/2026',
      order: 99,
    })

    const activities = await getActivities('03/2026')

    expect(activities.map((activity) => activity.description)).toEqual(['C', 'A atualizada', 'B'])
    expect(activities.map((activity) => activity.order)).toEqual([0, 1, 2])
  })

  it('returns report payload activities in the same order as getActivities', async () => {
    const first = await saveActivity({ description: 'Relatório A', status: 'Pendente', month_reference: '03/2026' })
    const second = await saveActivity({ description: 'Relatório B', status: 'Pendente', month_reference: '03/2026' })
    const third = await saveActivity({ description: 'Relatório C', status: 'Pendente', month_reference: '03/2026' })

    await reorderActivities([
      { id: second.id, order: 0 },
      { id: third.id, order: 1 },
      { id: first.id, order: 2 },
    ])

    const activities = await getActivities('03/2026')
    const payload = await getReportPayload('03/2026')

    expect(payload.activities.map((activity) => activity.id)).toEqual(
      activities.map((activity) => activity.id)
    )
  })

  it('orders search results by month and persisted activity order', async () => {
    const first = await saveActivity({ description: 'Busca API A', status: 'Pendente', month_reference: '03/2026' })
    const second = await saveActivity({ description: 'Busca API B', status: 'Pendente', month_reference: '03/2026' })
    const third = await saveActivity({ description: 'Busca API C', status: 'Pendente', month_reference: '03/2026' })
    await saveActivity({ description: 'Busca API Abril', status: 'Pendente', month_reference: '04/2026' })

    await reorderActivities([
      { id: second.id, order: 0 },
      { id: third.id, order: 1 },
      { id: first.id, order: 2 },
    ])
    await saveActivity({
      id: first.id,
      description: 'Busca API A atualizada',
      status: 'Pendente',
      month_reference: '03/2026',
    })

    const activities = await searchActivities('Busca API')

    expect(activities.map((activity) => activity.description)).toEqual([
      'Busca API B',
      'Busca API C',
      'Busca API A atualizada',
      'Busca API Abril',
    ])
  })

  it('persists and updates svn_releases on activities', async () => {
    const saved = await saveActivity({
      description: 'Atividade com releases SVN',
      status: 'Pendente',
      month_reference: '03/2026',
      svn_releases: '12345,67890',
    })

    expect(saved.svn_releases).toBe('12345,67890')

    const created = await getActivity(saved.id)
    expect(created).not.toBeNull()
    expect(created!.svn_releases).toBe('12345,67890')

    await saveActivity({
      id: saved.id,
      description: 'Atividade com releases SVN',
      status: 'Concluído',
      month_reference: '03/2026',
      svn_releases: '77777',
    })

    const updated = await getActivity(saved.id)
    expect(updated).not.toBeNull()
    expect(updated!.svn_releases).toBe('77777')
  })

  it('searches activities by svn_releases value', async () => {
    const target = await saveActivity({
      description: 'Atividade alvo release',
      status: 'Pendente',
      month_reference: '03/2026',
      svn_releases: '99112233,44556677',
    })

    await saveActivity({
      description: 'Outra atividade sem match',
      status: 'Pendente',
      month_reference: '03/2026',
      svn_releases: '111222',
    })

    const results = await searchActivities('44556677')
    expect(results.some((activity) => activity.id === target.id)).toBe(true)
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

  it('cascade-deletes evidences and activity_reports on activity removal', async () => {
    const db = await getDb()

    // Create activity with evidence
    const activity = await saveActivity({
      description: 'Atividade com dependentes',
      status: 'Concluído',
      month_reference: '03/2026',
      order: 1,
    })

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-fk-'))
    const imgPath = path.join(tmpDir, 'ev.png')
    fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const ev = await saveEvidence(activity.id, imgPath, 'Evidência FK')

    // Insert an ActivityReport row (needs a Report row first for FK constraint)
    const { ActivityReport } = await import('./entities/ActivityReport')
    const { Report } = await import('./entities/Report')
    const { v7: uuidv7 } = await import('uuid')

    const reportRepo = db.getRepository(Report)
    const report = await reportRepo.save({
      id: uuidv7(),
      month_reference: '03/2026',
      file_path: '/tmp/test-report.docx',
      report_name: 'Relatório Teste FK',
      status: 'Gerado',
    })

    const arRepo = db.getRepository(ActivityReport)
    await arRepo.save({
      id: uuidv7(),
      report_id: report.id,
      activity_id: activity.id,
    })

    // Confirm rows exist before delete
    const evidenceBefore = await db.getRepository((await import('./entities/Evidence')).Evidence)
      .countBy({ activity_id: activity.id })
    const arBefore = await arRepo.countBy({ activity_id: activity.id })
    expect(evidenceBefore).toBe(1)
    expect(arBefore).toBe(1)

    // Delete the activity
    const deleted = await deleteActivity(activity.id)
    expect(deleted).toBe(true)

    // Verify cascade: both Evidence and ActivityReport rows removed
    const evidenceAfter = await db.getRepository((await import('./entities/Evidence')).Evidence)
      .countBy({ activity_id: activity.id })
    const arAfter = await arRepo.countBy({ activity_id: activity.id })
    expect(evidenceAfter).toBe(0)
    expect(arAfter).toBe(0)

    fs.rmSync(tmpDir, { recursive: true, force: true })
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
    expect(ev.file_path && fs.existsSync(ev.file_path)).toBe(true)
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

describe('Text Evidence operations', () => {
  let activityId: string

  beforeEach(async () => {
    const activity = await saveActivity({
      description: 'Atividade com texto',
      status: 'Em andamento',
      month_reference: '03/2026',
      order: 1,
    })
    activityId = activity.id
  })

  it('saves text evidence with content and caption', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Hello world</p>', 'Nota de teste')
    expect(ev.id).toBeTruthy()
    expect(ev.type).toBe('text')
    expect(ev.text_content).toBe('<p>Hello world</p>')
    expect(ev.caption).toBe('Nota de teste')
    expect(ev.file_path).toBeNull()
    expect(ev.activity_id).toBe(activityId)
  })

  it('saves text evidence with null caption', async () => {
    const ev = await saveTextEvidence(activityId, '<p>No caption</p>', null)
    expect(ev.type).toBe('text')
    expect(ev.text_content).toBe('<p>No caption</p>')
    expect(ev.caption).toBeNull()
  })

  it('saved text evidence appears in activity evidences', async () => {
    await saveTextEvidence(activityId, '<p>Visible text</p>', 'Legenda')
    const activity = await getActivity(activityId)
    expect(activity!.evidences.length).toBe(1)
    expect(activity!.evidences[0].type).toBe('text')
    expect(activity!.evidences[0].text_content).toBe('<p>Visible text</p>')
    expect(activity!.evidences[0].caption).toBe('Legenda')
  })

  it('saves multiple text evidences for same activity', async () => {
    await saveTextEvidence(activityId, '<p>First</p>', 'First')
    await saveTextEvidence(activityId, '<p>Second</p>', 'Second')
    const activity = await getActivity(activityId)
    expect(activity!.evidences.length).toBe(2)
  })

  it('saves text evidence alongside image evidence', async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-mixed-'))
    const imgPath = path.join(testDir, 'test.png')
    fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    await saveEvidence(activityId, imgPath, 'Image caption')
    await saveTextEvidence(activityId, '<p>Text content</p>', 'Text caption')

    const activity = await getActivity(activityId)
    expect(activity!.evidences.length).toBe(2)
    const imageEv = activity!.evidences.find(e => e.type === 'image')
    const textEv = activity!.evidences.find(e => e.type === 'text')
    expect(imageEv).toBeTruthy()
    expect(textEv).toBeTruthy()
    expect(textEv!.file_path).toBeNull()
    expect(imageEv!.file_path).toBeTruthy()

    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('updates text evidence content', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Original</p>', null)
    const updated = await updateTextEvidence(ev.id, '<p>Updated</p>')
    expect(updated).not.toBeNull()
    expect(updated!.text_content).toBe('<p>Updated</p>')
  })

  it('updates text evidence preserves other fields', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Original</p>', 'Keep this caption')
    const updated = await updateTextEvidence(ev.id, '<p>New content</p>')
    expect(updated!.caption).toBe('Keep this caption')
    expect(updated!.type).toBe('text')
    expect(updated!.activity_id).toBe(activityId)
  })

  it('updateTextEvidence returns null for non-existent id', async () => {
    const result = await updateTextEvidence('non-existent-id', '<p>test</p>')
    expect(result).toBeNull()
  })

  it('updateTextEvidence returns null for image evidence', async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-notext-'))
    const imgPath = path.join(testDir, 'test.png')
    fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const imgEv = await saveEvidence(activityId, imgPath, 'Image')
    const result = await updateTextEvidence(imgEv.id, '<p>Should not update</p>')
    expect(result).toBeNull()

    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('updates caption on text evidence via updateEvidenceCaption', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Content</p>', 'Old caption')
    const updated = await updateEvidenceCaption(ev.id, 'New caption')
    expect(updated).not.toBeNull()
    expect(updated!.caption).toBe('New caption')
    expect(updated!.text_content).toBe('<p>Content</p>')
  })

  it('soft-deletes text evidence without file operations', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Delete me</p>', null)
    const deleted = await deleteEvidence(ev.id)
    expect(deleted).toBe(true)

    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(1)
    expect(deletedList[0].type).toBe('text')
  })

  it('restores soft-deleted text evidence', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Restore me</p>', 'Restaurável')
    await deleteEvidence(ev.id)

    const restored = await restoreEvidence(ev.id)
    expect(restored).toBe(true)

    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(0)

    // Verify content is preserved after restore
    const activity = await getActivity(activityId)
    expect(activity!.evidences.length).toBe(1)
    expect(activity!.evidences[0].text_content).toBe('<p>Restore me</p>')
    expect(activity!.evidences[0].caption).toBe('Restaurável')
  })

  it('permanently deletes text evidence', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Permanent delete</p>', null)
    await deleteEvidence(ev.id)

    const result = await permanentlyDeleteEvidence(ev.id)
    expect(result).toBe(true)

    const deletedList = await getDeletedEvidences()
    expect(deletedList.length).toBe(0)
  })

  it('updated text evidence content reflects in activity query', async () => {
    const ev = await saveTextEvidence(activityId, '<p>Before</p>', null)
    await updateTextEvidence(ev.id, '<p>After</p>')

    const activity = await getActivity(activityId)
    const found = activity!.evidences.find(e => e.id === ev.id)
    expect(found!.text_content).toBe('<p>After</p>')
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
