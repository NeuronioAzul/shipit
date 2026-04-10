# ShipIt! — Roadmap de Desenvolvimento

> Atualizado em: 10/04/2026 (v1.2.0)
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
- [x] Botão "Gerar PDF" do mês selecionado
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
- [ ] Testes E2E básicos (Playwright) — adiado
- [x] Revisão geral de UI (responsividade, feedback visual, acessibilidade)

### Fase 10: Testes Automatizados ✅

- [x] Testes unitários para `getLastBusinessDay()` (9 testes)
- [x] Testes de integração para `generateDocxReport()` com template fixture (9 testes)
- [x] Testes de integração para database CRUD com sql.js in-memory (20 testes)
- [x] Refatoração: `initDatabase()` aceita overrides de `DataSourceOptions`
- [x] Refatoração: `generateDocxReport()` aceita `templatePath` no payload
- [x] Exclusão de `dist-electron/` do Vitest config
- [x] Total: 54 testes passando (16 validation + 9 report unit + 9 report integration + 20 database)

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

### Fase 9: Distribuição Multiplataforma

- [x] Configuração do electron-builder
  - [x] .exe (Windows 10/11)
  - [ ] .dmg (macOS)
  - [ ] .AppImage (Linux)
- [x] Ícones do app configurados (favicon, tray, instalador)
- [ ] Ajustar ícones de tray para macOS (template images)
- [ ] Testar auto-launch e paths em cada plataforma
- [ ] Testes finais e empacotamento de release
