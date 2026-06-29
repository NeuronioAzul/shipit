## Plan: Remoção do tema Cyberpunk + padronização de temas e campos de formulário

Remover **completamente** o tema Cyberpunk (CSS, efeitos, hooks de classe, testes, assets órfãos e documentação) em um commit isolado; em seguida **melhorar e padronizar** o sistema de temas (paletas Futurista, Oceano e Pôr do Sol conforme as cores fornecidas; imagem de fundo para Rosa & Violeta; revisão de consistência das demais paletas e dos temas de alto contraste em 8-bit) e **unificar o estilo de todos os controles de formulário e botões** (texto, textarea, select, checkbox, date/time, botões) através de um único sistema de classes baseado em tokens de tema, eliminando as inconsistências mapeadas (raio, padding, hover, focus ring, cores cruas, estados de disabled).

Esta é uma tarefa grande, dividida em **duas entregas** (dois ou mais commits): **(A) remoção do Cyberpunk** e **(B) padronização de temas + controles**.

---

### Contexto técnico (estado atual)

- Tema aplicado como classe no `<html>` por [src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx) (`root.classList.add(theme)`); IDs derivados de `ALL_THEME_IDS`.
- Cada tema sobrescreve ~60 variáveis CSS em [src/themes/themes.css](src/themes/themes.css); expostas ao Tailwind v4 via `@theme inline` em [src/index.css](src/index.css).
- Hoje são **11 temas** (incluindo `cyberpunk`). Efeitos Cyberpunk em [src/themes/cyberpunk-effects.css](src/themes/cyberpunk-effects.css) (1404 linhas, tudo sob `.cyberpunk`).
- Classes-gancho `cyber-*` (`cyber-input`, `cyber-input-frame`, `cyber-frame-muted`, `cyber-frame-error`, `cyber-input-error`, `cyber-neon-border`) estão espalhadas em 15 componentes, mas **só têm efeito sob `.cyberpunk`** → ficam mortas após a remoção. `cyber-button` e `cyberpunk-input` **já são classes mortas** (sem regra CSS).
- `vite.config.ts` usa `base: './'`; produção carrega via `loadFile(dist/index.html)` (file://). `public/**/*` é empacotado. `url('/assets/...')` em CSS é reescrito pelo Vite para caminho relativo (precedente comprovado: cursores). Protocolos `shipit-evidence://`/`shipit-sfx://` servem **arquivos do usuário**, não assets de build.
- Testes de tema vivem **apenas** em [e2e/app.spec.ts](e2e/app.spec.ts) (não há teste unitário de `themes.ts`). 3 testes referenciam Cyberpunk.

---

## PARTE A — Remover o tema Cyberpunk (commit 1)

**Steps**

1. **Excluir** [src/themes/cyberpunk-effects.css](src/themes/cyberpunk-effects.css) (arquivo inteiro).
2. [src/index.css](src/index.css): remover o `@import "./themes/cyberpunk-effects.css";` (linha 5) e remover **apenas** o seletor `.cyberpunk ::selection,` da regra agrupada (linha 119), preservando `.dark / .futuristic / .high-contrast-dark`.
3. [src/themes/themes.css](src/themes/themes.css): remover o bloco da seção 11 (`/* ===== 11. Cyberpunk ===== */` + `.cyberpunk { … }`, linhas 876–960).
4. [src/themes/themes.ts](src/themes/themes.ts): remover o membro `| 'cyberpunk'` do `ThemeId` (linha 12) e a entrada do array `THEMES` (linhas 179–193, incl. comentário `// Personality (dark)`). Funções derivadas não mudam.
5. **Remover os tokens `cyber-*` mortos do markup** (apagar somente o token-gancho, **mantendo** todas as classes de layout/utilitárias do mesmo `className`):
   - `cyber-neon-border`: [DashboardPage.tsx:173](src/pages/DashboardPage.tsx#L173), [TrashPage.tsx:224](src/pages/TrashPage.tsx#L224) e [:263](src/pages/TrashPage.tsx#L263), [ActivityDetailPage.tsx:73](src/pages/ActivityDetailPage.tsx#L73)/[:742](src/pages/ActivityDetailPage.tsx#L742)/[:807](src/pages/ActivityDetailPage.tsx#L807), [ActivitiesPage.tsx:502](src/pages/ActivitiesPage.tsx#L502), [EvidenceUpload.tsx:87](src/components/EvidenceUpload.tsx#L87)/[:458](src/components/EvidenceUpload.tsx#L458)/[:509](src/components/EvidenceUpload.tsx#L509), [ThemeSelector.tsx:9](src/components/ThemeSelector.tsx#L9).
   - `cyber-input` / `cyber-input-error`: [ProfilePage.tsx:255/258](src/pages/ProfilePage.tsx#L255), [ActivityFormPage.tsx:360/363](src/pages/ActivityFormPage.tsx#L360), [SettingsPage.tsx:341/503/515](src/pages/SettingsPage.tsx#L341), [ActivitiesPage.tsx:372/415](src/pages/ActivitiesPage.tsx#L372), [DatePicker.tsx:180/181](src/components/DatePicker.tsx#L180), [Select.tsx:147/148](src/components/Select.tsx#L147), [TimePicker.tsx:172/173](src/components/TimePicker.tsx#L172), [RichTextEditor.tsx:144](src/components/RichTextEditor.tsx#L144), [TextEvidenceModal.tsx:112](src/components/TextEvidenceModal.tsx#L112).
   - `cyber-input-frame` / `cyber-frame-muted` / `cyber-frame-error`: wrappers em [ProfilePage.tsx:272](src/pages/ProfilePage.tsx#L272) (`frameClass`), [ActivityFormPage.tsx:376/592/613](src/pages/ActivityFormPage.tsx#L376), [SettingsPage.tsx:336/498](src/pages/SettingsPage.tsx#L336), [ActivitiesPage.tsx:366/409](src/pages/ActivitiesPage.tsx#L366). Remover a função `frameClass()` e os `<div>`-wrapper que só serviam ao gancho (não têm utilitárias de layout) — ou esvaziar; **preferir remover** para não deixar `className=""`. Em SettingsPage:336 manter `flex-1`.
   - Classes mortas: `cyber-button` ([SettingsPage.tsx:345/395](src/pages/SettingsPage.tsx#L345)) e `cyberpunk-input` ([SettingsPage.tsx:424](src/pages/SettingsPage.tsx#L424)) — remover.
   - **NÃO remover** classes base compartilhadas usadas em todos os temas: `.datepicker-*`, `.select-*`, `.timepicker-*`, `.ProseMirror`, `border-dashed`, etc.
6. [e2e/app.spec.ts](e2e/app.spec.ts): **excluir** os 2 testes exclusivos de Cyberpunk (`keeps top menu dropdown anchored in cyberpunk theme`, ~748–780; `keeps searchbar stable and anchored in cyberpunk theme`, ~1159–1224); **adaptar** o teste de scrollbar (`applies themed scrollbar tokens…`, ~799–860) para usar outro tema escuro de contraste (ex.: **Futurista** ou **Escuro**) no lugar de Cyberpunk, mantendo as asserções de `--scrollbar-*` diferindo do tema Claro.
7. **Excluir assets órfãos**: pasta [public/assets/cursors/](public/assets/cursors/) (referenciada só pelo CSS removido) e a pasta de referência `docs/cyber-punk-style-samples/`.
8. **Documentação**: remover linhas de Cyberpunk em [README.md](README.md) (linha 273 e exemplo 278), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (linhas 188, 248, 250, 281, 388), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (linha 188). **CHANGELOG**: adicionar entrada nova de remoção (não reescrever histórico de versões já publicadas). Atualizar o rascunho [docs/coisas para fazer e publicar.md](<docs/coisas para fazer e publicar.md>) e registrar em [docs/TODO.md](docs/TODO.md)/[docs/DONE.md](docs/DONE.md) conforme o fluxo do CLAUDE.md.
9. Rodar `npm run build` + `npm run test` + (se viável) `npm run test:e2e`; **commit 1**: `feat(themes)!: remover tema Cyberpunk`.

---

## PARTE B — Padronizar temas e controles de formulário (commit 2+)

### B1. Sistema único de controles (fonte da verdade)

Criar **`src/themes/controls.css`** (importado em [src/index.css](src/index.css) após `themes.css`), com `@layer components`, 100% baseado nos tokens de tema (sem cores cruas), definindo:

- **Botões** — base `.btn` (inline-flex, `gap`, `font-medium`, `text-sm`, `rounded-lg`=0.5rem, `px-4 py-2`, `cursor-pointer`, transição, `:focus-visible` → `outline: 2px solid var(--ring); outline-offset:2px`, `:disabled`/`[aria-disabled]` → `opacity:.5; cursor:not-allowed`). Variantes:
  - `.btn-primary` (`--primary`/`--primary-foreground`), `.btn-accent` (`--accent`), `.btn-secondary` (`--secondary`), `.btn-destructive` (`--destructive`), `.btn-outline` (transparente + `border-border` + hover `--surface-hover`), `.btn-ghost` (transparente, `--muted-foreground`, hover `--surface-hover` + `--foreground`), `.btn-link` (texto sublinhado).
  - **Hover padronizado:** sólidos → `opacity:.9` (ativo `.8`); outline/ghost → `background: var(--surface-hover)`.
  - Tamanhos: `.btn-sm` (`px-3 py-1.5 text-xs`), `.btn-icon` (quadrado `p-2`), `.btn-icon-sm` (`p-1.5`).
- **Campos** — `.field` (canônico: `w-full px-3 py-2`, `background: var(--input)`, `border-border`, `rounded-lg`, `color: var(--foreground)`, foco `:focus`/`:focus-within` → `ring-2`/`box-shadow` com `--ring`), `.field-sm` (`px-3 py-1.5 text-sm` para barras de filtro), `.field-error` (`border-destructive` + foco `--destructive`). `textarea.field` → `resize-y` por padrão.
- **Checkbox/Radio** — `.checkbox` (`1rem`, `accent-color: var(--accent)`, `cursor-pointer`, foco visível).
- **Opções de lista** — `.option` + `.option-selected` (hover/focus `--surface-hover`; selecionado `bg-primary/10` + `text-primary`, `font-medium`) reaproveitadas por `Select`, `TimePicker` e `SearchBar`.

### B2. Migrar componentes/páginas para o sistema

- **Controles customizados (cobrem muitos call-sites de uma vez):** [Select.tsx](src/components/Select.tsx), [DatePicker.tsx](src/components/DatePicker.tsx), [TimePicker.tsx](src/components/TimePicker.tsx) → trigger usa `.field`/`.field-sm`/`.field-error`; padronizar opções com `.option`. Adicionar variante `size='sm'` a DatePicker/TimePicker (paridade com Select para barras de filtro). Corrigir o **bug do `className` duplicado** no TimePicker (aplicado em container *e* trigger). Dar `role="option"`/`aria-selected` aos itens de hora/minuto do TimePicker (paridade de a11y).
- **Inputs/Textareas nativos:** ProfilePage, ActivityFormPage, SettingsPage (`reportsDir`, `alertMessage`), ActivitiesPage (filtros), [InputTags.tsx](src/components/InputTags.tsx) (wrapper → `.field` com `focus-within`), [SearchBar.tsx](src/components/SearchBar.tsx) (input → `.field`/`.field-sm`, resultados → `.option`), [RichTextEditor.tsx](src/components/RichTextEditor.tsx) (host → `.field` no wrapper), [TextEvidenceModal.tsx](src/components/TextEvidenceModal.tsx)/[EvidenceUpload.tsx](src/components/EvidenceUpload.tsx) (caption inputs).
- **Checkboxes:** os 3 do SettingsPage (419/444/510) → `.checkbox` (mesma classe).
- **Botões (app inteiro):** migrar para `.btn*`, resolvendo a semântica:
  - **Cancelar** (não destrutivo) → sempre `.btn-outline` (corrige os 4+ tratamentos atuais: bg-primary/destructive/ghost).
  - **Confirmar destrutivo** → `.btn-destructive`; **CTA principal** (criar/salvar) → `.btn-accent`; ações positivas secundárias → `.btn-primary`.
  - Remover **cores cruas**: `hover:bg-emerald-300` (SettingsPage 348/397), `hover:bg-amber-400` (ActivityDetailPage 872/919), `bg-white/NN`/`hover:bg-white/10` (TitleBar 206/217/237/250, AppTopMenu 189, Header logo plates) → tokens (`--surface-hover`, `--titlebar-foreground`, etc.); `bg-black/50` de drag-handle (EvidenceUpload/ActivityDetail) → tokens. Scrims de overlay podem migrar para `var(--overlay)`.
  - Padronizar `disabled:opacity-50`, raio `rounded-lg`, foco visível em **todos** os botões de ação (hoje só ícones de navegação têm).
- **Correções de bugs visuais mapeadas:** conflito `border-2 border-3` em [ThemeSelector.tsx:9–12](src/components/ThemeSelector.tsx#L9); `group` vs `group/ev` em ActivityDetailPage (hover-reveal nunca dispara); hover "morto" (ActivityDetailPage:801); botão "Voltar" sem transição (ActivityDetailPage:510).

### B3. Paletas de tema (atualizar/padronizar [src/themes/themes.css](src/themes/themes.css))

Manter o esquema de ~60 variáveis em `rgb()`. Aplicar as cores fornecidas, mapeando os papéis para os tokens existentes (`--secondary` é **superfície**, não ação; a 2ª cor de marca vai em `--accent`):

- **Futurista** (dark) — neon sobre preto. `--background` #030305, `--card` #101629, `--popover` #131B33, `--foreground` #F6F8FF, `--primary` #00CFFF (ciano), `--accent` #FF00D4 (magenta), `--secondary`/`--muted` #141A2E, `--muted-foreground` #7682A8, `--border` #31436D, `--input` #141A2E, `--ring` #5CEEFF, `--success` #39FF14, `--warning` #FFB800, `--destructive` #FF3A20, `--info` #2972FF, sidebar/header #070B14, scrollbar thumb ciano/hover magenta, charts cyan/green/blue/amber/red. Foregrounds de status escuros (#030305).
- **Oceano** (**passa a `base: 'dark'`**) — oceano profundo. `--background` #071826, `--card` #123148, `--popover` #183E57, `--foreground` #F5FBFD, `--primary` #2CA3C3, `--accent` #1DB7AE (aqua), `--secondary`/`--muted` #183E57, `--muted-foreground` #8EA9B5, `--border` #37718C, `--input` #183E57, `--ring` #6BD6FF, `--success` #1BCB8F, `--warning` #E8B84A, `--destructive` #D65A5A, `--info` #37B7FF, sidebar/header #0D2436. Atualizar `preview` e `base` em [themes.ts](src/themes/themes.ts) e **incluir `.ocean` no grupo `::selection` escuro** de [index.css](src/index.css).
- **Pôr do Sol** (light) — outono quente. `--background` #F5F2ED, `--card` #FFFFFF, `--secondary`/`--muted` #EEE7DD, `--foreground` #2F120B, `--muted-foreground` #8C7A6B, `--primary` #B13F0A (laranja outono), `--accent` #E58A17 (dourado), `--border` #D6C8B8, `--input` #FFFFFF, `--ring` #B13F0A, `--success` #7A8A45 (oliva), `--warning` #D8B84C, `--destructive` #A62B12, `--info` #8591C0, sidebar/header #B13F0A.
- **Rosa & Violeta** — adicionar imagem de fundo: no bloco `.rose-violet` (ou no `body`/raiz com a classe), `background-image: url('/assets/images/bg/tema-rosa.jpg'); background-size: cover; background-position: center; background-attachment: fixed; background-repeat: no-repeat;` (forma `'/assets/...'` reescrita pelo Vite — funciona em dev e empacotado). Garantir legibilidade (cards já são opacos; usar `var(--background)` por baixo).
- **Demais temas** (Claro, Escuro, Colorido, Minimalista) — revisar para completude/consistência de tokens e contraste; **não** trocar identidade de cor (Colorido permanece "focado nas primárias").
- **Alto Contraste / Alto Contraste Escuro** — alinhar cores de ação/status à paleta **8-bit websafe** (componentes ∈ {0,51,102,153,204,255}) **mantendo WCAG AAA (≥7:1)**: ex. primário `#0000CC`/`#FFFF00`, sucesso `#006600`/`#00FF00`, erro `#CC0000`/`#FF0000`, aviso/accent `#CC6600`. Atualizar `preview` em [themes.ts](src/themes/themes.ts) se mudar.

### B4. Sincronizar `themes.ts` e descrições

Atualizar `label`/`description`/`preview`/`base` conforme a tabela fornecida (Claro, Escuro, Colorido, Rosa & Violeta, Minimalista, Futurista, Oceano, Pôr do Sol, Alto Contraste, Alto Contraste Escuro). Adicionar **teste unitário** `src/themes/themes.test.ts` travando o conjunto pós-mudança (10 temas, IDs sem `cyberpunk`, categorias, shape do `preview`).

**Steps (Parte B)**

1. Criar `src/themes/controls.css` (B1) e importá-lo em [src/index.css](src/index.css).
2. Atualizar paletas em [src/themes/themes.css](src/themes/themes.css) (B3) e `base`/`preview`/textos em [src/themes/themes.ts](src/themes/themes.ts) (B4); ajustar grupo `::selection` para incluir `.ocean`.
3. Adicionar imagem de fundo de Rosa & Violeta (B3).
4. Migrar controles customizados (Select/DatePicker/TimePicker/InputTags/SearchBar/RichTextEditor) para `.field`/`.option` e corrigir bugs (B2).
5. Migrar inputs/textareas/checkboxes nativos para `.field`/`.checkbox` (B2).
6. Migrar botões do app para `.btn*`, padronizar semântica de Cancelar/Confirmar e remover cores cruas (B2).
7. Corrigir bugs visuais residuais (ThemeSelector border, group/ev, hovers mortos) (B2).
8. Adicionar `src/themes/themes.test.ts`; ajustar/expandir e2e de tema se tokens mudarem.
9. `npm run build` + `npm run test` + `npm run test:e2e`; commits lógicos (paletas; sistema de controles + migração).

**Relevant files**
- [src/themes/themes.css](src/themes/themes.css), [src/themes/themes.ts](src/themes/themes.ts), [src/index.css](src/index.css), **novo** `src/themes/controls.css`, [src/themes/scrollbars.css](src/themes/scrollbars.css).
- Componentes: [Select.tsx](src/components/Select.tsx), [DatePicker.tsx](src/components/DatePicker.tsx), [TimePicker.tsx](src/components/TimePicker.tsx), [InputTags.tsx](src/components/InputTags.tsx), [SearchBar.tsx](src/components/SearchBar.tsx), [RichTextEditor.tsx](src/components/RichTextEditor.tsx), [TextEvidenceModal.tsx](src/components/TextEvidenceModal.tsx), [TextEvidenceEditor.tsx](src/components/TextEvidenceEditor.tsx), [EvidenceUpload.tsx](src/components/EvidenceUpload.tsx), [ThemeSelector.tsx](src/components/ThemeSelector.tsx), [TitleBar.tsx](src/components/TitleBar.tsx), [AppTopMenu.tsx](src/components/AppTopMenu.tsx), [Header.tsx](src/components/Header.tsx), [ActivityNav.tsx](src/components/ActivityNav.tsx), [UpdateStatusPanel.tsx](src/components/UpdateStatusPanel.tsx), [UpdateModal.tsx](src/components/UpdateModal.tsx).
- Páginas: [AboutPage.tsx](src/pages/AboutPage.tsx), [ProfilePage.tsx](src/pages/ProfilePage.tsx), [SettingsPage.tsx](src/pages/SettingsPage.tsx), [TrashPage.tsx](src/pages/TrashPage.tsx), [ActivitiesPage.tsx](src/pages/ActivitiesPage.tsx), [ActivityFormPage.tsx](src/pages/ActivityFormPage.tsx), [ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx), [DashboardPage.tsx](src/pages/DashboardPage.tsx), [UserManualPage.tsx](src/pages/UserManualPage.tsx).
- Testes/Docs: [e2e/app.spec.ts](e2e/app.spec.ts), **novo** `src/themes/themes.test.ts`, [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

**Verification**
1. `npm run build` compila (tsc src + electron) sem erros (a remoção do `ThemeId 'cyberpunk'` é checada pelo TS).
2. `npm run test` (vitest) verde, incluindo o novo `themes.test.ts`.
3. `npm run test:e2e` verde (testes de Cyberpunk removidos/realocados).
4. `npm run dev`: alternar os **10 temas**; conferir Futurista/Oceano/Pôr do Sol com as novas cores, imagem de fundo no Rosa & Violeta, e Alto Contraste AAA.
5. Inspecionar visualmente botões e campos (texto, textarea, select, date, time, checkbox, tags, busca) em todos os temas: mesmo raio, padding, foco, hover e disabled. Verificar que `localStorage.shipit-theme='cyberpunk'` degrada para Claro (fallback `getThemeById`).

**Decisions (interpretações assumidas — ajustáveis)**
- **Oceano vira tema escuro** (a paleta fornecida é "oceano profundo"). Pôr do Sol permanece claro; Futurista permanece escuro.
- Remoção do Cyberpunk inclui a pasta de samples e os cursores órfãos; **CHANGELOG** ganha entrada nova (sem reescrever histórico publicado).
- Padronização via **classes de componente em CSS baseadas em tokens** (`.btn*`, `.field*`, `.checkbox`, `.option`), e não novos componentes React — menor churn e tema-agnóstico.
- **Cancelar** padroniza para `.btn-outline` em todo o app; CTA principal mantém `--accent` (identidade laranja atual).
- Colorido/Claro/Escuro/Minimalista mantêm identidade de cor; apenas consistência/contraste são revisados.

**Further Considerations**
1. Migração de botões é ampla (~36 arquivos): fazer por grupos, rodando build/test entre etapas para isolar regressões.
2. A imagem `tema-rosa.jpg` (13.9 KB) é leve; se necessário, sobrepor leve `--background` para contraste de texto.
3. Avaliar adicionar cobertura e2e mínima de estilo de controle (raio/foco) já que a área é hoje não testada.
