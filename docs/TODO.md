# ShipIt! — Roadmap de Desenvolvimento

> Atualizado em: 26/05/2026 (sincronização documental pós-v1.5.2)
>
> Este documento serve como roadmap do projeto. Cada fase é um milestone de desenvolvimento.
> Itens marcados com `[x]` estão concluídos. Itens com `[ ]` estão pendentes.

---

## Fase 1: Fundação ✅

- [x] Setup Electron + React (Vite) + TypeScript
- [x] Integração com SQLite (TypeORM + better-sqlite3)
- [x] Criação das entidades: UserProfile, Alert, Activity, Evidence, Report, ActivityReport
- [x] Tela Empty State com logo e botão "Criar Perfil"
- [x] Tela de Configurações Iniciais (Cadastro de Perfil do Usuário)
- [x] Electron main process com IPC handlers (`db:`, `app:`)
- [x] Preload bridge com contextBridge (contextIsolation: true)
- [x] Tailwind v4 com brand colors (light + dark)
- [x] Font Awesome via npm (self-hosted)

### Fase 1.1: Dark Mode e Light Mode ✅

- [x] ThemeContext com toggle dark/light
- [x] Persistência em localStorage (`shipit-theme`)
- [x] Radio buttons na tela de Perfil para escolher aparência
- [x] Toggle no Header para alternar rapidamente

---

## Fase 2: Fluxo de Registro ✅

- [x] IPC handlers para CRUD de atividades (`db:getActivities`, `db:saveActivity`, `db:deleteActivity`)
- [x] Formulário de Nova Atividade
  - [x] Campo de descrição (texto longo)
  - [x] Seleção de período (data início → data fim)
  - [x] Seletor de status (Em andamento, Concluído, Cancelado, Pendente)
  - [x] Campo de links de referência (múltiplos URLs)
  - [x] Seletor de tipo de atendimento (herda do perfil, pode sobrescrever)
  - [x] Mês de referência (auto-preenchido, editável)
- [x] Área de upload de evidências (prints)
  - [x] Upload via seleção de arquivo
  - [x] Arrastar e soltar (drag & drop)
  - [x] Colar da área de transferência (clipboard paste)
  - [x] Cópia automática para diretório interno do app
  - [x] Campo de legenda (caption) por evidência
- [x] IPC handlers para evidências (`db:saveEvidence`, `db:deleteEvidence`)

### Fase 2.1: Tela de Listagem de Atividades ✅

- [x] Listagem das atividades do mês selecionado
- [x] Seletor de mês de referência
- [x] Opção editar atividade
- [x] Opção excluir atividade (com confirmação)
- [x] Reorganização por drag & drop (campo `order`) — via `@dnd-kit/sortable`

### Fase 2.2: Tela de Detalhes da Atividade ✅

- [x] Exibição completa: descrição, período, status, links, evidências
- [x] Edição inline dos detalhes (via botão Editar → rota edit)
- [x] Adicionar/editar legendas das evidências
- [x] Visualização das imagens de evidência

### Fase 2.3: Validação de Campos Obrigatórios ✅

- [x] Validação antes de gerar relatório (description, date_start, date_end, status)
- [x] Validação do perfil do usuário (todos os campos obrigatórios)
- [x] Ícone de alerta nas atividades incompletas
- [x] Mensagens de erro detalhadas

### Fase 2.3.1: System Tray icon ✅

Implementação do ícone do ShipIt! no System Tray para fácil acesso.
Ao clicar no ícone, a janela para registrar uma nova atividade ou continuar editando atividades existentes que não foi fechada deve ser exibida.

- [x] Implementação do ícone do ShipIt! no System Tray para fácil acesso.
- [x] Ao clicar no ícone, a janela para registrar uma nova atividade ou continuar editando atividades existentes que não foi fechada deve ser exibida.
- [x] Ícone deve refletir o status do app (ex: alerta para atividades incompletas)
- [x] Menu de contexto no ícone com opções rápidas (ex: "Nova Atividade", "Abrir Dashboard", "Sair")
- [ ] Compatibilidade com macOS e Linux (ajustes de ícone e comportamento conforme plataforma)
- [x] Configuração para iniciar o app junto com o sistema operacional, pode alterar em configurações.

