import type { Page } from '@playwright/test'

export type ActivityFixtureOverrides = Record<string, unknown>

interface ActivityFixtureApi {
  saveActivity?: (data: Record<string, unknown>) => Promise<unknown>
}

export function getCurrentMonthRef(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return `${mm}/${yyyy}`
}

export function getUniqueMonthSequence(seed: number, count: number): string[] {
  const startYear = 2040 + (seed % 500)
  const startMonthIndex = seed % 12

  return Array.from({ length: count }, (_, index) => {
    const absoluteMonthIndex = startMonthIndex + index
    const month = (absoluteMonthIndex % 12) + 1
    const year = startYear + Math.floor(absoluteMonthIndex / 12)

    return `${String(month).padStart(2, '0')}/${year}`
  })
}

export async function createActivityRecord(
  page: Page,
  description: string,
  monthReference = getCurrentMonthRef(),
  overrides: ActivityFixtureOverrides = {},
) {
  return page.evaluate(async ({ description, monthReference, overrides }) => {
    const api = (window as unknown as { electronAPI?: ActivityFixtureApi }).electronAPI

    if (!api?.saveActivity) {
      throw new Error('electronAPI.saveActivity indisponivel no E2E')
    }

    return api.saveActivity({
      description,
      date_start: null,
      date_end: null,
      status: 'Pendente',
      link_ref: null,
      svn_releases: null,
      attendance_type: null,
      month_reference: monthReference,
      project_scope: null,
      ...overrides,
    })
  }, { description, monthReference, overrides })
}

export async function createActivityThroughForm(
  page: Page,
  description: string,
  monthReference = getCurrentMonthRef(),
) {
  await page.click('[title="Atividades"]')
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 5_000 })

  await page.evaluate((month) => {
    window.location.hash = `#/activities?month=${month}`
  }, monthReference)
  await page.waitForURL((url) => url.toString().includes(`#/activities?month=${monthReference}`))

  await page.click('button:has-text("Nova Atividade")')

  const descInput = page.locator('textarea#description')
  await descInput.waitFor({ timeout: 5_000 })
  await descInput.fill(description)

  const monthInput = page.locator('input#month_reference')
  await monthInput.fill(monthReference)

  await page.click('button[type="submit"]')
  await page.waitForURL(/#\/activities(?:\?.*)?$/, { timeout: 10_000 })
  await page.waitForSelector('h1:has-text("Atividades")', { timeout: 10_000 })
}
