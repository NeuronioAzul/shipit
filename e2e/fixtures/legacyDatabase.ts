import fs from 'fs'

/**
 * Cria um `shipit.db` no formato anterior ao plano 42 (colunas `environment` e
 * `svn_releases`, sem `deployments`) usando `sql.js` — SQLite puro em JS, sem
 * depender do `better-sqlite3` compilado para o Electron.
 */

export interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  export(): Uint8Array
  close(): void
}

export async function loadSqlJs(): Promise<{ Database: new (data?: Uint8Array) => SqlJsDatabase }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js') as (config?: object) => Promise<{ Database: new (data?: Uint8Array) => SqlJsDatabase }>
  return initSqlJs()
}

export async function seedLegacyDatabase(dbPath: string): Promise<void> {
  const SQL = await loadSqlJs()
  const db = new SQL.Database()
  db.run(`CREATE TABLE activities (
    id text PRIMARY KEY, "order" integer, description text, date_start date, date_end date,
    link_ref text, svn_releases text, environment text, status text NOT NULL DEFAULT 'Pendente',
    month_reference text NOT NULL, attendance_type text, project_scope text,
    last_updated datetime NOT NULL DEFAULT (datetime('now'))
  )`)
  db.run(
    `INSERT INTO activities (id, "order", description, status, month_reference, environment, svn_releases)
     VALUES ('legacy-1', 1, 'Legado ambiente e releases', 'Concluído', '06/2041', 'Homologação', '424242')`,
  )
  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  db.close()
}

export async function readActivityColumns(dbPath: string): Promise<string[]> {
  const SQL = await loadSqlJs()
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)))
  const info = db.exec('PRAGMA table_info(activities)')
  const columns = info[0]?.values.map((row) => String(row[1])) ?? []
  db.close()
  return columns
}
