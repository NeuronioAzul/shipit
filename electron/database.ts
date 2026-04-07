import 'reflect-metadata'
import { DataSource } from 'typeorm'
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

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'shipit.db')
}

export async function initDatabase(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource
  }

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: getDbPath(),
    entities: [UserProfile, Alert, Activity, Evidence, Report, ActivityReport],
    synchronize: true,
    logging: false,
  })

  await dataSource.initialize()
  return dataSource
}

export async function getDb(): Promise<DataSource> {
  if (!dataSource || !dataSource.isInitialized) {
    return initDatabase()
  }
  return dataSource
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
  return repo.find({
    where: { month_reference: monthReference },
    relations: ['evidences'],
    order: { order: 'ASC', last_updated: 'DESC' },
  })
}

export async function getActivity(id: string): Promise<Activity | null> {
  const db = await getDb()
  const repo = db.getRepository(Activity)
  return repo.findOne({ where: { id }, relations: ['evidences'] })
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
  // Delete evidences first
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

  // Delete the file from disk
  if (fs.existsSync(evidence.file_path)) {
    fs.unlinkSync(evidence.file_path)
  }

  const result = await repo.delete({ id })
  return (result.affected ?? 0) > 0
}

export async function getEvidenceFilePath(id: string): Promise<string | null> {
  const db = await getDb()
  const repo = db.getRepository(Evidence)
  const evidence = await repo.findOne({ where: { id } })
  return evidence?.file_path ?? null
}
