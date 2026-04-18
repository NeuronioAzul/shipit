import 'reflect-metadata'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { UserProfile } from './entities/UserProfile'
import { Alert } from './entities/Alert'
import { Activity } from './entities/Activity'
import { Evidence } from './entities/Evidence'
import { Report } from './entities/Report'
import { ActivityReport } from './entities/ActivityReport'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { v7 as uuidv7 } from 'uuid'

let dataSource: DataSource | null = null

const ALL_ENTITIES = [UserProfile, Alert, Activity, Evidence, Report, ActivityReport]

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'shipit.db')
}

export async function initDatabase(overrides?: Partial<DataSourceOptions>): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource
  }

  const defaultOpts: DataSourceOptions = {
    type: 'better-sqlite3',
    database: getDbPath(),
    entities: ALL_ENTITIES,
    synchronize: true,
    logging: false,
  }

  dataSource = new DataSource({ ...defaultOpts, ...overrides } as DataSourceOptions)

  await dataSource.initialize()
  return dataSource
}

export async function getDb(): Promise<DataSource> {
  if (!dataSource || !dataSource.isInitialized) {
    return initDatabase()
  }
  return dataSource
}

/** Reset the singleton DataSource (for testing) */
export async function resetDatabase(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy()
  }
  dataSource = null
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDb()
  const repo = db.getRepository(UserProfile)
  return repo.findOne({ where: {}, relations: ['alert'] })
}

export async function saveUserProfile(
  data: Partial<UserProfile>
): Promise<UserProfile> {
  const db = await getDb()
  const repo = db.getRepository(UserProfile)

  let profile = await repo.findOne({ where: {} })

  if (profile) {
    Object.assign(profile, data)
    profile.last_updated = new Date()
  } else {
    profile = repo.create({
      ...data,
      last_updated: new Date(),
    })
  }

  return repo.save(profile)
}

// ──── Activities ────

export async function getActivities(monthReference: string): Promise<Activity[]> {
  const db = await getDb()
  const repo = db.getRepository(Activity)
  const activities = await repo.find({
    where: { month_reference: monthReference },
    relations: ['evidences'],
    order: { order: 'ASC', last_updated: 'DESC' },
  })
  // Exclude soft-deleted evidences
  for (const act of activities) {
    act.evidences = (act.evidences || []).filter(e => !e.deleted_at)
  }
  return activities
}

export async function getActivity(id: string): Promise<Activity | null> {
  const db = await getDb()
  const repo = db.getRepository(Activity)
  const activity = await repo.findOne({ where: { id }, relations: ['evidences'] })
  if (activity) {
    activity.evidences = (activity.evidences || []).filter(e => !e.deleted_at)
  }
  return activity
}

export async function saveActivity(data: Partial<Activity>): Promise<Activity> {
  const db = await getDb()
  const repo = db.getRepository(Activity)

  if (data.id) {
    const existing = await repo.findOne({ where: { id: data.id } })
    if (existing) {
      Object.assign(existing, data)
      existing.last_updated = new Date()
      return repo.save(existing)
    }
  }

  const activity = repo.create({
    ...data,
    id: data.id || uuidv7(),
    last_updated: new Date(),
  })
  return repo.save(activity)
}

export async function deleteActivity(id: string): Promise<boolean> {
  const db = await getDb()
  // Delete related records first to satisfy foreign key constraints
  await db.getRepository(ActivityReport).delete({ activity_id: id })
  await db.getRepository(Evidence).delete({ activity_id: id })
  const result = await db.getRepository(Activity).delete({ id })
  return (result.affected ?? 0) > 0
}

export async function reorderActivities(
  items: { id: string; order: number }[]
): Promise<void> {
  const db = await getDb()
  const repo = db.getRepository(Activity)
  for (const item of items) {
    await repo.update({ id: item.id }, { order: item.order })
  }
}

// ──── Evidences ────

function getEvidencesDir(): string {
  const dir = path.join(app.getPath('userData'), 'evidences')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function saveEvidence(
  activityId: string,
  sourcePath: string,
  caption: string | null
): Promise<Evidence> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)

  const id = uuidv7()
  const ext = path.extname(sourcePath) || '.png'
  const destFileName = `${id}${ext}`
  const destPath = path.join(getEvidencesDir(), destFileName)

  fs.copyFileSync(sourcePath, destPath)

  const evidence = repo.create({
    id,
    activity_id: activityId,
    file_path: destPath,
    caption,
    date_added: new Date(),
  })
  return repo.save(evidence)
}

