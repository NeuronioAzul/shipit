import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import fs from 'fs'
import path from 'path'
import {
  createShipItTestProfileDir,
  createShipItTestProfileEnv,
  removeShipItTestProfileDirWithRetries,
} from './fixtures/testProfile'

/**
 * Fluxo do plano 42: banco legado (colunas `environment`/`svn_releases`) →
 * aviso bloqueante → backup → migração → app liberado. Lança o app com um
 * `shipit.db` semeado no formato antigo, por isso tem launch próprio.
 */

const SQLITE_HEADER = 'SQLite format 3\0'
const COUNTDOWN_SECONDS = 2

let app: ElectronApplication
let page: Page
let testUserDataDir: string
let originalDbSize = 0

interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  export(): Uint8Array
  close(): void
}

async function loadSqlJs(): Promise<{ Database: new (data?: Uint8Array) => SqlJsDatabase }> {
  // sql.js (devDependency) — SQLite puro em JS para criar/ler o arquivo sem better-sqlite3.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js') as (config?: object) => Promise<{ Database: new (data?: Uint8Array) => SqlJsDatabase }>
  return initSqlJs()
}

/** Cria um `shipit.db` no formato anterior ao plano 42 (sem `deployments`). */
async function seedLegacyDatabase(dbPath: string) {
  const SQL = await loadSqlJs()
  const db = new SQL.Database()
  db.run(`CREATE TABLE activities (
    id text PRIMARY KEY, "order" integer, description text, date_start date, date_end date,
    link_ref text, svn_releases text, environment text, status text NOT NULL DEFAULT 'Pendente',
    month_reference text NOT NULL, attendance_type text, project_scope text,
    last_updated datetime NOT NULL DEFAULT (datetime('now'))
  )`)
  const insert = (id: string, description: string, env: string | null, svn: string | null) =>
    db.run(
      `INSERT INTO activities (id, "order", description, status, month_reference, environment, svn_releases)
       VALUES (?, ?, ?, 'Concluído', '06/2041', ?, ?)`,
      [id, Number(id.slice(-1)), description, env, svn],
    )
  insert('legacy-1', 'Legado só ambiente', 'Produção', null)
  insert('legacy-2', 'Legado ambiente e releases', 'Homologação', '424242, 434343')
  insert('legacy-3', 'Legado só releases', null, '999999')
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  db.close()
}

async function readActivityColumns(dbPath: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const SQL = await loadSqlJs()
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)))
  const info = db.exec('PRAGMA table_info(activities)')
  const columns = info[0]?.values.map((row) => String(row[1])) ?? []
  // O backup pré-migração não tem `deployments`; só seleciona a coluna quando existe.
  const deploymentsExpr = columns.includes('deployments') ? 'deployments' : 'NULL'
  const result = db.exec(`SELECT id, ${deploymentsExpr} FROM activities ORDER BY id`)
  const rows = (result[0]?.values ?? []).map((values) => ({ id: values[0], deployments: values[1] }))
  db.close()
  return { columns, rows }
}