### Fase 2.4: Sistema de Rascunho e Salvamento Automático ✅

- [x] Auto-save no formulário de atividade
- [x] Recuperação de rascunhos após fechamento inesperado
- [x] Indicador visual de "salvando..." / "salvo"

### Fase 2.5: Dashboard de Resumo Mensal ✅

- [x] Dashboard como tela inicial (substituir Empty State pós-perfil)
- [x] Seletor de mês/ano na parte superior
- [x] Cards de resumo (total, concluídas, em andamento, canceladas)
- [x] Gráfico de Gantt com atividades × dias do mês
- [x] Listagem de atividades com: número, descrição resumida, período, status, atendimento, referência de páginas
- [x] Botão "Gerar Relatório DOCX" do mês selecionado
- [x] Troca de mês atualiza todos os dados

---

## Fase 3: O Motor de Relatório DOCX ✅

- [x] Confirmação do mês antes de gerar
- [x] Serviço de geração via DOCX (template OpenXML com jszip + xmldom)
- [x] Um print por página no DOCX, legenda abaixo da imagem
- [x] Referências de páginas (PAGEREF) na coluna "Referência" da tabela
- [x] Nomenclatura: `RELATÓRIO DE SERVIÇO - <CARGO>_<NOME>_<MÊS>.docx`
- [x] Histórico de relatórios gerados (entidade Report)
- [x] Status do relatório (Gerado, Falha, Excluído)
- [x] Ação com botão para abrir relatório gerado na pasta de destino
- [x] Encarte A: agrupamento por escopo de projeto com atividades
- [x] Encarte B: páginas de evidência com imagens e bookmarks
- [x] Checkboxes de atendimento em linhas separadas

---

## Fase 4: Configurações e perfil ✅

- [x] Tela de perfil do usuário (acessível no Header via ícone de usuário)
- [x] Separar configurações de perfil e configurações do app
- [x] Configurações de perfil: cargo, tipo de atendimento, atividades correlatas, escopo do projeto/squad etc.
- [x] Configurações do app:
  - [x] tema (dark/light) — persistido via localStorage, na tela de Configurações
  - [x] escolha do som para notificações entre os sons pré-configurados na pasta `assets/sounds/`
  - [x] opções de notificação — seção "Notificações" com toggle, dias, horário, mensagem, som
  - [x] comportamento do app (ex: iniciar com o sistema)
  - [ ] escolha do diretório de armazenamento dos dados (opcional — adiado)
  - [x] escolha do diretório de armazenamento dos relatórios gerados

---

## Alterações e correções

- [x] Arrastar e soltar evidências na tela de detalhes da atividade — `@dnd-kit` + zona de drop para novos arquivos
- [x] Arrastar e soltar para reorganizar atividades na listagem (campo `order` no banco) — `@dnd-kit/sortable`
- [x] A parte sobre que está em configurações do app não está completa e precisa ficar no menubar — movida para modal "Sobre" no Header
- [x] Ajustar os menus para refletir as novas telas e funcionalidades — Header com nav: Dashboard, Atividades, Perfil, Configurações, Sobre
- [x] Criar o arquivo de configuração do tailwind para definir as cores da marca e os tokens de tema — usando `@theme inline` no CSS

---

## Depois que tudo estiver pronto, podemos pensar em

### Fase 5: Alertas e Notificações ✅

- [x] Scheduler de alertas no main process (verifica a cada 60s)
- [x] Integração com Notification API nativa do Electron
- [x] Atualização automática do ícone do tray (verde/amarelo/vermelho com blinking)
- [x] Seção de configuração de alertas na SettingsPage (toggle, dias, horário, mensagem, som)

### Fase 6: Drag & Drop ✅

