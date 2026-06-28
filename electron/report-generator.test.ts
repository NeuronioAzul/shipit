import { describe, it, expect } from 'vitest'
import {
  DOCX_EVIDENCE_LAYOUT,
  fitImageToEvidencePage,
  formatImageCaptionForDocx,
  getLastBusinessDay,
  htmlToWordXml,
} from './report-generator.ts'

describe('getLastBusinessDay', () => {
  it('returns last day when it is a weekday (Wednesday)', () => {
    // April 2026: last day is Thu 30
    const result = getLastBusinessDay(4, 2026)
    expect(result.getDate()).toBe(30)
    expect(result.getMonth()).toBe(3) // 0-indexed
    expect(result.getFullYear()).toBe(2026)
    expect(result.getDay()).toBe(4) // Thursday
  })

  it('returns Friday when month ends on Saturday', () => {
    // January 2026: last day is Sat 31 → should return Fri 30
    const result = getLastBusinessDay(1, 2026)
    expect(result.getDate()).toBe(30)
    expect(result.getDay()).toBe(5) // Friday
  })

  it('returns Friday when month ends on Sunday', () => {
    // May 2026: last day is Sun 31 → should return Fri 29
    const result = getLastBusinessDay(5, 2026)
    expect(result.getDate()).toBe(29)
    expect(result.getDay()).toBe(5) // Friday
  })

  it('returns last day when it is a Friday', () => {
    // July 2026: last day is Fri 31
    const result = getLastBusinessDay(7, 2026)
    expect(result.getDate()).toBe(31)
    expect(result.getDay()).toBe(5) // Friday
  })

  it('handles February in a non-leap year', () => {
    // February 2026: last day is Sat 28 → should return Fri 27
    const result = getLastBusinessDay(2, 2026)
    expect(result.getDate()).toBe(27)
    expect(result.getDay()).toBe(5) // Friday
  })

  it('handles February in a leap year', () => {
    // February 2028: last day is Tue 29
    const result = getLastBusinessDay(2, 2028)
    expect(result.getDate()).toBe(29)
    expect(result.getDay()).toBe(2) // Tuesday
  })

  it('returns a Monday when month ends on Monday', () => {
    // March 2026: last day is Tue 31
    const result = getLastBusinessDay(3, 2026)
    expect(result.getDate()).toBe(31)
    expect(result.getDay()).toBe(2) // Tuesday
  })

  it('handles December correctly', () => {
    // December 2026: last day is Thu 31
    const result = getLastBusinessDay(12, 2026)
    expect(result.getDate()).toBe(31)
    expect(result.getDay()).toBe(4) // Thursday
  })

  it('always returns a weekday (Mon–Fri)', () => {
    // Test all 12 months of 2026
    for (let month = 1; month <= 12; month++) {
      const result = getLastBusinessDay(month, 2026)
      const day = result.getDay()
      expect(day).toBeGreaterThanOrEqual(1) // Monday
      expect(day).toBeLessThanOrEqual(5) // Friday
    }
  })
})

describe('fitImageToEvidencePage', () => {
  it('scales wide images proportionally by max width', () => {
    const result = fitImageToEvidencePage(4000, 2000)

    expect(result.cx).toBe(DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX)
    expect(result.cy).toBe(Math.round(DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX / 2))
    expect(result.cy).toBeLessThanOrEqual(DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CY)
  })

  it('limits very tall images by max image height with caption reserve applied', () => {
    const result = fitImageToEvidencePage(1000, 5000)

    expect(result.cy).toBe(DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CY)
    expect(result.cx).toBeLessThan(DOCX_EVIDENCE_LAYOUT.MAX_IMAGE_CX)
  })
})

