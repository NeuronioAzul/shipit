# 🚀 ShipIt! — Plano de Continuidade (v2)

> Criado em: 08/04/2026
> Baseado em: `docs/plan-shipit01.prompt.md`
> Referência: `docs/TODO.md` (atualizado em 07/04/2026)

---

## 1. Resumo do Estado Atual

O ShipIt! já possui toda a fundação e o fluxo principal de registro operacionais. As Fases 1 e 2 (incluindo sub-fases) estão substancialmente completas. O app roda com Electron 41 + React 19 + Vite 8 + TypeORM + better-sqlite3, com dark/light mode, system tray, auto-save e dashboard funcional.

---

## Organização dos arquivos do projeto

Quero que coloque nas pastas de assets somente tudo o que o app precisa para rodar, como ícones, sons, template DOCX, etc. O diretório `assets/` deve conter:
- `icons/` — ícones para app e system tray
- `sfx/` — sons de alerta
- `templates/` — template DOCX base para geração de relatórios
- `fonts/` — fontes customizadas (se necessário)
- `images/` — imagens estáticas usadas no app (logo, empty state, etc.)

## 2. O que já foi implementado

### Fase 1: Fundação ✅ COMPLETA

- [x] Setup Electron + React (Vite) + TypeScript
- [x] Integração com SQLite (TypeORM + better-sqlite3) — BD em `userData/shipit.db`
- [x] Criação de todas as 6 entidades: UserProfile, Alert, Activity, Evidence, Report, ActivityReport
- [x] Tela Empty State com logo e botão "Criar Perfil"
- [x] Tela de Configurações / Cadastro de Perfil do Usuário (todos os 8 campos obrigatórios)
- [x] Electron main process com IPC handlers (`db:`, `app:`)
- [x] Preload bridge com contextBridge (`contextIsolation: true`, `nodeIntegration: false`)
- [x] Tailwind v4 com `@theme inline` — brand colors light + dark
- [x] Font Awesome 7 via npm (self-hosted)
- [x] Protocolo customizado `shipit-evidence://` para servir imagens de forma segura

### Fase 1.1: Dark / Light Mode ✅ COMPLETA

- [x] ThemeContext com toggle dark/light
- [x] Persistência em `localStorage.shipit-theme`
- [x] Radio buttons na tela de Perfil
- [x] Toggle no Header para alternar rapidamente
- [x] Classe `.dark` / `.light` no `<html>`

### Fase 2: Fluxo de Registro ✅ COMPLETA

- [x] CRUD completo de atividades via IPC (`db:getActivities`, `db:getActivity`, `db:saveActivity`, `db:deleteActivity`)
- [x] Formulário de Nova Atividade: descrição, período, status, links, atendimento, mês de referência
- [x] Upload de evidências: seleção de arquivo, drag & drop, clipboard paste
- [x] Cópia automática para diretório interno (`userData/evidences/`)
- [x] Legenda (caption) por evidência com edição inline
- [x] IPC: `db:saveEvidence`, `db:saveEvidenceFromBuffer`, `db:updateEvidenceCaption`, `db:deleteEvidence`, `db:getEvidenceFilePath`

### Fase 2.1: Listagem de Atividades ✅ PARCIAL

- [x] Listagem por mês com seletor de mês (prev/next)
- [x] Contagem de atividades, badge de status, indicador de completude, contagem de evidências
- [x] Botões editar / excluir com confirmação
- [x] Empty state com botão de criação rápida
- [x] Query param `?month=MM/YYYY`
- [ ] ~~Drag & drop para reordenação~~ — **NÃO IMPLEMENTADO** (IPC `db:reorderActivities` existe, campo `order` existe, falta UI)

### Fase 2.2: Detalhes da Atividade ✅ COMPLETA

- [x] Visualização completa: descrição, período, status, links, evidências com legendas
- [x] Edição via botão Editar → rota `/activities/:id/edit`
- [x] Edição inline de legendas das evidências
- [x] Visualização de imagens via protocolo customizado

### Fase 2.3: Validação de Campos Obrigatórios ✅ COMPLETA

- [x] `validateActivity()` — verifica descrição, datas, status, mês
- [x] `validateProfile()` — verifica todos os 8 campos obrigatórios
- [x] `isActivityComplete()` — usado para badge de alerta
- [x] Mensagens de erro detalhadas em lista colapsável

### Fase 2.3.1: System Tray ✅ PARCIAL

- [x] Ícone no System Tray com minimizar para tray ao fechar
- [x] Clique para exibir janela
- [x] Menu de contexto: Abrir, Nova Atividade, Dashboard, Atividades, Sair
- [x] 4 estados de ícone: default, green, yellow, red
- [x] Navegação via IPC `app:navigate`

### Fase 2.4: Auto-save e Rascunhos ✅ COMPLETA

- [x] Auto-save com debounce de 2s no formulário de atividade
- [x] Indicador visual "Salvando..." → "Salvo automaticamente"
- [x] Recuperação de rascunhos após fechamento

### Fase 2.5: Dashboard ✅ COMPLETA

