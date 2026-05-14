# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---


## [1.4.0] — 2026-05-14

- Atualização para versão 1.4.0


## [1.3.7] — 2026-05-13

### Corrigido

- A verificação manual de atualizações agora retorna o estado final corretamente ao concluir a checagem, evitando que a interface permaneça presa em “verificando” quando não há nova versão disponível.

## [1.3.6] — 2026-05-13

### Adicionado v1.3.6

Fluxo manual de atualização em Configurações → Atualizações, com ações separadas para verificar, baixar e instalar, além de acompanhamento de progresso do download.
Sinalização visual de novas versões com badges na navegação, modal de atualização na TitleBar e indicadores por plataforma (overlay no Windows e badge no macOS/Linux).

### Corrigido v1.3.6

O estado de atualização pendente agora é preservado entre reinicializações, mantendo versões disponíveis ou já baixadas visíveis até a instalação.
O destaque de atualização passou a respeitar melhor a visualização da área de atualizações, reduzindo alertas repetidos para a mesma versão.

### Alterado v1.3.6

O ShipIt! passou a apenas verificar novas versões ao iniciar; o download e a instalação agora dependem de consentimento explícito do usuário.

## [1.3.5] — 2026-05-08

### Corrigido v1.3.5

- `userData` de produção fixado explicitamente em `%APPDATA%\shipit` para preservar compatibilidade com instalações anteriores, mantendo desenvolvimento em `%APPDATA%\ShipIt!` e E2E em perfil temporário isolado.
- `APP_ID` runtime alinhado ao `build.appId` do `package.json` (`br.com.neuronioazul.shipit`), evitando identidade divergente no Windows.

## [1.3.4] — 2026-05-08

### Corrigido v1.3.4

- `userData` de produção foi fixado explicitamente em `%APPDATA%\shipit` para preservar compatibilidade com instalações anteriores, mantendo desenvolvimento em `%APPDATA%\ShipIt!` e E2E em perfil temporário isolado.
- `APP_ID` em runtime foi alinhado ao `build.appId` do `package.json` (`br.com.neuronioazul.shipit`), evitando identidade divergente no Windows.

## [1.3.3] — 2026-05-06

- Enhanced text formatting preservation in DOCX exports.
- Introduced user-controlled application updates with notification indicators.
- Implemented notification system for available updates with user prompts for installation.
- Created a PowerShell script to clear Windows icon cache for the application.

### Adicionado (Validação TitleBar e Release)

- Cobertura Playwright/Electron ampliada para controles reais da janela na TitleBar: minimizar, maximizar/restaurar e fechar para tray sem destruir a janela.
- Regressão completa da busca na TitleBar cobrindo foco via `Ctrl+K`, ícone, debounce, limite de resultados, destaque com `<mark>`, estado vazio, navegação por teclado, filtro avançado, `Escape` e clique fora.
- Validação completa do menu superior customizado: navegação por teclado entre seções/itens e comandos File/Edit/View/Help, com instrumentação segura para ações nativas (`shell.openPath`, `webContents`, zoom, janela e quit).
- Fixtures E2E de atividades centralizadas para criar registros via IPC/formulário e gerar meses únicos por execução.
- Helpers testáveis para identidade runtime, resolução de assets/ícones, notificações de update e perfil temporário E2E com marcador de segurança.
- Script manual opt-in `docs/scripts/clear-shipit-icon-cache.ps1` para limpeza dry-run do cache global de ícones do Windows.

### Corrigido 1.3.3

- Resultados da SearchBar ganharam IDs, `role="listbox"`, `role="option"`, `aria-selected` e `data-selected` para tornar a seleção por teclado assertiva e acessível.
- Teste E2E do seletor mensal no detalhe da atividade agora usa meses únicos por execução, evitando contaminação por dados persistidos de runs anteriores.
- Auto-update passou a usar `checkForUpdates()` com notificações próprias do ShipIt em pt-BR, ícone controlado, dedupe por versão/status e clique focando a janela existente em Configurações.
- Execução Playwright/Electron agora usa `userData` temporário isolado com marcador `.shipit-test-profile`, evitando escrita em `%APPDATA%\shipit` e permitindo cleanup seguro.
- Identidade visual do Windows foi centralizada para alinhar AppUserModelId, nome do app e ícones de janela, notificação, tray e empacotamento.

---

## [1.3.2] — 2026-05-04

### Alterado v1.3.2

- Atualização de versão para 1.3.2 e alinhamento dos metadados de release, sem mudanças funcionais adicionais em relação à 1.3.1.

