# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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

### Adicionado

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

---

## [Unreleased]

### Pendente

- Testes E2E básicos (Playwright)
- Diretório de armazenamento de dados customizável (opcional)
- Builds para macOS (.dmg) e Linux (.AppImage)
- Ajustes de tray para macOS (template images) e Linux (AppIndicator)
- Testes finais e empacotamento multiplataforma

---

## [1.2.0] — 2026-07-10

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

### Dependências adicionadas ( Fase 11)

- `sql.js` (devDependency) — SQLite puro em JavaScript para testes sem native modules

### Arquivos modificados

- `electron/report-generator.ts` — export `getLastBusinessDay()`, param `templatePath` no payload
- `electron/database.ts` — `initDatabase(overrides?)`, `resetDatabase()`, constante `ALL_ENTITIES`
- `electron/main.ts` — `minWidth: 800`
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