- [x] Reordenar atividades na listagem via `@dnd-kit/sortable` com drag handles
- [x] Reordenar evidências na tela de detalhes via `@dnd-kit/sortable`
- [x] Zona de drop na `ActivityDetailPage` para adicionar novas evidências

### Fase 7: Menus e Navegação ✅

- [x] Modal "Sobre o ShipIt!" acessível via ícone no Header
- [x] Header com nav links diretos: Dashboard, Atividades, Perfil, Configurações, Sobre
- [x] Menu do tray atualizado com Perfil e Configurações

### Fase 8: Polimento ✅

- [x] Validação de margens e quebras de tabela no DOCX (`ensureCantSplit` em linhas de tabela)
- [x] Data da capa do DOCX usando último dia útil do mês de referência
- [x] Suporte a gif/bmp/webp no gerador DOCX
- [x] Lixeira de evidências (soft delete + auto-limpeza > 3 meses)
- [x] Testes unitários com Vitest (16 testes: validation.ts)
- [x] UI de gerenciamento da lixeira (visualizar/restaurar itens)
- [x] Testes do report-generator (9 unit + 9 integration)
- [x] Testes de integração para database CRUD (20 testes)
- [x] Testes E2E básicos (Playwright) — 4 testes (janela visível, navegação, tema, criação de atividade)
- [x] Revisão geral de UI (responsividade, feedback visual, acessibilidade)

### Fase 10: Testes Automatizados ✅

- [x] Testes unitários para `getLastBusinessDay()` (9 testes)
- [x] Testes de integração para `generateDocxReport()` com template fixture (9 testes)
- [x] Testes de integração para database CRUD com sql.js in-memory (20 testes)
- [x] Refatoração: `initDatabase()` aceita overrides de `DataSourceOptions`
- [x] Refatoração: `generateDocxReport()` aceita `templatePath` no payload
- [x] Exclusão de `dist-electron/` do Vitest config
- [x] Marco histórico da fase: 54 testes passando (16 validation + 9 report unit + 9 report integration + 20 database)

### Fase 11: Revisão UI/UX ✅

- [x] Análise WCAG AA de paleta de cores (palette-test.html com comparação atual vs proposta)
- [x] Auditoria de acessibilidade: `aria-label` em todos os botões icon-only
- [x] Auditoria de acessibilidade: `role="dialog"` / `role="alertdialog"` + `aria-modal` em todos os modais
- [x] Auditoria de acessibilidade: handler de Escape em modais About
- [x] Auditoria de acessibilidade: `aria-hidden="true"` em ícones decorativos
- [x] Auditoria de acessibilidade: `focus-visible:ring` em elementos interativos chave
- [x] Responsividade: `minWidth: 800, minHeight: 600` no BrowserWindow
- [x] Consistência visual: sem cores hardcoded, tokens padronizados, hierarquia tipográfica consistente
- [x] Animações: fade-in de página (`animate-page-in`), entrada de modal (`animate-modal-in`), shake (`animate-shake`)
- [x] CSS keyframes para `fade-in`, `modal-fade-in`, `shake` em `index.css`

### Fase 12: Correção de Bugs e Estabilização ✅

- [x] Corrigir caminho do tray icon em `setTrayIcon()` (faltava `'assets'`)
- [x] Corrigir CHANGELOG: ordem descendente, data correta em [1.2.0]
- [x] Atualizar `package.json` version para `1.2.0`
- [x] Remover `cleanupTrash()` duplicada em `startSchedulers()`
- [x] Corrigir rId colisão no gerador DOCX (nextRId dinâmico)
- [x] Adicionar suporte a dimensões GIF/BMP em `getImageDimensions()`

### Fase 13: Animações e Feedback Visual ✅

- [x] Shake animation no drag handle ao arrastar evidência pela imagem
- [x] Loading spinners em botões (Gerar Relatório, Salvar) — já implementados na v1.1.0
- [x] Transições de página com `key={location.pathname}` no AppLayout
- [x] Drop zones com efeito `scale` + `ring` durante drag & drop

### Fase 14: Aplicar Nova Paleta de Cores ✅

