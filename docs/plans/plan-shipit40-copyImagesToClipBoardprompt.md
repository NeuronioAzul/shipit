# Plano — Copiar evidência de imagem e abrir local do arquivo

## Contexto

Hoje as evidências de imagem nas telas de **criação**, **edição** e **detalhes** de Atividade só podem ser visualizadas (cards + lightbox/visão maximizada). Não há como reaproveitar a imagem fora do app. A solicitação:

1. Em cada card de evidência de imagem (criar/editar/detalhes) → **botão para copiar a imagem para a área de transferência**.
2. Na **visão maximizada (lightbox)** → **menu de contexto (botão direito)** com 2 opções: *Copiar para a área de transferência* e *Abrir local do arquivo*.

Objetivo: permitir colar a imagem em e-mail/documento/mensagem e localizar o arquivo no explorador.

## Decisões de design

- **Copiar imagem**: feito no processo main via `clipboard.writeImage(nativeImage.createFromPath(filePath))`. É a forma confiável e nativa no Electron (cobre todos os formatos). Novo handler IPC `app:copyImageToClipboard`.
- **Abrir local do arquivo**: **reutilizar** o handler já existente `app:openFileInFolder` → `openInFolder()` (`shell.showItemInFolder`) em [electron/report-generator.ts](electron/report-generator.ts#L1147). Nada novo no main para isso.
- **Caminho do arquivo**: `evidence.file_path` já é o caminho absoluto (é o que o protocolo `shipit-evidence://` usa). Ações só valem quando `window.electronAPI` existe e `file_path` **não** começa com `data:` (fallback browser não suporta).
- **Toasts**: usar `sonner` (`import { toast } from 'sonner'`), padrão do projeto.

## Mudanças

### 1. Main — novo handler de cópia ([electron/main.ts](electron/main.ts))
- Adicionar `clipboard` ao import existente do `electron` (linha 2; `nativeImage` já está importado).
- Após o handler `app:openFileInFolder` (linha 1031), registrar:
  ```ts
  ipcMain.handle('app:copyImageToClipboard', async (_event, filePath: string) => {
    // Segurança: só permite arquivos dentro de evidences/ ou trash/ (mesma regra do protocolo)
    const evidencesDir = path.join(app.getPath('userData'), 'evidences')
    const trashDir = path.join(app.getPath('userData'), 'trash')
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(evidencesDir) && !resolved.startsWith(trashDir)) return false
    const image = nativeImage.createFromPath(resolved)
    if (image.isEmpty()) return false
    clipboard.writeImage(image)
    return true
  })
  ```

### 2. Preload + tipos
- [electron/preload.ts](electron/preload.ts#L52): adicionar
  `copyImageToClipboard: (filePath: string) => ipcRenderer.invoke('app:copyImageToClipboard', filePath),`
- [src/vite-env.d.ts](src/vite-env.d.ts#L32): adicionar
  `copyImageToClipboard: (filePath: string) => Promise<boolean>`

### 3. Helper compartilhado (novo) — `src/services/evidenceClipboard.ts`
Centraliza a lógica usada pelos cards e pelo lightbox (DRY):
```ts
import { toast } from 'sonner'

export function canUseEvidenceFileActions(filePath: string | null | undefined): filePath is string {
  return !!window.electronAPI && !!filePath && !filePath.startsWith('data:')
}
export async function copyEvidenceImage(filePath: string | null | undefined) {
  if (!canUseEvidenceFileActions(filePath)) return
  const ok = await window.electronAPI!.copyImageToClipboard(filePath)
  toast[ok ? 'success' : 'error'](ok ? 'Imagem copiada para a área de transferência' : 'Não foi possível copiar a imagem')
}
export async function openEvidenceLocation(filePath: string | null | undefined) {
  if (!canUseEvidenceFileActions(filePath)) return
  await window.electronAPI!.openFileInFolder(filePath)
}
```

### 4. Botão "Copiar" nos cards de imagem
Em ambos os `SortableEvidenceCard`:
- [src/components/EvidenceUpload.tsx](src/components/EvidenceUpload.tsx#L144) — junto aos botões overlay (perto do "Delete", linha 144-154).
- [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx#L84) — junto ao botão de excluir (linha 84-91).

Renderizar **somente** quando `!isText && canUseEvidenceFileActions(evidence.file_path)`. Botão com ícone `fa-solid fa-copy`, `onClick={(e) => { e.stopPropagation(); copyEvidenceImage(evidence.file_path) }}`, `title="Copiar imagem"`, seguindo o mesmo estilo overlay (`opacity-0 group-hover…`). Posicionar para não colidir com os botões existentes (ex.: `top-2 right-10`/`right-11`; no EvidenceUpload o delete está em `right-2` e edit-texto em `right-10`, mas edit-texto só existe para texto — sem conflito para imagem).

### 5. Menu de contexto no lightbox ([src/components/EvidenceLightbox.tsx](src/components/EvidenceLightbox.tsx))
- Estender a interface `LightboxSlide` com `filePath?: string`.
- Nos dois call sites, preencher `filePath` apenas para caminhos reais:
  - [src/components/EvidenceUpload.tsx](src/components/EvidenceUpload.tsx#L518) (map dos slides)
  - [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx#L944) (map dos slides)
  - `filePath: ev.file_path && !ev.file_path.startsWith('data:') ? ev.file_path : undefined`
- Dentro de `EvidenceLightbox`:
  - Rastrear o índice atual: estado `currentIndex` inicializado do prop `index`, atualizado via `on={{ view: ({ index }) => setCurrentIndex(index) }}` (e ressincronizar quando `open`/`index` mudarem).
  - Ao abrir, registrar `contextmenu` listener no `document`; se o alvo estiver dentro de `.yarl__container`, `preventDefault()` e abrir um menu custom posicionado em `clientX/clientY` (estado `{x,y}` ou null). Fechar o menu em `click`/`scroll`/`Escape`/fechar lightbox.
  - Renderizar um menu custom (div posicionada `fixed`, z-index acima do lightbox) com 2 itens:
    - **Copiar para a área de transferência** → `copyEvidenceImage(slides[currentIndex]?.filePath)`
    - **Abrir local do arquivo** → `openEvidenceLocation(slides[currentIndex]?.filePath)`
  - Itens desabilitados/ocultos quando o slide atual não tem `filePath` (ex.: data URL no fallback browser).
  - Usar tokens Tailwind (`bg-popover`/`bg-card`, `text-foreground`, `border-border`, `hover:bg-muted`) — sem cores cruas.

## Arquivos tocados (resumo)
- `electron/main.ts` (import + 1 handler)
- `electron/preload.ts`, `src/vite-env.d.ts` (API)
- `src/services/evidenceClipboard.ts` (novo)
- `src/components/EvidenceUpload.tsx`, `src/pages/ActivityDetailPage.tsx` (botão copiar + filePath nos slides)
- `src/components/EvidenceLightbox.tsx` (menu de contexto)

## Verificação
1. `npm run dev` (Electron). Criar/editar uma atividade, adicionar imagem.
2. **Card**: hover → botão copiar aparece; clicar → toast de sucesso; colar (Ctrl+V) em e-mail/Paint/Word → imagem aparece.
3. **Lightbox**: clicar na imagem para maximizar; botão direito → menu com 2 opções.
   - "Copiar" → toast + colar em outro app.
   - "Abrir local do arquivo" → Explorer abre com o arquivo selecionado.
4. Repetir nas 3 telas: criar atividade, editar atividade, detalhes da atividade.
5. `npm run build` para garantir que os dois projetos TS (src/ e electron/) compilam.
6. (Opcional) `npm run test` para não quebrar testes existentes.

## Pós-implementação (docs)
Registrar no rascunho/TODO→DONE e CHANGELOG conforme regra do projeto (skill `shipit-release-and-doc-sync` ao publicar versão).
