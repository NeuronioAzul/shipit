# 🚀 ShipIt! — Plano de Continuidade (v4)

> Criado em: 09/04/2026
>
> Este documento é a continuação do [plan-shipit03.prompt.md](plan-shipit03.prompt.md).
> Consolida o que foi implementado desde a v3 e detalha o que falta para finalizar o projeto.

---

## 1. Resumo do Estado Atual

O ShipIt! está funcional e quase completo. Todas as funcionalidades core estão implementadas, incluindo itens que estavam listados como pendentes no plan-shipit03 mas que já foram concluídos no código.

### Itens que estavam pendentes na v3 e já foram implementados

| Item | Evidência no código |
|------|---------------------|
| UI da Lixeira de Evidências | `TrashPage.tsx` completo — grid com thumbnails, restaurar, excluir permanente, esvaziar lixeira, skeleton loader, countdown de dias restantes |
| Rota `/trash` registrada | `App.tsx` contém `<Route path="/trash" element={<TrashPage />} />` |
| Badge de contagem na navegação | `ActivityBar.tsx` mostra quantidade de itens na lixeira com badge laranja (cap 99+) |
| Skeleton loaders | `Skeleton.tsx` com 6 variantes (Card, TableRow, ActivityItem, Stats, EvidenceGrid, base) |
| Toast notifications | Sonner integrada — `toast.success()`, `toast.error()` usados nas pages |
| TitleBar sem bordas (VSCode-style) | `TitleBar.tsx` com botões minimize/maximize/close customizados |
| ActivityBar lateral (VSCode-style) | `ActivityBar.tsx` — sidebar 48px com ícones de nav, badge, about modal |

### O que ainda falta

- **Testes automatizados** — apenas `validation.test.ts` (15 testes) existe; faltam testes do report-generator, integração do database e E2E
- **Revisão de UI/UX** — acessibilidade (WCAG AA), paleta de cores, responsividade, consistência visual
- **Distribuição multiplataforma** — builds macOS e Linux, ajustes de tray cross-platform

---

## 2. Inventário: O Que Foi Implementado (Sessão v3)

### Fase 8.5 — Lixeira UI ✅

| Item | Status |
|------|--------|
| `TrashPage.tsx` com listagem de evidências deletadas (grid + thumbnails) | ✅ |
| Botão "Restaurar" por item → `db:restoreEvidence` | ✅ |
| Botão "Excluir permanentemente" por item → confirmação + `db:permanentlyDeleteEvidence` | ✅ |
| Botão "Esvaziar lixeira" com confirmação | ✅ |
| Indicador de dias restantes até limpeza automática (3 meses) | ✅ |
| Badge na navegação (ActivityBar) com quantidade de itens | ✅ |
| Skeleton loader durante carregamento | ✅ |
| Evento `shipit:trash-changed` para sincronização entre componentes | ✅ |

### Feedback Visual (Parcial) ✅

| Item | Status |
|------|--------|
| Skeleton loaders (6 variantes) | ✅ |
| Toast notifications via Sonner | ✅ |
| TitleBar customizada sem bordas | ✅ |
| ActivityBar lateral VSCode-style | ✅ |

---

## 3. O Que Falta Implementar

### 3.1 Testes Automatizados

**Prioridade:** Alta
**Justificativa:** Testes protegem contra regressões durante as refatorações visuais da Fase 11.

#### 3.1.1 Testes do `getLastBusinessDay()`

**Complexidade:** Baixa

A função está na linha ~50 de `electron/report-generator.ts` como função privada:

```typescript
function getLastBusinessDay(month: number, year: number): Date {
  const lastDay = new Date(year, month, 0)
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1)
  }
  return lastDay
}
```

**O que fazer:**
- Exportar `getLastBusinessDay()` de `report-generator.ts`
- Criar `electron/report-generator.test.ts`
- Testar: mês terminando em sábado (ex: jan 2026), domingo, sexta-feira, dia útil normal
- Testar: fevereiro em ano bissexto vs ano normal
- Padrão: `describe/it/expect` igual a `validation.test.ts`

#### 3.1.2 Testes do Report Generator com Payload Mock

**Complexidade:** Alta

