# 🚀 ShipIt! — Plano de Continuidade (v2)

> Criado em: 08/04/2026
>
> Este documento é a continuação do [plan-shipit01.prompt.md](plan-shipit01.prompt.md).
> Consolida o que já foi implementado e detalha o que falta para concluir o projeto.

---

## 1. Resumo do Estado Atual

O ShipIt! já é um aplicativo funcional. As fases 1, 2 e 3 do plano original foram concluídas com sucesso. O app possui:

- Perfil de usuário completo com todos os campos do MEC
- CRUD de atividades com auto-save (debounce 2s)
- Upload de evidências (drag & drop, clipboard, seleção de arquivos)
- Geração de relatório DOCX com Encartes A e B (template OpenXML via JSZip + xmldom)
- Dashboard com cards de resumo, gráfico de Gantt, listagem de atividades e histórico de relatórios
- System Tray com menu de contexto e ícones de status (verde/amarelo/vermelho)
- Tema claro/escuro com persistência
- Configurações: diretório de relatórios, som de notificação, auto-launch
- Validação de campos obrigatórios para geração do relatório
- Protocolo seguro `shipit-evidence://` para servir imagens

---

## 2. Inventário: O Que Já Foi Implementado

### Fase 1: Fundação ✅

| Item | Status |
|------|--------|
| Electron + React + Vite + TypeScript | ✅ |
| SQLite (TypeORM + better-sqlite3) | ✅ |
| Entidades: UserProfile, Alert, Activity, Evidence, Report, ActivityReport | ✅ |
| Empty State + Criar Perfil | ✅ |
| Tela de Configurações Iniciais (Perfil) | ✅ |
| IPC handlers (`db:`, `app:`) com preload bridge | ✅ |
| Tailwind v4 com brand colors (light + dark) | ✅ |
| Font Awesome 7 self-hosted | ✅ |
| Dark/Light mode com ThemeContext e persistência | ✅ |

### Fase 2: Fluxo de Registro ✅

| Item | Status |
|------|--------|
| Formulário de Nova Atividade (todos os campos) | ✅ |
| Upload de evidências (arquivo, drag & drop, clipboard) | ✅ |
| Cópia automática para diretório interno | ✅ |
| Legendas por evidência | ✅ |
| Listagem de atividades por mês | ✅ |
| Editar/excluir atividades | ✅ |
| Tela de detalhes da atividade | ✅ |
| Validação de campos obrigatórios | ✅ |
| Ícone de alerta em atividades incompletas | ✅ |
| System Tray com ícone e menu de contexto | ✅ |
| Ícones de status no tray (verde, amarelo, vermelho) | ✅ |
| Auto-save com indicador visual | ✅ |
| Dashboard com resumo mensal, Gantt e listagem | ✅ |
| Botão Gerar DOCX no Dashboard | ✅ |
| Seletor de mês/ano com navegação | ✅ |

### Fase 3: Motor de Relatório DOCX ✅

| Item | Status |
|------|--------|
| Template OpenXML com JSZip + xmldom | ✅ |
| Encarte A: tabela de atividades agrupadas por escopo | ✅ |
| Encarte B: uma evidência por página com legenda | ✅ |
| Referências de páginas (PAGEREF/bookmarks) | ✅ |
| Nomenclatura padrão MEC | ✅ |
| Histórico de relatórios gerados | ✅ |
| Status do relatório (Gerado, Falha, Excluído) | ✅ |
| Abrir relatório na pasta | ✅ |

### Fase 4: Configurações (Parcial)

| Item | Status |
|------|--------|
| Tela de perfil do usuário | ✅ |
| Separação perfil vs. configurações do app | ✅ |
| Tema (dark/light) na tela de Configurações | ✅ |
| Som de notificação (seletor + preview) | ✅ |
| Auto-launch (iniciar com o sistema) | ✅ |
| Diretório de relatórios (escolha + default) | ✅ |
| Seção "Sobre" com versão e stack | ✅ |

### Infraestrutura