export async function saveEvidenceFromBuffer(
  activityId: string,
  buffer: Buffer,
  extension: string,
  caption: string | null
): Promise<Evidence> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)

  const id = uuidv7()
  const destFileName = `${id}${extension}`
  const destPath = path.join(getEvidencesDir(), destFileName)

  fs.writeFileSync(destPath, buffer)

  const evidence = repo.create({
    id,
    activity_id: activityId,
    file_path: destPath,
    caption,
    date_added: new Date(),
  })
  return repo.save(evidence)
}

export async function updateEvidenceCaption(
  id: string,
  caption: string
): Promise<Evidence | null> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  if (!evidence) return null
  evidence.caption = caption
  return repo.save(evidence)
}

export async function deleteEvidence(id: string): Promise<boolean> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  if (!evidence) return false

  // Soft delete: move file to trash directory and mark deleted_at
  if (evidence.type !== 'text' && evidence.file_path) {
    const trashDir = path.join(app.getPath('userData'), 'trash')
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true })
    }

    if (fs.existsSync(evidence.file_path)) {
      const trashPath = path.join(trashDir, path.basename(evidence.file_path))
      fs.renameSync(evidence.file_path, trashPath)
      evidence.file_path = trashPath
    }
  }

  evidence.deleted_at = new Date()
  await repo.save(evidence)
  return true
}

export async function getDeletedEvidences(): Promise<Evidence[]> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  return repo.createQueryBuilder('evidence')
    .where('evidence.deleted_at IS NOT NULL')
    .orderBy('evidence.deleted_at', 'DESC')
    .getMany()
}

export async function restoreEvidence(id: string): Promise<boolean> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  if (!evidence || !evidence.deleted_at) return false

  // Move file back to evidences directory (only for image evidences)
  if (evidence.type !== 'text' && evidence.file_path) {
    const evidencesDir = path.join(app.getPath('userData'), 'evidences')
    if (!fs.existsSync(evidencesDir)) {
      fs.mkdirSync(evidencesDir, { recursive: true })
    }

    if (fs.existsSync(evidence.file_path)) {
      const restoredPath = path.join(evidencesDir, path.basename(evidence.file_path))
      fs.renameSync(evidence.file_path, restoredPath)
      evidence.file_path = restoredPath
    }
  }

  evidence.deleted_at = null
  await repo.save(evidence)
  return true
}

export async function permanentlyDeleteEvidence(id: string): Promise<boolean> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  if (!evidence) return false

  if (evidence.type !== 'text' && evidence.file_path && fs.existsSync(evidence.file_path)) {
    fs.unlinkSync(evidence.file_path)
  }

  const result = await repo.delete({ id })
  return (result.affected ?? 0) > 0
}

/** Permanently delete evidences that have been in trash for over 3 months */
export async function cleanupTrash(): Promise<number> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const old = await repo.createQueryBuilder('evidence')
    .where('evidence.deleted_at IS NOT NULL')
    .andWhere('evidence.deleted_at < :date', { date: threeMonthsAgo.toISOString() })
    .getMany()

  let cleaned = 0
  for (const ev of old) {
    if (ev.type !== 'text' && ev.file_path && fs.existsSync(ev.file_path)) {
      fs.unlinkSync(ev.file_path)
    }
    await repo.delete({ id: ev.id })
    cleaned++
  }
  return cleaned
}

export async function getEvidenceFilePath(id: string): Promise<string | null> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  return evidence?.file_path ?? null
}

export async function reorderEvidences(
  items: { id: string; sort_index: number }[]
): Promise<void> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  for (const item of items) {
    await repo.update({ id: item.id }, { sort_index: item.sort_index })
  }
}

export async function saveTextEvidence(
  activityId: string,
  textContent: string,
  caption: string | null
): Promise<Evidence> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)

  const id = uuidv7()
  const evidence = repo.create({
    id,
    activity_id: activityId,
    type: 'text',
    file_path: null,
    text_content: textContent,
    caption,
    date_added: new Date(),
  })
  return repo.save(evidence)
}

export async function updateTextEvidence(
  id: string,
  textContent: string
): Promise<Evidence | null> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  if (!evidence || evidence.type !== 'text') return null
  evidence.text_content = textContent
  return repo.save(evidence)
}

