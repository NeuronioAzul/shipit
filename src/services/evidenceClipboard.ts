import { toast } from 'sonner'

/**
 * Indica se as ações de arquivo de evidência (copiar imagem, abrir local)
 * estão disponíveis: só no Electron e para caminhos de arquivo reais
 * (não para data URLs do fallback de browser).
 */
export function canUseEvidenceFileActions(
  filePath: string | null | undefined
): filePath is string {
  return !!window.electronAPI && !!filePath && !filePath.startsWith('data:')
}

/** Copia a imagem da evidência para a área de transferência. */
export async function copyEvidenceImage(filePath: string | null | undefined) {
  if (!canUseEvidenceFileActions(filePath)) return
  const ok = await window.electronAPI!.copyImageToClipboard(filePath)
  toast[ok ? 'success' : 'error'](
    ok
      ? 'Imagem copiada para a área de transferência'
      : 'Não foi possível copiar a imagem'
  )
}

/** Abre o local do arquivo da evidência no explorador do sistema. */
export async function openEvidenceLocation(filePath: string | null | undefined) {
  if (!canUseEvidenceFileActions(filePath)) return
  await window.electronAPI!.openFileInFolder(filePath)
}
