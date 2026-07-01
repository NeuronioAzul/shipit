## Plan: Ambiente da atividade (Desenvolvimento / Homologação / Produção)

Adicionar um seletor de **ambiente** — campo interno e opcional — acima da seção de Releases SVN no formulário de atividade, com três opções coloridas: **Desenvolvimento (verde)**, **Homologação (amarelo)** e **Produção (vermelho)**. O ambiente selecionado é exibido como uma _tag_ (pill colorida com ícone) na **lista de atividades** e na **visualização detalhada**, permitindo identificar rapidamente de qual ambiente é cada atividade.

A abordagem recomendada persiste o valor em uma coluna de texto nullable na entidade `Activity` (valores em pt-BR, como já ocorre com `status`/`attendance_type`), reutiliza o padrão de tokens de cor `chart-*` de [statusColors.ts](../../src/utils/statusColors.ts), e cria dois componentes pequenos e testáveis (seletor segmentado + badge). O campo **não é exportado no DOCX** (interno), igual a `svn_releases`.

### Contexto

Hoje a atividade guarda `status`, `attendance_type` e `svn_releases`, mas não há como marcar em qual ambiente a evidência/atividade se refere. O usuário quer marcar isso internamente e enxergar de relance na lista e no detalhe. Como `saveActivity` (tanto [electron/database.ts](../../electron/database.ts) via `Object.assign`/`repo.create` quanto [localDb.ts](../../src/services/localDb.ts) via spread) já propaga qualquer campo novo do payload, a persistência exige apenas: coluna na entidade + tipo + defaults do fallback + integração no formulário.

### Decisões de design

- **Modelo de dados:** novo campo `environment: ActivityEnvironment | null` na `Activity`. Enum de valores em pt-BR: `'Desenvolvimento' | 'Homologação' | 'Produção'`. Nullable — atividades legadas/sem marcação ficam `null` (o `synchronize: true` do TypeORM adiciona a coluna automaticamente).
- **Cores (reuso de tokens de tema, sem cores cruas):** mapear para os mesmos `chart-*` já usados em status —
  - Desenvolvimento → dsv → verde: `bg-chart-2/15 text-chart-2` (borda `border-chart-2/30`), ícone `fa-code`.
  - Homologação → hmg → amarelo: `bg-chart-4/15 text-chart-4` (`border-chart-4/30`), ícone `fa-vial`.
  - Produção → prd → vermelho: `bg-chart-5/15 text-chart-5` (`border-chart-5/30`), ícone `fa-rocket`.
- **Seletor segmentado** (não um `<select>`): três botões coloridos lado a lado; o selecionado fica "preenchido/realçado" e os demais em estado neutro (`bg-muted/…`, `text-muted-foreground`). Clicar no já selecionado **limpa** a seleção (campo opcional, sem opção "Nenhum" explícita). Colocado **acima** da seção `#activity-form-svn-releases-section`.
- **Badge reutilizável** para lista e detalhe (DRY), retornando `null` quando `environment` é vazio.
- **DOCX:** sem alteração no [report-generator.ts](../../electron/report-generator.ts) — campo interno, não exportado (mesmo tratamento de `svn_releases`).

### Steps

**Fase 1 — Contrato de dados e persistência (base)**
1. Adicionar `export type ActivityEnvironment = 'Desenvolvimento' | 'Homologação' | 'Produção'` e a coluna `@Column({ type: 'text', nullable: true }) environment!: ActivityEnvironment | null` em [electron/entities/Activity.ts](../../electron/entities/Activity.ts).
2. Estender `ActivityData` (e adicionar `ActivityEnvironment`) em [src/vite-env.d.ts](../../src/vite-env.d.ts) com `environment: ActivityEnvironment | null`.
3. Ajustar o fallback browser em [src/services/localDb.ts](../../src/services/localDb.ts): incluir `environment: null` no objeto default de `saveActivity` (preservação em edição já ocorre pelo spread). *parallel with 2*
4. Confirmar que `saveActivity` em [electron/database.ts](../../electron/database.ts) não precisa de mudança (o `Object.assign`/`repo.create` já cobre o novo campo).

**Fase 2 — Tokens de cor e componentes reutilizáveis**
5. Criar [src/utils/environmentColors.ts](../../src/utils/environmentColors.ts) espelhando `statusColors.ts`: `ENVIRONMENTS` (ordem Desenvolvimento→Homologação→Produção), `ENVIRONMENT_COLORS` (classes pill), `ENVIRONMENT_SELECTED_COLORS` (estado realçado do seletor) e `ENVIRONMENT_ICONS`.
6. Criar [src/utils/environmentColors.test.ts](../../src/utils/environmentColors.test.ts) — garante que todas as opções têm cor/ícone e a ordem esperada. *depends on 5*
7. Criar componente `EnvironmentBadge` em [src/components/EnvironmentBadge.tsx](../../src/components/EnvironmentBadge.tsx): props `{ environment: ActivityEnvironment | null; size?: 'sm' | 'md' }`; renderiza pill com ícone + rótulo usando os tokens; retorna `null` se vazio. *depends on 5*
8. Criar componente `EnvironmentSelector` em [src/components/EnvironmentSelector.tsx](../../src/components/EnvironmentSelector.tsx): props `{ value: ActivityEnvironment | ''; onChange: (v: ActivityEnvironment | '') => void }`; três botões coloridos; clique no selecionado limpa; acessível (`aria-pressed`, `type="button"`). *depends on 5*
9. Testes unitários dos componentes em `EnvironmentSelector.test.tsx` / `EnvironmentBadge.test.tsx` (seleção, toggle-off, render/omissão). *depends on 7, 8*