## [1.3.1] — 2026-05-04

### Adicionado v1.3.1

- Cobertura Playwright/Electron ampliada para validar os controles reais da janela na TitleBar, incluindo minimizar, maximizar/restaurar e fechar para a bandeja.
- Regressão completa da busca na TitleBar, cobrindo foco via `Ctrl+K`, debounce, limite de resultados, destaque, navegação por teclado, filtro avançado, `Escape` e clique fora.
- Validação automatizada do menu superior customizado, com navegação por mouse/teclado e execução segura dos comandos de **File / Edit / View / Help**.

### Corrigido v1.3.1

- Resultados da SearchBar passaram a ter IDs e atributos ARIA (`role="listbox"`, `role="option"`, `aria-selected` e `data-selected`) para tornar a navegação por teclado mais previsível e acessível.
- O teste E2E do seletor mensal no detalhe da atividade agora usa meses únicos por execução, evitando interferência de dados persistidos entre execuções.

## [1.3.0] — 2026-04-27

### Corrigido v1.3.0 (Fase 22 — Ordenação cronológica de atividades)

- **Ordenação estável no backend**
  - Novas atividades passam a ser anexadas ao fim do mês de referência em vez de depender de `last_updated`
  - Atividades antigas com `order = null` são normalizadas por mês usando UUID v7 (`id ASC`) como fallback de criação
  - `getActivities`, `getReportPayload` e `searchActivities` agora usam a mesma fonte de ordenação (`order ASC`, `id ASC`)
- **Fallback browser alinhado**
  - `localDb` calcula a próxima ordem pelo maior `order` existente no mês e mantém fallback por posição de inserção
- **Cobertura de testes ampliada**
  - Regressões para criação, normalização de legado, drag-and-drop autoritativo, payload DOCX e busca ordenada

### Corrigido v1.3.0 (Fase 21 — Modal de Evidência de Texto)

- **Foco e colagem no editor TipTap**
  - Clique no padding/área vazia do editor agora foca o ProseMirror corretamente
  - Colagem via `Ctrl+V` e menu de contexto passa a funcionar de forma consistente no modal
- **Limite de evidência textual ampliado**
  - Contador e extensão TipTap atualizados de 2.000 para 20.000 caracteres

### Adicionado v1.3.0 (Fase 20 — Detalhe da Atividade: exclusão e seletor de mês)

- **Seletor de mês no `ActivityNav`**
  - O antigo toggle de modo de navegação foi substituído por um seletor de mês alinhado ao padrão do Dashboard/Atividades
  - Navegação local por `←` / `→` opera sobre a lista do mês selecionado com guardas de digitação
- **Exclusão pela tela de detalhes**
  - Botão de excluir atividade com modal de confirmação acessível e redirecionamento para a lista do mês selecionado
- **Cobertura E2E ampliada**
  - Cenários para ausência do toggle antigo, troca de mês no detalhe e exclusão/cancelamento/confirmação

### Adicionado v1.3.0 (Fase 19 — Menu do App ao lado do Logo)

- **Menu customizado na barra superior (TitleBar)**
  - Novo componente `AppTopMenu` com seções **File / Edit / View / Help** ao lado do logo
  - Abertura/fechamento por mouse, navegação por teclado entre seções/itens e fechamento com `Esc`/clique fora
- **Catálogo central de comandos de menu**
  - Novo módulo `appMenuCatalog` com IDs, rótulos, grupos, atalhos e variações cross-platform (`Mod`)
  - Mapeamento de atalhos globais com guardas para não interferir em digitação (`input`, `textarea`, `select`, `contenteditable`)
- **Ações de menu integradas ao Electron (IPC)**
  - Novos handlers para abrir pasta de relatórios/evidências, sair do app, ações de edição (`undo/redo/cut/copy/paste/selectAll`) e zoom (`in/out/reset`)
  - Bridge expandida em `preload` + tipagem atualizada da `electronAPI` no renderer
- **Salvar contextual por tela (`Ctrl+S`)**
  - Novo registro central de save-context com retorno padronizado (`saved`, `no-changes`, `unavailable`, `error`)
  - Integração nas telas `ActivityFormPage`, `ProfilePage` e `SettingsPage` com detecção de alterações pendentes
- **Help aprimorado**
  - Nova rota `/manual` com página `UserManualPage` (conteúdo inicial + FAQ + atalhos)
  - Ação “Sobre o ShipIt!” integrada via evento global para abrir o modal existente
  - Ação “Reportar um Problema” direcionando para `https://github.com/NeuronioAzul/shipit/issues/new`