**O que fazer:**
- Criar fixture: copiar o template DOCX real para `__fixtures__/`
- Testar geração com 1 atividade + 1 evidência → DOCX gerado sem erro
- Validar que `document.xml` dentro do ZIP contém placeholders substituídos
- Testar nomenclatura do arquivo gerado segue padrão MEC
- Testar imagens em diferentes formatos (png, jpg, gif, bmp, webp)

**Dependência:** Refatorar minimamente `generateDocxReport()` para aceitar `templatePath` como parâmetro (permitir injeção do template nos testes).

#### 3.1.3 Testes de Integração do Database

**Complexidade:** Alta

**O que fazer:**
- Criar `electron/database.test.ts`
- Inicializar TypeORM DataSource com SQLite `:memory:`
- Testar CRUD: `saveActivity`, `getActivities`, `deleteActivity`
- Testar evidências: `saveEvidence`, `deleteEvidence` (soft delete)
- Testar lixeira: `getDeletedEvidences`, `restoreEvidence`, `permanentlyDeleteEvidence`
- Testar alertas: `getAlert`, `saveAlert`
- Testar diretamente as funções exportadas de `database.ts` (sem mock de IPC)

**Dependência:** Refatorar `getDb()` para aceitar `DataSourceOptions` como parâmetro opcional, permitindo inicialização com `:memory:` nos testes.

#### 3.1.4 Setup Playwright + Testes E2E

**Complexidade:** Alta

**O que fazer:**
- Instalar `@playwright/test` com suporte a Electron (`_electron.launch()`)
- Configurar `playwright.config.ts`
- Fluxo E2E: criar perfil → criar atividade → adicionar evidência → gerar relatório
- Testar navegação entre páginas
- Testar toggle dark/light

**Dependência:** Deve ser feito após a UI estar estável (após Fase 11.1-11.4), para evitar testes quebrando por mudanças visuais.

---

### 3.2 Revisão de UI/UX

**Prioridade:** Alta (paleta + acessibilidade), Média (responsividade + consistência), Baixa (animações)

#### 3.2.1 Nova Paleta de Cores WCAG AA

**Complexidade:** Média

Na pasta `docs\new-ui-ux-visual` tem uma Sugestão de paleta de cores, faça uma análise para saber se atende aos requisitos de contraste WCAG AA.

Antes de aplicar a nova paleta, crie um arquivo html simples, com os componentes mais usados para que eu possa olhar e verificar se gostei e testar os tokens de cor com o WebAIM Contrast Checker.

**O que fazer:**
- Derivar paleta light + dark garantindo contraste mínimo 4.5:1 (AA) para texto normal e 3:1 para texto grande
- Verificar com WebAIM Contrast Checker
- Criar `docs/new-ui-ux-visual/palette-test.html` com exemplos de componentes (cards, botões, texto) usando os tokens de cor atuais para validar visualmente a nova paleta

**Tokens a revisar (possíveis falhas de contraste):**

| Token | Valor light | Sobre | Possível problema |
|-------|------------|-------|-------------------|
| `--muted-foreground` | `hsl(215 14% 45%)` | `--background` `hsl(210 20% 98%)` | Ratio pode ser < 4.5:1 |
| `--warning` | `hsl(48 100% 50%)` | qualquer background | Amarelo puro falha AA para texto |
| `--accent` | `hsl(24 89% 54%)` | backgrounds escuros (dark mode) | Verificar ratio |

**Aguardar validação da paleta antes de aplicar as mudanças.**
- Atualizar variáveis em `src/index.css` sob `@theme inline`

#### 3.2.2 Acessibilidade

**Complexidade:** Média

**O que fazer:**
- `aria-label` em todos os botões de ícone sem texto visível (ActivityBar, TitleBar, drag handles)
- Labels `<label htmlFor>` associados a todos os inputs de formulário (ProfilePage, ActivityFormPage, SettingsPage)
- Focus ring visível em todos os elementos interativos (Tailwind `ring` / `focus-visible:ring`)
- Navegação por teclado: Tab order lógico, Enter/Space para ações, Escape para fechar modais
- `role` e `aria-*` atributos em componentes customizados (modais, dropdowns, drag & drop)

