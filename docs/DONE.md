# ShipIt! — Histórico de Concluídos (DONE)

> Histórico do que já foi **feito, corrigido, testado e publicado**, organizado por fase.
> Para o detalhe de mudanças por versão (datas e categorias), a fonte é o [CHANGELOG.md](../CHANGELOG.md).
>
> **Fluxo dos arquivos de tarefa:**
> `coisas para fazer e publicar.md` (rascunho) → `TODO.md` (pendências reais) → `DONE.md` (este arquivo, histórico).
>
> Itens concluídos mas **ainda não lançados** ficam em [Unreleased]; ao publicar, anote a versão.
>
> Quando identificável, cada bloco traz uma linha `> Plano:` apontando para o(s) plano(s) em [docs/plans/](plans/) que originaram o trabalho. As fases iniciais (1–16) antecedem a convenção de planos numerados (`plan-shipitNN`) e nem sempre têm um plano correspondente.

---

## [Unreleased]

> Plano: [plan-shipit38 — descrição rich-text e formatação no DOCX](plans/plan-shipit38-richTextDescriptionAndDocxFormatting.prompt.md)

- [x] Campo de **descrição da atividade** com editor rich-text (negrito, itálico, listas), reutilizando o editor das evidências de texto. Descrições legadas em texto plano são normalizadas para HTML preservando as quebras de linha.
- [x] **Correção:** quebras de linha da descrição passaram a ser preservadas no DOCX (antes colapsavam em uma única linha).
- [x] **Correção:** o DOCX passou a exportar a formatação (negrito/itálico/listas/quebras) da descrição e das evidências de texto, com numeração de listas ordenadas e espaços entre marcações.
- [x] **Infra/testes:** `electron/tsconfig.json` para os decorators do TypeORM no transformer oxc do Vite 8 (suíte voltou a 100% verde — 185 unit + 37 e2e); rebuild do `better-sqlite3` para a ABI do Electron atual; `ELECTRON_RUN_AS_NODE` (herdado do host) tratado nos comandos de e2e.

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

## Fase 2: Fluxo de Registro ✅

- [x] IPC handlers para CRUD de atividades (`db:getActivities`, `db:saveActivity`, `db:deleteActivity`)
- [x] Formulário de Nova Atividade (descrição, período início→fim, status, links de referência, tipo de atendimento, mês de referência)
- [x] Área de upload de evidências (seleção de arquivo, drag & drop, clipboard paste, cópia interna, legenda por evidência)
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

- [x] Implementação do ícone do ShipIt! no System Tray para fácil acesso
- [x] Clique no ícone exibe a janela para registrar/continuar atividades
- [x] Ícone reflete o status do app (alerta para atividades incompletas)
- [x] Menu de contexto no ícone com opções rápidas ("Nova Atividade", "Abrir Dashboard", "Sair")
- [x] Configuração para iniciar o app junto com o sistema operacional (editável em configurações)

### Fase 2.4: Sistema de Rascunho e Salvamento Automático ✅

- [x] Auto-save no formulário de atividade
- [x] Recuperação de rascunhos após fechamento inesperado
- [x] Indicador visual de "salvando..." / "salvo"

### Fase 2.5: Dashboard de Resumo Mensal ✅

- [x] Dashboard como tela inicial (substituir Empty State pós-perfil)
- [x] Seletor de mês/ano na parte superior
- [x] Cards de resumo (total, concluídas, em andamento, canceladas)
- [x] Gráfico de Gantt com atividades × dias do mês
- [x] Listagem de atividades com número, descrição, período, status, atendimento, referência de páginas
- [x] Botão "Gerar Relatório DOCX" do mês selecionado
- [x] Troca de mês atualiza todos os dados

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

## Fase 4: Configurações e perfil ✅

- [x] Tela de perfil do usuário (acessível no Header via ícone de usuário)
- [x] Separar configurações de perfil e configurações do app
- [x] Configurações de perfil: cargo, tipo de atendimento, atividades correlatas, escopo do projeto/squad etc.
- [x] Configurações do app: tema (persistido via localStorage), som de notificações, seção "Notificações" (toggle/dias/horário/mensagem/som), comportamento (iniciar com o sistema), diretório dos relatórios gerados

## Alterações e correções (base) ✅

- [x] Arrastar e soltar evidências na tela de detalhes — `@dnd-kit` + zona de drop
- [x] Arrastar e soltar para reorganizar atividades na listagem (campo `order`) — `@dnd-kit/sortable`
- [x] "Sobre" movida de configurações para modal no Header
- [x] Menus ajustados para refletir telas e funcionalidades (Header com nav)
- [x] Cores da marca e tokens de tema via `@theme inline` no CSS (sem arquivo de config)

