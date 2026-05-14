import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PRODUCTION_USER_DATA_DIR_NAME, SHIPIT_TEST_PROFILE_MARKER, SHIPIT_TEST_PROFILE_PREFIX } from '../electron/runtime-paths'
import {
  createActivityRecord as createActivityFixtureRecord,
  createActivityThroughForm,
  getUniqueMonthSequence,
  type ActivityFixtureOverrides,
} from './fixtures/activityFixtures'
import {
  createShipItTestProfileDir,
  createShipItTestProfileEnv,
  removeShipItTestProfileDir,
  removeShipItTestProfileDirWithRetries,
} from './fixtures/testProfile'

let app: ElectronApplication
let page: Page
let testUserDataDir: string

test.beforeAll(async () => {
  testUserDataDir = createShipItTestProfileDir()

  app = await electron.launch({
    args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
    env: createShipItTestProfileEnv(process.env, testUserDataDir),
  })

  page = await app.firstWindow()

  // Wait for the page to finish loading
  await page.waitForLoadState('domcontentloaded')
  // Give React extra time to mount + run effects
  await page.waitForTimeout(2_000)
})

test.afterAll(async () => {
  // Force kill — the tray intercepts normal close and app.quit waits for handlers
  try {
    if (app) {
      await app.evaluate(({ app }) => {
        app.exit(0)
      }).catch(() => {})
      await app.close().catch(() => {})
    }
  } finally {
    if (testUserDataDir) {
      try {
        await removeShipItTestProfileDirWithRetries(testUserDataDir)
      } catch (error) {
        console.error('Falha ao limpar perfil temporario do E2E:', error)
      }
    }
  }
})

function menuItemSelector(commandId: string): string {
  return `#titlebar-menu-item-${commandId.replace(/\./g, '-')}`
}

async function clickMenuCommand(sectionId: string, commandId: string) {
  await page.click(`#titlebar-menu-btn-${sectionId}`)
  await page.click(menuItemSelector(commandId))
}

async function selectComboboxOption(triggerSelector: string, optionLabel: string) {
  await page.locator(triggerSelector).click()
  await page.getByRole('option', { name: optionLabel }).click()
}

async function restoreMainWindow() {
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    if (win.isMaximized()) win.unmaximize()
    win.show()
    win.focus()
  })
}

async function createActivityRecord(
  description: string,
  monthReference?: string,
  overrides: ActivityFixtureOverrides = {},
) {
  return createActivityFixtureRecord(page, description, monthReference, overrides)
}

async function createActivity(description: string, monthReference?: string) {
  await createActivityThroughForm(page, description, monthReference)
}

// ──── Window ────

test('window starts visible', async () => {
  const isVisible = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return win?.isVisible() ?? false
  })
  expect(isVisible).toBe(true)
})

test('uses isolated test userData profile with safety marker', async () => {
  const profile = await app.evaluate(({ app }) => {
    return {
      userData: app.getPath('userData'),
      appData: app.getPath('appData'),
    }
  })
  const productionUserData = path.join(profile.appData, PRODUCTION_USER_DATA_DIR_NAME)

  expect(path.resolve(profile.userData)).toBe(path.resolve(testUserDataDir))
  expect(path.basename(profile.userData).startsWith(SHIPIT_TEST_PROFILE_PREFIX)).toBe(true)
  expect(path.basename(productionUserData)).toBe('shipit')
  expect(fs.existsSync(path.join(profile.userData, SHIPIT_TEST_PROFILE_MARKER))).toBe(true)
  expect(path.resolve(profile.userData).toLowerCase()).not.toBe(path.resolve(productionUserData).toLowerCase())
})

test('removes only marked temporary test profiles', async () => {
  const markedDir = createShipItTestProfileDir()
  const unsafeDir = fs.mkdtempSync(path.join(os.tmpdir(), SHIPIT_TEST_PROFILE_PREFIX))

  fs.mkdirSync(path.join(markedDir, 'evidences'), { recursive: true })
  fs.mkdirSync(path.join(markedDir, 'reports'), { recursive: true })
  fs.writeFileSync(path.join(markedDir, 'settings.json'), '{}', 'utf-8')
  fs.writeFileSync(path.join(markedDir, 'evidences', 'artifact.txt'), 'teste', 'utf-8')

  removeShipItTestProfileDir(markedDir)
  expect(fs.existsSync(markedDir)).toBe(false)

  expect(() => removeShipItTestProfileDir(unsafeDir)).toThrow(/marcador|prefixo/)
  expect(fs.existsSync(path.join(unsafeDir, SHIPIT_TEST_PROFILE_MARKER))).toBe(false)
  fs.rmSync(unsafeDir, { recursive: true, force: true })
})