- [x] Validação da paleta proposta (WCAG AA)
- [x] Substituição de variáveis CSS: `hsl()` → `rgb()` com valores da `tokens.css`
- [x] Novos tokens: `--secondary`, `--popover`, `--info`, `--surface-*`, `--disabled-*`, `--selection-*`, `--chart-*`, `--radius-*`, `--shadow-*`
- [x] Estilos `::selection` para seleção de texto
- [x] Remoção de cor hardcoded `#e81123` no TitleBar
- [x] Renomeação `--sidebar-bg` → `--sidebar`

### Fase 15: Melhorar Cobertura de Testes ✅

- [x] Teste de cascade FK em `deleteActivity` (Activity + Evidence + ActivityReport)
- [x] Testes E2E com Playwright (4 testes: janela visível, navegação entre telas, toggle de tema, criação de atividade)

### Fase 9: Distribuição Multiplataforma

- [x] Configuração do electron-builder
  - [x] .exe (Windows 10/11)
  - [x] .dmg (macOS)
  - [x] .AppImage (Linux)
- [x] Ícones do app configurados (favicon, tray, instalador)
- [ ] Ajustar ícones de tray para macOS (template images)
- [ ] Testar auto-launch e paths em cada plataforma
- [x] Testes finais e empacotamento de release

### Fase 9.1: CI/CD — Build & Release Multiplataforma

- [x] Instalar `electron-updater` como dependência de produção
- [x] Configurar `publish` (provider: github) no `build` do `package.json`
- [x] Auto-update em `electron/main.ts` (notifica sem forçar restart)
- [x] Workflow GitHub Actions (`.github/workflows/release.yml`)
  - [x] Trigger por tag semver (`v*.*.*`)
  - [x] Build paralelo: Windows (.exe), macOS (.dmg), Linux (.AppImage)
  - [x] Testes unitários como gate antes do build
  - [x] Publicação automática no GitHub Releases
- [x] Ícone macOS atualizado para `.icns`
- [ ] Verificar path do DOCX template com acentos no CI Linux/macOS (primeira run)

### Fase 16: Ícone, Instaladores Multi-formato, Busca, Auto-Update UI ✅

- [x] Corrigir ícone Windows: gerar `ShipIt.ico` (multi-size) a partir do PNG 310×310
- [x] `build.win.icon` aponta para `ShipIt.ico` em vez do PNG
- [x] Instaladores multi-formato:
  - [x] Windows: NSIS Setup + Portable + MSI (x64)
  - [x] macOS: DMG separado para arm64 e x64
  - [x] Linux: AppImage + deb + rpm
  - [x] `artifactName` descritivo por target
- [x] Workflow release: job `create-release` (draft) → 3 build jobs com novos targets
- [x] Barra de busca na TitleBar (estilo Command Palette) com `Ctrl+K`
- [x] Backend: `searchActivities(query)` com LIKE em `description`, `project_scope`, `link_ref`, `Evidence.caption`
- [x] IPC `db:searchActivities` + preload + tipo
- [x] Filtro avançado na ActivitiesPage (texto, status, atendimento, escopo, pills removíveis)
- [x] Botão "Verificar atualizações" na SettingsPage com estados visuais
- [x] IPC `app:checkForUpdate` e `app:installUpdate`
- [x] Listeners autoUpdater → renderer via `app:updateStatus`
- [x] Token CSS `--titlebar-search`
- [x] Documentação atualizada: README (download expandido), CHANGELOG, TODO, DEVELOPMENT

### Fase 16.1: Correção de Ícones no App Empacotado ✅

- [x] Corrigir `BrowserWindow.icon`: apontar para `public/assets/images/icons/ShipIt.ico` (existe no asar)
- [x] Remover `signAndEditExecutable: false` do `package.json` (impedia injeção do ícone no .exe)
- [x] Regenerar `build/icon.ico` com 9 tamanhos (16–256px, 32bpp RGBA)
- [x] Sincronizar `public/assets/images/icons/ShipIt.ico` com `build/icon.ico`
- [x] Atualizar ícones de tray (novas versões em alta qualidade)
- [x] Atualizar campo `author` em `package.json` para objeto com name + email
- [x] Validar: .exe mostra ícone correto no File Explorer, taskbar e lista de programas