## Fase 5: Alertas e Notificações ✅

- [x] Scheduler de alertas no main process (verifica a cada 60s)
- [x] Integração com Notification API nativa do Electron
- [x] Atualização automática do ícone do tray (verde/amarelo/vermelho)
- [x] Seção de configuração de alertas na SettingsPage

## Fase 6: Drag & Drop ✅

- [x] Reordenar atividades na listagem via `@dnd-kit/sortable`
- [x] Reordenar evidências na tela de detalhes via `@dnd-kit/sortable`
- [x] Zona de drop na `ActivityDetailPage` para adicionar novas evidências

## Fase 7: Menus e Navegação ✅

- [x] Modal "Sobre o ShipIt!" acessível via ícone no Header
- [x] Header com nav links diretos (Dashboard, Atividades, Perfil, Configurações, Sobre)
- [x] Menu do tray atualizado com Perfil e Configurações

## Fase 8: Polimento ✅

- [x] Validação de margens e quebras de tabela no DOCX (`ensureCantSplit`)
- [x] Data da capa do DOCX usando último dia útil do mês de referência
- [x] Suporte a gif/bmp/webp no gerador DOCX
- [x] Lixeira de evidências (soft delete + auto-limpeza > 3 meses)
- [x] Testes unitários com Vitest (16 testes: validation.ts)
- [x] UI de gerenciamento da lixeira (visualizar/restaurar)
- [x] Testes do report-generator (9 unit + 9 integration)
- [x] Testes de integração para database CRUD (20 testes)
- [x] Testes E2E básicos (Playwright)
- [x] Revisão geral de UI (responsividade, feedback visual, acessibilidade)

## Fase 9: Distribuição Multiplataforma ✅ (parcial)

- [x] Configuração do electron-builder: .exe (Windows), .dmg (macOS), .AppImage (Linux)
- [x] Ícones do app configurados (favicon, tray, instalador)
- [x] Testes finais e empacotamento de release
- _(itens pendentes de plataforma movidos para o TODO)_

### Fase 9.1: CI/CD — Build & Release Multiplataforma ✅

- [x] `electron-updater` como dependência de produção
- [x] `publish` (provider: github) no `build` do `package.json`
- [x] Auto-update em `electron/main.ts`
- [x] Workflow GitHub Actions (`.github/workflows/release.yml`): trigger por tag semver, build paralelo Win/macOS/Linux, testes como gate, publicação no GitHub Releases
- [x] Ícone macOS atualizado para `.icns`

## Fase 10: Testes Automatizados ✅

- [x] Testes unitários para `getLastBusinessDay()` (9 testes)
- [x] Testes de integração para `generateDocxReport()` com template fixture (9 testes)
- [x] Testes de integração para database CRUD com sql.js in-memory (20 testes)
- [x] `initDatabase()` aceita overrides de `DataSourceOptions`
- [x] `generateDocxReport()` aceita `templatePath` no payload
- [x] Exclusão de `dist-electron/` do Vitest config
- [x] Marco histórico: 54 testes passando

## Fase 11: Revisão UI/UX ✅

- [x] Análise WCAG AA de paleta de cores
- [x] Auditoria de acessibilidade: `aria-label` em botões icon-only; `role="dialog"`/`alertdialog` + `aria-modal`; Escape em modais; `aria-hidden` em ícones decorativos; `focus-visible:ring`
- [x] Responsividade: `minWidth: 800, minHeight: 600`
- [x] Consistência visual: sem cores hardcoded, tokens padronizados, hierarquia tipográfica
- [x] Animações: `animate-page-in`, `animate-modal-in`, `animate-shake` (keyframes em `index.css`)

## Fase 12: Correção de Bugs e Estabilização ✅

- [x] Corrigir caminho do tray icon em `setTrayIcon()`
- [x] Corrigir CHANGELOG (ordem descendente, data em [1.2.0])
- [x] `package.json` version `1.2.0`
- [x] Remover `cleanupTrash()` duplicada
- [x] Corrigir colisão de rId no gerador DOCX
- [x] Suporte a dimensões GIF/BMP em `getImageDimensions()`

## Fase 13: Animações e Feedback Visual ✅

- [x] Shake animation no drag handle de evidência
- [x] Loading spinners em botões (v1.1.0)
- [x] Transições de página com `key={location.pathname}` no AppLayout
- [x] Drop zones com `scale` + `ring` durante drag & drop