test('controls real window state from titlebar buttons', async () => {
  await restoreMainWindow()

  const minimizeButton = page.locator('#titlebar-btn-minimize')
  const maximizeButton = page.locator('#titlebar-btn-maximize')
  const closeButton = page.locator('#titlebar-btn-close')

  await minimizeButton.click()
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMinimized() ?? false)
  }).toBe(true)

  await restoreMainWindow()
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible() ?? false)
  }).toBe(true)

  await expect(maximizeButton).toHaveAttribute('aria-label', 'Maximizar janela')
  await maximizeButton.click()
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
  }).toBe(true)
  await expect(maximizeButton).toHaveAttribute('aria-label', 'Restaurar janela')

  await maximizeButton.click()
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
  }).toBe(false)
  await expect(maximizeButton).toHaveAttribute('aria-label', 'Maximizar janela')

  await closeButton.click()
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible() ?? false)
  }).toBe(false)
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isDestroyed() ?? true)
  }).toBe(false)

  await restoreMainWindow()
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

test('saves and reloads availability fields on the profile page', async () => {
  await page.click('[title="Perfil"]')
  await page.waitForURL(/#\/profile/)

  await page.locator('#full_name').fill('MARIA SILVA')
  await selectComboboxOption('#role', 'ENGENHEIRO DE SOFTWARE')
  await selectComboboxOption('#seniority_level', 'Pleno')
  await page.locator('#contract_identifier').fill('CT-AVAIL-001')
  await selectComboboxOption('#profile_type', 'DEV-03')
  await selectComboboxOption('#attendance_type', 'Remoto')
  await page.locator('#project_scope').fill('Squad Alpha')
  await page.locator('#correlating_activities').fill('Desenvolvimento de software e sustentação.')
  await page.locator('#daily_availability').fill('8')
  await page.locator('#monthly_availability').fill('168')
  await page.locator('#minimum_effort_hours').fill('40')

  await page.locator('#profile-btn-submit').click()
  await page.waitForURL(/#\/$/)

  await page.click('[title="Perfil"]')
  await page.waitForURL(/#\/profile/)

  await expect(page.locator('h1')).toHaveText('Editar Perfil')
  await expect(page.locator('#daily_availability')).toHaveValue('8')
  await expect(page.locator('#monthly_availability')).toHaveValue('168')
  await expect(page.locator('#minimum_effort_hours')).toHaveValue('40')

  const profile = await page.evaluate(async () => {
    return window.electronAPI?.getUserProfile() ?? null
  })

  expect(profile?.daily_availability).toBe(8)
  expect(profile?.monthly_availability).toBe(168)
  expect(profile?.minimum_effort_hours).toBe(40)
})

test('opens external links outside the app without changing current route', async () => {
  await app.evaluate(({ shell }) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitOpenExternalCalls?: string[]
      __shipitRestoreOpenExternal?: () => void
    }

    const calls: string[] = []
    const originalOpenExternal = shell.openExternal

    shell.openExternal = async (url: string) => {
      calls.push(url)
    }

    globalState.__shipitOpenExternalCalls = calls
    globalState.__shipitRestoreOpenExternal = () => {
      shell.openExternal = originalOpenExternal
    }
  })

  try {
    await page.click('[title="Configurações"]')
    await page.waitForURL(/#\/settings/)
    const currentUrl = page.url()

    await page.locator('a[href^="mailto:"]').first().click()

    await expect(page).toHaveURL(currentUrl)
    await expect.poll(async () => {
      return app.evaluate(() => {
        const globalState = globalThis as typeof globalThis & {
          __shipitOpenExternalCalls?: string[]
        }
        return globalState.__shipitOpenExternalCalls?.length ?? 0
      })
    }).toBeGreaterThan(0)

    const openExternalCalls = await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitOpenExternalCalls?: string[]
      }
      return globalState.__shipitOpenExternalCalls ?? []
    })

    expect(openExternalCalls).toContain('mailto:mauro.rocha.t@gmail.com')
  } finally {
    await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitOpenExternalCalls?: string[]
        __shipitRestoreOpenExternal?: () => void
      }
      globalState.__shipitRestoreOpenExternal?.()
      delete globalState.__shipitRestoreOpenExternal
      delete globalState.__shipitOpenExternalCalls
    })
  }
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