- [x] Dashboard como tela inicial (pós-perfil)
- [x] Seletor de mês/ano
- [x] Cards de resumo: total, concluídas, em andamento, pendentes, canceladas
- [x] Gráfico de Gantt (atividades × dias do mês)
- [x] Tabela de atividades: nº, descrição, período, status, atendimento, contagem de imagens
- [x] Botão "Gerar PDF" no dashboard
- [x] Alerta visual para atividades incompletas

### Infraestrutura Implementada

| Recurso | Status |
|---------|--------|
| Browser fallback (localStorage) | ✅ `src/services/localDb.ts` |
| Tipagem IPC (`ElectronAPI`, `ActivityData`, etc.) | ✅ `src/vite-env.d.ts` |
| Rotas React Router 7 | ✅ 6 rotas definidas |
| Entidades Report e ActivityReport | ✅ Definidas mas **não utilizadas** |
| Entidade Alert | ✅ Definida, relacionada a UserProfile, mas **sem lógica de notificação** |

---

## 3. O que falta implementar

### 3.1 Pendências das Fases 1–2 (débito técnico)

| # | Item | Fase | Prioridade | Complexidade | Notas |
|---|------|------|------------|--------------|-------|
| P1 | Drag & drop para reordenar atividades | 2.1 | Média | Média | Backend pronto (`db:reorderActivities`), falta UI com lib de DnD |
| P2 | Compatibilidade tray macOS/Linux | 2.3.1 | Baixa | Baixa | Ícones e comportamento específico por plataforma |
| P3 | Autostart com o SO | 2.3.1 | Baixa | Baixa | `app.setLoginItemSettings()` no Electron |

---

### 3.2 Fase 2.5+ — Ajustes no modelo de dados para geração de relatório

Antes de implementar a geração DOCX, o modelo de dados precisa de ajustes conforme documentado em `docs/plan-docx-generator/`:

| # | Item | Descrição |
|---|------|-----------|
| D1 | Campo `project_scope` na entidade Activity | Agrupamento por projeto/squad para o Encarte A do relatório. Texto livre (opção pragmática). |
| D2 | Campo `sort_index` na entidade Evidence | Ordenação explícita para reorganização de evidências por drag & drop. |
| D3 | Template DOCX base | Arquivo `RELATÓRIO DE SERVIÇO - TEMPLATE.docx` acessível no app. |

---

### 3.3 Fase 3: O Motor de Relatório (DOCX)

> **Decisão técnica**: Gerar DOCX (não PDF direto) a partir de template OpenXML, conforme planejamento em `docs/plan-docx-generator/`. Evita dependência do Puppeteer e preserva o layout institucional MEC.

Incluir o template DOCX base no diretório `assets/` do projeto, acessível via `app.getAppPath()`. O template deve conter placeholders para substituição e estrutura pré-definida para os encartes.

**Stack da geração DOCX:**
- `jszip` — abrir/reempacotar o `.docx`
- `@xmldom/xmldom` — parse e manipulação XML
- `xpath` — localizar tabelas, linhas e parágrafos

#### Sub-fase 3.1: Infraestrutura do gerador

- [ ] Instalar dependências: `jszip`, `@xmldom/xmldom`, `xpath`
- [ ] Criar módulo `electron/report-export/` com a arquitetura proposta
- [ ] `docx-template-loader.ts` — carrega template base sem sobrescrever
- [ ] `build-report-export-payload.ts` — monta DTO com perfil, atividades agrupadas por projeto, evidências ordenadas
- [ ] `validate-report-export.ts` — valida campos obrigatórios e existência física de evidências

#### Sub-fase 3.2: Campos simples e capa

- [ ] Substituir placeholders simples da capa: `{{full_name}}`, `{{role}}`, `{{seniority_level}}`, `{{contract_number}}`, `{{month_reference}}`, checkboxes de atendimento, etc.
- [ ] Preencher dados do profissional e informações básicas

#### Sub-fase 3.3: Encarte A — Tabela de atividades

- [ ] Clonar tabela do Encarte A por projeto (`{{project_scope}}`)
- [ ] Clonar linha-modelo de atividade por item dentro de cada tabela
- [ ] Preencher: `{{activity_order}}`, `{{activity_description}}`, `{{activity_date_start}}`, `{{activity_date_end}}`, `{{activity_status}}`, `{{activity_reference}}`
- [ ] Ordenar atividades pelo campo `order`

#### Sub-fase 3.4: Encarte B — Evidências

- [ ] Inserir páginas de evidência a partir da âncora `{{evidence_pages}}`
- [ ] Uma evidência por página com quebra de página
- [ ] Inserir imagem com proporção adequada
- [ ] Inserir legenda abaixo da imagem
- [ ] Criar bookmark único por página de evidência (`evidence_activityX_N`)

#### Sub-fase 3.5: Referências cruzadas

- [ ] Criar campos `PAGEREF` apontando para bookmarks das evidências
- [ ] Preencher coluna Referência no formato "Páginas x, y e z"
- [ ] Template configurado com `updateFields=true`

#### Sub-fase 3.6: Fluxo de exportação

