# ShipIt! — Roadmap de Desenvolvimento

> Atualizado em: 07/04/2026

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
- [ ] Reorganização por drag & drop (campo `order`)

### Fase 2.2: Tela de Detalhes da Atividade ✅

- [x] Exibição completa: descrição, período, status, links, evidências
- [x] Edição inline dos detalhes (via botão Editar → rota edit)
- [x] Adicionar/editar legendas das evidências
- [x] Visualização das imagens de evidência

### Fase 2.3: Validação de Campos Obrigatórios

- [ ] Validação antes de gerar relatório (description, date_start, date_end, status)
- [ ] Validação do perfil do usuário (todos os campos obrigatórios)
- [ ] Ícone de alerta nas atividades incompletas
- [ ] Mensagens de erro detalhadas

### Fase 2.3.1: System Tray icon

Implementação do ícone do ShipIt! no System Tray para fácil acesso.
Ao clicar no ícone, a janela para registrar uma nova atividade ou continuar editando atividades existentes que não foi fechada deve ser exibida.

- [ ] Implementação do ícone do ShipIt! no System Tray para fácil acesso.
- [ ] Ao clicar no ícone, a janela para registrar uma nova atividade ou continuar editando atividades existentes que não foi fechada deve ser exibida.
- [ ] Ícone deve refletir o status do app (ex: alerta para atividades incompletas)
- [ ] Menu de contexto no ícone com opções rápidas (ex: "Nova Atividade", "Abrir Dashboard", "Sair")
- [ ] Compatibilidade com Windows, macOS e Linux (ajustes de ícone e comportamento conforme plataforma)
- [ ] Configuração para iniciar o app junto com o sistema operacional, pode alterar em configurações.

### Fase 2.4: Sistema de Rascunho e Salvamento Automático

- [ ] Auto-save no formulário de atividade
- [ ] Recuperação de rascunhos após fechamento inesperado
- [ ] Indicador visual de "salvando..." / "salvo"

### Fase 2.5: Dashboard de Resumo Mensal

- [ ] Dashboard como tela inicial (substituir Empty State pós-perfil)
- [ ] Seletor de mês/ano na parte superior
- [ ] Cards de resumo (total, concluídas, em andamento, canceladas)
- [ ] Gráfico de Gantt com atividades × dias do mês
- [ ] Listagem de atividades com: número, descrição resumida, período, status, atendimento, referência de páginas
- [ ] Botão "Gerar PDF" do mês selecionado
- [ ] Troca de mês atualiza todos os dados

---

## Fase 3: O Motor de PDF

- [ ] Confirmação do mês antes de gerar
- [ ] Template HTML/CSS idêntico ao modelo MEC
- [ ] Serviço de geração via Puppeteer (ou DOCX via template)
- [ ] Um print por página no PDF, legenda abaixo da imagem
- [ ] Referências de páginas na coluna "Referência" da tabela
- [ ] Preview do PDF antes de salvar
- [ ] Nomenclatura: `RELATÓRIO DE SERVIÇO - <CARGO>_<NOME>_<MÊS>.pdf`
- [ ] Histórico de relatórios gerados (entidade Report)
- [ ] Status do relatório (Gerado, Falha, Excluído)

---

## Fase 4: Polimento e Distribuição

- [ ] Validação de margens e quebras de tabela no PDF
- [ ] Sistema de alertas (notificações antes do fim do mês)
- [ ] Lixeira de evidências (reter 3 meses)
- [ ] Configuração do electron-builder
  - [ ] .exe (Windows 10/11)
  - [ ] .dmg (macOS)
  - [ ] .AppImage (Linux)
- [ ] Ícones do app configurados (favicon, tray, instalador)
- [ ] Testes finais e empacotamento