| Item | Status |
|------|--------|
| electron-builder (.exe Windows) | ✅ |
| Ícones configurados (favicon, tray, instalador) | ✅ |
| Protocolo `shipit-evidence://` | ✅ |
| Protocolo `shipit-sfx://` | ✅ |
| Browser fallback (localStorage via localDb) | ✅ Parcial |

---

## 3. O Que Falta Implementar

### 3.0 Ajustes no DOCX

**Prioridade:** Altíssima
**Complexidade:** Média

A data que aparece na capa do relatório é a data de geração, mas deveria ser o ultimo dia útil do mês (ex.: 31/03/2026) do mês/ano do relatório. Ajustar o template para refletir isso.

### 3.1 Pendências de UX e Interação

#### 3.1.1 Drag & Drop para Reordenar Atividades

**Prioridade:** Média
**Complexidade:** Média

A infraestrutura já existe (campo `order` na entidade, IPC `db:reorderActivities`, função no banco). Falta a implementação da UI.

**Escopo:**
- Implementar sortable list na `ActivitiesPage` com drag handles
- Chamar `db:reorderActivities` ao soltar o item
- Atualizar o estado local para refletir a nova ordem
- Manter a ordem persistida ao trocar de mês e voltar

**Sugestão:** Usar uma lib leve como `@dnd-kit/core` + `@dnd-kit/sortable` ou implementar com HTML5 Drag API nativa.

#### 3.1.2 Drag & Drop de Evidências na Tela de Detalhes

**Prioridade:** Baixa
**Complexidade:** Média

Atualmente, evidências só podem ser adicionadas via `EvidenceUpload` no formulário de edição. Permitir drag & drop diretamente na tela de detalhes (`ActivityDetailPage`) tornaria o fluxo mais ágil.

**Escopo:**
- Zona de drop na `ActivityDetailPage` para adicionar novas evidências
- Reordenar evidências existentes via drag & drop (campo `sort_index` já existe)
- Salvar nova ordem via IPC

---

### 3.2 Sistema de Alertas e Notificações

**Prioridade:** Alta
**Complexidade:** Alta

A entidade `Alert` já existe no banco com todos os campos (dias antes, frequência, horário, mensagem, som). O que falta é toda a lógica de disparo e a UI de configuração.

#### 3.2.1 Motor de Alertas no Main Process

**Escopo:**
- Criar scheduler no `electron/main.ts` que roda a cada minuto (ou a cada 5 min) verificando:
  - Quantos dias faltam para o fim do mês corrente
  - Se o dia atual está na lista `alert_days_before`
  - Se o número de alertas enviados hoje é menor que a `alert_frequency` correspondente
  - Se o horário atual é compatível com `alert_time`
- Disparar `Notification` nativa do Electron com a `alert_message`
- Tocar som via `app:playSound` se `alert_sound_enabled === true`
- Atualizar `last_alert_sent` após cada disparo
- Atualizar ícone do tray (amarelo/vermelho) conforme proximidade do prazo (ficar piscando entre o default e o vermelho ou amarelo para chamar atenção)

#### 3.2.2 UI de Configuração de Alertas

**Escopo:**
- Adicionar seção "Notificações" na `SettingsPage`:
  - Toggle habilitar/desabilitar alertas
  - Configurar dias de antecedência (multi-select ou input customizado)
  - Configurar frequência por faixa de dias
  - Campo de horário de início dos alertas
  - Campo de mensagem personalizada
  - Toggle som habilitado + seletor de som (já existe seletor, reaproveitar)
- Carregar/salvar configurações via relação `UserProfile → Alert`

#### 3.2.3 Verificação Inteligente do Tray

**Escopo:**
- Ao iniciar o app e periodicamente, verificar:
  - Se há atividades incompletas no mês atual → tray amarelo
  - Se estamos nos últimos 3 dias do mês e há atividades incompletas → tray vermelho
  - Se tudo está ok → tray verde (ou default)
- O handler `app:setTrayStatus` já existe, precisa ser chamado automaticamente

---

### 3.3 Melhorias na Navegação e Menus