- **Cobertura de testes ampliada**
  - Testes unitários para helpers de atalhos (`appMenuCatalog`) e registro de save-context
  - Novos cenários E2E para abrir/fechar menu, ações de Help e atalhos principais

### Corrigido v1.3.0 (Fase 19.1 — Menu da TitleBar no tema Cyberpunk)

- **Dropdown do menu da barra superior estabilizado no tema cyberpunk**
  - Corrigida colisão de seletor global do tema que forçava `position: relative` no painel do menu
  - Adicionada exceção específica para painéis `titlebar-menu-panel-*` e override dedicado de ancoragem
  - Dropdown volta a abrir corretamente abaixo do botão da seção, sem subir/metade fora da tela
- **Regressão automatizada (Playwright/Electron)**
  - Novo cenário E2E para validar ancoragem do menu da titlebar no tema cyberpunk

### Adicionado v1.3.0 (Fase 18 — Menu de Contexto e Links Externos)

- **Política de links externos no processo principal**
  - Helper centralizado para abertura externa segura com `shell.openExternal`
  - Allowlist de protocolos (`http`, `https`, `mailto`) com rejeição silenciosa de protocolos não permitidos
- **Interceptação de navegação externa no BrowserWindow**
  - `setWindowOpenHandler` para capturar `target="_blank"`, abrir externamente quando permitido e sempre negar nova janela interna
  - `will-navigate` para bloquear saídas externas da janela principal e preservar navegação interna do app (HashRouter)
- **Menu de contexto nativo por contexto de edição**
  - Campo editável: `undo`, `redo`, `cut`, `copy`, `paste`, `selectAll`
  - Texto selecionado não editável: `copy`
  - Respeito aos `editFlags` para habilitar/desabilitar ações disponíveis
- **Consistência de links externos no renderer**
  - Padronização de links `mailto` em telas de Sobre com atributos de segurança (`target`/`rel`)
- **Regressão automatizada (Playwright/Electron)**
  - Novo cenário E2E validando que clique em link externo não altera a rota atual da janela principal
  - Verificação de chamada de abertura externa sem depender de navegador real

### Corrigido v1.3.0 (Fase 17.1 — Robustez da Navegação Global)

- **Histórico da TitleBar estabilizado para pilha profunda**
  - Ajuste no `NavigationHistoryContext` para reconstruir a pilha corretamente em cenários de time-travel inesperado, evitando truncamento prematuro do histórico
  - Navegação Voltar/Avançar passa a manter múltiplas entradas de forma consistente (limite configurado em 100)
- **Navegação local por setas na tela de detalhe**
  - Teclas `←` / `→` agora impedem o comportamento padrão do navegador antes da navegação local, evitando saltos de rota indesejados
- **Regressão automatizada (Playwright/Electron)**
  - Novo cenário E2E validando profundidade mínima de histórico (10 entradas) para os botões de navegação da TitleBar

### Adicionado v1.3.0 (Fase 17 — Sistema Multi-Tema) 🎨

- **11 temas visuais** organizados em 3 categorias:
  - **Principais**: Claro (modernizado), Escuro (preto profundo com acentos vibrantes)
  - **Personalidade**: Colorido, Rosa & Violeta, Minimalista, Futurista, Oceano, Pôr do Sol
  - **Acessibilidade**: Alto Contraste (WCAG AAA claro), Alto Contraste Escuro (WCAG AAA escuro)
  - **Bônus**: Cyberpunk (neon amarelo/ciano, glitch, scanlines CRT, cantos angulares)
- **Componente `ThemeSelector`** — seletor visual em grid com cards por categoria, preview de 4 cores, ícone e descrição por tema
- **Registro de temas** (`src/themes/themes.ts`) — `ThemeMetadata` com id, label, description, icon, category, base (dark/light) e preview colors
- **60+ variáveis CSS por tema** (`src/themes/themes.css`) — foundation, surfaces, semantic, interactive, navigation, charts, radius, shadows
- **Temas de alto contraste** com conformidade WCAG AAA (contraste 7:1+)
- **Efeitos especiais Cyberpunk** (`src/themes/cyberpunk-effects.css`):
  - Scanlines CRT com overlay
  - Brilho neon em títulos (text-shadow)
  - Cantos angulares via `clip-path: polygon()`
  - Bordas neon com técnica double-polygon
  - Botões com diagonal clip-path e drop-shadow
  - Glitch text (aberração cromática) e flickering
  - Animação card-scan (hover)
  - Scrollbars neon verdes
  - Barras Gantt com cantos angulares e glow
