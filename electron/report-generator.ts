import path from 'path'
import fs from 'fs'
import { app, shell } from 'electron'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import xpath from 'xpath'
import type { Activity } from './entities/Activity'
import type { UserProfile } from './entities/UserProfile'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const PIC_NS = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'

const sel = xpath.useNamespaces({
  w: W_NS,
  r: R_NS,
  wp: WP_NS,
  a: A_NS,
  pic: PIC_NS,
})

// ─── Types ───

interface ReportPayload {
  profile: UserProfile
  activities: Activity[]
  monthReference: string
  reportsDir?: string
  templatePath?: string
}

interface ProjectGroup {
  scope: string
  activities: Activity[]
}

interface ActivityReferenceContent {
  bookmarks: string[]
  links: string[]
}

// ─── Month names in Portuguese ───

const MONTH_NAMES: Record<string, string> = {
  '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL',
  '05': 'MAIO', '06': 'JUNHO', '07': 'JULHO', '08': 'AGOSTO',
  '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO',
}

const DOCX_PT_TO_EMU = 12700
const DOCX_TWIP_TO_EMU = 635
const DOCX_CM_TO_EMU = 360000
const DOCX_IMAGE_PX_TO_EMU = 9525
const DOCX_CAPTION_SPACING_BEFORE_TWIP = 120
const DOCX_CAPTION_MAX_LINES = 2
const DOCX_CAPTION_MAX_CHARS_PER_LINE = 68
const DOCX_CAPTION_LINE_HEIGHT_PT = 11
const DOCX_EVIDENCE_IMAGE_MAX_WIDTH_CM = 27
const DOCX_EVIDENCE_IMAGE_MAX_HEIGHT_CM = 15
const DOCX_CAPTION_RESERVED_CY =
  (DOCX_CAPTION_SPACING_BEFORE_TWIP * DOCX_TWIP_TO_EMU) +
  (DOCX_CAPTION_MAX_LINES * DOCX_CAPTION_LINE_HEIGHT_PT * DOCX_PT_TO_EMU)
const DOCX_EVIDENCE_IMAGE_MAX_CX = DOCX_EVIDENCE_IMAGE_MAX_WIDTH_CM * DOCX_CM_TO_EMU
const DOCX_EVIDENCE_IMAGE_MAX_CY = DOCX_EVIDENCE_IMAGE_MAX_HEIGHT_CM * DOCX_CM_TO_EMU
const DOCX_EVIDENCE_PAGE_MAX_CY = DOCX_EVIDENCE_IMAGE_MAX_CY + DOCX_CAPTION_RESERVED_CY

export const DOCX_EVIDENCE_LAYOUT = {
  MAX_IMAGE_CX: DOCX_EVIDENCE_IMAGE_MAX_CX,
  MAX_PAGE_CY: DOCX_EVIDENCE_PAGE_MAX_CY,
  CAPTION_RESERVED_CY: DOCX_CAPTION_RESERVED_CY,
  MAX_IMAGE_CY: DOCX_EVIDENCE_IMAGE_MAX_CY,
  PX_TO_EMU: DOCX_IMAGE_PX_TO_EMU,
  CAPTION_MAX_LINES: DOCX_CAPTION_MAX_LINES,
  CAPTION_MAX_CHARS_PER_LINE: DOCX_CAPTION_MAX_CHARS_PER_LINE,
  CAPTION_SPACING_BEFORE_TWIP: DOCX_CAPTION_SPACING_BEFORE_TWIP,
} as const

// ─── Helpers ───

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Get the last business day (Mon–Fri) of the given month/year */
export function getLastBusinessDay(month: number, year: number): Date {
  const lastDay = new Date(year, month, 0) // last calendar day of the month
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1)
  }
  return lastDay
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatAvailabilityValue(
  value: number | null | undefined,
  suffix: string,
  fallback: string,
): string {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? `${value} ${suffix}`
    : fallback
}

function formatMinimumEffortHours(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? String(value)
    : '168'
}

function getTemplatePath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(app.getAppPath(), 'public', 'RELATÓRIO DE SERVIÇO - TEMPLATE.docx')
  }
  // In production, template is bundled in extraResources
  return path.join(process.resourcesPath, 'RELATÓRIO DE SERVIÇO - TEMPLATE.docx')
}