**Fase 3 — Integração no formulário**
10. Em [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx): adicionar `environment: ''` ao estado `ActivityForm`; incluir em `buildActivityPayload` (`environment: (nextForm.environment as ...) || null`), em `buildFormFingerprint` (para o auto-save detectar mudança) e no `loadedForm` de edição (`environment: activity.environment || ''`).
11. Renderizar o `EnvironmentSelector` num bloco novo **imediatamente acima** de `#activity-form-svn-releases-section`, com `label` ("Ambiente (uso interno)") e texto curto de ajuda ("Marcação interna — não incluída no relatório DOCX."). Ligar `onChange` ao `setForm` + `setAutoSaveStatus('idle')` (padrão dos outros campos). *depends on 8, 10*

**Fase 4 — Exibição da tag**
12. Lista: em [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx), renderizar `<EnvironmentBadge size="sm" environment={activity.environment} />` na linha do cabeçalho do card, junto ao badge de status (~L104–109). *depends on 7*
13. Detalhe: em [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx), renderizar `<EnvironmentBadge environment={activity.environment} />` na linha de status/período do `#activity-detail-info` (~L609–614). *depends on 7*
14. (Opcional) Incluir `environment` no filtro de texto local da lista e na busca — avaliar se agrega; se incluído, refletir em [electron/database.ts](../../electron/database.ts) `searchActivities`. Marcar como opcional.

**Fase 5 — Testes de integração e validação**
15. Expandir [electron/database.test.ts](../../electron/database.test.ts) cobrindo criar/editar atividade com `environment` (incluindo limpar para `null`).
16. Adicionar cenário E2E em [e2e/app.spec.ts](../../e2e/app.spec.ts): criar atividade, selecionar "Produção" no seletor, salvar, e conferir a tag colorida na lista e no detalhe; validar toggle-off. **Escrito pelo Claude; execução do Playwright é responsabilidade do usuário** (ver `e2e-test-ownership`).
17. Garantir não-regressão no DOCX: teste em [electron/report-generator.integration.test.ts](../../electron/report-generator.integration.test.ts) de que o valor de `environment` não aparece no `document.xml`.
18. Validação final: `npm run test` (Vitest) + `npm run build`; E2E rodado pelo usuário.

### Relevant files
- [electron/entities/Activity.ts](../../electron/entities/Activity.ts) — nova coluna `environment` + type `ActivityEnvironment`.
- [src/vite-env.d.ts](../../src/vite-env.d.ts) — estender `ActivityData` e exportar `ActivityEnvironment`.
- [src/services/localDb.ts](../../src/services/localDb.ts) — default do novo campo no fallback.
- [src/utils/environmentColors.ts](../../src/utils/environmentColors.ts) — tokens de cor/ícone e ordem (espelha `statusColors.ts`).
- [src/components/EnvironmentSelector.tsx](../../src/components/EnvironmentSelector.tsx) — seletor segmentado colorido (toggle-off).
- [src/components/EnvironmentBadge.tsx](../../src/components/EnvironmentBadge.tsx) — pill reutilizável para lista/detalhe.
- [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx) — estado/payload/fingerprint/load + bloco do seletor acima do SVN.
- [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx) — badge no card da lista.
- [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx) — badge no bloco de info.
- [electron/database.ts](../../electron/database.ts) — sem mudança na persistência; opcionalmente `environment` na busca.
- Testes: `environmentColors.test.ts`, `EnvironmentSelector.test.tsx`, `EnvironmentBadge.test.tsx`, `database.test.ts`, `report-generator.integration.test.ts`, `e2e/app.spec.ts`.

### Gotchas
- **`synchronize: true`**: a coluna nullable é criada automaticamente; linhas antigas ficam `null` (badge omitido). Nenhuma migração manual.
- **Acentos** em `'Homologação'`/`'Produção'`: valores literais de string — consistentes com `status` já acentuado; usar exatamente as mesmas strings em enum, tokens e UI.
- **Auto-save**: sem incluir `environment` no `buildFormFingerprint`, a mudança não dispararia o auto-save em modo edição.
- **Sem cores cruas**: usar somente tokens `chart-*`/`muted`/`border` (regra do projeto).
- **DOCX**: não mapear `environment` no report generator (campo interno).

### Verificação
1. `npm run dev`: criar atividade → selecionar cada ambiente (verde/amarelo/vermelho) acima do campo de releases; clicar no selecionado limpa.
2. Conferir a tag colorida na lista de atividades e no detalhe; editar e trocar/limpar o ambiente (auto-save reflete).
3. `npm run test` + `npm run build`; E2E (`npm run test:e2e`) executado pelo usuário.
