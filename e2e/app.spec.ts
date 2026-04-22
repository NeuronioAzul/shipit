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
  await page.click('button[aria-label="Tema Claro"]')
  await expect(html).toHaveClass(/(?:^|\s)light(?:\s|$)/)

  // Switch back to dark mode
  await page.click('button[aria-label="Tema Escuro"]')
  await expect(html).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
})

// ──── Titlebar Drag Contract ────

test('maintains drag/no-drag contract in titlebar search area', async () => {
  const regions = await page.evaluate(() => {
    function readRegion(id: string) {
      const el = document.getElementById(id) as HTMLElement | null
      const computed = el ? getComputedStyle(el) : null
      return {
        styleAttr: el?.getAttribute('style') ?? '',
        inline: el?.style.getPropertyValue('-webkit-app-region') ?? '',
        computed: computed?.getPropertyValue('-webkit-app-region') ?? '',
      }
    }

    return {
      titlebar: readRegion('titlebar'),
      titlebarSearch: readRegion('titlebar-search'),
      searchbar: readRegion('searchbar'),
      titlebarControls: readRegion('titlebar-controls'),
    }
  })

  expect(regions.titlebar.styleAttr).toMatch(/(?:-webkit-)?app-region:\s*drag/)
  expect(regions.titlebar.inline).toBe('drag')

  // Central wrapper should not block drag globally.
  expect(regions.titlebarSearch.styleAttr).not.toContain('-webkit-app-region')

  // Interactive areas must explicitly opt out of drag.
  expect(regions.searchbar.styleAttr).toMatch(/(?:-webkit-)?app-region:\s*no-drag/)
  expect(regions.searchbar.inline).toBe('no-drag')
  expect(regions.titlebarControls.styleAttr).toMatch(/(?:-webkit-)?app-region:\s*no-drag/)
  expect(regions.titlebarControls.inline).toBe('no-drag')

  // Some environments may not expose this computed property; if exposed, it must match.
  if (regions.titlebar.computed) {
    expect(regions.titlebar.computed).toBe('drag')
  }
  if (regions.searchbar.computed) {
    expect(regions.searchbar.computed).toBe('no-drag')
  }
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

// ──── Cyberpunk Search Regression ────

test('keeps searchbar stable and anchored in cyberpunk theme', async () => {
  await page.click('[title="Configurações"]')
  await page.waitForURL(/#\/settings/)
  await page.click('button[aria-label="Tema Cyberpunk"]')

  const html = page.locator('html')
  await expect(html).toHaveClass(/(?:^|\s)cyberpunk(?:\s|$)/)

  await page.click('[title="Atividades"]')
  await page.waitForURL(/#\/activities/)

  const input = page.locator('#searchbar-input, #searchbar input[type="text"]')
  await expect(input.first()).toBeVisible({ timeout: 5_000 })

  await page.keyboard.press('Control+k')
  await expect(input.first()).toBeFocused()

  const magnifier = page.locator('#searchbar-magnifier, #searchbar .fa-magnifying-glass')
  await expect(magnifier).toBeVisible()

  await input.first().fill('E2')
  const dropdown = page.locator('#searchbar-results')
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await expect(dropdown).toContainText('Atividade E2E Playwright')

  const metrics = await page.evaluate(() => {
    const searchbar = document.getElementById('searchbar')
    const inputEl = document.getElementById('searchbar-input')
    const dropdownEl = document.getElementById('searchbar-results')

    if (!searchbar || !inputEl || !dropdownEl) return null

    const searchbarRect = searchbar.getBoundingClientRect()
    const inputRect = inputEl.getBoundingClientRect()
    const dropdownRect = dropdownEl.getBoundingClientRect()
    const dropdownStyle = getComputedStyle(dropdownEl)

    const expectedMaxWidth = window.matchMedia('(min-width: 1024px)').matches
      ? 520
      : window.matchMedia('(min-width: 640px)').matches
        ? 420
        : 320

    return {
      expectedMaxWidth,
      searchbarWidth: searchbarRect.width,
      dropdownWidth: dropdownRect.width,
      inputBottom: inputRect.bottom,
      dropdownTop: dropdownRect.top,
      leftDelta: Math.abs(dropdownRect.left - inputRect.left),
      position: dropdownStyle.position,
      transform: dropdownStyle.transform,
    }
  })

  expect(metrics).not.toBeNull()
  expect(metrics!.position).toBe('absolute')
  expect(metrics!.transform).toBe('none')
  expect(metrics!.dropdownTop).toBeGreaterThanOrEqual(metrics!.inputBottom - 1)
  expect(metrics!.dropdownTop).toBeLessThanOrEqual(metrics!.inputBottom + 12)
  expect(metrics!.leftDelta).toBeLessThanOrEqual(1)
  expect(metrics!.searchbarWidth).toBeLessThanOrEqual(metrics!.expectedMaxWidth + 1)
  expect(metrics!.dropdownWidth).toBeLessThanOrEqual(metrics!.expectedMaxWidth + 1)
})