function getReportsDir(): string {
  const dir = path.join(app.getPath('userData'), 'reports')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function buildReportFileName(profile: UserProfile, monthRef: string): string {
  const [mm] = monthRef.split('/')
  const monthName = MONTH_NAMES[mm] || mm
  const role = stripAccents(profile.role).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim()
  const name = stripAccents(profile.full_name).toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, '_')
  return `RELATÓRIO DE SERVIÇO - ${role}_${name}_${monthName}.docx`
}

function groupByProject(activities: Activity[]): ProjectGroup[] {
  const map = new Map<string, Activity[]>()
  for (const act of activities) {
    const scope = act.project_scope?.trim() || 'Projeto não especificado'
    if (!map.has(scope)) map.set(scope, [])
    map.get(scope)!.push(act)
  }
  return Array.from(map.entries()).map(([scope, acts]) => ({
    scope,
    activities: acts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }))
}

/** Get image dimensions from PNG/JPEG/GIF/BMP file header */
function getImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const buf = fs.readFileSync(filePath)
    // PNG: bytes 16-23 contain width (4 bytes) and height (4 bytes)
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const width = buf.readUInt32BE(16)
      const height = buf.readUInt32BE(20)
      return { width, height }
    }
    // GIF: bytes 6-9 contain width (2 bytes LE) and height (2 bytes LE)
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf.length >= 10) {
      const width = buf.readUInt16LE(6)
      const height = buf.readUInt16LE(8)
      return { width, height }
    }
    // BMP: bytes 18-25 contain width (4 bytes LE) and height (4 bytes LE)
    if (buf[0] === 0x42 && buf[1] === 0x4D && buf.length >= 26) {
      const width = buf.readInt32LE(18)
      const height = Math.abs(buf.readInt32LE(22))
      return { width, height }
    }
    // JPEG: scan for SOF0 marker (0xFF 0xC0)
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2
      while (i < buf.length - 8) {
        if (buf[i] === 0xFF) {
          const marker = buf[i + 1]
          if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
            const height = buf.readUInt16BE(i + 5)
            const width = buf.readUInt16BE(i + 7)
            return { width, height }
          }
          const segLen = buf.readUInt16BE(i + 2)
          i += 2 + segLen
        } else {
          i++
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Calculate proportional EMU dimensions to fit evidence image area.
 * This always reserves fixed vertical space for two caption lines.
 */
export function fitImageToEvidencePage(width: number, height: number): { cx: number; cy: number } {
  let cx = width * DOCX_EVIDENCE_LAYOUT.PX_TO_EMU
  let cy = height * DOCX_EVIDENCE_LAYOUT.PX_TO_EMU

  // Scale down proportionally by width.
  if (cx > DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX) {
    const ratio = DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX / cx
    cx = DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX
    cy = Math.round(cy * ratio)
  }

  // Then scale down proportionally by effective height (already discounting caption reserve).
  if (cy > DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CY) {
    const ratio = DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CY / cy
    cy = DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CY
    cx = Math.round(cx * ratio)
  }

  return { cx, cy }
}

function takeCaptionLine(input: string, maxChars: number): { line: string; rest: string } {
  if (input.length <= maxChars) {
    return { line: input, rest: '' }
  }

  const candidate = input.slice(0, maxChars + 1)
  let breakIndex = candidate.lastIndexOf(' ')

  // Fallback for long uninterrupted tokens.
  if (breakIndex <= 0) {
    breakIndex = maxChars
  }

  const line = input.slice(0, breakIndex).trimEnd()
  const rest = input.slice(breakIndex).trimStart()

  return { line, rest }
}

function appendEllipsis(text: string, maxChars: number): string {
  const suffix = '...'
  if (maxChars <= suffix.length) return suffix.slice(0, maxChars)

  const trimmed = text.trimEnd()
  if (trimmed.length + suffix.length <= maxChars) {
    return `${trimmed}${suffix}`
  }

  return `${trimmed.slice(0, maxChars - suffix.length).trimEnd()}${suffix}`
}

export function formatImageCaptionForDocx(caption: string): {
  line1: string
  line2: string | null
  truncated: boolean
} {
  const normalized = caption.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return {
      line1: '',
      line2: null,
      truncated: false,
    }
  }

  const first = takeCaptionLine(normalized, DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE)
  if (!first.rest) {
    return {
      line1: first.line,
      line2: null,
      truncated: false,
    }
  }

  const second = takeCaptionLine(first.rest, DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE)
  if (!second.rest) {
    return {
      line1: first.line,
      line2: second.line,
      truncated: false,
    }
  }

  return {
    line1: first.line,
    line2: appendEllipsis(second.line, DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE),
    truncated: true,
  }
}