test('keeps at least 10 entries in titlebar history stack', async () => {
  // Reset app state so this test validates history depth from a clean stack.
  await page.evaluate(() => {
    window.location.hash = '#/'
    window.location.reload()
  })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(900)

  for (let i = 0; i < 12; i++) {
    await page.evaluate((idx) => {
      window.location.hash = `#/activities?search=hist-depth-${idx}`
    }, i)
    await page.waitForURL(new RegExp(`#/activities\\?search=hist-depth-${i}$`))
  }

  const backButton = page.locator('#titlebar-btn-back')

  for (let step = 0; step < 10; step++) {
    await expect(backButton).toBeEnabled()
    await backButton.click()
    await page.waitForTimeout(150)
  }

  await expect(page).toHaveURL(/#\/activities\?search=hist-depth-1$/)
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

test('opens and closes app menu sections with mouse and Escape', async () => {
  const fileMenuButton = page.locator('#titlebar-menu-btn-file')
  const fileMenuPanel = page.locator('#titlebar-menu-panel-file')

  await fileMenuButton.click()
  await expect(fileMenuPanel).toBeVisible({ timeout: 5_000 })

  await page.keyboard.press('Escape')
  await expect(fileMenuPanel).toBeHidden({ timeout: 5_000 })

  await fileMenuButton.click()
  await expect(fileMenuPanel).toBeVisible({ timeout: 5_000 })

  await page.locator('#app-main').click()
  await expect(fileMenuPanel).toBeHidden({ timeout: 5_000 })
})

test('supports full keyboard navigation across top menu sections', async () => {
  await page.locator('#titlebar-menu-btn-file').focus()
  await page.keyboard.press('ArrowDown')

  await expect(page.locator('#titlebar-menu-panel-file')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#titlebar-menu-item-file-new-activity')).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#titlebar-menu-item-file-open-reports-folder')).toBeFocused()

  await page.keyboard.press('ArrowUp')
  await expect(page.locator('#titlebar-menu-item-file-new-activity')).toBeFocused()

  await page.keyboard.press('End')
  await expect(page.locator('#titlebar-menu-item-file-quit')).toBeFocused()

  await page.keyboard.press('Home')
  await expect(page.locator('#titlebar-menu-item-file-new-activity')).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#titlebar-menu-panel-edit')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#titlebar-menu-item-edit-undo')).toBeFocused()

  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#titlebar-menu-panel-file')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#titlebar-menu-item-file-new-activity')).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(page.locator('#titlebar-menu-panel-file')).toBeHidden({ timeout: 5_000 })
})

test('runs file menu commands with safe instrumentation', async () => {
  await app.evaluate(({ shell }) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitOpenPathCalls?: string[]
      __shipitRestoreOpenPath?: () => void
    }

    const calls: string[] = []
    const originalOpenPath = shell.openPath

    shell.openPath = async (targetPath: string) => {
      calls.push(targetPath)
      return ''
    }

    globalState.__shipitOpenPathCalls = calls
    globalState.__shipitRestoreOpenPath = () => {
      shell.openPath = originalOpenPath
    }
  })

  try {
    const runId = Date.now()
    const [monthRef] = getUniqueMonthSequence(runId, 1)
    const description = `Atividade Salvar Menu ${runId}`

    await clickMenuCommand('file', 'file.new-activity')
    await page.waitForURL(/#\/activities\/new$/)

    await page.locator('textarea#description').fill(description)
    await page.locator('input#month_reference').fill(monthRef)
    await clickMenuCommand('file', 'file.save-context')

    await expect.poll(async () => {
      return page.evaluate(async (description) => {
        const api = (window as unknown as { electronAPI?: { searchActivities?: (query: string) => Promise<Array<{ description?: string }>> } }).electronAPI
        const results = await api?.searchActivities?.(description)
        return results?.some((activity) => activity.description === description) ?? false
      }, description)
    }, { timeout: 1_000, intervals: [100, 150, 250] }).toBe(true)

    await clickMenuCommand('file', 'file.settings')
    await page.waitForURL(/#\/settings$/)

    await clickMenuCommand('file', 'file.open-reports-folder')
    await clickMenuCommand('file', 'file.open-evidences-folder')

    await expect.poll(async () => {
      return app.evaluate(() => {
        const globalState = globalThis as typeof globalThis & { __shipitOpenPathCalls?: string[] }
        return globalState.__shipitOpenPathCalls?.length ?? 0
      })
    }).toBe(2)

    const openPathCalls = await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & { __shipitOpenPathCalls?: string[] }
      return globalState.__shipitOpenPathCalls ?? []
    })

    expect(openPathCalls[0]).toBeTruthy()
    expect(openPathCalls[1]).toMatch(/evidences$/i)
  } finally {
    await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitOpenPathCalls?: string[]
        __shipitRestoreOpenPath?: () => void
      }
      globalState.__shipitRestoreOpenPath?.()
      delete globalState.__shipitRestoreOpenPath
      delete globalState.__shipitOpenPathCalls
    })
  }
})

