---
description: "Corrigir a perda de formatação (quebras de linha, negrito, itálico, listas) na exportação DOCX e adicionar editor rich-text ao campo de descrição da atividade, reutilizando o padrão do TextEvidenceEditor. Use ao trabalhar em report-generator.ts, ActivityFormPage e na renderização da descrição."
agent: "agent"
argument-hint: "Escopo: fase 1 (fix), fase 2 (feature), ou ambas"
---

# Plan shipit38 — Descrição rich-text e formatação no DOCX

**TL;DR**: a descrição da atividade hoje é texto plano injetado num `<w:t>` do DOCX, então `\n` colapsa (tudo em uma linha). As evidências de texto (TipTap → `htmlToWordXml`) preservam formatação, mas o conversor tem lacunas (`<br>`, listas numeradas, espaços entre marcações). Este plano: **(Fase 1)** conserta as quebras de linha da descrição e endurece o `htmlToWordXml`; **(Fase 2)** transforma a descrição em rich-text (igual à evidência de texto), refletindo isso em todas as telas, busca, validação e no DOCX.

Itens atendidos (do rascunho `coisas para fazer e publicar.md`):

- 🔴 fix: quebras de linha da descrição não vão para o DOCX (ficam numa linha só).
- 🔴 fix: verificar negrito/itálico/listas/quebras passando corretamente para o DOCX.
- 🟠 feat: adicionar formatador de texto na descrição, igual ao da evidência de texto.

---

## Contexto do código (fonte da verdade)

- **DOCX**: `electron/report-generator.ts`
  - Descrição injetada em `replaceTextInNode(actRow, '{{activity_description}}', act.description || '')` (~L624). Placeholder é o conteúdo único de um `<w:t>` dentro de um `<w:r>` (sz=18) numa célula de tabela (`<w:tc>`). `\n` num `<w:t>` **não** vira quebra de linha no Word.
  - Evidência de texto: `htmlToWordXml(html)` (~L424) → parágrafos `<w:p>`. Trata `<p>`, `<li>`, `<strong>/<b>`, `<em>/<i>`. **Lacunas**: não trata `<br>` (hard break do TipTap); `<ol>` vira marcador `•` (perde numeração); `.trim()` por fragmento remove espaços entre marcações ("foo <b>bar</b> baz" → "foobarbaz"); não decodifica entidades HTML.
- **Editor existente**: `src/components/TextEvidenceEditor.tsx` (TipTap StarterKit sem heading/codeBlock/blockquote/hr; negrito, itálico, lista com marcadores e numerada; limite 20.000). Reutilizável.
- **Descrição (estado atual = texto plano)** — locais (ver mapa completo):
  - Edição: `ActivityFormPage.tsx` `<textarea>` (~L477-506), estado `form.description`.
  - Exibição: `ActivityDetailPage.tsx` `whitespace-pre-wrap` (~L627-634); `ActivitiesPage.tsx` `line-clamp-2` (~L123) + filtro `.includes` (~L283); `DashboardPage.tsx` tabela + Gantt `substring(0,18)` (~L260-335); `ActivityNav.tsx` `truncate(...,50)`.
  - Busca: `SearchBar.tsx` (`.includes` + `highlightMatch`), `electron/database.ts` `LIKE` (~L556).
  - Validação: `src/utils/validation.ts` obrigatório (`!description?.trim()`, L11-13) + completude (L112).
  - Tipos: `src/vite-env.d.ts` `ActivityData.description: string`; entidade `electron/entities/Activity.ts` `@Column text nullable`.

---

## Fase 1 — FIX (urgente, baixo risco, independente)

Objetivo: resolver os dois 🔴 sem mudar armazenamento nem UI.

### 1a. Quebras de linha da descrição no DOCX

- Em `report-generator.ts`, trocar a injeção da descrição por uma versão multilinha: ao achar o `<w:t>` com `{{activity_description}}`, dividir o valor em `\r?\n` e, dentro do mesmo `<w:r>`, emitir `<w:t>linha0</w:t><w:br/><w:t>linha1</w:t>...` (com `xml:space="preserve"`). O Word renderiza `<w:br/>` dentro do run como quebra de linha.
- Implementar helper `replaceTextInNodeMultiline(node, search, value)` e usá-lo só para a descrição; demais placeholders seguem `replaceTextInNode`.

### 1b. Endurecer `htmlToWordXml` (negrito/itálico/listas/quebras)