- **Integração no SettingsPage** — seção "Aparência" com `ThemeSelector` no topo das configurações

### Corrigido v1.3.0 (Fase 16.2 — Busca na TitleBar e Cyberpunk)

- **Contrato drag/no-drag da TitleBar**
  - Área central da titlebar voltou a ser arrastável (drag)
  - `no-drag` ficou restrito às áreas realmente interativas (`SearchBar` e controles da janela)
- **SearchBar responsiva na menubar**
  - Largura máxima ajustada por breakpoints: **320 / 420 / 520 px**
  - Contêiner da busca estabilizado para evitar ocupação excessiva da titlebar
- **Tema Cyberpunk: dropdown da busca estabilizado**
  - `#searchbar-results` excluído das regras globais agressivas de cards (`clip-path`/pseudo-elementos/scanline)
  - Regra dedicada para manter dropdown ancorado abaixo do input, sem deslocamento vertical e sem sumiço de conteúdo
- **Regressão automatizada (Playwright/Electron)**
  - Novo cenário E2E para busca no tema cyberpunk (foco via `Ctrl+K`, input/ícone visíveis, dropdown ancorado e limite de largura)
  - Nova assertiva estrutural E2E para o contrato drag/no-drag na titlebar/searchbar

### Adicionado v1.3.0 (Evidências e navegação)

