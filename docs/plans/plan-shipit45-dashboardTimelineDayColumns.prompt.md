## Plan: Divisões de dias na "Linha do Tempo" do Dashboard

Adicionar ao gráfico **Linha do Tempo** do Dashboard uma grade de dias: cada dia ganha uma coluna com cabeçalho centralizado (número do dia em cima, letra do dia da semana em pt-BR embaixo, sábado e domingo em cor de destaque), **linhas verticais** entre os dias quando a largura da trilha permitir, e **destaque sutil da coluna inteira** ao passar o mouse. O objetivo é permitir ler, de relance, quantos dias cada atividade levou.

A abordagem recomendada extrai o gráfico para um componente próprio (`TimelineChart`), move a matemática de dias para um util puro e testável (`timelineDays.ts`), corrige de tabela o desalinhamento entre cabeçalho e barras que existe hoje, e usa **container queries do Tailwind v4** para decidir a densidade (sem `ResizeObserver`, sem estado de largura). Nenhuma dependência nova.

### Contexto

- O gráfico vive inline em [DashboardPage.tsx](../../src/pages/DashboardPage.tsx) (linhas ~223–282): card `#dashboard-gantt` com `overflow-x-auto`, `div.min-w-150`, um cabeçalho `flex` com `paddingLeft: 140px` e células de largura `100/daysInMonth %`, mostrando o número só no dia 1 e nos múltiplos de 5; depois uma linha por atividade (`h-7`) com rótulo `w-35 shrink-0` (140px) + trilha `flex-1 relative h-5 bg-muted/30` onde a barra é posicionada em `%` da trilha. Barras coloridas por status (`bg-chart-2/3/4/5`), `title` nativo e clique para o detalhe.
- **Bug existente**: as células do cabeçalho são `%` da linha inteira (incluindo o gutter de 140px), enquanto as barras são `%` da trilha. Os números não batem com as barras, e qualquer linha divisória herdaria o erro.
- `daysInMonth` e `getActivityDays` (clamp ao mês) estão em [DashboardPage.tsx:111-126](../../src/pages/DashboardPage.tsx); `formatDate` local em 66–69. Helpers de mês em [monthReference.ts](../../src/utils/monthReference.ts) (`parseMonthReference` é privado, com fallback para o mês atual).
- Não há lib de gráfico nem de datas; nomes de dias da semana só existem em `DatePicker.tsx` (`['Dom','Seg',…]`, privado). Convenção de destaque de data no `DatePicker`: `text-accent` + `bg-accent/15` para "hoje"; preenchimentos discretos usam `bg-muted/30`, `hover:bg-surface-hover`.
- Janela do Electron: 1100×750 (mín. 800×600). Sidebar `w-12`, `#app-main` com `p-6`, card `p-4` → trilha ≈ 820px na largura padrão (~26px/dia em mês de 31 dias) e ≈ 520px no mínimo (~17px/dia).
- Testes: Vitest com `environment: 'node'`; testes de componente optam por jsdom com `// @vitest-environment jsdom` (ex.: [DeploymentPipeline.test.tsx](../../src/components/DeploymentPipeline.test.tsx)). Não existe teste do Dashboard. E2E em [e2e/app.spec.ts](../../e2e/app.spec.ts) sobe o Electron real; `createActivityRecord(desc, monthRef, overrides)` semeia via IPC (aceita `date_start`, `date_end`, `status`); `getUniqueMonthSequence` dá meses isolados; o Dashboard escolhe o mês pelo hash `#/?month=MM/YYYY`.

### Decisões de design

| Ponto | Decisão | Motivo |
|---|---|---|
| Densidade | `@container` na coluna da trilha + variantes `@min-[682px]:` (22px × 31 dias). Abaixo: modo **compacto** = sem linhas, sem letras, números só no dia 1 e múltiplos de 5 (como hoje). Sombreado de fim de semana e hover ficam nos dois modos. | Zero JS, sem re-render ao redimensionar, sem guarda para jsdom, sem flash no primeiro paint. Limiar fixo é levemente conservador em fevereiro (24px/dia no ponto de virada) — irrelevante. |
| Alinhamento | Duas colunas: gutter `w-35 shrink-0` (espaçador do cabeçalho + rótulos) e trilha `flex-1 min-w-0 relative @container` (cabeçalho + linhas). Cabeçalho, colunas de fundo e barras usam a mesma fórmula `100/n %`. | Corrige o bug por construção; camada de colunas pode ser `absolute inset-0` sem offset. |
| Fim de semana | Cabeçalho `text-accent font-medium`; coluna `bg-muted/40`. | Mesma convenção do "hoje" no DatePicker; o fundo neutro garante leitura em temas onde accent ≈ cinza (minimalist) e em dark/high-contrast. |
| Hover | Coluna `bg-primary/10`; cabeçalho `text-primary font-semibold`; `transition-colors duration-100`. Hover vence fim de semana. | Sutil mas distinto do fim de semana. |
| Linhas divisórias | `border-l border-border/60` só em modo completo e nunca no dia 1 (classe condicional, não `first:`). Cabeçalho com `border-b border-border`. | Evita ambiguidade de ordem de variantes com `@min-[…]:`. |
| Trilha por linha | Remover `bg-muted/30` (trilha transparente). Barras mantêm `rounded-sm`, `title`, clique e `opacity-80 hover:opacity-100`. | O preenchimento por linha ficaria acima da camada de colunas e mascararia o sombreado. |
| Onde fica | `src/components/TimelineChart.tsx` (props `activities`, `monthRef`, `onSelect`) + `src/utils/timelineDays.ts`. | `hoveredDay` isolado no componente não re-renderiza a página inteira (tabela, histórico). Permite teste jsdom. |
| Hover sem ref | `onMouseMove` na própria trilha: `getDayAtPointer(e.clientX - rect.left, rect.width, n)` com `rect = e.currentTarget.getBoundingClientRect()`; `setHoveredDay(prev => prev === day ? prev : day)`; `onMouseLeave` limpa. | Funciona sobre barra, trilha vazia ou cabeçalho; `clientX` e `rect` são relativos ao viewport, então o scroll horizontal cancela. |
| Tooltip da célula | `title` com data longa pt-BR (`sábado, 05/09`). | Custo zero, ajuda a leitura. Tooltip da barra passa a usar `htmlToPlainText` (hoje mostra HTML cru). |