test('runs edit menu commands against active webContents', async () => {
  await app.evaluate(({ BrowserWindow }) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitEditCalls?: string[]
      __shipitRestoreEditCommands?: () => void
    }
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) throw new Error('Janela principal indisponível')

    const webContents = win.webContents as unknown as Record<string, () => void>
    const methods = ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']
    const originals = new Map<string, () => void>()
    const calls: string[] = []

    for (const method of methods) {
      originals.set(method, webContents[method])
      webContents[method] = () => {
        calls.push(method)
      }
    }

    globalState.__shipitEditCalls = calls
    globalState.__shipitRestoreEditCommands = () => {
      for (const [method, original] of originals) {
        webContents[method] = original
      }
    }
  })

  try {
    await clickMenuCommand('edit', 'edit.undo')
    await clickMenuCommand('edit', 'edit.redo')
    await clickMenuCommand('edit', 'edit.cut')
    await clickMenuCommand('edit', 'edit.copy')
    await clickMenuCommand('edit', 'edit.paste')
    await clickMenuCommand('edit', 'edit.select-all')

    const editCalls = await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & { __shipitEditCalls?: string[] }
      return globalState.__shipitEditCalls ?? []
    })

    expect(editCalls).toEqual(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'])

    await clickMenuCommand('edit', 'edit.focus-search')
    await expect(page.locator('#searchbar-input')).toBeFocused()
  } finally {
    await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitEditCalls?: string[]
        __shipitRestoreEditCommands?: () => void
      }
      globalState.__shipitRestoreEditCommands?.()
      delete globalState.__shipitRestoreEditCommands
      delete globalState.__shipitEditCalls
    })
  }
})

test('runs view menu zoom and window commands', async () => {
  await restoreMainWindow()
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.setZoomLevel(0)
  })

  await clickMenuCommand('view', 'view.zoom-in')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.getZoomLevel() ?? 0)
  }).toBe(0.5)

  await clickMenuCommand('view', 'view.zoom-out')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.getZoomLevel() ?? 0)
  }).toBe(0)

  await clickMenuCommand('view', 'view.zoom-in')
  await clickMenuCommand('view', 'view.zoom-reset')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.webContents.getZoomLevel() ?? 0)
  }).toBe(0)

  await clickMenuCommand('view', 'view.window-maximize')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
  }).toBe(true)

  await clickMenuCommand('view', 'view.window-maximize')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
  }).toBe(false)

  await clickMenuCommand('view', 'view.window-minimize')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMinimized() ?? false)
  }).toBe(true)

  await restoreMainWindow()

  await clickMenuCommand('view', 'view.window-close')
  await expect.poll(async () => {
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible() ?? false)
  }).toBe(false)

  await restoreMainWindow()
})

