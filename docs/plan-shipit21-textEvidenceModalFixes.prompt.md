# Plan: Fix Text Evidence Modal (click, paste, limit)

## TL;DR
Corrigir três problemas no editor de evidência do tipo texto (`TextEvidenceEditor`/`TextEvidenceModal`):
1. Clicar no padding/área vazia do editor não dá foco no ProseMirror (TipTap) → adicionar handler `onMouseDown` que chama `editor.commands.focus()` quando o clique for fora do `.tiptap` interno.
2. Paste (Ctrl+V e menu de contexto) não funciona → na prática é sintoma do (1): sem foco no editor, o paste do Electron é aplicado em nenhum lugar. Após corrigir o foco, validar; se ainda falhar, adicionar fallback TipTap `editor.chain().focus().run()` antes do paste.
3. Limite de caracteres deve passar de 2000 → 20000.

Adicionalmente, fazer auditoria rápida em todos os `<input>`/`<textarea>` e confirmar que nenhum bloqueia clipboard (atalhos nativos + menu de contexto já são tratados globalmente em `electron/main.ts`).

## Steps

### Fase 1 — Ajustes no editor de texto
1. Editar [src/components/TextEvidenceEditor.tsx](src/components/TextEvidenceEditor.tsx):
   - Alterar `const MAX_CHARS = 2000` para `20000`.
   - Envolver o `<EditorContent>` num wrapper clicável: adicionar `onMouseDown` no wrapper atual (`#text-evidence-editor-content`) que, se `e.target === e.currentTarget` (ou não for descendente do `.ProseMirror`/`.tiptap`), chama `editor.commands.focus('end')` e evita `preventDefault` só quando necessário.
   - Confirmar que a classe `min-h-[150px]` e o padding `p-3` ficam no wrapper externo (não no `EditorContent`) para que toda a área seja clicável e mapeada para foco no ProseMirror. Alternativa: manter `p-3` no `EditorContent` mas adicionar `role="textbox"` e handler de foco no wrapper externo.
2. Ajustar contador visual: atualizar o threshold `isNearLimit = charCount > MAX_CHARS * 0.9` continua válido; confirmar render com 20000 caracteres.

### Fase 2 — Validação de paste (Ctrl+V e menu de contexto)
3. Após corrigir foco, testar Ctrl+V e "Colar" do menu nativo (já configurado em [electron/main.ts](electron/main.ts) `context-menu` handler linhas ~126–156).
4. Se paste ainda falhar no TipTap (caso o menu de contexto abra sem foco ativo no editor), considerar pequenas melhorias:
   - No `TextEvidenceEditor`, garantir `editor.commands.focus()` ao abrir o modal (`useEffect` quando `editor && !readOnly`).
   - Caso o `webContents.paste()` não propague eventos para ProseMirror, adicionar listener explícito `onPaste` no wrapper que lê `DataTransfer` e chama `editor.chain().insertContent(text).run()` (fallback).

### Fase 3 — Auditoria de inputs/textareas
5. Listar ocorrências de `<input ` e `<textarea ` em `src/pages/**` e `src/components/**`.
6. Confirmar que nenhum aplica `onPaste={(e) => e.preventDefault()}`, `readOnly`, ou atalhos que bloqueiem Ctrl+C/V/X/A/Z/Y.
7. Verificar que o menu de contexto (`context-menu` em `electron/main.ts`) cobre todos os campos editáveis (já cobre via `isEditable`/`editFlags`).
8. Nenhum código adicional esperado; apenas relatório de conferência. Se algum campo bloquear clipboard, remover a restrição.

### Fase 4 — Verificação
9. `npm run build` — garantir typecheck limpo.
10. `npm run dev` — teste manual:
    - Abrir atividade → "Adicionar Texto como Evidência".
    - Clicar em várias regiões do editor (padding, linhas vazias) e confirmar cursor/foco.
    - Ctrl+V em texto copiado da área de transferência do SO → deve colar.
    - Botão direito → "Colar" → deve colar.
    - Digitar > 2000 caracteres e confirmar que vai até 20000 e que o contador fica vermelho acima de 18000.
    - Repetir em modo "Editar Evidência de Texto".
11. Teste rápido em outros inputs (legenda da evidência, descrição de atividade, busca, profile) com Ctrl+V e menu de contexto.

## Relevant files
- [src/components/TextEvidenceEditor.tsx](src/components/TextEvidenceEditor.tsx) — alterar `MAX_CHARS`, adicionar `onMouseDown` no wrapper de conteúdo, garantir foco inicial do editor.
- [src/components/TextEvidenceModal.tsx](src/components/TextEvidenceModal.tsx) — referência; não deve precisar mudar. Verificar que `onClick={(e) => e.stopPropagation()}` no card interno continua correto.
- [electron/main.ts](electron/main.ts) — contexto do `context-menu` handler (linhas ~126–156) e `runEditCommand` (linhas ~526–546). Sem alterações previstas.
- [src/pages/ActivityFormPage.tsx](src/pages/ActivityFormPage.tsx) e demais páginas com `<input>`/`<textarea>` — apenas auditoria.

## Decisions
- **Novo limite**: 20000 caracteres (conforme solicitado).
- **Abordagem do clique**: correção mínima com `onMouseDown` focando o editor; não reescrever layout do editor.
- **Escopo**: fix localizado no editor TipTap + auditoria de outros campos. Nenhuma mudança em schema, IPC ou backend. `Evidence.text_content` já aceita strings grandes (SQLite TEXT), sem limite de DB.
- **Fora de escopo**: reescrever toolbar, adicionar novas extensões TipTap (ex.: sublinhado, links), mudar aparência do modal.

## Further Considerations
1. O `EditorContent` hoje mistura padding e classes do ProseMirror na mesma div. Devemos mover `p-3 min-h-[150px]` para o wrapper externo (mais robusto) ou manter no `EditorContent` e apenas adicionar o handler de foco?
   - Opção A (recomendada): mover padding/min-h para o wrapper e deixar `EditorContent` só com a área editável → garante que clicar em qualquer pixel foca o editor sem lógica adicional.
   - Opção B: manter layout atual e apenas adicionar `onMouseDown` com `focus()` → menos mudança mas depende de `e.target` do DOM do ProseMirror.
2. Validar se há necessidade de aumentar limite também para a legenda (`caption` input). Hoje não há `maxLength`. Recomendação: manter como está (sem limite explícito).