- Reescrever para: preservar espaços entre marcações (sem `.trim()` por fragmento; colapsar espaços como HTML); tratar `<br>` → `<w:br/>`; numerar `<ol>` (`1. `, `2. `…) e manter `•` em `<ul>`; decodificar entidades HTML (`&amp; &lt; &gt; &nbsp; &quot; &#39;`) antes do `escapeXml`.
- Exportar `htmlToWordXml` para teste unitário.

### Testes (Fase 1)

- Unit (`report-generator.test.ts`): `htmlToWordXml` para negrito, itálico, negrito+itálico, espaços entre marcações, `<br>`, `<ul>` (•) e `<ol>` (1./2.).
- Integração (`report-generator.integration.test.ts`): descrição com `\n` gera `<w:br/>` e contém ambas as linhas; evidência de texto com lista numerada contém `1. ` no `document.xml`.

### Validação (Fase 1)

- `npm run build` e `npm run test` verdes.

---

## Fase 2 — FEAT: descrição rich-text

Objetivo: descrição passa a ser HTML (TipTap), como a evidência de texto, refletida em todo o app e no DOCX. Sem migração destrutiva no banco (coluna continua `text`); normaliza legados em texto plano para HTML na borda.

### 2a. Editor reutilizável

- Extrair o núcleo do `TextEvidenceEditor` para um `RichTextEditor` reutilizável (props: `content`, `onChange`, `placeholder`, `maxChars`, `readOnly`, `minHeight`). Manter `TextEvidenceEditor` como wrapper fino (sem regressão).

### 2b. Formulário

- `ActivityFormPage`: trocar `<textarea>` pelo `RichTextEditor`; `form.description` passa a guardar HTML. Ajustar `onPaste`, auto-save (fingerprint por texto plano), e carregamento (normalizar legado → HTML).

### 2c. Exibição e busca (helpers compartilhados)

- Criar `src/utils/richText.ts`: `htmlToPlainText(html)`, `isRichTextEmpty(html)`, `normalizeToHtml(value)` (legado texto plano → HTML preservando `\n`).
- Detalhe: renderizar HTML com classes `prose` (no lugar de `whitespace-pre-wrap`).
- Lista, Dashboard (tabela/Gantt/tooltip), `ActivityNav`, `SearchBar` (preview/highlight): usar `htmlToPlainText` para truncar/buscar/realçar.
- Busca client-side (`ActivitiesPage`, `SearchBar`) usa `htmlToPlainText` antes do `.includes`. `LIKE` no banco permanece (casa o texto entre tags).

### 2d. Validação

- `validation.ts`: obrigatoriedade e completude passam a usar `isRichTextEmpty` (TipTap vazio = `<p></p>`).

### 2e. DOCX (descrição HTML na célula)

- Substituir a injeção da Fase 1a: localizar o `<w:p>` âncora com `{{activity_description}}` na célula e trocá-lo pelos parágrafos gerados por `htmlToWordXml` (variante para célula, font sz=18). Legado texto plano passa por `normalizeToHtml` antes.

### Testes (Fase 2)

- Unit: `richText.ts` (`htmlToPlainText`, `isRichTextEmpty`, `normalizeToHtml`).
- Validação: descrição `<p></p>` é inválida; texto real é válido.
- Integração DOCX: descrição com `<ul>`/negrito gera parágrafos/`•`/`<w:b/>` na célula; descrição legada com `\n` preserva quebras.
- E2E (se viável): criar atividade com descrição formatada e ver no detalhe.

### Validação (Fase 2)

- `npm run build`, `npm run test` verdes; smoke manual em `npm run dev` (criar/editar/gerar DOCX).

---

## Regras e cuidados

- pt-BR em textos/UI; inglês em identificadores.
- Não mudar `contextIsolation`/`nodeIntegration`; sem novas libs além do TipTap já presente.
- Renderização de HTML da descrição vem só do próprio editor (TipTap sanitiza para um subconjunto seguro: p, br, strong/b, em/i, ul, ol, li). Ainda assim, evitar injetar HTML arbitrário de fontes externas.
- Preservar mudanças não relacionadas no working tree.
- Fase 1 é entregável sozinha (atende os 🔴). Fase 2 supera a injeção da Fase 1a.

---

## Ordem de execução

1. Fase 1a + 1b + testes → build/test → (commit).
2. Fase 2a→2e + testes → build/test → smoke → (commit).
3. Doc-sync: CHANGELOG `[Unreleased]`, mover itens do rascunho/TODO conforme a skill `shipit-release-and-doc-sync`.