test('runs help menu actions for manual and report issue', async () => {
  await app.evaluate(({ shell }) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitOpenExternalCalls?: string[]
      __shipitRestoreOpenExternal?: () => void
    }

    const calls: string[] = []
    const originalOpenExternal = shell.openExternal

    shell.openExternal = async (url: string) => {
      calls.push(url)
    }

    globalState.__shipitOpenExternalCalls = calls
    globalState.__shipitRestoreOpenExternal = () => {
      shell.openExternal = originalOpenExternal
    }
  })

  try {
    await clickMenuCommand('help', 'help.about')
    await expect(page.locator('#sidebar-about-modal')).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('#sidebar-about-modal')).toHaveCount(0)

    await clickMenuCommand('help', 'help.check-updates')
    // help.check-updates opens the titlebar update modal instead of navigating.
    const updateModal = page.locator('#titlebar-update-modal')
    await expect(updateModal).toBeVisible({ timeout: 5_000 })
    await expect(updateModal.locator('#update-modal-btn-check')).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
    await expect(updateModal).toHaveCount(0, { timeout: 5_000 })

    await page.click('#titlebar-menu-btn-help')
    await page.click('#titlebar-menu-item-help-user-manual')
    await page.waitForURL(/#\/manual$/)

    const manualUrl = page.url()

    await page.click('#titlebar-menu-btn-help')
    await page.click('#titlebar-menu-item-help-report-issue')

    await expect(page).toHaveURL(manualUrl)

    await expect.poll(async () => {
      return app.evaluate(() => {
        const globalState = globalThis as typeof globalThis & {
          __shipitOpenExternalCalls?: string[]
        }
        return globalState.__shipitOpenExternalCalls?.length ?? 0
      })
    }).toBeGreaterThan(0)

    const openExternalCalls = await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitOpenExternalCalls?: string[]
      }
      return globalState.__shipitOpenExternalCalls ?? []
    })

    expect(openExternalCalls).toContain('https://github.com/NeuronioAzul/shipit/issues/new')
  } finally {
    await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitOpenExternalCalls?: string[]
        __shipitRestoreOpenExternal?: () => void
      }
      globalState.__shipitRestoreOpenExternal?.()
      delete globalState.__shipitRestoreOpenExternal
      delete globalState.__shipitOpenExternalCalls
    }).catch(() => { /* main process may already be torn down on timeout */ })
  }
})