Esboço da estrutura:

```
div.min-w-150.flex
├─ div.w-35.shrink-0                                   ← gutter: espaçador h-8 + rótulos h-7 (truncate, hover:text-primary, clique)
└─ div#dashboard-gantt-track.flex-1.min-w-0.relative.@container   (onMouseMove / onMouseLeave)
   ├─ div#dashboard-gantt-columns.absolute.inset-0.flex.pointer-events-none  aria-hidden
   │    └─ por dia: shrink-0 h-full  width:100/n%  data-day data-weekend data-hovered
   │         `${day > 1 ? '@min-[682px]:border-l' : ''} border-border/60`
   │         hovered → bg-primary/10 | weekend → bg-muted/40
   ├─ div#dashboard-gantt-header.relative.flex.h-8.border-b.border-border
   │    └─ por dia: flex-col items-center justify-end gap-0.5 pb-1 leading-none select-none  title={label}  data-*
   │         hovered → text-primary font-semibold | weekend → text-accent font-medium | text-muted-foreground
   │         <span text-[10px] {marco ? '' : 'invisible @min-[682px]:visible'}>{day}</span>
   │         <span text-[9px] data-role="weekday" 'hidden @min-[682px]:block'>{letra}</span>
   └─ por atividade: div.relative.h-7
        └─ barra absolute top-1.5 h-4 rounded-sm bg-chart-N opacity-80 hover:opacity-100 cursor-pointer
             data-activity-bar={id}  left/width em 100/n%  title  onClick
```

### Steps

**Fase 1 — Helpers puros**
1. Em [monthReference.ts](../../src/utils/monthReference.ts): exportar `parseMonthReference` (mesmo fallback para todos).
2. Criar [src/utils/timelineDays.ts](../../src/utils/timelineDays.ts): `WEEKDAY_LETTERS = ['D','S','T','Q','Q','S','S']`, `MIN_DAY_WIDTH_PX = 22`, `FULL_DENSITY_MIN_TRACK_PX = 682` (comentário: deve bater com `@min-[682px]` do componente); `getTimelineDays(monthRef)` → `{ day, weekday, letter, isWeekend, label }[]`; `getDayAtPointer(offsetX, trackWidth, n)` → 1..n ou `null`; `getActivityDays(activity, monthRef)` (lógica movida do Dashboard); `formatShortDate(d)` (o `formatDate` local movido). *depends on 1*
3. Criar [src/utils/timelineDays.test.ts](../../src/utils/timelineDays.test.ts) (node) — ver Verificação. *depends on 2*

**Fase 2 — Componente**
4. Criar [src/components/TimelineChart.tsx](../../src/components/TimelineChart.tsx) conforme o esboço; estado único `hoveredDay`; cores de barra por status como hoje; comentários em pt-BR, só tokens de tema. *depends on 2*
5. Criar [src/components/TimelineChart.test.tsx](../../src/components/TimelineChart.test.tsx) (`// @vitest-environment jsdom`, seguindo `DeploymentPipeline.test.tsx`). *depends on 4*

**Fase 3 — Integração**
6. Em [DashboardPage.tsx](../../src/pages/DashboardPage.tsx): remover `daysInMonth`, `getActivityDays`, `formatDate` e o corpo inline do gráfico; manter o card `#dashboard-gantt` + `<h2>` e renderizar `<TimelineChart activities={activities} monthRef={monthRef} onSelect={(id) => navigate(`/activities/${id}`)} />`; tabela passa a usar `formatShortDate`. *depends on 4*
7. `npm run test` e `npm run build`; conferir visualmente (`npm run dev`) em 1100px e 800px nos temas light, dark e high-contrast. *depends on 6*

