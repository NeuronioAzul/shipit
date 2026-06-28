/**
 * Helpers para lidar com o conteúdo rich-text (HTML do TipTap) usado na
 * descrição da atividade e nas evidências de texto.
 *
 * O HTML é sempre produzido pelo editor TipTap (subconjunto seguro:
 * `p`, `br`, `strong`/`b`, `em`/`i`, `ul`, `ol`, `li`). Conteúdo legado da
 * descrição pode ser texto plano — `normalizeToHtml` cuida da conversão.
 */

/** Detecta se o valor já é HTML (do editor) e não texto plano legado. */
export function isLikelyHtml(value: string | null | undefined): boolean {
  return typeof value === 'string' && /<(p|br|ul|ol|li|strong|em|b|i)\b[^>]*>/i.test(value)
}

/** Converte HTML rich-text em texto plano (para prévias, truncamento e busca). */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/<\/(?:p|li|h[1-6]|div)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Verdadeiro quando o rich-text não tem conteúdo visível (ex.: `<p></p>`). */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  return htmlToPlainText(value).length === 0
}

/**
 * Normaliza um valor para HTML. Se já for HTML do editor, retorna como está;
 * se for texto plano legado, escapa e preserva quebras de linha
 * (linha em branco vira parágrafo, quebra simples vira `<br>`).
 */
export function normalizeToHtml(value: string | null | undefined): string {
  if (!value) return ''
  if (isLikelyHtml(value)) return value

  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const paragraphs = escaped
    .split(/\r?\n\r?\n+/)
    .map((paragraph) => `<p>${paragraph.replace(/\r?\n/g, '<br>')}</p>`)
    .join('')

  return paragraphs || '<p></p>'
}