## Fase 14: Aplicar Nova Paleta de Cores ✅

- [x] Validação da paleta (WCAG AA)
- [x] Variáveis CSS `hsl()` → `rgb()` com valores da `tokens.css`
- [x] Novos tokens (`--secondary`, `--popover`, `--info`, `--surface-*`, `--disabled-*`, `--selection-*`, `--chart-*`, `--radius-*`, `--shadow-*`)
- [x] Estilos `::selection`
- [x] Remoção de cor hardcoded no TitleBar; renomeação `--sidebar-bg` → `--sidebar`

## Fase 15: Melhorar Cobertura de Testes ✅

- [x] Teste de cascade FK em `deleteActivity`
- [x] Testes E2E com Playwright (janela, navegação, tema, criação de atividade)

## Fase 16: Ícone, Instaladores Multi-formato, Busca, Auto-Update UI ✅

- [x] `ShipIt.ico` multi-size a partir do PNG 310×310; `build.win.icon` aponta para o `.ico`
- [x] Instaladores multi-formato: Windows (NSIS + Portable + MSI), macOS (DMG arm64/x64), Linux (AppImage + deb + rpm)
- [x] Workflow release: job `create-release` (draft) → build jobs
- [x] Barra de busca na TitleBar (Command Palette) com `Ctrl+K`
- [x] `searchActivities(query)` + IPC `db:searchActivities` + filtros avançados na ActivitiesPage
- [x] Botão "Verificar atualizações" + IPC `app:checkForUpdate`/`app:installUpdate` + listeners `app:updateStatus`

### Fase 16.1: Correção de Ícones no App Empacotado ✅

- [x] `BrowserWindow.icon` apontando para o `.ico` no asar
- [x] Remover `signAndEditExecutable: false`
- [x] Regenerar `build/icon.ico` (9 tamanhos) e sincronizar com `public/assets/images/icons/`
- [x] `author` em `package.json` como objeto name+email
- [x] Validação do ícone no Explorer/taskbar/lista de programas

## Automação de Release ✅

> Plano: [plan-shipit09 — Automated Release Script](plans/plan-shipit09-AutomatedReleaseScript.prompt.md)

- [x] Script Python `docs/scripts/release.py` (validação de ambiente, commit condicional, CHANGELOG, bump, push, PR dev→main, squash merge, tag, aguardar CI/CD, publicar)
- [x] Flags `--dry-run`, `--skip-changelog`, `--skip-commit`, `--skip-pull-request`, `--version`, `--help`; resumibilidade; compatibilidade Windows
- [x] Documentação: `RELEASE_GUIDE.md`, `RELEASE_TROUBLESHOOTING.md`, `README.md`

## Fase 17: Sistema Multi-Tema ✅

> Plano: [plan-shipit10 — multiThemeSystem](plans/plan-shipit10-multiThemeSystem.prompt.md)

- [x] Arquitetura de temas: `themes.ts` (registro) + `themes.css` (paletas)
- [x] 11 paletas (2 principais, 6 personalidade, 2 acessibilidade, 1 bônus)
- [x] 60+ variáveis CSS por tema
- [x] `ThemeSelector` com grid visual por categoria e preview
- [x] `ThemeContext` refatorado de toggle para multi-tema
- [x] Efeitos Cyberpunk (`cyberpunk-effects.css`)
- [x] Transições suaves (200ms); persistência em `localStorage.shipit-theme`

## Fase 18: Atualização da Documentação ✅

> Plano: [plan-shipit11 — documentationUpdate](plans/plan-shipit11-documentationUpdate.prompt.md)

- [x] README reescrito como doc de usuário final
- [x] CHANGELOG, TODO, copilot-instructions e ARCHITECTURE atualizados (ciclo v1.2.2)

## Fase 19: Evidências de Texto ✅

> Plano: [plan-shipit14 — textEvidenceForActivities](plans/plan-shipit14-textEvidenceForActivities.prompt.md)

- [x] Editor rich-text TipTap; componentes `TextEvidenceEditor` e `TextEvidenceModal`
- [x] Campo `type` ('image'|'text') e `text_content` na entidade Evidence
- [x] IPC `db:saveTextEvidence` e `db:updateTextEvidence`

## Fase 20: Lightbox de Evidências e Navegação entre Atividades ✅

> Plano: [plan-shipit12 — layoutConsistencyAndEvidenceLightbox](plans/plan-shipit12-layoutConsistencyAndEvidenceLightbox.prompt.md) · [plan-shipit13 — activityDetailShowAllFieldsAndNavigation](plans/plan-shipit13-activityDetailShowAllFieldsAndNavigation.prompt.md)