// ──── Reports ────

export async function saveReport(data: {
  id: string
  month_reference: string
  file_path: string
  report_name: string
  status: string
  activityIds: string[]
}): Promise<Report> {
  const db = await getDb()

  // Mark previous reports for same month as Excluído
  const reportRepo = db.getRepository(Report)
  const existing = await reportRepo.find({ where: { month_reference: data.month_reference, status: 'Gerado' as any } })
  for (const old of existing) {
    old.status = 'Excluído'
    await reportRepo.save(old)
  }

  const report = reportRepo.create({
    id: data.id,
    month_reference: data.month_reference,
    file_path: data.file_path,
    report_name: data.report_name,
    status: data.status as any,
    date_generated: new Date(),
  })
  await reportRepo.save(report)

  // Create ActivityReport entries
  const arRepo = db.getRepository(ActivityReport)
  for (const actId of data.activityIds) {
    const ar = arRepo.create({
      id: uuidv7(),
      report_id: report.id,
      activity_id: actId,
      date_added: new Date(),
    })
    await arRepo.save(ar)
  }

  return report
}

export async function getReportPayload(monthReference: string) {
  const db = await getDb()
  const profile = await db.getRepository(UserProfile).findOne({ where: {} })
  const activities = await db.getRepository(Activity).find({
    where: { month_reference: monthReference },
    relations: ['evidences'],
    order: { order: 'ASC', last_updated: 'DESC' },
  })
  for (const act of activities) {
    act.evidences = (act.evidences || []).filter(e => !e.deleted_at)
  }
  return { profile, activities }
}

export async function getReports(monthReference: string): Promise<Report[]> {
  const db = await getDb()
  return db.getRepository(Report).find({
    where: { month_reference: monthReference },
    order: { date_generated: 'DESC' },
  })
}

// ──── Alerts ────

export async function getAlert(): Promise<Alert | null> {
  const db = await getDb()
  return db.getRepository(Alert).findOne({ where: {} })
}

export async function saveAlert(data: Partial<Alert>): Promise<Alert> {
  const db = await getDb()
  const repo = db.getRepository(Alert)
  let alert = await repo.findOne({ where: {} })

  if (alert) {
    Object.assign(alert, data)
  } else {
    // Need a profile to link to
    const profile = await db.getRepository(UserProfile).findOne({ where: {} })
    if (!profile) throw new Error('Perfil não encontrado para vincular alerta.')
    alert = repo.create({ ...data, profile })
  }
  return repo.save(alert)
}

export async function updateLastAlertSent(): Promise<void> {
  const db = await getDb()
  const repo = db.getRepository(Alert)
  const alert = await repo.findOne({ where: {} })
  if (alert) {
    alert.last_alert_sent = new Date()
    await repo.save(alert)
  }
}

/** Count incomplete activities for a given month */
export async function countIncompleteActivities(monthReference: string): Promise<number> {
  const db = await getDb()
  const activities = await db.getRepository(Activity).find({
    where: { month_reference: monthReference },
  })
  return activities.filter(a => a.status !== 'Concluído').length
}

/** Count total activities for a given month */
export async function countActivities(monthReference: string): Promise<number> {
  const db = await getDb()
  return db.getRepository(Activity).count({
    where: { month_reference: monthReference },
  })
}

/** Search activities across all months by query string */
export async function searchActivities(query: string): Promise<Activity[]> {
  const db = await getDb()
  const like = `%${query}%`
  const activities = await db.getRepository(Activity)
    .createQueryBuilder('activity')
    .leftJoinAndSelect('activity.evidences', 'evidence', 'evidence.deleted_at IS NULL')
    .where('activity.description LIKE :like', { like })
    .orWhere('activity.project_scope LIKE :like', { like })
    .orWhere('activity.link_ref LIKE :like', { like })
    .orWhere('evidence.caption LIKE :like', { like })
    .orderBy('activity.last_updated', 'DESC')
    .take(50)
    .getMany()
  // Deduplicate (join may produce duplicates)
  const seen = new Set<string>()
  const unique: Activity[] = []
  for (const act of activities) {
    if (!seen.has(act.id)) {
      seen.add(act.id)
      act.evidences = (act.evidences || []).filter(e => !e.deleted_at)
      unique.push(act)
    }
  }
  return unique
}
