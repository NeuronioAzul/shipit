import { describe, it, expect } from 'vitest'
import { isLikelyHtml, htmlToPlainText, isRichTextEmpty, normalizeToHtml } from './richText'

describe('isLikelyHtml', () => {
  it('detects editor HTML', () => {
    expect(isLikelyHtml('<p>oi</p>')).toBe(true)
    expect(isLikelyHtml('texto <strong>negrito</strong>')).toBe(true)
    expect(isLikelyHtml('<ul><li>a</li></ul>')).toBe(true)
  })

  it('treats plain text as not-HTML', () => {
    expect(isLikelyHtml('apenas texto')).toBe(false)
    expect(isLikelyHtml('linha 1\nlinha 2')).toBe(false)
    expect(isLikelyHtml('')).toBe(false)
    expect(isLikelyHtml(null)).toBe(false)
  })
})

describe('htmlToPlainText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(htmlToPlainText('<p>foo <strong>bar</strong> baz</p>')).toBe('foo bar baz')
  })

  it('separates blocks and line breaks with spaces', () => {
    expect(htmlToPlainText('<p>linha 1</p><p>linha 2</p>')).toBe('linha 1 linha 2')
    expect(htmlToPlainText('a<br>b')).toBe('a b')
    expect(htmlToPlainText('<ul><li>um</li><li>dois</li></ul>')).toBe('um dois')
  })

  it('decodes entities', () => {
    expect(htmlToPlainText('<p>A &amp; B &lt; C</p>')).toBe('A & B < C')
  })

  it('returns empty for nullish/empty', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText('<p></p>')).toBe('')
  })
})

describe('isRichTextEmpty', () => {
  it('is true for empty editor content', () => {
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty('<p></p>')).toBe(true)
    expect(isRichTextEmpty('<p>   </p>')).toBe(true)
    expect(isRichTextEmpty(null)).toBe(true)
  })

  it('is false when there is visible text', () => {
    expect(isRichTextEmpty('<p>oi</p>')).toBe(false)
    expect(isRichTextEmpty('texto')).toBe(false)
  })
})

describe('normalizeToHtml', () => {
  it('keeps editor HTML untouched', () => {
    expect(normalizeToHtml('<p>oi</p>')).toBe('<p>oi</p>')
  })

  it('wraps plain text and preserves single line breaks as <br>', () => {
    expect(normalizeToHtml('linha 1\nlinha 2')).toBe('<p>linha 1<br>linha 2</p>')
  })

  it('splits paragraphs on blank lines', () => {
    expect(normalizeToHtml('p1\n\np2')).toBe('<p>p1</p><p>p2</p>')
  })

  it('escapes HTML-special characters in plain text', () => {
    expect(normalizeToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeToHtml('')).toBe('')
    expect(normalizeToHtml(null)).toBe('')
  })
})