### Automação de Release ✅

- [x] Script Python `docs/scripts/release.py` para automação completa do fluxo de release
  - [x] Validação de ambiente (git, gh CLI, autenticação, branch)
  - [x] Commit condicional de mudanças pendentes (com fallback manual)
  - [x] Atualização de CHANGELOG.md via Copilot CLI (com fallback manual)
  - [x] Bump de versão no package.json (patch/minor/major/custom)
  - [x] Push, PR (dev → main), squash merge, tag, aguardar CI/CD, publicar release
  - [x] `--dry-run`, `--skip-changelog`, `--skip-commit`, `--skip-pull-request`, `--version`, `--help`
  - [x] Resumibilidade: detecta estado atual e pula passos concluídos
  - [x] Compatibilidade Windows (subprocess, encoding UTF-8)
- [x] Documentação: `RELEASE_GUIDE.md`, `RELEASE_TROUBLESHOOTING.md`, `README.md`

### Fase 17: Sistema Multi-Tema ✅

- [x] Refatorar arquitetura de temas: `src/themes/themes.ts` (registro), `src/themes/themes.css` (paletas)
- [x] Projetar 11 paletas de temas (2 principais, 6 personalidade, 2 acessibilidade, 1 bônus)
  - [x] Claro (modernizado) e Escuro (preto profundo)
  - [x] Colorido, Rosa & Violeta, Minimalista, Futurista, Oceano, Pôr do Sol
  - [x] Alto Contraste (WCAG AAA claro) e Alto Contraste Escuro (WCAG AAA escuro)
  - [x] Cyberpunk (neon amarelo/ciano, efeitos especiais)
- [x] 60+ variáveis CSS por tema (foundation, surfaces, semantic, navigation, charts, radius, shadows)
- [x] Componente `ThemeSelector` com grid visual por categoria e preview de cores
- [x] Refatorar `ThemeContext` de toggle dark/light para multi-tema completo
- [x] Integração do `ThemeSelector` na SettingsPage (seção "Aparência")
- [x] Efeitos especiais Cyberpunk (`cyberpunk-effects.css`): scanlines CRT, neon glow, glitch, cantos angulares
- [x] Transições de tema suaves (200ms)
- [x] Persistência de tema atualizada: `localStorage.shipit-theme` armazena ID do tema

### Fase 18: Atualização da Documentação ✅

- [x] Reescrever `README.md` como documentação para usuário final (instalação, primeiros passos, funcionalidades, FAQ)
- [x] Atualizar `CHANGELOG.md` com informações do ciclo v1.2.2 e mudanças pendentes
- [x] Atualizar `docs/TODO.md` com fases 17 e 18
- [x] Atualizar `.github/copilot-instructions.md` (versão, stack, temas, file structure)
- [x] Atualizar `docs/ARCHITECTURE.md` (arquitetura multi-tema, decisões técnicas)

### Fase 19: Evidências de Texto ✅