test('supports app menu keyboard shortcuts for search focus and new activity', async () => {
  await page.locator('#app-main').click()
  await page.keyboard.press('Control+f')
  await expect(page.locator('#searchbar-input')).toBeFocused()

  await page.locator('#app-main').click()
  await page.keyboard.press('Control+n')
  await page.waitForURL(/#\/activities\/new$/)
  await expect(page.locator('h1:has-text("Nova Atividade")')).toBeVisible({ timeout: 5_000 })
})

test('keeps top menu dropdown anchored in cyberpunk theme', async () => {
  await page.click('[title="Configurações"]')
  await page.waitForURL(/#\/settings/)
  await page.click('button[aria-label="Tema Cyberpunk"]')

  const html = page.locator('html')
  await expect(html).toHaveClass(/(?:^|\s)cyberpunk(?:\s|$)/)

  await page.click('#titlebar-menu-btn-file')
  await expect(page.locator('#titlebar-menu-panel-file')).toBeVisible({ timeout: 5_000 })

  const metrics = await page.evaluate(() => {
    const trigger = document.getElementById('titlebar-menu-btn-file')
    const panel = document.getElementById('titlebar-menu-panel-file')

    if (!trigger || !panel) return null

    const triggerRect = trigger.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const style = getComputedStyle(panel)

    return {
      position: style.position,
      panelTop: panelRect.top,
      gapFromTrigger: panelRect.top - triggerRect.bottom,
    }
  })

  expect(metrics).not.toBeNull()
  expect(metrics!.position).toBe('absolute')
  expect(metrics!.panelTop).toBeGreaterThanOrEqual(0)
  expect(metrics!.gapFromTrigger).toBeGreaterThanOrEqual(0)
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
  await page.locator('#app-main').click()
  await page.keyboard.press(backwardDirection)
  await page.waitForURL(firstDetailUrl)
})

test('replaces nav mode toggle with month selector and updates detail navigation context', async () => {
  const runId = Date.now()
  const [monthA, monthB, monthC] = getUniqueMonthSequence(runId, 3)
  const activityA = `Atividade Detalhe Mês ${runId} A`
  const activityB = `Atividade Detalhe Mês ${runId} B`

  await createActivity(activityA, monthA)
  await createActivity(activityB, monthB)

  await page.evaluate((month) => {
    window.location.hash = `#/activities?month=${month}`
  }, monthB)
  await page.waitForURL((url) => url.hash === `#/activities?month=${monthB}`)
  await expect(page.locator('.flex-1.cursor-pointer', { hasText: activityB }).first()).toBeVisible({ timeout: 5_000 })

  await page.evaluate((month) => {
    window.location.hash = `#/activities?month=${month}`
  }, monthA)
  await page.waitForURL((url) => url.hash === `#/activities?month=${monthA}`)

  await page.locator('.flex-1.cursor-pointer', { hasText: activityA }).first().click()
  await page.waitForURL(/#\/activities\/[^/?#]+$/)

  await expect(page.locator('#activity-nav-mode-toggle')).toHaveCount(0)

  const monthLabel = page.locator('#activity-nav-month-label').first()
  await expect(monthLabel).toHaveText(monthA)

  await page.locator('#activity-nav-btn-next-month').first().click()
  await expect(monthLabel).toHaveText(monthB)
  await expect(page.locator('#activity-detail-info')).toContainText(activityB)

  await page.locator('#activity-nav-btn-next-month').first().click()
  await expect(monthLabel).toHaveText(monthC)

  const emptyMonthState = page.locator('#activity-detail-empty-month')
  await expect(emptyMonthState).toBeVisible({ timeout: 5_000 })
  await expect(emptyMonthState).toContainText('Mês sem atividades cadastradas')
  await expect(emptyMonthState).toContainText(monthC)
})

test('opens, cancels and confirms activity deletion on detail page', async () => {
  const runId = Date.now()
  const monthRef = '12/2036'
  const description = `Atividade Excluir Detalhe ${runId}`

  await createActivity(description, monthRef)

  await page.evaluate((month) => {
    window.location.hash = `#/activities?month=${month}`
  }, monthRef)
  await page.waitForURL(/#\/activities\?month=12\/2036$/)

  await page.locator('.flex-1.cursor-pointer', { hasText: description }).first().click()
  await page.waitForURL(/#\/activities\/[^/?#]+$/)

  const detailUrl = page.url()
  const deleteButton = page.locator('#activity-detail-btn-delete')
  const deleteModal = page.locator('#activity-detail-delete-modal')

  await deleteButton.click()
  await expect(deleteModal).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press('Escape')
  await expect(deleteModal).toHaveCount(0)

  await deleteButton.click()
  await expect(deleteModal).toBeVisible({ timeout: 5_000 })
  await deleteModal.locator('button:has-text("Cancelar")').click()
  await expect(deleteModal).toHaveCount(0)
  await expect(page).toHaveURL(detailUrl)

  await deleteButton.click()
  await expect(deleteModal).toBeVisible({ timeout: 5_000 })
  await deleteModal.locator('#activity-detail-confirm-delete').click()

  await page.waitForURL(/#\/activities\?month=12\/2036$/)
  await expect(page.locator('.flex-1.cursor-pointer', { hasText: description })).toHaveCount(0)
})

test('searches from titlebar with debounce, keyboard navigation and close behavior', async () => {
  const runId = Date.now()
  const [monthRef] = getUniqueMonthSequence(runId, 1)
  const query = `Busca Titlebar ${runId}`
  const noMatchQuery = `Sem Resultado ${runId}`

  for (let index = 0; index < 12; index++) {
    await createActivityRecord(`${query} Item ${String(index).padStart(2, '0')}`, monthRef)
  }

  await page.locator('#app-main').click()
  await page.keyboard.press('Control+k')

  const input = page.locator('#searchbar-input')
  const dropdown = page.locator('#searchbar-results')
  const resultButtons = dropdown.locator('button[id^="searchbar-result-"]')

  await expect(input).toBeFocused()
  await expect(page.locator('#searchbar-magnifier')).toBeVisible()

  await input.fill(query.slice(0, 1))
  await expect(dropdown).toHaveCount(0)

  await input.fill(query)
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await expect(resultButtons).toHaveCount(10)
  await expect(dropdown.locator('mark').first()).toHaveText(query)
  await expect(dropdown.locator('button', { hasText: `Filtro avançado para "${query}"` })).toBeVisible()

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#searchbar-result-0')).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#searchbar-result-1')).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('ArrowUp')
  await expect(page.locator('#searchbar-result-0')).toHaveAttribute('data-selected', 'true')

  await page.keyboard.press('Enter')
  await page.waitForURL(/#\/activities\/[^/?#]+$/)
  await expect(page.locator('#activity-detail-info')).toContainText(`${query} Item 00`, { timeout: 5_000 })

  await page.keyboard.press('Control+k')
  await input.fill(query)
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press('Enter')
  await page.waitForURL((url) => url.hash === `#/activities?search=${encodeURIComponent(query)}`)

  await page.keyboard.press('Control+k')
  await input.fill(noMatchQuery)
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#searchbar-empty')).toBeVisible({ timeout: 5_000 })

  await input.fill(query)
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press('Escape')
  await expect(dropdown).toHaveCount(0)
  await expect(input).not.toBeFocused()

  await page.keyboard.press('Control+k')
  await input.fill(query)
  await expect(dropdown).toBeVisible({ timeout: 5_000 })
  await page.locator('#app-main').click()
  await expect(dropdown).toHaveCount(0)
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

// ──── Update Flow ────

type FakeCheckOutcome = 'not-available' | 'available' | 'error' | 'silent'
type FakeDownloadOutcome = 'downloaded' | 'error'

async function configureFakeUpdaterCheck(behavior: {
  outcome: FakeCheckOutcome
  version?: string
  error?: string
}) {
  await app.evaluate((_electron, payload) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitFakeUpdater?: {
        __setCheckBehavior: (b: typeof payload) => void
      }
    }
    globalState.__shipitFakeUpdater?.__setCheckBehavior(payload)
  }, behavior)
}

async function configureFakeUpdaterDownload(behavior: {
  outcome: FakeDownloadOutcome
  version?: string
  error?: string
  progress?: number[]
}) {
  await app.evaluate((_electron, payload) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitFakeUpdater?: {
        __setDownloadBehavior: (b: typeof payload) => void
      }
    }
    globalState.__shipitFakeUpdater?.__setDownloadBehavior(payload)
  }, behavior)
}

async function resetFakeUpdater() {
  await app.evaluate(() => {
    const globalState = globalThis as typeof globalThis & {
      __shipitFakeUpdater?: { __reset: () => void }
      __shipitResetUpdateService?: () => void
    }
    globalState.__shipitFakeUpdater?.__reset()
    globalState.__shipitResetUpdateService?.()
  })
}

async function getFakeUpdaterQuitInstallCalls(): Promise<number> {
  return app.evaluate(() => {
    const globalState = globalThis as typeof globalThis & {
      __shipitFakeUpdater?: { __getQuitAndInstallCalls: () => number }
    }
    return globalState.__shipitFakeUpdater?.__getQuitAndInstallCalls() ?? 0
  })
}

async function openUpdateSection() {
  await page.click('[title="Configurações"]')
  await page.waitForURL(/#\/settings/)
  await expect(page.locator('#settings-update-section')).toBeVisible({ timeout: 5_000 })
}

test('fake updater is wired up under SHIPIT_E2E_FAKE_UPDATER', async () => {
  const isWired = await app.evaluate(() => {
    const globalState = globalThis as typeof globalThis & { __shipitFakeUpdater?: unknown }
    return Boolean(globalState.__shipitFakeUpdater)
  })
  expect(isWired).toBe(true)
})

test('settles to not-available without leaving the spinner stuck', async () => {
  await resetFakeUpdater()
  await configureFakeUpdaterCheck({ outcome: 'not-available' })
  await openUpdateSection()

  const checkButton = page.locator('#settings-update-btn-check')
  const status = page.locator('#settings-update-status')

  await checkButton.click()
  await expect(checkButton).toBeEnabled({ timeout: 5_000 })
  await expect(checkButton.locator('i.fa-spin')).toHaveCount(0)
  await expect(status).toContainText('Você está na versão mais recente.')
})

test('settles to available, downloads and exposes install action through the real IPC path', async () => {
  await resetFakeUpdater()
  await configureFakeUpdaterCheck({ outcome: 'available', version: '9.9.9' })
  await configureFakeUpdaterDownload({ outcome: 'downloaded', version: '9.9.9', progress: [40, 100] })
  await openUpdateSection()

  await page.locator('#settings-update-btn-check').click()

  const downloadButton = page.locator('#settings-update-btn-download')
  await expect(downloadButton).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#settings-update-status')).toContainText('Versão 9.9.9 pronta para download.')
  await expect(page.locator('#settings-update-attention-badge')).toBeVisible()

  await downloadButton.click()

  const installButton = page.locator('#settings-update-btn-install')
  await expect(installButton).toBeVisible({ timeout: 5_000 })
  await expect(installButton).toContainText('Instalar agora')
  await expect(page.locator('#settings-update-status')).toContainText('Versão 9.9.9 baixada.')

  await installButton.click()
  await expect.poll(() => getFakeUpdaterQuitInstallCalls()).toBeGreaterThanOrEqual(1)
})

test('surfaces error state when the autoUpdater emits an error event', async () => {
  await resetFakeUpdater()
  await configureFakeUpdaterCheck({ outcome: 'error', error: 'Falha simulada de rede' })
  await openUpdateSection()

  await page.locator('#settings-update-btn-check').click()

  const checkButton = page.locator('#settings-update-btn-check')
  await expect(checkButton).toBeEnabled({ timeout: 5_000 })
  await expect(checkButton.locator('i.fa-spin')).toHaveCount(0)
  await expect(page.locator('#settings-update-status')).toContainText('Falha simulada de rede')
})

test('regression: silent check resolution still settles the UI (1.3.6 → 1.3.7 stuck spinner)', async () => {
  await resetFakeUpdater()
  // 'silent' resolves the checkForUpdates promise without emitting a terminal
  // event. The service's post-await fallback must broadcast 'available' based
  // on the resolved updateInfo so the UI does not get stuck on "Verificando".
  await configureFakeUpdaterCheck({ outcome: 'silent', version: '9.9.9' })
  await openUpdateSection()

  await page.locator('#settings-update-btn-check').click()

  const downloadButton = page.locator('#settings-update-btn-download')
  await expect(downloadButton).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('#settings-update-status')).toContainText('Versão 9.9.9 pronta para download.')
})

test('regression: silent resolution with no remote version settles to not-available', async () => {
  await resetFakeUpdater()
  await configureFakeUpdaterCheck({ outcome: 'silent' })
  await openUpdateSection()

  await page.locator('#settings-update-btn-check').click()
  await expect(page.locator('#settings-update-status')).toContainText('Você está na versão mais recente.', { timeout: 5_000 })
  await expect(page.locator('#settings-update-btn-check')).toBeEnabled()
})

test('routes quit menu command through Electron without ending the suite', async () => {
  await app.evaluate(({ app }) => {
    const globalState = globalThis as typeof globalThis & {
      __shipitQuitCalls?: number
      __shipitRestoreQuit?: () => void
    }

    const originalQuit = app.quit
    globalState.__shipitQuitCalls = 0
    app.quit = () => {
      globalState.__shipitQuitCalls = (globalState.__shipitQuitCalls ?? 0) + 1
    }
    globalState.__shipitRestoreQuit = () => {
      app.quit = originalQuit
    }
  })

  try {
    await restoreMainWindow()
    await clickMenuCommand('file', 'file.quit')

    await expect.poll(async () => {
      return app.evaluate(() => {
        const globalState = globalThis as typeof globalThis & { __shipitQuitCalls?: number }
        return globalState.__shipitQuitCalls ?? 0
      })
    }).toBe(1)
  } finally {
    await app.evaluate(() => {
      const globalState = globalThis as typeof globalThis & {
        __shipitQuitCalls?: number
        __shipitRestoreQuit?: () => void
      }
      globalState.__shipitRestoreQuit?.()
      delete globalState.__shipitRestoreQuit
      delete globalState.__shipitQuitCalls
    })
  }
})