- **Evidências de texto** — novo tipo de evidência que permite registrar conteúdo textual formatado (além de imagens)
  - Editor rich-text com TipTap (negrito, itálico, listas, etc.) e contagem de caracteres
  - Componentes `TextEvidenceEditor` e `TextEvidenceModal`
  - IPC handlers `db:saveTextEvidence` e `db:updateTextEvidence`
  - Campo `type` ('image' | 'text') e `text_content` na entidade Evidence
  - 4 dependências TipTap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`
- **Lightbox de evidências** — visualização em tela cheia de imagens de evidência com navegação entre fotos
  - Componente `EvidenceLightbox` via `yet-another-react-lightbox`
- **Navegação entre atividades** — componente `ActivityNav` com botões prev/next na tela de detalhes da atividade
- **Navegação global na TitleBar** — histórico de navegação no estilo IDE com botões Voltar/Avançar ao lado esquerdo da busca
  - Novo provider `NavigationHistoryContext` com API `canGoBack`, `canGoForward`, `goBack` e `goForward`
  - Histórico global com `pathname + search + hash`, deduplicação consecutiva, limpeza da forward stack e limite de 100 entradas
  - Atalhos globais `Alt+←` / `Alt+→` com guardas para `input`, `textarea`, `select` e `contenteditable`

### Alterado v1.3.0 (Temas e navegação)

- **ThemeContext** refatorado de toggle dark/light para suporte multi-tema completo
  - Estado `theme` armazena `ThemeId` (union de 11 IDs)
  - `isDark` computado automaticamente a partir da propriedade `base` do tema
  - Classes CSS removidas e reaplicadas dinamicamente ao trocar tema
- **Persistência de tema** atualizada: `localStorage.shipit-theme` agora armazena o ID do tema (ex: `"cyberpunk"`, `"ocean"`) em vez de `"dark"`/`"light"`
- **Transições de tema** suaves com 200ms de duração ao trocar entre temas
- **Navegação local por teclado**
  - Tela de detalhes da atividade passou a usar apenas `←` / `→` para navegação local entre atividades
  - Dashboard passou a suportar `←` / `→` para alternar mês localmente

---

## [1.2.2] — 2026-04-14

### Adicionado v1.2.2

- Release tag `v1.2.2` consolidando os instaladores multi-formato, busca na TitleBar, UI de auto-update, workflow de release multiplataforma, melhorias de testes/E2E e correções de ícones iniciadas após `v1.2.1`.

### Observação

- A branch `dev` continuou recebendo mudanças após a tag `v1.2.2`; por isso as funcionalidades pós-tag permanecem em `[Unreleased]` até o próximo release.

---

## [1.2.1] — 2026-04-13

### Corrigido v1.2.1 (Fase 16.1 — Correção de Ícones)

- **BrowserWindow icon**: caminho alterado de `build/icon.ico` → `public/assets/images/icons/ShipIt.ico` (o diretório `build/` não é incluído no asar empacotado, causava fallback para ícone do Electron)
- **`signAndEditExecutable`**: removida flag `false` que impedia o electron-builder de injetar o ícone customizado no `.exe`
- **`build/icon.ico`**: regenerado com 9 tamanhos (16–256px, 32bpp RGBA) para uso pelo electron-builder no `.exe` e instalador
- **`public/assets/images/icons/ShipIt.ico`**: mesmo ícone multi-size, disponível dentro do asar para uso em runtime (BrowserWindow, notificações)
- **Ícones de tray**: atualizados com novas versões em alta qualidade (black, green, yellow, red, orange)
- **`package.json` author**: atualizado para objeto com `name` + `email` (necessário para campo maintainer do `.deb`)

### Adicionado v1.2.1 (Fase 16 — Ícone, Instaladores, Busca, Auto-Update UI)

- **Ícone corrigido**: gerado `ShipIt.ico` (multi-size 256px+) a partir do PNG 310×310; `build.win.icon` aponta para `.ico`
- **Instaladores multi-formato**:
  - Windows: NSIS Setup + Portable + MSI (x64)
  - macOS: DMG com builds separados para arm64 e x64
  - Linux: AppImage + deb + rpm
  - `artifactName` descritivo por target (ex: `ShipIt-1.2.1-Windows-x64-Setup.exe`)
- **Release workflow**: job `create-release` cria draft GitHub Release; 3 build jobs publicam artefatos; upload inclui `.msi`, `.deb`, `.rpm`
- **Barra de busca** (estilo VS Code Command Palette): componente `SearchBar` no TitleBar com atalho `Ctrl+K`, debounce 300ms, dropdown de resultados, navegação para atividade ou filtro avançado
- **Busca backend**: `searchActivities(query)` com `LIKE` em `description`, `project_scope`, `link_ref` e `Evidence.caption`; IPC handler `db:searchActivities`
- **Filtro avançado na ActivitiesPage**: painel de filtros (texto, status, atendimento, escopo) com pills removíveis; modo busca via `?search=QUERY`
- **Botão "Verificar atualizações"** na SettingsPage: seção "Atualizações" com botão, estados visuais (verificando, disponível, baixando, pronta, erro), botão "Reiniciar e atualizar" quando downloaded
- **IPC auto-update**: handlers `app:checkForUpdate` e `app:installUpdate`; listeners de `autoUpdater` enviam estado para renderer via `app:updateStatus`
- Token CSS `--titlebar-search` para background do input de busca

### Adicionado v1.2.1 (Fase 9.1 — CI/CD & Auto-Update)

- Workflow GitHub Actions (`.github/workflows/release.yml`) para build & release multiplataforma
  - Trigger por tag semver (`v*.*.*`)
  - 3 jobs paralelos: Windows (.exe), macOS (.dmg), Linux (.AppImage)
  - Testes unitários como gate antes do build
  - Publicação automática no GitHub Releases com `--publish always`
- `electron-updater` para auto-update: notifica sobre atualizações disponíveis e prontas sem forçar restart
- Config `publish` (provider: github) no `build` do `package.json`
- Ícone macOS atualizado para `.icns` (`apple-icon.icns`)

### Adicionado v1.2.1 (Fase 15.2 — Testes E2E)

- 4 testes E2E com Playwright + Electron:
  - Janela inicia visível
  - EmptyState em DB limpo + navegação entre todas as telas (Atividades, Perfil, Configurações, Lixeira, Dashboard)
  - Toggle dark/light theme via rádio na tela de Configurações
  - Criação de atividade via formulário (preenchimento + submit + verificação)
- Cleanup: `app.exit(0)` no teardown para evitar hang do tray
- `waitForURL` para sincronizar navegação entre rotas

### Adicionado v1.2.1 (Fase 14 — Paleta WCAG AA)

- Nova paleta de cores com conformidade WCAG AA (contraste mínimo 4.5:1)
- Formato migrado de `hsl()` para `rgb()` em todas as variáveis CSS
- Novos tokens: `--secondary`, `--popover`, `--info`, `--surface-*`, `--disabled-*`, `--selection-*`, `--chart-*`, `--radius-*`, `--shadow-*`
- Estilos `::selection` para seleção de texto com cores da marca
- Token `--sidebar-bg` renomeado para `--sidebar` (consistência)
- Cor hardcoded `#e81123` substituída por token `destructive` no TitleBar

### Adicionado v1.2.1 (Fase 15 — Testes)

- Teste de cascade FK em `deleteActivity`: cria Activity + Evidence + ActivityReport, deleta e verifica remoção em cascata
- Builds para macOS (.dmg) e Linux (.AppImage)
- Ajustes de tray para macOS (template images) e Linux (AppIndicator)
- Testes finais e empacotamento multiplataforma

---

## [1.2.0] — 2026-04-10

### Testes Automatizados (Fase 10) ✅

