import { toast } from 'sonner'

/**
 * Copia um texto para a área de transferência exibindo feedback via toast.
 * `label` descreve o que foi copiado (ex.: "Release 12345").
 */
export async function copyTextToClipboard(text: string, label: string) {
  if (!navigator.clipboard?.writeText) {
    toast.error('Seu ambiente não permite copiar automaticamente.')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado com sucesso.`)
  } catch {
    toast.error(`Não foi possível copiar ${label.toLowerCase()}.`)
  }
}
