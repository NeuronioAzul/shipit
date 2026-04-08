# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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

- Opções de notificação e configuração de alertas
- Diretório de armazenamento de dados (opcional)
- Arrastar e soltar para reorganizar atividades e evidências
- Validação de margens e quebras de tabela no DOCX
- Sistema de alertas com notificações antes do fim do mês
- Lixeira de evidências (reter 3 meses)
- Builds para macOS (.dmg) e Linux (.AppImage)
- Testes finais e empacotamento