- 9 testes unitários para `getLastBusinessDay()` (semana, sáb→sex, dom→sex, fevereiro, todos os meses)
- 9 testes de integração para `generateDocxReport()` com template real (nomenclatura MEC, placeholders, múltiplos projetos, evidências PNG, fallback de escopo)
- 20 testes de integração para database CRUD com sql.js in-memory (UserProfile, Activity, Evidence, Alert, contagens)
- Refatoração: `initDatabase()` aceita `Partial<DataSourceOptions>` para facilitar testes
- Refatoração: `generateDocxReport()` aceita `templatePath` no payload
- Adicionado `resetDatabase()` para limpar DataSource entre testes
- Total: **54 testes** (16 validation + 9 report unit + 9 report integration + 20 database)
- Exclusão de `dist-electron/` do Vitest config para evitar conflito com builds CommonJS

### Revisão UI/UX (Fase 11) ✅

#### Acessibilidade (WCAG AA)

- Análise de contraste WCAG AA com `palette-test.html` (paleta atual vs proposta)
- `aria-label` em todos os botões icon-only (nav links, back buttons, drag handles, delete, play)
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` nos modais About
- `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` nos modais de confirmação de exclusão
- Handler de `Escape` para fechar modais About (Header e ActivityBar)
- `aria-hidden="true"` em ícones Font Awesome decorativos
- `focus-visible:ring-2 focus-visible:ring-ring` em botões icon-only e links de navegação

#### Responsividade

- `minWidth` do BrowserWindow reduzido de 900 para 800 (mínimo: 800×600)
- Verificação de grids responsivos (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`)
- Gantt chart com `overflow-x-auto` confirmado funcional

#### Consistência Visual

- Zero cores hardcoded (sem `bg-blue-500`, `text-gray-*` etc.)
- Tokens padronizados via CSS variables + Tailwind `@theme inline`
- Hierarquia tipográfica consistente: h1=`text-2xl font-bold`, h2=`text-lg font-semibold`
- Mix intencional `fa-solid` (ações) vs `fa-regular` (metadata) em ícones

#### Animações e Transições

- Keyframe `fade-in`: entrada de página com fade + translateY suave (0.2s)
- Keyframe `modal-fade-in`: entrada de modal com scale + fade (0.15s)
- Keyframe `shake`: animação de rejeição para drop inválido (0.4s)
- Classe `animate-page-in` aplicada ao wrapper `<main>` do `AppLayout`
- Classe `animate-modal-in` aplicada aos painéis internos de todos os modais

### Dependências adicionadas (Fase 11)

- `sql.js` (devDependency) — SQLite puro em JavaScript para testes sem native modules

### Arquivos modificados

- `electron/report-generator.ts` — export `getLastBusinessDay()`, param `templatePath` no payload
- `electron/database.ts` — `initDatabase(overrides?)`, `resetDatabase()`, constante `ALL_ENTITIES`
- `electron/main.ts` — `minWidth: 800`

### Correções (Fase 12) 🐛

- Corrigido caminho do ícone de tray em `setTrayIcon()` (faltava `'assets'` no path)
- Removida chamada duplicada de `cleanupTrash()` em `startSchedulers()`
- Corrigida ordem das seções no CHANGELOG.md (descendente)
- Atualizado `package.json` version para `1.2.0`
- Corrigido `nextRId` hardcoded no gerador DOCX — agora calcula dinamicamente a partir dos rIds existentes no template
- Adicionado suporte a dimensões de imagens GIF e BMP no gerador DOCX

### Animações e Feedback Visual (Fase 13) ✨

- Shake animation no drag handle ao tentar arrastar evidência pela imagem (ActivityDetailPage e EvidenceUpload)
- Transições de página com fade-in a cada navegação via `key={location.pathname}` no AppLayout
- Drop zones com `scale` + `ring` effect durante drag & drop de arquivos

---

## [1.1.0] — 2026-04-08

### Implementações do Plano de Continuidade v2

#### Correção DOCX (3.0)

- Data da capa do relatório agora usa o último dia útil do mês de referência (não a data de geração)
- Função `getLastBusinessDay()` calcula automaticamente, pulando sábados e domingos

#### Sistema de Alertas e Notificações (Fase 5) 🔔

- Scheduler de alertas no main process (verifica a cada 60 segundos)
- Disparo de `Notification` nativa do Electron com mensagem personalizável
- Som de alerta opcional via `app:playSound`
- Atualização automática do ícone do tray conforme status das atividades:
  - Verde: tudo em dia
  - Amarelo (piscando): atividades incompletas no mês
  - Vermelho (piscando): últimos 3 dias do mês com pendências