function buildCaptionRunXml(caption: string): string {
  const formatted = formatImageCaptionForDocx(caption)
  const firstLine = escapeXml(formatted.line1)

  if (!formatted.line2) {
    return `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:i/></w:rPr>` +
      `<w:t xml:space="preserve">${firstLine}</w:t></w:r>`
  }

  return `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/><w:i/></w:rPr>` +
    `<w:t xml:space="preserve">${firstLine}</w:t><w:br/>` +
    `<w:t xml:space="preserve">${escapeXml(formatted.line2)}</w:t></w:r>`
}

// ─── XML manipulation helpers ───

/** Walk DOM tree directly to replace text — avoids xpath namespace issues on cloned nodes */
function replaceTextInNode(node: any, search: string, replacement: string): void {
  if (node.localName === 't' && node.namespaceURI === W_NS) {
    if (node.textContent && node.textContent.includes(search)) {
      node.textContent = node.textContent.replace(search, replacement)
    }
    return
  }
  let child = node.firstChild
  while (child) {
    replaceTextInNode(child, search, replacement)
    child = child.nextSibling
  }
}

function cloneNode(node: Node): Node {
  return node.cloneNode(true)
}

function parseReferenceLinks(linkRef: string | null): string[] {
  if (!linkRef) return []

  return linkRef
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter((link) => /^https?:\/\//i.test(link))
}

function addExternalHyperlinkRelationship(
  relsDom: any,
  target: string,
  nextRId: number,
): { rId: string; nextRId: number } {
  const rId = `rId${nextRId}`
  const relEl = relsDom.createElementNS(REL_NS, 'Relationship')
  relEl.setAttribute('Id', rId)
  relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')
  relEl.setAttribute('Target', target)
  relEl.setAttribute('TargetMode', 'External')
  relsDom.documentElement!.appendChild(relEl)

  return { rId, nextRId: nextRId + 1 }
}

/** Ensure a table row has w:cantSplit to prevent it from breaking across pages */
function ensureCantSplit(row: Element): void {
  let trPr = (sel('./w:trPr', row as any) as any[])[0] as Element | undefined
  if (!trPr) {
    const trPrXml = `<w:trPr xmlns:w="${W_NS}"><w:cantSplit/></w:trPr>`
    const fragDoc = new DOMParser().parseFromString(trPrXml, 'application/xml')
    const imported = row.ownerDocument!.importNode(fragDoc.documentElement! as unknown as Node, true)
    row.insertBefore(imported as any, row.firstChild)
    return
  }
  const existing = (sel('./w:cantSplit', trPr as any) as any[])
  if (existing.length === 0) {
    const el = row.ownerDocument!.createElementNS(W_NS, 'w:cantSplit')
    trPr.appendChild(el)
  }
}

// ─── Evidence page XML builder ───

function buildEvidencePageXml(
  bookmarkId: number,
  bookmarkName: string,
  rId: string,
  cx: number,
  cy: number,
  caption: string,
  imageIdx: number
): string {
  const captionRunXml = buildCaptionRunXml(caption)

  // Page break + bookmark start + image paragraph + caption + bookmark end
  return `<w:p xmlns:w="${W_NS}"><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>` +
    `<w:bookmarkStart xmlns:w="${W_NS}" w:id="${bookmarkId}" w:name="${bookmarkName}"/>` +
    `<w:p xmlns:w="${W_NS}" xmlns:r="${R_NS}" xmlns:wp="${WP_NS}" xmlns:a="${A_NS}" xmlns:pic="${PIC_NS}">` +
    `<w:pPr><w:pStyle w:val="Normal"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr/><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${100 + imageIdx}" name="Evidence ${imageIdx}"/>` +
    `<a:graphic><a:graphicData uri="${PIC_NS}">` +
    `<pic:pic><pic:nvPicPr>` +
    `<pic:cNvPr id="${100 + imageIdx}" name="Evidence ${imageIdx}"/>` +
    `<pic:cNvPicPr/>` +
    `</pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch/></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>` +
    `<w:p xmlns:w="${W_NS}"><w:pPr><w:pStyle w:val="Normal"/><w:jc w:val="center"/>` +
    `<w:spacing w:before="${DOCX_EVIDENCE_LAYOUT.CAPTION_SPACING_BEFORE_TWIP}"/></w:pPr>` +
    `${captionRunXml}</w:p>` +
    `<w:bookmarkEnd xmlns:w="${W_NS}" w:id="${bookmarkId}"/>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert TipTap HTML content to OpenXML paragraphs for text evidence pages.
 */
function htmlToWordXml(html: string): string {
  if (!html) return ''
  const paragraphs: string[] = []
  // Split by block elements: <p>, <li>, <ul>, <ol>
  // Simple conversion: strip tags, keep bold/italic inline formatting
  const blocks = html.split(/<\/(?:p|li)>/).filter(b => b.trim())

  for (const block of blocks) {
    let cleaned = block.replace(/<(?:p|li|ul|ol)[^>]*>/g, '')
    // Check if this is a list item (was preceded by <li>)
    const isBullet = block.includes('<li')

    const runs: string[] = []
    // Process inline formatting
    const parts = cleaned.split(/(<\/?(?:strong|b|em|i)>)/)
    let bold = false
    let italic = false

    for (const part of parts) {
      if (part === '<strong>' || part === '<b>') { bold = true; continue }
      if (part === '</strong>' || part === '</b>') { bold = false; continue }
      if (part === '<em>' || part === '<i>') { italic = true; continue }
      if (part === '</em>' || part === '</i>') { italic = false; continue }
      // Strip any remaining tags
      const text = part.replace(/<[^>]*>/g, '').trim()
      if (!text) continue
      let rPr = '<w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/>'
      if (bold) rPr += '<w:b/>'
      if (italic) rPr += '<w:i/>'
      rPr += '</w:rPr>'
      runs.push(`<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`)
    }

    if (runs.length === 0) continue

    const prefix = isBullet
      ? `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">• </w:t></w:r>`
      : ''

    paragraphs.push(
      `<w:p xmlns:w="${W_NS}"><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="60"/></w:pPr>${prefix}${runs.join('')}</w:p>`
    )
  }

  return paragraphs.join('')
}

