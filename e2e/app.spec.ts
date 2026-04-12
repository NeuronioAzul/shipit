import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
    env: { ...process.env, NODE_ENV: 'test', PLAYWRIGHT: '1' },
  })

  page = await app.firstWindow()

  // Wait for the page to finish loading
  await page.waitForLoadState('domcontentloaded')
  // Give React extra time to mount + run effects
  await page.waitForTimeout(2_000)
})

test.afterAll(async () => {
  // Force kill — the tray intercepts normal close and app.quit waits for handlers
  await app.evaluate(({ app }) => {
    app.exit(0)
  })
})

// ──── Window ────

test('window starts visible', async () => {
  const isVisible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return win?.isVisible() ?? false
  })
  expect(isVisible).toBe(true)
})

// ──── Navigation ────

test('shows EmptyState on fresh DB and navigates to all screens', async () => {
  // Fresh DB → EmptyState with "Bem-vindo ao ShipIt!"
  await expect(page.locator('text=Bem-vindo')).toBeVisible({ timeout: 5_000 })

  // Navigate to Atividades via sidebar
  await page.click('[title="Atividades"]')
  await expect(page.locator('h1:has-text("Atividades")')).toBeVisible({ timeout: 5_000 })

  // Navigate to Perfil (h1 shows "Configurações Iniciais" or "Editar Perfil")
  await page.click('[title="Perfil"]')
  await page.waitForURL(/#\/profile/)
  await expect(page.locator('h1')).toBeVisible({ timeout: 5_000 })

  // Navigate to Configurações
  await page.click('[title="Configurações"]')
  await page.waitForURL(/#\/settings/)
  await expect(page.locator('h1:has-text("Configurações")')).toBeVisible({ timeout: 5_000 })

  // Navigate to Lixeira
  await page.click('[title="Lixeira"]')
  await page.waitForURL(/#\/trash/)
  await expect(page.locator('h1:has-text("Lixeira")')).toBeVisible({ timeout: 5_000 })

  // Back to Dashboard
  await page.click('[title="Dashboard"]')
  await page.waitForURL(/#\/$/)
  await expect(page.locator('text=Bem-vindo')).toBeVisible({ timeout: 5_000 })
})

// ──── Theme Toggle ────

test('toggles dark/light theme', async () => {
  await page.click('[title="Configurações"]')
  await page.waitForSelector('h1:has-text("Configurações")', { timeout: 5_000 })

  const html = page.locator('html')

  // Switch to light mode
  await page.click('input[value="light"]')
  await expect(html).not.toHaveClass(/dark/)

  // Switch back to dark mode
  await page.click('input[value="dark"]')
  await expect(html).toHaveClass(/dark/)
})

// ──── Activity Creation ────

test('creates an activity', async () => {
  await page.click('[title="Atividades"]')
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 5_000 })

  // Click "Nova Atividade"
  await page.click('button:has-text("Nova Atividade")')

  // Fill the description (required field)
  const descInput = page.locator('textarea#description')
  await descInput.waitFor({ timeout: 5_000 })
  await descInput.fill('Atividade E2E Playwright')

  // Submit the form
  await page.click('button[type="submit"]')

  // Should navigate back to activities list
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 5_000 })

  // Verify the created activity appears
  await expect(page.locator('text=Atividade E2E Playwright').first()).toBeVisible({ timeout: 5_000 })
})