- Seção "Notificações" na `SettingsPage`:
  - Toggle habilitar/desabilitar alertas
  - Seleção de dias de antecedência (chips: 0, 1, 2, 3, 5, 7, 10, 14)
  - Horário de início dos alertas
  - Mensagem personalizada
  - Toggle de som habilitado

#### Drag & Drop (Fase 6) 🖱️

- Reordenação de atividades na listagem via `@dnd-kit/sortable` com drag handles
- Reordenação de evidências na tela de detalhes via `@dnd-kit/sortable`
- Zona de drop na `ActivityDetailPage` para adicionar novas evidências arrastando arquivos
- IPC handler `db:reorderEvidences` para persistir ordem

#### Menus e Navegação (Fase 7) 🧭

- Modal "Sobre o ShipIt!" com versão, stack tecnológico e licença, acessível via ícone no Header
- Header com ícones de navegação direta: Dashboard, Atividades, Perfil, Configurações, Sobre
- Menu do tray atualizado com entradas para Perfil e Configurações

#### Polimento (Fase 8) 🔧

- `ensureCantSplit()` em linhas de tabela do DOCX para evitar quebras de página no meio
- Suporte a formatos gif, bmp e webp no gerador DOCX
- Lixeira de evidências com soft delete:
  - Campo `deleted_at` na entidade Evidence
  - Ao excluir, move para `userData/trash/` e marca `deleted_at`
  - Restauração via `db:restoreEvidence` (move de volta para `evidences/`)
  - Exclusão permanente via `db:permanentlyDeleteEvidence`
  - Limpeza automática de itens com mais de 3 meses no startup
  - Evidências deletadas são filtradas de queries e do gerador de relatórios
- Setup do Vitest com 15 testes unitários para `validation.ts`
- Scripts `test` e `test:watch` no `package.json`

### Dependências adicionadas

- `@dnd-kit/core` — drag & drop core
- `@dnd-kit/sortable` — sortable preset
- `@dnd-kit/utilities` — CSS utilities
- `vitest` (devDependency) — test runner

---

## [1.0.0] — 2026-04-08

### Primeira versão funcional do ShipIt

### Adicionado v1.0.0

#### Fundação (Fase 1)

- Setup completo: Electron 41 + React 19 + Vite 8 + TypeScript 6
- Banco de dados SQLite local via TypeORM + better-sqlite3
- Entidades: `UserProfile`, `Alert`, `Activity`, `Evidence`, `Report`, `ActivityReport`
- Tela Empty State com logo e botão "Criar Perfil"
- Tela de cadastro de perfil do usuário com todos os campos necessários
- Electron main process com IPC handlers (`db:`, `app:`)
- Preload bridge com `contextBridge` (`contextIsolation: true`)
- Tailwind CSS v4 com brand colors via `@theme inline`
- Font Awesome 7 instalado via npm (self-hosted, 100% offline)

#### Dark Mode / Light Mode (Fase 1.1)

- `ThemeContext` com toggle dark/light
- Persistência em `localStorage` (`shipit-theme`)
- Seleção de aparência na tela de Configurações
- Variáveis CSS para todos os tokens de cor (light e dark)

#### Fluxo de Registro (Fase 2)

- CRUD completo de atividades via IPC (`db:getActivities`, `db:saveActivity`, `db:deleteActivity`)
- Formulário de nova atividade com: descrição, período, status, links de referência, tipo de atendimento, mês de referência
- Upload de evidências (prints): seleção de arquivo, arrastar e soltar (drag & drop), colar da área de transferência
- Cópia automática de evidências para diretório interno do app
- Campo de legenda (caption) por evidência
- Protocolo customizado `shipit-evidence://` para servir imagens com segurança

#### Listagem de Atividades (Fase 2.1)

- Listagem filtrada por mês de referência
- Seletor de mês/ano
- Edição e exclusão com confirmação

#### Detalhes da Atividade (Fase 2.2)

- Exibição completa: descrição, período, status, links, evidências com imagens
- Edição inline via botão Editar (rota `/activities/:id/edit`)
- Adicionar/editar legendas das evidências

#### Validação (Fase 2.3)

- Validação de campos obrigatórios antes de gerar relatório
- Validação do perfil do usuário
- Ícone de alerta nas atividades incompletas
- Mensagens de erro detalhadas por campo

#### System Tray (Fase 2.3.1)