function buildTextEvidencePageXml(
  bookmarkId: number,
  bookmarkName: string,
  htmlContent: string,
  caption: string,
  evidenceIdx: number
): string {
  const contentXml = htmlToWordXml(htmlContent)
  // Page break + bookmark start + bordered text box + caption + bookmark end
  return `<w:p xmlns:w="${W_NS}"><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>` +
    `<w:bookmarkStart xmlns:w="${W_NS}" w:id="${bookmarkId}" w:name="${bookmarkName}"/>` +
    // Title paragraph
    `<w:p xmlns:w="${W_NS}"><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="120"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(caption)}</w:t></w:r></w:p>` +
    // Text content paragraphs
    contentXml +
    `<w:bookmarkEnd xmlns:w="${W_NS}" w:id="${bookmarkId}"/>`
}

// ─── Main generator ───

export async function generateDocxReport(payload: ReportPayload): Promise<{ filePath: string; reportName: string }> {
  const { profile, activities, monthReference } = payload
  const [mm, yyyy] = monthReference.split('/')

  // Load template
  const templatePath = payload.templatePath || getTemplatePath()
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`)
  }
  const templateBuf = fs.readFileSync(templatePath)
  const zip = await JSZip.loadAsync(templateBuf)

  // Parse document.xml
  let docXml = await zip.file('word/document.xml')!.async('string')
  docXml = docXml.replace(/^\uFEFF/, '') // Strip BOM
  const doc = new DOMParser().parseFromString(docXml, 'application/xml')

  // Parse relationships
  let relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string')
  relsXml = relsXml.replace(/^\uFEFF/, '')
  const relsDom = new DOMParser().parseFromString(relsXml, 'application/xml')

  // ─── 1. Simple placeholder replacements ───
  const monthName = MONTH_NAMES[mm] || mm
  const monthNameCapitalized = monthName.charAt(0) + monthName.slice(1).toLowerCase()
  const monthLong = `${monthNameCapitalized} de ${yyyy}`
  const lastBusinessDay = getLastBusinessDay(parseInt(mm), parseInt(yyyy))
  const dateLong = lastBusinessDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const replacements: Record<string, string> = {
    '{{contract_number}}': profile.contract_identifier || '',
    '{{contract_reference_short}}': profile.contract_identifier || '',
    '{{full_name}}': profile.full_name || '',
    '{{full_name_upper}}': (profile.full_name || '').toUpperCase(),
    '{{role}}': profile.role || '',
    '{{seniority_level}}': profile.seniority_level || '',
    '{{report_generated_date_long}}': dateLong,
    '{{month_reference}}': monthReference,
    '{{daily_availability}}': formatAvailabilityValue(profile.daily_availability, 'horas/dia', '8 horas/dia'),
    '{{monthly_availability}}': formatAvailabilityValue(profile.monthly_availability, 'horas/mês', '168 horas/mês'),
    '{{profile_type}}': profile.profile_type || '',
    '{{correlating_activities}}': profile.correlating_activities || '',
    '{{minimum_effort_hours}}': formatMinimumEffortHours(profile.minimum_effort_hours),
  }

  // Apply simple replacements to all text nodes
  const allTextNodes = sel('//w:t', doc as any) as any[]
  for (const tNode of allTextNodes) {
    if (!tNode.textContent) continue
    let text = tNode.textContent
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (text.includes(placeholder)) {
        text = text.replace(new RegExp(escapeRegex(placeholder), 'g'), value)
      }
    }
    tNode.textContent = text
  }

  // ─── Post-process: split attendance cell into 3 paragraphs (one per line) ───
  const allTextNodesPost = sel('//w:t', doc as any) as any[]
  for (const tNode of allTextNodesPost) {
    const text = tNode.textContent || ''
    if (text.includes('Presencial') && text.includes('Remoto') && text.includes('Híbrido')) {
      // Walk up to the w:tc (cell)
      let cell = tNode.parentNode
      while (cell && cell.localName !== 'tc') cell = cell.parentNode
      if (!cell) continue

      // Get the first paragraph to copy its properties
      const existingParas = sel('./w:p', cell) as any[]
      const firstPara = existingParas[0]
      const pPr = (sel('./w:pPr', firstPara) as any[])[0]
      const rPr = (sel('.//w:rPr', firstPara) as any[])[0]

      // Remove all existing paragraphs from cell
      for (const p of existingParas) cell.removeChild(p)

      // Determine checkbox values
      const presencial = profile.attendance_type === 'Presencial' ? '☒' : '☐'
      const remoto = profile.attendance_type === 'Remoto' ? '☒' : '☐'
      const hibrido = profile.attendance_type === 'Híbrido' ? '☒' : '☐'

      const lines = [
        `${presencial} Presencial`,
        `${remoto} Remoto`,
        `${hibrido} Híbrido`,
      ]

      // Build paragraph XML for each line, preserving formatting
      const pPrXml = pPr ? new XMLSerializer().serializeToString(pPr) : ''
      const rPrXml = rPr ? new XMLSerializer().serializeToString(rPr) : ''
      for (const line of lines) {
        const pXml = `<w:p xmlns:w="${W_NS}">${pPrXml}<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
        const fragDoc = new DOMParser().parseFromString(pXml, 'application/xml')
        const imported = doc.importNode(fragDoc.documentElement!, true)
        cell.appendChild(imported as any)
      }
      break
    }
  }

  // ─── 2. Encarte A: Clone project/activity rows in Table 3 ───
  const tables = sel('//w:tbl', doc as any) as any[]
  const encarteTable = tables[2] // Third table
  const encarteRows = sel('./w:tr', encarteTable) as Element[]

  // Row indices: 0=header1, 1=header2, 2=column headers, 3=project_scope row, 4=activity row
  const projectRowTemplate = encarteRows[3]
  const activityRowTemplate = encarteRows[4]

  // Remove template rows (we'll re-insert cloned ones)
  encarteTable.removeChild(projectRowTemplate)
  encarteTable.removeChild(activityRowTemplate)

  // Group activities and build rows
  const groups = groupByProject(activities)
  let actOrderGlobal = 0
  const activityReferences: Map<string, ActivityReferenceContent> = new Map()

  for (const group of groups) {
    // Clone and populate project row
    const projRow = cloneNode(projectRowTemplate) as Element
    replaceTextInNode(projRow, '{{project_scope}}', group.scope)
    ensureCantSplit(projRow)
    encarteTable.appendChild(projRow)

    for (const act of group.activities) {
      actOrderGlobal++
      const actRow = cloneNode(activityRowTemplate) as Element

      replaceTextInNode(actRow, '{{activity_order}}', String(actOrderGlobal))
      replaceTextInNode(actRow, '{{activity_description}}', act.description || '')
      replaceTextInNode(actRow, '{{activity_reference}}', '')
      // svn_releases is internal metadata for publication workflow and must not be exported to DOCX.
      replaceTextInNode(actRow, '{{activity_date_start}}', formatDateBR(act.date_start))
      replaceTextInNode(actRow, '{{activity_date_end}}', formatDateBR(act.date_end))
      replaceTextInNode(actRow, '{{activity_status}}', act.status || '')

      ensureCantSplit(actRow)
      encarteTable.appendChild(actRow)

      // Track evidence bookmarks for this activity
      const bookmarks: string[] = []
      const actIdClean = act.id.replace(/-/g, '')
      const evidences = (act.evidences || []).sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
      for (let i = 0; i < evidences.length; i++) {
        bookmarks.push(`ev_${actIdClean}_${i}`)
      }
      const links = parseReferenceLinks(act.link_ref)
      if (bookmarks.length > 0 || links.length > 0) {
        activityReferences.set(act.id, { bookmarks, links })
      }
    }
  }

  // ─── 3. Encarte B: Evidence pages ───
  // Find the {{evidence_pages}} paragraph and replace it with evidence pages
  const evidParagraphs = sel('//w:t', doc as any) as any[]
  let evidAnchorParagraph: Element | null = null
  for (const t of evidParagraphs) {
    if (t.textContent && t.textContent.includes('{{evidence_pages}}')) {
      // Walk up to the <w:p> parent
      let p = t.parentNode as Element | null
      while (p && p.localName !== 'p') p = p.parentNode as Element | null
      evidAnchorParagraph = p
      break
    }
  }

  let nextRId = 1 // Will be computed from existing relationships
  // Scan existing rIds to avoid collisions
  const existingRels = relsDom.documentElement!.childNodes
  for (let i = 0; i < existingRels.length; i++) {
    const node = existingRels[i] as unknown as Element
    if (node.getAttribute) {
      const id = node.getAttribute('Id')
      if (id && id.startsWith('rId')) {
        const num = parseInt(id.substring(3), 10)
        if (!isNaN(num) && num >= nextRId) {
          nextRId = num + 1
        }
      }
    }
  }
  const hyperlinkRelationshipIds = new Map<string, string>()
  function getOrCreateHyperlinkRelationshipId(target: string): string {
    const existingId = hyperlinkRelationshipIds.get(target)
    if (existingId) return existingId

    const relation = addExternalHyperlinkRelationship(relsDom, target, nextRId)
    nextRId = relation.nextRId
    hyperlinkRelationshipIds.set(target, relation.rId)
    return relation.rId
  }
  let bookmarkIdCounter = 100
  let evidenceGlobalIdx = 0
  const body = doc.documentElement!.getElementsByTagNameNS(W_NS, 'body')[0]

  if (evidAnchorParagraph && body) {
    // Collect all evidence pages XML fragments
    const evidenceFragments: string[] = []

    for (const group of groups) {
      for (const act of group.activities) {
        const evidences = (act.evidences || []).sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
        for (let i = 0; i < evidences.length; i++) {
          const ev = evidences[i]

          const bmId = bookmarkIdCounter++
          const bmName = `ev_${act.id.replace(/-/g, '')}_${i}`
          const caption = ev.caption || `Evidência ${evidenceGlobalIdx + 1}`

          // Text evidence — render as formatted text page
          if (ev.type === 'text') {
            evidenceFragments.push(
              buildTextEvidencePageXml(bmId, bmName, ev.text_content || '', caption, evidenceGlobalIdx)
            )
            evidenceGlobalIdx++
            continue
          }

          // Image evidence
          const filePath = ev.file_path

          if (!filePath || !fs.existsSync(filePath)) continue

          // Read image and add to zip
          const imgBuf = fs.readFileSync(filePath)
          const ext = path.extname(filePath).toLowerCase()
          const mediaName = `image_ev_${evidenceGlobalIdx}${ext}`
          zip.file(`word/media/${mediaName}`, imgBuf)

          // Add relationship
          const rId = `rId${nextRId++}`
          const relEl = relsDom.createElementNS(REL_NS, 'Relationship')
          relEl.setAttribute('Id', rId)
          relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
          relEl.setAttribute('Target', `media/${mediaName}`)
          relsDom.documentElement!.appendChild(relEl)

          // Calculate dimensions (using effective page height with reserved caption area)
          const dims = getImageDimensions(filePath)
          const { cx, cy } = dims
            ? fitImageToEvidencePage(dims.width, dims.height)
            : fitImageToEvidencePage(1600, 900)

          // Build evidence page
          evidenceFragments.push(
            buildEvidencePageXml(bmId, bmName, rId, cx, cy, caption, evidenceGlobalIdx)
          )
          evidenceGlobalIdx++
        }
      }
    }

    if (evidenceFragments.length > 0) {
      // Parse evidence fragments and insert before the anchor paragraph
      const fragmentXml = `<w:wrapper xmlns:w="${W_NS}" xmlns:r="${R_NS}" xmlns:wp="${WP_NS}" xmlns:a="${A_NS}" xmlns:pic="${PIC_NS}">${evidenceFragments.join('')}</w:wrapper>`
      const fragDoc = new DOMParser().parseFromString(fragmentXml, 'application/xml')
      const children = fragDoc.documentElement!.childNodes

      const parentNode = evidAnchorParagraph.parentNode!
      for (let i = 0; i < children.length; i++) {
        const imported = doc.importNode(children[i], true)
        parentNode.insertBefore(imported as any, evidAnchorParagraph)
      }
    }

    // Remove the anchor paragraph itself
    evidAnchorParagraph.parentNode!.removeChild(evidAnchorParagraph)
  }

  // ─── 4. Fill PAGEREF references in Encarte A ───
  // For each activity with evidences, fill the reference cell with bookmark-based PAGEREF fields
  // We know exactly which rows we appended: for each group, 1 project row + N activity rows
  // Row layout after header rows (0..2): [projRow, actRow, actRow, ..., projRow, actRow, ...]
  if (activityReferences.size > 0) {
    const updatedRows = sel('//w:tbl[3]/w:tr', doc as any) as any[]
    const headerRowCount = 3 // rows 0,1,2 are headers
    let rowOffset = headerRowCount
    for (const group of groups) {
      rowOffset++ // skip project scope row
      for (const act of group.activities) {
        const referenceContent = activityReferences.get(act.id)
        if (referenceContent && rowOffset < updatedRows.length) {
          const actRow = updatedRows[rowOffset]
          const cells = sel('./w:tc', actRow) as any[]
          // Reference cell is index 2 (0=order, 1=description, 2=reference, 3=start, 4=end, 5=status)
          if (cells.length >= 3) {
            const refCell = cells[2]
            const refParas = sel('./w:p', refCell) as any[]
            if (refParas.length > 0) {
              const refPara = refParas[0]
              const childNodes = Array.from(refPara.childNodes)
              childNodes.forEach((node: any) => {
                if (node.localName !== 'pPr') {
                  refPara.removeChild(node)
                }
              })

              const hyperlinkEntries = referenceContent.links.map((link, index) => ({
                label: `link ${String(index + 1).padStart(2, '0')}`,
                rId: getOrCreateHyperlinkRelationshipId(link),
              }))

              const pageRefXml = buildActivityReferenceRuns(hyperlinkEntries, referenceContent.bookmarks)
              const fragDoc = new DOMParser().parseFromString(
                `<w:p xmlns:w="${W_NS}" xmlns:r="${R_NS}">${pageRefXml}</w:p>`,
                'application/xml'
              )
              const fragRuns = fragDoc.documentElement!.childNodes
              for (let i = 0; i < fragRuns.length; i++) {
                const imported = doc.importNode(fragRuns[i], true)
                refPara.appendChild(imported as any)
              }
            }
          }
        }
        rowOffset++
      }
    }
  }

  // ─── 5. Add content type for images if needed ───
  let ctXml = await zip.file('[Content_Types].xml')!.async('string')
  ctXml = ctXml.replace(/^\uFEFF/, '')
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
  }
  if (!ctXml.includes('Extension="jpg"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>')
  }
  if (!ctXml.includes('Extension="jpeg"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>')
  }
  if (!ctXml.includes('Extension="gif"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="gif" ContentType="image/gif"/></Types>')
  }
  if (!ctXml.includes('Extension="bmp"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="bmp" ContentType="image/bmp"/></Types>')
  }
  if (!ctXml.includes('Extension="webp"')) {
    ctXml = ctXml.replace('</Types>', '<Default Extension="webp" ContentType="image/webp"/></Types>')
  }
  zip.file('[Content_Types].xml', ctXml)

  // ─── 6. Serialize and save ───
  const serializer = new XMLSerializer()
  const finalDocXml = serializer.serializeToString(doc)
  zip.file('word/document.xml', finalDocXml)

  const finalRelsXml = serializer.serializeToString(relsDom)
  zip.file('word/_rels/document.xml.rels', finalRelsXml)

  // Ensure updateFields is set in settings.xml
  let settingsXml = await zip.file('word/settings.xml')!.async('string')
  settingsXml = settingsXml.replace(/^\uFEFF/, '')
  if (!settingsXml.includes('updateFields')) {
    settingsXml = settingsXml.replace(
      '</w:settings>',
      `<w:updateFields w:val="true"/></w:settings>`
    )
    zip.file('word/settings.xml', settingsXml)
  }

  // Generate the output file
  const reportName = buildReportFileName(profile, monthReference)
  const outDir = payload.reportsDir || getReportsDir()
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outputPath = path.join(outDir, reportName)

  const outputBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  fs.writeFileSync(outputPath, outputBuf)

  return { filePath: outputPath, reportName }
}