**Arquivos a auditar:** `ActivityBar.tsx`, `TitleBar.tsx`, `Header.tsx`, `ActivityFormPage.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx`, `DashboardPage.tsx`, `TrashPage.tsx`

#### 3.2.3 Responsividade (min 800×600)

**Complexidade:** Média

**O que fazer:**
- Definir `minWidth: 800` / `minHeight: 600` no `BrowserWindow` em `main.ts` (se não definido)
- Testar Gantt chart em 800×600 (já tem `overflow-x-auto` ✅)
- Verificar grids e formulários em janelas estreitas
- ActivityBar (48px fixo) + conteúdo: verificar que não espreme conteúdo
- TitleBar: botões de controle não devem sobrepor o logo em janelas pequenas

#### 3.2.4 Consistência Visual

**Complexidade:** Baixa

**O que fazer:**
- Verificar uso consistente de tokens de cor (`bg-primary`, `text-foreground`) — sem cores hardcoded (`bg-blue-500`, `text-gray-400`, etc.)
- Padronizar espaçamentos entre seções e cards (margins, paddings)
- Padronizar hierarquia tipográfica (h1, h2, h3, tamanhos de fonte)
- Verificar ícones Font Awesome para consistência de estilo (todos `fa-solid` ou mix intencional)

#### 3.2.5 Animações e Transições

**Complexidade:** Baixa

**O que fazer:**
- Se arrastar a imagem de evidência sem ser pela área de drag clicando e segurando o `#root > div > div.flex-1.flex.overflow-hidden > main > div > div.bg-card.border.border-border.rounded-lg.p-6.space-y-5 > div:nth-child(3) > div.grid.grid-cols-1.sm\:grid-cols-2.gap-4 > div > button.absolute.top-2.left-2.z-10.p-1\.5.rounded.bg-black\/50.text-white\/80.hover\:text-white.cursor-grab.active\:cursor-grabbing.opacity-0.group-hover\/ev\:opacity-100.transition-opacity.touch-none` não adicionar no drag and drop para criar nova imagem de evidência, adicionar uma animação de shake para indicar que o local correto é a área de drag (hover indicators + drop preview) 
- Transições de página (fade via React Router)
- Loading state com spinner nos botões de ação (Gerar Relatório, Salvar) — spinner + `disabled` state
- Animação mais suave no drag & drop (hover indicators, drop preview)

---

### 3.3 Nova Interface VSCode-inspired (Avaliar necessidade)

**Prioridade:** Média
**Complexidade:** Alta

**O que já existe:**
- `TitleBar.tsx` — barra de título sem bordas com botões minimize/maximize/close
- `ActivityBar.tsx` — sidebar lateral 48px com ícones, badge, about modal
- Dark theme com variáveis CSS

**O que avaliar:**
- A base VSCode-style já está implementada. Verificar se um redesign completo é necessário ou se refinamentos no que existe são suficientes
- Se avançar: refinar tipografia, spacing, micro-interactions, command palette
- Usar logo do foguete como ícone do aplicativo (verificar configuração no electron-builder)

**Recomendação:** Refinar o que existe em vez de reescrever. Concentrar esforço nas Fases 11.1-11.4.

---

### 3.4 Distribuição Multiplataforma

**Prioridade:** Baixa (app é primariamente Windows por enquanto)

#### 3.4.1 macOS
- Gerar `.dmg` via electron-builder
- Ajustar ícones de tray para macOS (template images — branco com transparência)
- Testar auto-launch e paths no macOS

#### 3.4.2 Linux
- Gerar `.AppImage` via electron-builder
- Testar tray icon (AppIndicator)
- Verificar paths e permissões

---

### 3.5 Atualização de Documentação

**Prioridade:** Baixa

- Atualizar `TODO.md`: marcar Fase 8.5 (Lixeira UI) como ✅, skeleton loaders como ✅, toast notifications como ✅
- Atualizar `CHANGELOG.md`: registrar implementações da Lixeira UI, TitleBar, ActivityBar
- Preparar release notes para v1.2.0

---

## 4. Plano de Fases

### Fase 10: Testes Automatizados 🧪

**Objetivo:** Garantir estabilidade antes de refatorações visuais.

