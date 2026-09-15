import { test, expect, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from 'playwright'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { readActivityColumns, seedLegacyDatabase } from './fixtures/legacyDatabase'
import {
  createShipItTestProfileDir,
  createShipItTestProfileEnv,
  removeShipItTestProfileDirWithRetries,
} from './fixtures/testProfile'

/**
 * Guarda de schema do plano 42.1: um banco anterior à 1.14.x (ainda com a coluna
 * `environment`) não tem mais migração neste app. O app deve encerrar SEM tocar
 * no arquivo (o `synchronize()` dropararia a coluna com os dados, sem backup).
 * O diálogo nativo é suprimido sob PLAYWRIGHT=1, então a asserção é
 * "processo encerrou + arquivo intacto + sem pasta backups/".
 */

let testUserDataDir: string
let dbPath: string

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

async function waitForExit(app: ElectronApplication, timeoutMs: number): Promise<number | null> {
  const proc = app.process()
  if (proc.exitCode !== null) return proc.exitCode
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    proc.once('exit', (code) => { clearTimeout(timer); resolve(code) })
  })
}

test.beforeAll(async () => {
  testUserDataDir = createShipItTestProfileDir()
  dbPath = path.join(testUserDataDir, 'shipit.db')
  await seedLegacyDatabase(dbPath)
})

test.afterAll(async () => {
  if (testUserDataDir) {
    try {
      await removeShipItTestProfileDirWithRetries(testUserDataDir)
    } catch (error) {
      console.error('Falha ao limpar perfil temporario do E2E da guarda de schema:', error)
    }
  }
})

test('refuses a pre-1.14 database and exits without touching the file', async () => {
  const hashBefore = sha256(dbPath)
  expect(await readActivityColumns(dbPath)).toContain('environment')

  let app: ElectronApplication | null = null
  let launchError: unknown = null
  try {
    app = await electron.launch({
      args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
      env: createShipItTestProfileEnv(process.env, testUserDataDir),
    })
  } catch (error) {
    // O app pode encerrar antes de o Playwright terminar de conectar — também é um "encerrou".
    launchError = error
  }

  if (app) {
    const exitCode = await waitForExit(app, 15_000)
    if (exitCode === null) {
      await app.close().catch(() => {})
      throw new Error('O app não encerrou sozinho diante de um banco legado sem migração.')
    }
  } else {
    expect(launchError).toBeTruthy()
  }

  // Nada mudou no banco: mesmo conteúdo, colunas legadas intactas, sem backup.
  expect(sha256(dbPath)).toBe(hashBefore)
  const columns = await readActivityColumns(dbPath)
  expect(columns).toContain('environment')
  expect(columns).toContain('svn_releases')
  expect(columns).not.toContain('deployments')
  expect(fs.existsSync(path.join(testUserDataDir, 'backups'))).toBe(false)
})
