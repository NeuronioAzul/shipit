import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import JSZip from 'jszip'

// Mock electron modules before importing report-generator
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd(),
    getPath: (name: string) => {
      if (name === 'userData') return os.tmpdir()
      return os.tmpdir()
    },
  },
  shell: {
    showItemInFolder: vi.fn(),
  },
}))

import { generateDocxReport } from './report-generator'
import type { UserProfile } from './entities/UserProfile'
import type { Activity } from './entities/Activity'

const TEMPLATE_PATH = path.join(__dirname, '__fixtures__', 'template.docx')
let outDir: string

beforeAll(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-test-'))
})

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true })
})

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 1,
    full_name: 'MAURO ROCHA TAVARES',
    role: 'ENGENHEIRO DE SOFTWARE',
    seniority_level: 'Pleno',
    contract_identifier: 'CT-001/2026',
    profile_type: 'Técnico',
    correlating_activities: 'Desenvolvimento de software',
    attendance_type: 'Remoto',
    project_scope: 'Squad Alpha',
    last_updated: new Date(),
    alert: null as any,
    ...overrides,
  } as UserProfile
}

function makeActivity(overrides?: Partial<Activity>): Activity {
  return {
    id: '019746ab-0000-7000-8000-000000000001',
    order: 1,
    description: 'Implementar feature de relatórios DOCX',
    date_start: '2026-03-01',
    date_end: '2026-03-15',
    status: 'Concluído',
    month_reference: '03/2026',
    attendance_type: 'Remoto',
    project_scope: 'Squad Alpha',
    last_updated: new Date(),
    link_ref: null,
    evidences: [],
    ...overrides,
  } as Activity
}

describe('generateDocxReport', () => {
  it('generates a DOCX file without errors for 1 activity with no evidences', async () => {
    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [makeActivity()],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    expect(result.filePath).toBeTruthy()
    expect(result.reportName).toBeTruthy()
    expect(fs.existsSync(result.filePath)).toBe(true)
  })

  it('generates report with correct MEC naming convention', async () => {
    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [makeActivity()],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    // Pattern: RELATÓRIO DE SERVIÇO - ROLE_NAME_MONTH.docx
    expect(result.reportName).toMatch(/^RELATÓRIO DE SERVIÇO - /)
    expect(result.reportName).toContain('ENGENHEIRO DE SOFTWARE')
    expect(result.reportName).toContain('MAURO_ROCHA_TAVARES')
    expect(result.reportName).toContain('MARÇO')
    expect(result.reportName.endsWith('.docx')).toBe(true)
  })

  it('produces a valid ZIP (DOCX) with document.xml containing replaced placeholders', async () => {
    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [makeActivity()],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    const buf = fs.readFileSync(result.filePath)
    const zip = await JSZip.loadAsync(buf)

    // Verify essential DOCX structure exists
    expect(zip.file('word/document.xml')).toBeTruthy()
    expect(zip.file('[Content_Types].xml')).toBeTruthy()
    expect(zip.file('word/_rels/document.xml.rels')).toBeTruthy()

    // Verify placeholders have been replaced
    const docXml = await zip.file('word/document.xml')!.async('string')
    expect(docXml).not.toContain('{{full_name}}')
    expect(docXml).not.toContain('{{contract_number}}')
    expect(docXml).not.toContain('{{role}}')
    expect(docXml).toContain('MAURO ROCHA TAVARES')
    expect(docXml).toContain('CT-001/2026')
  })

  it('handles multiple activities from different projects', async () => {
    const activities = [
      makeActivity({
        id: '019746ab-0000-7000-8000-000000000001',
        order: 1,
        description: 'Atividade do projeto Alpha',
        project_scope: 'Squad Alpha',
      }),
      makeActivity({
        id: '019746ab-0000-7000-8000-000000000002',
        order: 2,
        description: 'Atividade do projeto Beta',
        project_scope: 'Squad Beta',
      }),
    ]

    const result = await generateDocxReport({
      profile: makeProfile(),
      activities,
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    const buf = fs.readFileSync(result.filePath)
    const zip = await JSZip.loadAsync(buf)
    const docXml = await zip.file('word/document.xml')!.async('string')

    expect(docXml).toContain('Squad Alpha')
    expect(docXml).toContain('Squad Beta')
    expect(docXml).toContain('Atividade do projeto Alpha')
    expect(docXml).toContain('Atividade do projeto Beta')
  })

  it('generates correct filename for each month', async () => {
    const months = [
      { ref: '01/2026', expected: 'JANEIRO' },
      { ref: '06/2026', expected: 'JUNHO' },
      { ref: '12/2026', expected: 'DEZEMBRO' },
    ]

    for (const { ref, expected } of months) {
      const result = await generateDocxReport({
        profile: makeProfile(),
        activities: [makeActivity({ month_reference: ref })],
        monthReference: ref,
        templatePath: TEMPLATE_PATH,
        reportsDir: outDir,
      })

      expect(result.reportName).toContain(expected)
    }
  })

  it('handles activity with PNG evidence image', async () => {
    // Create a minimal valid PNG (1x1 red pixel)
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // 8-bit RGB
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82,
    ])

    const imgPath = path.join(outDir, 'test-evidence.png')
    fs.writeFileSync(imgPath, pngHeader)

    const activity = makeActivity({
      evidences: [{
        id: '019746ab-0000-7000-8000-ev0000000001',
        activity_id: '019746ab-0000-7000-8000-000000000001',
        file_path: imgPath,
        caption: 'Evidência de teste',
        sort_index: 0,
        date_added: new Date(),
        deleted_at: null,
        activity: null as any,
      }],
    })

    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [activity],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    const buf = fs.readFileSync(result.filePath)
    const zip = await JSZip.loadAsync(buf)

    // Verify image was embedded in the DOCX
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/'))
    expect(mediaFiles.length).toBeGreaterThanOrEqual(1)

    // Verify document contains evidence caption
    const docXml = await zip.file('word/document.xml')!.async('string')
    expect(docXml).toContain('Evidência de teste')
  })

  it('throws error when template is not found', async () => {
    await expect(generateDocxReport({
      profile: makeProfile(),
      activities: [makeActivity()],
      monthReference: '03/2026',
      templatePath: '/nonexistent/template.docx',
      reportsDir: outDir,
    })).rejects.toThrow('Template não encontrado')
  })

  it('handles activities with empty project_scope', async () => {
    const activity = makeActivity({
      project_scope: '',
    })

    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [activity],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    const buf = fs.readFileSync(result.filePath)
    const zip = await JSZip.loadAsync(buf)
    const docXml = await zip.file('word/document.xml')!.async('string')

    // Fall back to default scope text
    expect(docXml).toContain('Projeto não especificado')
  })

  it('sets updateFields in settings.xml', async () => {
    const result = await generateDocxReport({
      profile: makeProfile(),
      activities: [makeActivity()],
      monthReference: '03/2026',
      templatePath: TEMPLATE_PATH,
      reportsDir: outDir,
    })

    const buf = fs.readFileSync(result.filePath)
    const zip = await JSZip.loadAsync(buf)
    const settingsXml = await zip.file('word/settings.xml')!.async('string')

    expect(settingsXml).toContain('updateFields')
  })
})