// ─── PAGEREF field builder ───

function buildPageRefRuns(bookmarks: string[]): string {
  if (bookmarks.length === 0) return ''

  // Build: "Páginas " then for each bookmark: { PAGEREF bmName }
  // With commas between them
  let xml = `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${bookmarks.length > 1 ? 'Páginas ' : 'Página '}</w:t></w:r>`

  bookmarks.forEach((bm, i) => {
    // Word field: begin
    xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>`
    // Field instruction
    xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGEREF ${bm} </w:instrText></w:r>`
    // Separate
    xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>`
    // Default text (will be updated by Word)
    xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>?</w:t></w:r>`
    // End
    xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`

    // Separator
    if (i < bookmarks.length - 2) {
      xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">, </w:t></w:r>`
    } else if (i === bookmarks.length - 2) {
      xml += `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve"> e </w:t></w:r>`
    }
  })

  return xml
}

function buildReferenceLineBreakRun(): string {
  return `<w:r xmlns:w="${W_NS}"><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:br/></w:r>`
}

function buildHyperlinkRun(label: string, rId: string): string {
  return `<w:hyperlink xmlns:w="${W_NS}" xmlns:r="${R_NS}" r:id="${rId}" w:history="1">` +
    `<w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(label)}</w:t></w:r></w:hyperlink>`
}

function buildActivityReferenceRuns(
  links: Array<{ label: string; rId: string }>,
  bookmarks: string[],
): string {
  if (links.length === 0 && bookmarks.length === 0) return ''

  let xml = ''

  links.forEach((link, index) => {
    xml += buildHyperlinkRun(link.label, link.rId)

    const isLastLink = index === links.length - 1
    if (!isLastLink || bookmarks.length > 0) {
      xml += buildReferenceLineBreakRun()
    }
    if (isLastLink && bookmarks.length > 0) {
      xml += buildReferenceLineBreakRun()
    }
  })

  if (bookmarks.length > 0) {
    xml += buildPageRefRuns(bookmarks)
  }

  return xml
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function openInFolder(filePath: string): void {
  shell.showItemInFolder(filePath)
}
