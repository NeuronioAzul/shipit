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

async function createActivity(description: string) {
  await page.click('[title="Atividades"]')
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 5_000 })

  await page.click('button:has-text("Nova Atividade")')

  const descInput = page.locator('textarea#description')
  await descInput.waitFor({ timeout: 5_000 })
  await descInput.fill(description)

  await page.click('button[type="submit"]')
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 5_000 })
}

// ──── Window ────

test('window starts visible', async () => {
  const isVisible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return win?.isVisible() ?? false
  })
  expect(isVisible).toBe(true)
})

test('shows titlebar navigation buttons disabled by default', async () => {
  await page.click('[title="Dashboard"]')
  await page.waitForURL(/#\/$/)

  const backButton = page.locator('#titlebar-btn-back')
  const forwardButton = page.locator('#titlebar-btn-forward')

  await expect(backButton).toBeVisible({ timeout: 5_000 })
  await expect(forwardButton).toBeVisible({ timeout: 5_000 })
  await expect(backButton).toBeDisabled()
  await expect(forwardButton).toBeDisabled()
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

test('navigates global history with titlebar buttons preserving query string', async () => {
  await page.evaluate(() => {
    window.location.hash = '#/profile'
  })
  await page.waitForURL(/#\/profile$/)
  const startUrl = page.url()

  await page.evaluate(() => {
    window.location.hash = '#/activities'
  })
  await page.waitForURL(/#\/activities$/)
  const activitiesUrl = page.url()

  await page.evaluate(() => {
    window.location.hash = '#/activities?search=historico-global-e2e'
  })
  await page.waitForURL(/#\/activities\?search=historico-global-e2e$/)
  const searchUrl = page.url()

  const backButton = page.locator('#titlebar-btn-back')
  const forwardButton = page.locator('#titlebar-btn-forward')

  await expect(backButton).toBeEnabled()

  await backButton.click()
  await page.waitForURL(activitiesUrl)

  await backButton.click()
  await page.waitForURL(startUrl)

  await forwardButton.click()
  await page.waitForURL(activitiesUrl)

  await forwardButton.click()
  await page.waitForURL(searchUrl)
})

test('supports global Alt+arrow shortcuts and respects typing focus guard', async () => {
  await page.evaluate(() => {
    window.location.hash = '#/profile'
  })
  await page.waitForURL(/#\/profile$/)
  const profileUrl = page.url()

  await page.evaluate(() => {
    window.location.hash = '#/settings'
  })
  await page.waitForURL(/#\/settings$/)
  const settingsUrl = page.url()

  const searchInput = page.locator('#searchbar-input')
  await searchInput.focus()
  await page.keyboard.press('Alt+ArrowLeft')
  await page.waitForTimeout(150)
  await expect(page).toHaveURL(settingsUrl)

  await page.locator('h1:has-text("Configurações")').click()
  await page.keyboard.press('Alt+ArrowLeft')
  await page.waitForURL(profileUrl)

  await page.locator('#app-main').click()
  await page.keyboard.press('Alt+ArrowRight')
  await page.waitForURL(settingsUrl)
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
      titlebarNav: readRegion('titlebar-nav'),
      searchbar: readRegion('searchbar'),
      titlebarControls: readRegion('titlebar-controls'),
    }
  })

  expect(regions.titlebar.styleAttr).toMatch(/(?:-webkit-)?app-region:\s*drag/)
  expect(regions.titlebar.inline).toBe('drag')

  // Central wrapper should not block drag globally.
  expect(regions.titlebarSearch.styleAttr).not.toContain('-webkit-app-region')

  // Interactive areas must explicitly opt out of drag.
  expect(regions.titlebarNav.styleAttr).toMatch(/(?:-webkit-)?app-region:\s*no-drag/)
  expect(regions.titlebarNav.inline).toBe('no-drag')
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
  await createActivity('Atividade E2E Playwright')

  // Verify the created activity appears
  await expect(page.locator('text=Atividade E2E Playwright').first()).toBeVisible({ timeout: 5_000 })
})

test('uses local ArrowLeft/ArrowRight navigation on activity detail page', async () => {
  const runId = Date.now()
  const activityA = `Atividade Navegação Local ${runId} A`
  const activityB = `Atividade Navegação Local ${runId} B`

  await createActivity(activityA)
  await createActivity(activityB)

  await page.evaluate(() => {
    window.location.hash = '#/activities'
  })
  await page.waitForURL(/#\/activities$/)

  await page.locator('.flex-1.cursor-pointer', { hasText: activityA }).first().click()
  await page.waitForURL(/#\/activities\/[^/?#]+$/)

  const firstDetailUrl = page.url()
  const prevEnabled = await page.locator('#activity-nav-btn-prev').first().isEnabled()
  const nextEnabled = await page.locator('#activity-nav-btn-next').first().isEnabled()
  const forwardDirection = nextEnabled ? 'ArrowRight' : prevEnabled ? 'ArrowLeft' : null

  expect(forwardDirection).not.toBeNull()

  const searchInput = page.locator('#searchbar-input')
  await searchInput.focus()
  await page.keyboard.press(forwardDirection!)
  await expect(page).toHaveURL(firstDetailUrl)

  await page.locator('#app-main').click()

  await page.keyboard.press(forwardDirection!)
  await page.waitForURL((url) => url.toString() !== firstDetailUrl)
  const secondDetailUrl = page.url()

  expect(secondDetailUrl).not.toBe(firstDetailUrl)

  const backwardDirection = forwardDirection === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'
  const backwardButton = backwardDirection === 'ArrowLeft'
    ? page.locator('#activity-nav-btn-prev').first()
    : page.locator('#activity-nav-btn-next').first()

  await expect(backwardButton).toBeEnabled({ timeout: 5_000 })
  await page.keyboard.press(backwardDirection)
  await page.waitForURL(firstDetailUrl)
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