- Ícone do ShipIt! no System Tray com ícones de status (padrão, verde, amarelo, vermelho)
- Menu de contexto: "Abrir ShipIt!", "Nova Atividade", "Dashboard", "Atividades", "Sair"
- Clique no ícone restaura a janela
- Fechar janela minimiza para o tray

#### Salvamento Automático (Fase 2.4)

- Auto-save contínuo no formulário de atividade
- Recuperação de rascunhos após fechamento inesperado
- Indicador visual de "salvando..." / "salvo"

#### Dashboard (Fase 2.5)

- Dashboard como tela inicial com resumo mensal
- Seletor de mês/ano na parte superior com botão "Mês Atual"
- Cards de resumo: total, concluídas, em andamento, canceladas
- Gráfico de Gantt com atividades × dias do mês
- Listagem com número, descrição, período, status, atendimento, referência de páginas
- Botão "Gerar Relatório" do mês selecionado
- Seção de histórico de relatórios gerados

#### Motor de Relatório DOCX (Fase 3)

- Geração de DOCX via manipulação OpenXML (jszip + @xmldom/xmldom + xpath)
- Template oficial do MEC como base
- Encarte A: tabela de atividades agrupadas por escopo de projeto
- Encarte B: páginas de evidência com imagem + legenda + bookmarks
- Referências de páginas (PAGEREF) na coluna "Referência" da tabela
- Checkboxes de atendimento (Presencial/Remoto/Híbrido) em linhas separadas
- Nomenclatura padrão: `RELATÓRIO DE SERVIÇO - <CARGO>_<NOME>_<MÊS>.docx`
- Histórico de relatórios gerados com status (Gerado, Falha, Excluído)
- Botão para abrir relatório gerado na pasta de destino

#### Configurações e Perfil (Fase 4)

- Separação entre tela de Perfil e tela de Configurações
- Perfil: dados pessoais, cargo, contrato, atividades correlatas, escopo de projeto
- Configurações — Aparência: tema dark/light
- Configurações — Diretório de Relatórios: seletor de pasta via dialog nativo, restaurar padrão
- Configurações — Som de Notificação: seletor entre 14 sons pré-configurados com preview
- Configurações — Comportamento: iniciar com o sistema (auto-launch)
- Configurações — Sobre: versão do app
- Protocolo customizado `shipit-sfx://` para servir sons de alerta
- Persistência de configurações em `userData/settings.json`

#### Empacotamento (Fase 6 — parcial)

- Configuração do electron-builder para Windows (.exe NSIS), macOS (.dmg), Linux (.AppImage)
- Ícones configurados para todas as plataformas
- Template DOCX empacotado via `extraResources`
- `better-sqlite3` descompactado do asar (`asarUnpack`)

### Segurança

- `contextIsolation: true`, `nodeIntegration: false`
- Protocolos customizados com validação de path e sandbox por diretório
- Sanitização de nomes de arquivo para prevenir path traversal
- Evidências isoladas em diretório interno do app

### Infraestrutura

- Browser fallback via `localStorage` para desenvolvimento no navegador
- Path alias `@/*` → `src/*` no frontend
- TypeScript strict mode em todo o projeto
- UI em português (pt-BR), identificadores em inglês
- `src/index.css` — keyframes e classes de animação
- `src/components/AppLayout.tsx` — `animate-page-in` no `<main>`
- `src/components/Header.tsx` — aria-labels, role="dialog", Escape handler, animate-modal-in
- `src/components/ActivityBar.tsx` — role="dialog", Escape handler, animate-modal-in
- `src/components/EvidenceUpload.tsx` — aria-labels em drag handle/delete/save
- `src/pages/ProfilePage.tsx` — aria-label no back button
- `src/pages/SettingsPage.tsx` — aria-label no back button e play button
- `src/pages/ActivityFormPage.tsx` — aria-label no back button
- `src/pages/DashboardPage.tsx` — aria-labels nos botões de mês
- `src/pages/ActivitiesPage.tsx` — aria-labels em drag handle/edit/delete, role="alertdialog" no modal
- `src/pages/ActivityDetailPage.tsx` — aria-labels, role="alertdialog", animate-modal-in
- `src/pages/TrashPage.tsx` — aria-labels, role="alertdialog", animate-modal-in
- `vite.config.ts` — excluir `dist-electron/` dos testes

### Arquivos criados

- `electron/report-generator.test.ts` — 9 unit tests
- `electron/report-generator.integration.test.ts` — 9 integration tests
- `electron/database.test.ts` — 20 integration tests
- `electron/__fixtures__/template.docx` — template DOCX para testes
- `docs/new-ui-ux-visual/palette-test.html` — análise visual WCAG AA