describe('formatImageCaptionForDocx', () => {
  it('keeps short captions in one line without truncation', () => {
    const result = formatImageCaptionForDocx('Legenda curta para evidência')

    expect(result.line1).toBe('Legenda curta para evidência')
    expect(result.line2).toBeNull()
    expect(result.truncated).toBe(false)
  })

  it('truncates long captions to two lines with ellipsis', () => {
    const longCaption = [
      'Esta legenda foi escrita para testar truncamento automático em duas linhas',
      'mantendo o documento legível e sem overflow visual na página do relatório',
      'mesmo quando o texto original é maior do que o espaço reservado.',
    ].join(' ')

    const result = formatImageCaptionForDocx(longCaption)

    expect(result.line1.length).toBeLessThanOrEqual(DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE)
    expect(result.line2).not.toBeNull()
    expect(result.line2!.length).toBeLessThanOrEqual(DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE)
    expect(result.line2!.endsWith('...')).toBe(true)
    expect(result.truncated).toBe(true)
  })

  it('handles long uninterrupted tokens by hard-splitting and truncating', () => {
    const longToken = 'A'.repeat(DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE * 3)
    const result = formatImageCaptionForDocx(longToken)

    expect(result.line1.length).toBe(DOCX_EVIDENCE_LAYOUT.CAPTION_MAX_CHARS_PER_LINE)
    expect(result.line2).not.toBeNull()
    expect(result.line2!.endsWith('...')).toBe(true)
    expect(result.truncated).toBe(true)
  })
})

describe('htmlToWordXml', () => {
  it('returns empty string for empty input', () => {
    expect(htmlToWordXml('')).toBe('')
  })

  it('converts a paragraph into a single Word paragraph', () => {
    const xml = htmlToWordXml('<p>Texto simples</p>')
    expect(xml).toContain('<w:p')
    expect(xml).toContain('<w:t xml:space="preserve">Texto simples</w:t>')
    expect((xml.match(/<w:p\b/g) || []).length).toBe(1)
  })

  it('keeps bold and italic marks', () => {
    const xml = htmlToWordXml('<p><strong>Negrito</strong> e <em>itálico</em></p>')
    expect(xml).toContain('<w:b/>')
    expect(xml).toContain('<w:i/>')
    expect(xml).toContain('Negrito')
    expect(xml).toContain('itálico')
  })

  it('preserves spaces between inline marks', () => {
    const xml = htmlToWordXml('<p>foo <strong>bar</strong> baz</p>')
    // Reconstruct visible text from <w:t> nodes to ensure spacing survives.
    const text = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map((t) => t.replace(/<[^>]*>/g, ''))
      .join('')
    expect(text).toBe('foo bar baz')
  })

  it('converts <br> into a Word line break within the paragraph', () => {
    const xml = htmlToWordXml('<p>linha 1<br>linha 2</p>')
    expect(xml).toContain('<w:br/>')
    expect(xml).toContain('linha 1')
    expect(xml).toContain('linha 2')
    expect((xml.match(/<w:p\b/g) || []).length).toBe(1)
  })

  it('renders unordered lists with bullet markers', () => {
    const xml = htmlToWordXml('<ul><li><p>um</p></li><li><p>dois</p></li></ul>')
    expect((xml.match(/• /g) || []).length).toBe(2)
    expect(xml).toContain('um')
    expect(xml).toContain('dois')
  })

  it('renders ordered lists with incrementing numbers', () => {
    const xml = htmlToWordXml('<ol><li><p>primeiro</p></li><li><p>segundo</p></li><li><p>terceiro</p></li></ol>')
    expect(xml).toContain('1. ')
    expect(xml).toContain('2. ')
    expect(xml).toContain('3. ')
    expect(xml).not.toContain('• ')
  })

  it('decodes HTML entities before escaping for XML', () => {
    const xml = htmlToWordXml('<p>A &amp; B &lt; C</p>')
    expect(xml).toContain('A &amp; B &lt; C')
    expect(xml).not.toContain('&amp;amp;')
  })

  it('treats unstructured/plain content as a single inline paragraph', () => {
    const xml = htmlToWordXml('apenas texto')
    expect(xml).toContain('apenas texto')
    expect((xml.match(/<w:p\b/g) || []).length).toBe(1)
  })
})