- [x] `EvidenceLightbox` (via `yet-another-react-lightbox`)
- [x] `ActivityNav` com navegação prev/next

### Fase 20.1: Sincronização da Documentação (Full Sync) ✅

> Plano: [plan-shipit14-1 — documentationUpdate](plans/plan-shipit14-1-documentationUpdate.prompt.md)

- [x] Documentos sincronizados com o código (4 componentes + 19 dependências + entidade Evidence + contagens)

## Fase 21: Navegação Global, Menu de Contexto e Menu do App ✅

> Plano: [plan-shipit17 — titlebarBackForwardNavigation](plans/plan-shipit17-titlebarBackForwardNavigation.prompt.md) · [plan-shipit18 — contextMenuExternalLinks](plans/plan-shipit18-contextMenuExternalLinks.prompt.md) · [plan-shipit19 — menuDoAppAoLadoDoLogo](plans/plan-shipit19-menuDoAppAoLadoDoLogo.prompt.md)

- [x] `NavigationHistoryContext` com Voltar/Avançar (`Alt+←`/`Alt+→`)
- [x] Navegação local de detalhes `←`/`→` com guardas de digitação
- [x] Menu de contexto nativo (undo/redo/cut/copy/paste/selectAll)
- [x] Política de links externos no main process
- [x] `AppTopMenu` (File/Edit/View/Help) + módulo `src/menu` + rota `/manual` (`UserManualPage`)

## Fase 22: Detalhe da Atividade e Evidência de Texto ✅

> Plano: [plan-shipit20 — activityDetailDeleteAndMonthSelector](plans/plan-shipit20-activityDetailDeleteAndMonthSelector.prompt.md) · [plan-shipit21 — textEvidenceModalFixes](plans/plan-shipit21-textEvidenceModalFixes.prompt.md)

- [x] Botão Excluir + modal de confirmação acessível; redirecionamento pós-exclusão
- [x] `ActivityNav` com seletor de mês
- [x] Foco do TipTap estabilizado; colagem corrigida; limite de 20.000 caracteres

## Fase 23: Ordenação Cronológica de Atividades ✅

> Plano: [plan-shipit22 — activityChronologicalOrdering](plans/plan-shipit22-GPT55-activityChronologicalOrdering.prompt.md)

- [x] Normalização de `order` para atividades legadas; novas entram no fim do mês
- [x] `getActivities`/`getReportPayload`/`searchActivities` com ordenação estável (`order ASC, id ASC`)
- [x] `reorderActivities` autoritativo para drag-and-drop; fallback `localDb.ts` alinhado
- [x] Marco: 113 testes Vitest (10 arquivos)

### Fase 23.1: Validação TitleBar e Release ✅

> Plano: [plan-shipit23 — validacaoTitlebarRelease](plans/plan-shipit23-FullFix-validacaoTitlebarRelease.prompt.md)

- [x] Preflight local em `dev` (Node 24/npm 11, build, Vitest, E2E baseline)
- [x] Controles da TitleBar cobertos por Playwright/Electron; busca coberta extensivamente
- [x] Histórico global preserva query string; menu superior validado por mouse/teclado
- [x] Baseline E2E: 27 cenários; dry-run de release `1.3.3` concluído sem ações remotas

## Fase 24: Atualizações, Ícones e Limpeza Segura ✅

- [x] Identidade runtime centralizada (`appId`, nome, modo de teste, paths de assets)
- [x] Ícones resolvidos por helper com fallback `nativeImage`
- [x] Auto-update via `checkForUpdates()` com notificações pt-BR; dedupe por versão/status
- [x] `requestSingleInstanceLock()`; Playwright isolado em `userData` temporário com marcador
- [x] Cleanup E2E protegido por marcador `shipit-e2e-`; dry-run de limpeza de cache de ícones

## Fase 25: Compatibilidade de `userData` ✅

> Plano: [plan-shipit25 — compatibilidadeUserData](plans/plan-shipit25-compatibilidadeUserData.prompt.md)

- [x] `userData` de produção fixado no diretório legado `shipit` em `appData`
- [x] Dev separado em `ShipIt!`; E2E com `SHIPIT_TEST_USER_DATA_DIR`
- [x] `APP_ID` alinhado ao `build.appId` (`br.com.neuronioazul.shipit`)

## Fase 26: Fluxo Manual de Atualização ✅