| # | Tarefa | Complexidade | Dependência |
|---|--------|-------------|-------------|
| 10.1 | Exportar `getLastBusinessDay()` + testes unitários | Baixa | — |
| 10.2 | Testes do report-generator com payload mock + fixture DOCX | Alta | Refatorar `generateDocxReport()` para aceitar `templatePath` |
| 10.3 | Testes de integração do database (SQLite `:memory:`) | Alta | Refatorar `getDb()` para aceitar DataSourceOptions |
| 10.4 | Setup Playwright para testes E2E | Média | Após Fase 11 (UI estável) |
| 10.5 | Fluxo E2E: perfil → atividade → evidência → relatório | Alta | 10.4 |

**Paralelismo:** 10.1, 10.2 e 10.3 podem ser executados em paralelo.

---

### Fase 11: Revisão de UI/UX 🎨

**Objetivo:** Polir a interface com acessibilidade e consistência visual.

| # | Tarefa | Complexidade | Dependência |
|---|--------|-------------|-------------|
| 11.1 | Nova paleta de cores WCAG AA (light + dark) | Média | — |
| 11.2 | Acessibilidade (aria, labels, focus, keyboard nav) | Média | Junto com 11.1 |
| 11.3 | Responsividade (min 800×600) | Média | Após 11.1 (cores definidas) |
| 11.4 | Consistência visual (tokens, espaçamentos, tipografia) | Baixa | Após 11.1 |
| 11.5 | Animações e transições (page transitions, loading buttons) | Baixa | — |

**Paralelismo:** 11.1 + 11.2 juntos (cores afetam contraste). 11.3 + 11.4 em paralelo após cores. 11.5 independente.

---

### Fase 12: Distribuição Multiplataforma 📦

**Objetivo:** Preparar releases para macOS e Linux.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 12.1 | Build macOS (.dmg) + ajustes tray (template images) | Média |
| 12.2 | Build Linux (.AppImage) + ajustes tray (AppIndicator) | Média |
| 12.3 | Atualizar docs (TODO.md, CHANGELOG.md) + release notes v1.2.0 | Baixa |

---

## 5. Ordem de Execução Recomendada

```
1. Fase 10.1 + 10.2 + 10.3  — Testes report-generator + database (paralelos)
2. Fase 11.1 + 11.2          — Paleta WCAG AA + Acessibilidade (juntos)
3. Fase 11.3 + 11.4          — Responsividade + Consistência (paralelos)
4. Fase 11.5                  — Animações e transições
5. Fase 10.4 + 10.5           — E2E com Playwright (após UI estável)
6. Fase 12                    — Distribuição multiplataforma
7. Fase 12.3                  — Atualização de docs
```

**Estimativa de escopo total:** ~15 tarefas, sendo 5 de alta complexidade.

---

## 6. Critérios de Verificação

| Critério | Como verificar |
|----------|----------------|
| Testes passando | `npm test` — todos os testes (existentes + novos) |
| Contraste WCAG AA | WebAIM Contrast Checker — ratio ≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande |
| Acessibilidade | Navegar toda a app somente pelo teclado (Tab, Enter, Escape) |
| Responsividade | Redimensionar janela para 800×600 — nenhum conteúdo cortado ou sobreposto |
| Build | `npm run build` sem erros TypeScript |
| E2E | Fluxo completo: perfil → atividade → evidência → relatório → DOCX válido |

---

## 7. Decisões

| Questão | Decisão | Justificativa |
|---------|---------|---------------|
| Testes antes ou depois da UI? | Antes | Protegem contra regressões durante refatorações visuais |
| Nova interface completa (3.3.5 da v3)? | Refinar o existente | TitleBar + ActivityBar VSCode-style já implementados — não justifica reescrita |
| Template para testes DOCX | Copiar template real para `__fixtures__/` | Garante fidelidade; mini-template poderia mascarar bugs |
| Injeção de DataSource nos testes | Parâmetro opcional em `getDb()` | Mínima refatoração; permite `:memory:` sem mudar o fluxo principal |
| macOS/Linux builds agora? | Adiar | App é primariamente Windows; builds cross-platform são baixa prioridade |
| Lixeira UI: o que fazer nos docs? | Marcar como ✅ | Já está implementada e funcional no código |
