import { DataSource } from 'typeorm'
import { UserProfile } from './entities/UserProfile'
import { Alert } from './entities/Alert'
import { Activity } from './entities/Activity'
import { Evidence } from './entities/Evidence'
import { Report } from './entities/Report'
import { ActivityReport } from './entities/ActivityReport'
import path from 'path'
import { app } from 'electron'

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