**Fase 4 — E2E e docs**
8. Novo teste em [e2e/app.spec.ts](../../e2e/app.spec.ts) ("dashboard timeline renders day grid, weekday letters and column hover") — ver Verificação. Claude escreve **e executa** com `env -u ELECTRON_RUN_AS_NODE npx playwright test` após o build. *depends on 7*
9. Invocar a skill `shipit-release-and-doc-sync` (Doc Sync): CHANGELOG `[Unreleased]`, TODO/DONE com `> Plano:` apontando para este arquivo; ARCHITECTURE se o novo componente/util merecer menção. Sem `git commit` manual — entrega via `python docs/scripts/release_v2.py`. *depends on 8*

### Relevant files
- [src/pages/DashboardPage.tsx](../../src/pages/DashboardPage.tsx) — remove o gráfico inline, usa o componente.
- [src/components/TimelineChart.tsx](../../src/components/TimelineChart.tsx) (+ `.test.tsx`) — novo.
- [src/utils/timelineDays.ts](../../src/utils/timelineDays.ts) (+ `.test.ts`) — novo.
- [src/utils/monthReference.ts](../../src/utils/monthReference.ts) — exporta `parseMonthReference`.
- [e2e/app.spec.ts](../../e2e/app.spec.ts), [e2e/fixtures/activityFixtures.ts](../../e2e/fixtures/activityFixtures.ts) — cenário E2E.
- `src/components/DatePicker.tsx` — **não** mexer (labels de 3 letras, widget diferente).

### Gotchas
- **Alinhamento**: cabeçalho, colunas e barras devem usar a mesma fórmula `100/n %` (não `flex-1`, que distribui subpixels de forma diferente).
- **Ordem de variantes**: não usar `first:` combinado com `@min-[…]:`; a ausência de borda no dia 1 é classe condicional no JSX.
- **`min-w-0` na trilha**: sem ele o `flex-1` pode não encolher e a container query mede errado.
- **Scroll horizontal** do `overflow-x-auto`: `getBoundingClientRect()` e `clientX` são ambos do viewport — não somar `scrollLeft`.
- **Hover sobre o gutter** (rótulos) não destaca coluna — intencional.
- **Temas**: tudo via tokens com modificador de opacidade; fim de semana tem dois canais (fundo + cor/peso do texto) para o minimalist/high-contrast.
- **E2E**: testes anteriores podem deixar zoom ≠ 0 ou janela redimensionada — o teste fixa `setZoomLevel(0)` e `setSize(1280, 800)` e restaura no `finally`. `ELECTRON_RUN_AS_NODE` precisa ser removida do ambiente.
- **jsdom** não calcula layout: mockar `getBoundingClientRect` no teste de hover.

### Verificação
1. **Vitest** `timelineDays.test.ts`: contagem (02/2028 → 29, 02/2027 → 28, 10/2026 → 31); letras/fim de semana (01/10/2026 = quinta → `'Q'` não weekend; 03/10 → `'S'` weekend; 04/10 → `'D'` weekend; `label` contém "sábado"); `monthRef` inválido cai no mês atual; `getDayAtPointer` (0→1, 619.99/620→31, 310/620→16, negativo / ≥ width / width 0 → `null`); `getActivityDays` (início antes do mês → 1, fim depois → n, fora do mês → `null`, sem data → `null`, dia único); `FULL_DENSITY_MIN_TRACK_PX === 682`.
2. **Vitest** `TimelineChart.test.tsx`: n células e n colunas com `data-day`/`data-weekend` corretos para 02/2028; barra 05→09 em mês de 31 dias com `left: 12.903…%` e `width: 16.129…%`; atividade sem data não gera barra; hover com `getBoundingClientRect` mockado (`{ left: 0, width: 620 }`) + `mouseMove clientX=30` marca `data-hovered="true"` no dia 2 (coluna e cabeçalho) e `mouseLeave` limpa; clique na barra e no rótulo chama `onSelect(id)`.
3. `npm run build` verde.
4. **E2E**: mês isolado; seed 05→09 "Em andamento"; janela normalizada; navegar `#/?month=…`; `#dashboard-gantt-header [data-day]` = dias do mês; letra do dia 1 = `WEEKDAY_LETTERS[getDay()]`; nº de `[data-weekend="true"]` = fins de semana do mês; modo completo: `[data-day="2"] [data-role="weekday"]` visível; hover em `[data-day="7"]` do cabeçalho → coluna 7 com `data-hovered="true"`, mover para fora → `"false"`; `boundingBox` da `[data-activity-bar]`: `x` ≈ célula 5 e `x+width` ≈ fim da célula 9 (±1px); compacto (`setSize(800, 600)`): letra do dia 2 oculta, número do dia 5 visível.
5. Visual em light/dark/high-contrast a 1100px e 800px.
6. Doc Sync via skill; pronto para `release_v2.py`.

### Fora de escopo (considerações futuras)
- Marcador de "hoje" na coluna do dia atual.
- Tooltip rico (popover) nas barras em vez do `title` nativo.
- Zoom/pan ou trilha multi-mês.
