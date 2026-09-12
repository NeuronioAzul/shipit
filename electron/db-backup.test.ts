import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { buildBackupPath, createDatabaseBackup, DatabaseBackupError } from './db-backup'

const SQLITE_HEADER = 'SQLite format 3\0'

let tmpDir: string

function writeSqliteLikeFile(filePath: string, payloadBytes = 4096): void {
  const body = Buffer.alloc(payloadBytes, 0xab)
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from(SQLITE_HEADER, 'latin1'), body]))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-backup-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('buildBackupPath', () => {
  it('builds a name with version and timestamp inside the backups dir', () => {
    const now = new Date(2026, 8, 11, 14, 5, 9)
    const result = buildBackupPath(path.join(tmpDir, 'backups'), '1.14.0', now)
    expect(result).toBe(path.join(tmpDir, 'backups', 'shipit-backup-antes-v1.14.0-20260911-140509.db'))
  })

  it('sanitizes unexpected characters in the version', () => {
    const result = buildBackupPath(tmpDir, '1.14.0/beta x', new Date(2026, 0, 1, 0, 0, 0))
    expect(path.basename(result)).toBe('shipit-backup-antes-v1.14.0_beta_x-20260101-000000.db')
  })
})

describe('createDatabaseBackup', () => {
  it('copies the database, creates the folder and verifies the copy', () => {
    const dbPath = path.join(tmpDir, 'shipit.db')
    writeSqliteLikeFile(dbPath)
    const backupPath = path.join(tmpDir, 'backups', 'nested', 'copy.db')

    const result = createDatabaseBackup({ dbPath, backupPath })

    expect(result.backupPath).toBe(backupPath)
    expect(result.bytes).toBe(fs.statSync(dbPath).size)
    expect(result.sidecars).toEqual([])
    expect(fs.readFileSync(backupPath).equals(fs.readFileSync(dbPath))).toBe(true)
  })

  it('copies existing sidecar files next to the backup', () => {
    const dbPath = path.join(tmpDir, 'shipit.db')
    writeSqliteLikeFile(dbPath)
    fs.writeFileSync(`${dbPath}-wal`, 'wal-data')
    fs.writeFileSync(`${dbPath}-shm`, 'shm-data')
    const backupPath = path.join(tmpDir, 'backups', 'copy.db')

    const result = createDatabaseBackup({ dbPath, backupPath })

    expect(result.sidecars).toEqual([`${backupPath}-wal`, `${backupPath}-shm`])
    expect(fs.readFileSync(`${backupPath}-wal`, 'utf-8')).toBe('wal-data')
    expect(fs.existsSync(`${backupPath}-journal`)).toBe(false)
  })

  it('fails when the source database does not exist', () => {
    expect(() =>
      createDatabaseBackup({ dbPath: path.join(tmpDir, 'missing.db'), backupPath: path.join(tmpDir, 'b.db') }),
    ).toThrow(DatabaseBackupError)
  })

  it('fails when the source is not a SQLite file and leaves nothing behind', () => {
    const dbPath = path.join(tmpDir, 'shipit.db')
    fs.writeFileSync(dbPath, 'not a database')
    const backupPath = path.join(tmpDir, 'backups', 'copy.db')

    expect(() => createDatabaseBackup({ dbPath, backupPath })).toThrow(/SQLite/)
    expect(fs.existsSync(backupPath)).toBe(false)
  })

  it('refuses to overwrite an existing backup and leaves it intact', () => {
    const dbPath = path.join(tmpDir, 'shipit.db')
    writeSqliteLikeFile(dbPath)
    const backupPath = path.join(tmpDir, 'copy.db')
    fs.writeFileSync(backupPath, 'previous backup')

    expect(() => createDatabaseBackup({ dbPath, backupPath })).toThrow(DatabaseBackupError)
    expect(fs.readFileSync(backupPath, 'utf-8')).toBe('previous backup')
  })

  it('removes partial files when the backups folder cannot be created', () => {
    const dbPath = path.join(tmpDir, 'shipit.db')
    writeSqliteLikeFile(dbPath)
    // "backups" é um arquivo, então mkdir da pasta falha.
    const blocker = path.join(tmpDir, 'backups')
    fs.writeFileSync(blocker, 'file in the way')
    const backupPath = path.join(blocker, 'copy.db')

    expect(() => createDatabaseBackup({ dbPath, backupPath })).toThrow(DatabaseBackupError)
    expect(fs.readFileSync(blocker, 'utf-8')).toBe('file in the way')
  })
})