> Plano: [plan-shipit26 — atualizacaoManualESinalizacaoDeNovaVersao](plans/plan-shipit26-atualizacaoManualESinalizacaoDeNovaVersao.prompt.md) · [plan-shipit27 — fixStuckCheckingLoopAfterUpdateCheck](plans/plan-shipit27-fixStuckCheckingLoopAfterUpdateCheck.prompt.md)

- [x] Seção "Atualizações" em Configurações (verificar/baixar/instalar + progresso) (v1.3.6)
- [x] Badges de nova versão na navegação, modal na TitleBar, indicadores por plataforma (v1.3.6)
- [x] Verificação manual retorna estado final (sem UI travada) (v1.3.7)
- [x] Estado pendente persiste entre reinícios; auto-update só verifica ao iniciar (v1.3.6)
- [x] IPC `app:getUpdateState`/`app:downloadUpdate`/`app:acknowledgeUpdateAttention` + `UpdateStateContext`
- [x] Componentes `UpdateModal` e `UpdateStatusPanel`

## Fase 27: Perfil com Disponibilidade ✅ (v1.5.0)

> Plano: [plan-shipit28 — availabilityFieldsInProfile](plans/plan-shipit28-availabilityFieldsInProfile.prompt.md)

- [x] `UserProfile` com disponibilidade diária/mensal e esforço mínimo
- [x] ProfilePage coletando `contract_identifier`, `profile_type`, `correlating_activities` + campos numéricos
- [x] Validação e DOCX considerando os novos campos; cobertura dedicada para ProfilePage

## Fase 28: Ajustes Pós-release 1.5.x ✅

> Plano: [plan-shipit30 — fixNoUpdateFilepathBug](plans/plan-shipit30-fixNoUpdateFilepathBug.prompt.md) · [plan-shipit31 — fixdocxReferenceLinks](plans/plan-shipit31-fixdocxReferenceLinks.prompt.md)

- [x] Estado de update restaurado com segurança após reinício (v1.5.1)
- [x] Indicadores de atenção/versão pendente refinados
- [x] Links de referência exportados como hyperlinks clicáveis no DOCX (v1.5.2)
- [x] Validação 26/05/2026: 147 testes Vitest (12 arquivos), 36 cenários Playwright

## Fase 29: Evidências por Tipo e Layout DOCX ✅ (v1.6.0)

> Plano: [plan-shipit32 — EvidenceCountByType](plans/plan-shipit32-EvidenceCountByType.prompt.md) · [plan-shipit33 — docxImageMaxFitAnd2LineCaption](plans/plan-shipit33-docxImageMaxFitAnd2LineCaption.prompt.md)

- [x] Contagem de evidências separada por tipo (imagem/texto) na lista, detalhe e Dashboard
- [x] Contadores exibem ambos os tipos mesmo com valor zero
- [x] DOCX com área livre de imagem até 27 cm × 15 cm (escala proporcional)
- [x] Legenda DOCX limitada a duas linhas com truncamento em reticências
- [x] Cobertura para regras de fit e truncamento de legenda

## v1.6.1 – v1.6.2 ✅

> Plano: [plan-shipit34 — themedScrollbarTailwind](plans/plan-shipit34-themedScrollbarTailwind.prompt.md) (v1.6.1) · [plan-shipit36 — aboutPageDonationPix](plans/plan-shipit36-aboutPageDonationPix.prompt.md) (v1.6.2)

- [x] Barra de rolagem temática global com tokens por tema e gutter estável (`scrollbar-gutter: stable`) (v1.6.1)
- [x] Página **Sobre** com créditos e apoio via PIX (QR code) + cobertura E2E
- [x] Refatoração do `ActivityBar`; textos revisados em Dashboard/Configurações; README atualizado

## v1.7.0 ✅

> Plano: [plan-shipit37 — svnReleasesActivityField](plans/plan-shipit37-svnReleasesActivityField.prompt.md)

- [x] Campo **Releases SVN** (`svn_releases`) na entidade `Activity` (CSV, uso interno, sem exportação DOCX)
- [x] Componente `InputTags` (tags visuais, separadores automáticos, validação, dedupe)
- [x] Utilitário `svnReleases.ts` (parse/normalização/serialização/validação)
- [x] Seção "Releases SVN (uso interno)" no formulário; badges `#<número>` no detalhe e na lista
- [x] Busca textual estendida para `svn_releases`
- [x] Testes unitários (`svnReleases.test.ts`) + cobertura no banco + cenários E2E
- [x] Script de release aprimorado; `RELEASE_GUIDE.md`/`RELEASE_TROUBLESHOOTING.md` atualizados