- [x] Editor rich-text com TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`)
- [x] Componente `TextEvidenceEditor` para edição de evidências de texto formatado
- [x] Componente `TextEvidenceModal` para visualização/edição em modal
- [x] Campo `type` ('image' | 'text') e `text_content` na entidade Evidence
- [x] IPC handlers `db:saveTextEvidence` e `db:updateTextEvidence`

### Fase 20: Lightbox de Evidências e Navegação entre Atividades ✅

- [x] Componente `EvidenceLightbox` para visualização em tela cheia de imagens (via `yet-another-react-lightbox`)
- [x] Componente `ActivityNav` com navegação prev/next entre atividades na tela de detalhes

### Fase 20.1: Sincronização da Documentação (Full Sync) ✅

- [x] Sincronizar os documentos principais com o estado real do código
- [x] Adicionar 4 componentes faltantes na documentação (`ActivityNav`, `EvidenceLightbox`, `TextEvidenceEditor`, `TextEvidenceModal`)
- [x] Adicionar 19 dependências faltantes em DEPENDENCIES.md
- [x] Atualizar entidade Evidence com campos `type` e `text_content` em todos os docs
- [x] Atualizar contagem de testes e componentes em todos os docs

### Fase 21: Navegação Global, Menu de Contexto e Menu do App ✅

- [x] `NavigationHistoryContext` com histórico global, botões Voltar/Avançar na TitleBar e atalhos `Alt+←` / `Alt+→`
- [x] Ajuste da navegação local da tela de detalhes para `←` / `→`, preservando guardas de digitação
- [x] Menu de contexto nativo para campos editáveis e texto selecionado (`undo`, `redo`, `cut`, `copy`, `paste`, `selectAll`)
- [x] Política centralizada de links externos no processo principal (`http`, `https`, `mailto`) com abertura via navegador/cliente externo
- [x] `AppTopMenu` ao lado do logo com seções File/Edit/View/Help, atalhos globais e ações integradas via IPC
- [x] Módulo `src/menu` com catálogo de comandos e registro de save-context
- [x] Rota `/manual` com `UserManualPage` e ações de ajuda/reportar problema

### Fase 22: Detalhe da Atividade e Evidência de Texto ✅

- [x] Tela de detalhes da atividade com botão Excluir e modal de confirmação acessível
- [x] `ActivityNav` com seletor de mês no lugar do antigo toggle de modo
- [x] Redirecionamento pós-exclusão para `/activities?month={mês}`
- [x] `TextEvidenceEditor` com foco ao clicar na área vazia/padding do editor
- [x] Colagem em evidências de texto estabilizada via foco correto do ProseMirror
- [x] Limite de evidência textual ampliado para 20.000 caracteres

### Fase 23: Ordenação Cronológica de Atividades ✅

- [x] Helper de normalização em `electron/database.ts` para atividades legadas com `order = null`
- [x] Novas atividades entram no fim do mês de referência usando o maior `order` existente
- [x] `getActivities`, `getReportPayload` e `searchActivities` usam ordenação estável por `order ASC`, `id ASC`
- [x] `reorderActivities` permanece como fonte autoritativa para drag-and-drop
- [x] Fallback browser (`localDb.ts`) alinhado com a mesma regra de ordenação
- [x] Cobertura Vitest ampliada para criação, legado, reorder, payload DOCX e busca
- [x] Na conclusão da fase: 113 testes Vitest passando (10 arquivos)

### Fase 23.1: Validação TitleBar e Release ✅

- [x] Preflight local validado em `dev`: Node 24/npm 11, build, Vitest e E2E baseline registrados
- [x] Controles reais da TitleBar cobertos por Playwright/Electron (`minimize`, `maximize/restore`, `close` para tray)
- [x] Busca da TitleBar coberta com debounce, ícone, resultados, estado vazio, destaque, limite, navegação por teclado, filtro avançado e fechamento
- [x] Histórico global preserva query string e profundidade mínima de navegação por botões/atalhos
- [x] Menu superior validado por mouse, teclado e todos os command IDs de File/Edit/View/Help com instrumentação segura
- [x] Teste mensal do detalhe isolado com meses únicos por execução para evitar dados persistidos entre runs
- [x] Fixtures E2E de atividades centralizadas em `e2e/fixtures/activityFixtures.ts`
- [x] Baseline E2E declarada à época: 27 cenários Playwright/Electron
- [x] Dry-run oficial de release `1.3.3` concluído sem ações remotas destrutivas

### Fase 24: Atualizações, Ícones e Limpeza Segura ✅

- [x] Identidade runtime centralizada para `appId`, nome do app, modo de teste e paths de assets públicos
- [x] Ícones de janela, notificação e tray resolvidos por helper com fallback explícito de `nativeImage`
- [x] Auto-update alterado para `checkForUpdates()` com notificações customizadas do ShipIt em pt-BR
- [x] Dedupe de notificações por versão/status e proteção contra verificações concorrentes de update
- [x] Clique em notificação de update restaura/foca a janela existente e navega para Configurações
- [x] `requestSingleInstanceLock()` configurado para evitar segunda janela/instância concorrente
- [x] Playwright/Electron isolado em `userData` temporário com marcador `.shipit-test-profile`
- [x] Cleanup E2E protegido por marcador e prefixo `shipit-e2e-`, recusando diretórios não marcados
- [x] Script manual dry-run para limpeza opt-in do cache global de ícones do Windows validado sem remoção real
- [x] Cobertura focada para paths/ícones, update notifications, dedupe e limpeza segura de perfil temporário

### Fase 25: Compatibilidade de `userData` ✅

- [x] `userData` de produção fixado no diretório legado `shipit` dentro de `appData`, preservando banco, settings, evidências e relatórios existentes.
- [x] Desenvolvimento local mantido separado em `ShipIt!` para não misturar dados reais com `npm run dev`.
- [x] E2E continua com prioridade para `SHIPIT_TEST_USER_DATA_DIR` e perfil temporário protegido por marcador `.shipit-test-profile`.
- [x] `APP_ID` runtime alinhado ao `build.appId` do `package.json` (`br.com.neuronioazul.shipit`).
- [x] Cobertura Vitest ampliada para produção, desenvolvimento, E2E e alinhamento de identidade.

### Fase 26: Fluxo Manual de Atualização ✅

- [x] Seção "Atualizações" em Configurações com ações separadas para verificar, baixar e instalar, e acompanhamento do progresso de download (v1.3.6).
- [x] Sinalização visual de novas versões via badges na navegação, modal de atualização na TitleBar e indicadores por plataforma (overlay Windows, badge macOS/Linux) (v1.3.6).
- [x] Verificação manual de atualização agora retorna o estado final corretamente, evitando UI travada em “verificando” (v1.3.7).
- [x] Estado de atualização pendente persiste entre reinicializações até a instalação (v1.3.6).
- [x] Auto-update passou a apenas verificar ao iniciar; download e instalação dependem de consentimento explícito (v1.3.6).
- [x] Novos handlers IPC: `app:getUpdateState`, `app:downloadUpdate`, `app:acknowledgeUpdateAttention` + contexto `UpdateStateContext` no renderer.
- [x] Componentes `UpdateModal` e `UpdateStatusPanel` adicionados a `src/components/`.
- [x] Cobertura Vitest da fase ampliada (naquele momento, 120 testes em 10 arquivos) cobrindo a finalização do estado de checagem manual.

### Fase 27: Perfil com Disponibilidade ✅

- [x] `UserProfile` ganhou campos de disponibilidade diária, mensal e esforço mínimo, com persistência tipada no Electron e no renderer.
- [x] A tela de perfil passou a coletar `contract_identifier`, `profile_type`, `correlating_activities` e os novos campos numéricos de disponibilidade.
- [x] A validação e a geração do relatório DOCX passaram a considerar os novos campos do perfil quando preenchidos.
- [x] Cobertura automatizada dedicada para `ProfilePage` adicionada ao projeto.

### Fase 28: Ajustes Pós-release 1.5.x ✅

- [x] Estado de atualização restaurado com segurança após reinício, degradando updates baixados para novo download quando o caminho do arquivo não está mais disponível.
- [x] Indicadores de atenção e versão pendente de update foram refinados para se manterem consistentes entre reinicializações.
- [x] Links preenchidos em `Links de Referência` agora são exportados no DOCX como hyperlinks clicáveis.
- [x] Estado atual validado em 26/05/2026: 137 testes Vitest passando (11 arquivos) e 35 cenários Playwright declarados em `e2e/app.spec.ts`.

---

## Backlog

- [ ] Diretório de armazenamento de dados customizável (opcional, adiado)
- [ ] Ajustar ícones de tray para macOS (template images)
- [ ] Testar auto-launch e paths em cada plataforma (macOS/Linux)
- [ ] Verificar path do DOCX template com acentos no CI Linux/macOS (primeira run)