**Prioridade:** Média
**Complexidade:** Baixa

#### 3.3.1 Seção "Sobre" no Menu da Aplicação

A seção "Sobre" atualmente está na `SettingsPage`. Conforme o TODO, deve ficar acessível via menu da barra de título (menubar do Electron), não na tela de configurações.

**Escopo:**
- Criar menu nativo do Electron (ou menu customizado no header) com item "Sobre o ShipIt!"
- Abrir modal ou janela com informações do app (nome, versão, stack, licença, créditos)
- Remover a seção "Sobre" da `SettingsPage` (ou manter como duplicata, mas a entrada principal deve ser pelo menu)

#### 3.3.2 Ajustar Menus para Novas Funcionalidades

**Escopo:**
- Revisar navegação do Header para incluir links diretos: Dashboard, Atividades, Perfil, Configurações
- Avaliar se o Header precisa de breadcrumbs ou indicador de página atual
- Sincronizar menu do tray com rotas disponíveis

---

### 3.4 Configurações Pendentes

**Prioridade:** Baixa
**Complexidade:** Baixa-Média

#### 3.4.1 Diretório de Armazenamento de Dados

O app usa `userData/` como base. Permitir que o usuário escolha outro diretório é complexo (migração de banco + evidências).

**Escopo (se implementar):**
- Seletor de diretório na `SettingsPage`
- Lógica de migração: copiar `shipit.db` e pasta `evidences/` para novo local
- Atualizar paths no main process
- Restart do app após migração

**Recomendação:** Avaliar se vale a complexidade. A maioria dos usuários não precisa disso. Pode ficar como "futuro".

#### 3.4.2 Opções de Notificação Detalhadas

Além do sistema de alertas (3.2), permitir configurações granulares:
- Notificação nativa do SO vs. notificação in-app
- Som ligado/desligado por tipo de notificação

---

### 3.5 Compatibilidade Multiplataforma

**Prioridade:** Baixa (se somente Windows é usado)
**Complexidade:** Média

#### 3.5.1 System Tray: macOS e Linux

**Escopo:**
- **macOS:** Ícone de tray precisa ser template image (`Template` suffix) com 22x22 pontos
- **Linux:** Testar com AppIndicator; algumas distros não suportam tray nativo
- Ajustar comportamento de clique (macOS: clique duplo para abrir, Linux: clique único)

#### 3.5.2 Builds para Outras Plataformas

**Escopo:**
- Configurar electron-builder para `.dmg` (macOS) e `.AppImage` (Linux)
- Testar auto-launch em cada plataforma
- Validar paths de evidências e relatórios em cada SO

---

### 3.6 Polimento e Qualidade

**Prioridade:** Média-Alta
**Complexidade:** Variada

#### 3.6.1 Validação de Margens e Quebras no DOCX

O DOCX gerado pode ter problemas com tabelas que quebram entre páginas ou imagens que excedem margens.

**Escopo:**
- Testar com relatórios de 20+ atividades e 50+ evidências
- Ajustar XML do template para forçar `keepNext` em linhas de tabela
- Validar dimensões de imagem em formatos variados (landscape, portrait, quadrado)
- Testar abertura em Word, LibreOffice e Google Docs

#### 3.6.2 Lixeira de Evidências

**Escopo:**
- Ao excluir evidência, mover arquivo para pasta `userData/trash/` em vez de deletar
- Campo `deleted_at` na entidade Evidence (soft delete)
- Limpeza automática: remover arquivos com mais de 3 meses na trash
- UI: seção na `SettingsPage` ou página dedicada para visualizar e restaurar itens da lixeira

#### 3.6.3 Testes

**Escopo:**
- Testes unitários para `validation.ts`
- Testes para `report-generator.ts` (geração DOCX com dados mock)
- Testes de integração para IPC handlers
- Testes E2E básicos com Playwright ou Spectron

---

## 4. Plano de Fases de Continuidade

### Fase 5: Alertas e Notificações 🔔