async function launchApp() {
  app = await electron.launch({
    args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
    env: {
      ...createShipItTestProfileEnv(process.env, testUserDataDir),
      SHIPIT_E2E_MIGRATION_COUNTDOWN_SECONDS: String(COUNTDOWN_SECONDS),
    },
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
}

async function closeApp() {
  if (!app) return
  await app.evaluate(({ app: electronApp }) => { electronApp.exit(0) }).catch(() => {})
  await app.close().catch(() => {})
}

test.beforeAll(async () => {
  testUserDataDir = createShipItTestProfileDir()
  const dbPath = path.join(testUserDataDir, 'shipit.db')
  await seedLegacyDatabase(dbPath)
  originalDbSize = fs.statSync(dbPath).size
  await launchApp()
})

test.afterAll(async () => {
  try {
    await closeApp()
  } finally {
    if (testUserDataDir) {
      try {
        await removeShipItTestProfileDirWithRetries(testUserDataDir)
      } catch (error) {
        console.error('Falha ao limpar perfil temporario do E2E de migração:', error)
      }
    }
  }
})

test('shows the blocking migration notice before any app screen', async () => {
  const gate = page.locator('#migration-gate')
  await expect(gate).toBeVisible({ timeout: 10_000 })

  // Nada do app por trás: sem layout/rotas montados.
  await expect(page.locator('#activities-header')).toHaveCount(0)
  await expect(page.locator('[title="Atividades"]')).toHaveCount(0)

  // Conteúdo obrigatório do aviso.
  await expect(gate).toContainText('mudanças importantes')
  await expect(gate).toContainText('será feito um backup do seu banco de dados')
  await expect(gate.locator('#migration-gate-backup-path')).toContainText('shipit-backup-antes-v')
  await expect(gate).toContainText('Se precisar voltar para a versão')
  await expect(gate).toContainText(path.basename(testUserDataDir))
  await expect(gate.locator('#migration-gate-open-releases')).toContainText('github.com/NeuronioAzul/shipit/releases')

  // Botão desabilitado com contagem; Esc não fecha.
  const confirm = gate.locator('#migration-gate-confirm')
  await expect(confirm).toBeDisabled()
  await expect(confirm).toContainText('s)')
  await page.keyboard.press('Escape')
  await expect(gate).toBeVisible()
})

test('enables the confirm button after the countdown', async () => {
  const confirm = page.locator('#migration-gate-confirm')
  await expect(confirm).toBeEnabled({ timeout: (COUNTDOWN_SECONDS + 3) * 1_000 })
  await expect(confirm).toHaveText(/Entendi, fazer backup e atualizar$/)
})

test('runs backup → migration and reports the backup path', async () => {
  await page.locator('#migration-gate-confirm').click()

  await expect(page.locator('#migration-gate')).toContainText('Atualização concluída', { timeout: 20_000 })
  await expect(page.locator('#migration-gate-steps li[data-state="done"]')).toHaveCount(3)

  const backupPath = (await page.locator('#migration-gate-backup-path').textContent())?.trim() ?? ''
  expect(backupPath.startsWith(path.join(testUserDataDir, 'backups'))).toBe(true)
  expect(fs.existsSync(backupPath)).toBe(true)

  // Backup íntegro: mesmo tamanho do original e cabeçalho SQLite.
  expect(fs.statSync(backupPath).size).toBe(originalDbSize)
  const header = Buffer.alloc(SQLITE_HEADER.length)
  const fd = fs.openSync(backupPath, 'r')
  fs.readSync(fd, header, 0, header.length, 0)
  fs.closeSync(fd)
  expect(header.toString('latin1')).toBe(SQLITE_HEADER)

  // O backup ainda tem as colunas antigas (é a cópia pré-migração).
  const backup = await readActivityColumns(backupPath)
  expect(backup.columns).toContain('environment')
  expect(backup.columns).toContain('svn_releases')
  expect(backup.columns).not.toContain('deployments')

  // O banco ativo foi migrado e as colunas legadas sumiram.
  const migrated = await readActivityColumns(path.join(testUserDataDir, 'shipit.db'))
  expect(migrated.columns).toContain('deployments')
  expect(migrated.columns).not.toContain('environment')
  expect(migrated.columns).not.toContain('svn_releases')
  const byId = Object.fromEntries(migrated.rows.map((row) => [String(row.id), row.deployments]))
  expect(byId['legacy-1']).toBe('{"Produção":[]}')
  expect(byId['legacy-2']).toBe('{"Homologação":["424242","434343"]}')
  expect(byId['legacy-3']).toBeNull()
})

test('opens the app with migrated activities after acknowledging', async () => {
  await page.locator('#migration-gate-open-app').click()
  await expect(page.locator('#migration-gate')).toHaveCount(0)

  await page.evaluate(() => { window.location.hash = '#/activities?month=06/2041' })
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 10_000 })

  const envOnly = page.locator('.flex-1.cursor-pointer', { hasText: 'Legado só ambiente' }).first()
  await expect(envOnly.locator('[data-environment="Produção"][data-marked="true"]')).toBeVisible()

  const envAndReleases = page.locator('.flex-1.cursor-pointer', { hasText: 'Legado ambiente e releases' }).first()
  await expect(envAndReleases.locator('[data-environment="Homologação"][data-marked="true"]')).toBeVisible()
  await expect(envAndReleases).toContainText('424242')

  const releasesOnly = page.locator('.flex-1.cursor-pointer', { hasText: 'Legado só releases' }).first()
  await expect(releasesOnly.locator('[data-environment]')).toHaveCount(0)
  await expect(releasesOnly).not.toContainText('999999')

  // Registro persistido para Configurações + versão da última execução.
  const settings = JSON.parse(fs.readFileSync(path.join(testUserDataDir, 'settings.json'), 'utf-8'))
  expect(typeof settings.__migrationNotice?.backupPath).toBe('string')
  expect(typeof settings.__lastRunVersion).toBe('string')

  await page.evaluate(() => { window.location.hash = '#/settings' })
  await expect(page.locator('#settings-backup-section')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('#settings-backup-path')).toHaveValue(settings.__migrationNotice.backupPath)
})

test('does not show the notice again on the next launch', async () => {
  await closeApp()
  await launchApp()
  await page.waitForSelector('#app-layout, [title="Atividades"]', { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(1_500)
  await expect(page.locator('#migration-gate')).toHaveCount(0)
  await expect(page.locator('[title="Atividades"]')).toBeVisible({ timeout: 10_000 })
})