- [ ] Modal de confirmação do mês antes de gerar
- [ ] Diálogo nativo para escolher local de salvamento
- [ ] Nomenclatura: `RELATÓRIO DE SERVIÇO - <CARGO>_<NOME>_<MÊS>.pdf`
  - Tudo maiúsculo, sem acentos, espaços substituídos por `_`
- [ ] Opção de abrir pasta ou abrir arquivo após geração
- [ ] IPC handler `db:generateReport` ou `app:generateDocx`
- [ ] Registrar relatório na entidade Report (status: Gerado/Falha)
- [ ] Registrar atividades incluídas na entidade ActivityReport

#### Sub-fase 3.7: Histórico de relatórios

- [ ] Tela de histórico de relatórios gerados
- [ ] Exibir: nome, mês, data de geração, status
- [ ] Abrir arquivo / abrir pasta
- [ ] Lógica de substituição: novo relatório do mesmo mês marca anterior como "Excluído"

#### Sub-fase 3.8: Preview (pós-MVP)

- [ ] Preview do relatório antes de salvar (pode ser adiado)
- [ ] Alternativa: abrir diretamente no Word/LibreOffice para revisão

---

### 3.4 Fase 4: Sistema de Alertas

> Entidade `Alert` já existe no banco, associada 1:1 com `UserProfile`. Falta toda a lógica de notificação.

- [ ] Serviço de agendamento de alertas no main process (timer/scheduler)
- [ ] Lógica de frequência: 5 dias antes (2x/dia), 3 dias (3x), 2 dias (4x), 1 dia (5x), último dia (6x)
- [ ] Notificação nativa do SO (`Notification` API do Electron)
- [ ] Atualização do ícone do tray conforme status (verde/amarelo/vermelho)
- [ ] Som de alerta configurável (14 sons em `sfx/`)
- [ ] Tela de configuração de alertas no perfil
- [ ] Toggle habilitar/desabilitar alertas
- [ ] Registro de `last_alert_sent` para evitar duplicatas
- [ ] Impedir geração de relatório se houver atividades incompletas (já parcialmente implementado via validação)

---

## 3. Ordem de execução recomendada

```text
┌─────────────────────────────────────────────────────────────────┐
│  PRÓXIMOS PASSOS (ordem sugerida)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Ajustes no modelo de dados (D1, D2)          ← rápido       │
│     • project_scope em Activity                                 │
│     • sort_index em Evidence                                    │
│                                                                 │
│  2. Débito técnico prioritário (P1)              ← médio        │
│     • Drag & drop reorder na listagem                           │
│                                                                 │
│  3. Fase 3: Motor DOCX                          ← complexo      │
│     • 3.1 Infraestrutura do gerador                             │
│     • 3.2 Campos simples e capa                                 │
│     • 3.3 Encarte A (tabela de atividades)                      │
│     • 3.4 Encarte B (evidências)                                │
│     • 3.5 Referências cruzadas (PAGEREF)                        │
│     • 3.6 Fluxo de exportação (modal, IPC, save)                │
│     • 3.7 Histórico de relatórios                               │
│                                                                 │
│  4. Fase 4: Sistema de alertas                   ← médio        │
│     • Scheduler + notificações + tray status                    │
│                                                                 │
│  5. Fase 5: Polimento e distribuição             ← variável     │
│     • Lixeira, migrations, electron-builder                     │
│     • Testes, empacotamento, release                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
---

## 4. Depois de tudo desenvolvido: 

### Fase 5: Polimento e Distribuição

#### 1 — Robustez

- [ ] Lixeira de evidências (reter 3 meses antes de excluir permanentemente)
- [ ] Validação de margens e quebras de tabela no DOCX
- [ ] Tratamento de erros robusto no gerador DOCX
- [ ] Migração de banco (substituir `synchronize: true` por migrations para produção)

#### 2 — Configurações adicionais

- [ ] Configuração do diretório de armazenamento de evidências (perguntar na instalação)
- [ ] Autostart com o SO (`app.setLoginItemSettings()`)
- [ ] Compatibilidade multiplataforma do tray (macOS/Linux)

#### 3 — Empacotamento

- [ ] Configuração do `electron-builder`
  - [ ] `.exe` (Windows 10/11) — NSIS installer
  - [ ] `.dmg` (macOS)
  - [ ] `.AppImage` (Linux)
- [ ] Ícones configurados para cada plataforma (app, instalador, tray)
- [ ] Assinatura de código (opcional, recomendado para distribuição)

#### 4 — Qualidade

- [ ] Testes unitários para validação e gerador DOCX
- [ ] Testes E2E com Playwright/Spectron
- [ ] Changelog e release notes
- [ ] README atualizado com instruções de uso

---

## 5. Referências

| Documento | Caminho |
|-----------|---------|
| Plano original | `docs/plan-shipit01.prompt.md` |
| Roadmap de tarefas | `docs/TODO.md` |
| Planejamento DOCX | `docs/plan-docx-generator/planejamento-funcionalidade-docx.md` |
| Mapa do template DOCX | `docs/plan-docx-generator/docx-template-map.md` |
| Dependências | `docs/DEPENDENCIES.md` |
| Instruções do projeto | `.github/copilot-instructions.md` |
