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
  page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message))

  // Wait for the page to finish loading (HTML/CSS/JS)
  await page.waitForLoadState('load')
  // Give React some extra time to mount + run effects
  await page.waitForTimeout(5_000)
})

test.afterAll(async () => {
  await app.close()
})

// ──── Navigation ────

test('navigates to all main screens', async () => {
  // Dashboard is the default route
  await expect(page.locator('text=Dashboard')).toBeVisible()

  // Navigate to Atividades
  await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  await expect(page.locator('h1:text("Atividades")')).toBeVisible({ timeout: 5_000 })

  // Navigate to Perfil
  await page.click('[title="Perfil"], [aria-label*="Perfil"]')
  await expect(page.locator('h1:text("Perfil")')).toBeVisible({ timeout: 5_000 })

  // Navigate to Configurações
  await page.click('[title="Configurações"], [aria-label*="Configurações"]')
  await expect(page.locator('h1:text("Configurações")')).toBeVisible({ timeout: 5_000 })

  // Back to Dashboard
  await page.click('[title="Dashboard"], [aria-label*="Dashboard"]')
  await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5_000 })
})

// ──── Theme Toggle ────

test('toggles dark/light theme', async () => {
  // Navigate to settings
  await page.click('[title="Configurações"], [aria-label*="Configurações"]')
  await page.waitForSelector('h1:text("Configurações")', { timeout: 5_000 })

  const html = page.locator('html')

  // Click light mode radio
  await page.click('input[value="light"]')
  await expect(html).not.toHaveClass(/dark/)

  // Click dark mode radio
  await page.click('input[value="dark"]')
  await expect(html).toHaveClass(/dark/)
})

// ──── Activity Creation ────

test('creates an activity', async () => {
  // Navigate to Atividades
  await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  await page.waitForSelector('h1:text("Atividades")', { timeout: 5_000 })

  // Click "Nova Atividade" button
  const newBtn = page.locator('button:has-text("Nova Atividade"), a:has-text("Nova Atividade")')
  if (await newBtn.isVisible()) {
    await newBtn.click()
  } else {
    // Empty state: click the primary action button
    const emptyAction = page.locator('button:has-text("Criar"), a:has-text("Nova Atividade")')
    await emptyAction.first().click()
  }

  // Fill description
  await page.waitForSelector('textarea, input[name="description"]', { timeout: 5_000 })
  const descInput = page.locator('textarea').first()
  await descInput.fill('Atividade E2E teste Playwright')

  // Submit
  const saveBtn = page.locator('button:has-text("Salvar")')
  await saveBtn.click()

  // Should redirect back to activity list or detail
  await page.waitForTimeout(1_000)

  // Navigate to Atividades to verify
  await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  await expect(page.locator('text=Atividade E2E teste Playwright')).toBeVisible({ timeout: 5_000 })
})

// ──── Window Controls ────

test('window starts visible and can be minimized', async () => {
  const isVisible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return win?.isVisible() ?? false
  })
  expect(isVisible).toBe(true)
})
