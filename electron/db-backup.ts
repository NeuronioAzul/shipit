import fs from 'fs'
import path from 'path'

/**
 * Backup verificado do banco SQLite antes de migrações destrutivas (plano 42).
 * Sem dependência do Electron — testável em Vitest com diretórios temporários.
 */

const SQLITE_HEADER = 'SQLite format 3\0'
/** Arquivos auxiliares do SQLite que podem existir ao lado do banco. */
const SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const

export class DatabaseBackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseBackupError'
  }
}

export interface DatabaseBackupResult {
  backupPath: string
  bytes: number
  /** Sidecars copiados (caminhos de destino). */
  sidecars: string[]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `shipit-backup-antes-v<toVersion>-<YYYYMMDD-HHmmss>.db` dentro de `backupsDir`. */
export function buildBackupPath(backupsDir: string, toVersion: string, now: Date = new Date()): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const safeVersion = toVersion.replace(/[^0-9A-Za-z.-]/g, '_')
  return path.join(backupsDir, `shipit-backup-antes-v${safeVersion}-${stamp}.db`)
}

function hasSqliteHeader(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r')
  try {
    const buffer = Buffer.alloc(SQLITE_HEADER.length)
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0)
    return read === buffer.length && buffer.toString('latin1') === SQLITE_HEADER
  } finally {
    fs.closeSync(fd)
  }
}

function removeQuietly(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true })
  } catch {
    /* ignore */
  }
}

/**
 * Copia `dbPath` (e os sidecars `-wal`/`-shm`/`-journal` existentes) para
 * `backupPath`, criando a pasta se preciso, e verifica a cópia (tamanho igual ao
 * original e cabeçalho SQLite). Em qualquer falha remove os arquivos parciais e
 * lança `DatabaseBackupError` — nunca deixa um backup pela metade.
 */
export function createDatabaseBackup(options: { dbPath: string; backupPath: string }): DatabaseBackupResult {
  const { dbPath, backupPath } = options

  if (!fs.existsSync(dbPath)) {
    throw new DatabaseBackupError(`Banco de dados não encontrado: ${dbPath}`)
  }
  if (!hasSqliteHeader(dbPath)) {
    throw new DatabaseBackupError(`O arquivo não parece ser um banco SQLite válido: ${dbPath}`)
  }

  const written: string[] = []
  try {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true })

    fs.copyFileSync(dbPath, backupPath, fs.constants.COPYFILE_EXCL)
    written.push(backupPath)

    const sidecars: string[] = []
    for (const suffix of SIDECAR_SUFFIXES) {
      const source = `${dbPath}${suffix}`
      if (!fs.existsSync(source)) continue
      const target = `${backupPath}${suffix}`
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL)
      written.push(target)
      sidecars.push(target)
    }

    const originalSize = fs.statSync(dbPath).size
    const copiedSize = fs.statSync(backupPath).size
    if (originalSize !== copiedSize) {
      throw new DatabaseBackupError(
        `Backup incompleto: ${copiedSize} bytes copiados de ${originalSize}.`,
      )
    }
    if (!hasSqliteHeader(backupPath)) {
      throw new DatabaseBackupError('Backup inválido: cabeçalho SQLite não encontrado na cópia.')
    }

    return { backupPath, bytes: copiedSize, sidecars }
  } catch (error) {
    for (const file of written) removeQuietly(file)
    if (error instanceof DatabaseBackupError) throw error
    const message = error instanceof Error ? error.message : String(error)
    throw new DatabaseBackupError(`Falha ao criar o backup do banco de dados: ${message}`)
  }
}