**Objetivo:** Implementar o sistema de alertas que avisa o usuário sobre prazos do relatório mensal.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 5.1 | Criar scheduler de alertas no main process | Alta |
| 5.2 | Integrar com Notification API nativa do Electron | Média |
| 5.3 | Atualizar ícone do tray automaticamente (verde/amarelo/vermelho) | Baixa |
| 5.4 | Seção de configuração de alertas na SettingsPage | Média |
| 5.5 | Testes do scheduler com diferentes cenários de data | Média |

### Fase 6: Reordenação e Drag & Drop 🖱️

**Objetivo:** Completar todas as interações de drag & drop pendentes.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 6.1 | Implementar drag & drop para reordenar atividades na listagem | Média |
| 6.2 | Implementar reordenação de evidências (sort_index) | Média |
| 6.3 | Adicionar zona de drop na tela de detalhes da atividade | Baixa |

### Fase 7: Menus e Navegação 🧭

**Objetivo:** Ajustar a estrutura de menus e navegação do app.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 7.1 | Mover "Sobre" para menu da aplicação (menubar ou modal no header) | Baixa |
| 7.2 | Revisar Header com links de navegação diretos | Baixa |
| 7.3 | Sincronizar navegação do tray com rotas do app | Baixa |

### Fase 8: Polimento 🔧

**Objetivo:** Qualidade, resiliência e acabamento.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 8.1 | Validar DOCX com tabelas longas e muitas evidências | Média |
| 8.2 | Implementar lixeira de evidências (soft delete + 3 meses) | Média |
| 8.3 | Escrever testes unitários (validation, report-generator) | Média |
| 8.4 | Testes de integração para IPC handlers | Alta |
| 8.5 | Revisão geral de UI (responsividade, feedback visual, acessibilidade) | Média |

### Fase 9: Distribuição Multiplataforma 📦

**Objetivo:** Gerar builds para macOS e Linux.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 9.1 | Ajustar ícones de tray para macOS (template images) | Baixa |
| 9.2 | Configurar electron-builder para .dmg (macOS) | Média |
| 9.3 | Configurar electron-builder para .AppImage (Linux) | Média |
| 9.4 | Testar auto-launch e paths em cada plataforma | Média |
| 9.5 | Testes finais e empacotamento de release | Alta |

---

## 5. Priorização Sugerida

Ordem recomendada de execução, considerando valor para o usuário:

```
1. Fase 5  — Alertas (funcionalidade core que faltou)
2. Fase 7  — Menus (ajustes rápidos, baixo risco)
3. Fase 6  — Drag & Drop (melhoria de UX)
4. Fase 8  — Polimento (qualidade antes de distribuir)
5. Fase 9  — Distribuição (só após tudo estar polido)
```

---

## 6. Decisões em Aberto

| Questão | Opções | Recomendação |
|---------|--------|-------------|
| Diretório customizado de dados | Implementar agora vs. futuro | Deixar para futuro — complexidade alta, valor baixo |
| Lib de drag & drop | `@dnd-kit` vs. HTML5 nativo vs. `react-beautiful-dnd` | `@dnd-kit` — mais moderno, mantido, bom com React 19 |
| "Sobre" — onde colocar | Menubar Electron nativo vs. modal no Header | Modal no Header — mais consistente com o design atual |
| Testes — framework | Vitest vs. Jest vs. Node test runner | Vitest — já integrado com Vite, zero config extra |
| Formato do relatório | Manter só DOCX vs. adicionar PDF (Puppeteer) | Manter DOCX — atende o requisito, PDF pode vir depois |

---

## 7. Referências

- [plan-shipit01.prompt.md](plan-shipit01.prompt.md) — Plano original completo
- [TODO.md](TODO.md) — Roadmap com checklist de tarefas
- [ARCHITECTURE.md](ARCHITECTURE.md) — Arquitetura do projeto
- [DEPENDENCIES.md](DEPENDENCIES.md) — Auditoria de dependências
- [plan-docx-generator/](plan-docx-generator/) — Plano de geração DOCX (concluído)
