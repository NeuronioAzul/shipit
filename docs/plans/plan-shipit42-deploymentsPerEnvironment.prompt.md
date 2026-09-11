## Plan: Publicações por ambiente em uma única atividade (dsv / hmg / prd + releases)

Substituir os dois campos internos independentes de hoje — **Ambiente** (um único valor, plano 41) e **Releases SVN** (lista plana, plano 37) — por um único bloco **"Publicações por ambiente"** no formulário de atividade. Em uma mesma atividade o usuário marca em quais ambientes ela já foi publicada (**Desenvolvimento**, **Homologação**, **Produção**) e, ao lado de cada marcação, informa os números de release SVN daquele ambiente. Continua sendo possível criar outra atividade marcando só Produção em outra data — o modelo não impõe nada; apenas deixa de obrigar "uma atividade por ambiente".

A abordagem recomendada persiste tudo em **uma coluna JSON** (`deployments`, texto nullable — mesmo padrão de `link_ref`), com utilitário puro de parse/serialização, um editor de três linhas (toggle colorido + `InputTags` reaproveitado) e um componente de exibição em formato de **pipeline** (dsv › hmg › prd) reutilizado na lista e no detalhe. As colunas legadas `environment` e `svn_releases` são **migradas automaticamente na inicialização** e mantidas na entidade por uma versão (o `synchronize: true` derrubaria os dados se fossem removidas antes do backfill). O campo continua **interno e fora do DOCX**.

### Contexto

- `Activity` tem `environment: ActivityEnvironment | null` (um só valor) e `svn_releases: string | null` (CSV). Não há vínculo entre release e ambiente, e uma atividade só "cabe" em um ambiente — daí a necessidade atual de 3 atividades para o mesmo trabalho.
- O formulário ([ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx)) renderiza duas seções separadas (`#activity-form-environment-section` e `#activity-form-svn-releases-section`); lista e detalhe mostram `EnvironmentBadge` na linha de status e chips de release (copiáveis) em bloco próprio.
- Peças prontas para reuso: tokens `ENVIRONMENTS` / `ENVIRONMENT_COLORS` / `ENVIRONMENT_SELECTED_COLORS` / `ENVIRONMENT_ICONS` / `ENVIRONMENT_ABBR` em [environmentColors.ts](../../src/utils/environmentColors.ts); `normalizeSvnReleaseToken` / `serializeSvnReleases` em [svnReleases.ts](../../src/utils/svnReleases.ts); componente [InputTags.tsx](../../src/components/InputTags.tsx); `copyTextToClipboard` em [clipboard.ts](../../src/utils/clipboard.ts).
- `saveActivity` (Electron via `Object.assign`/`repo.create`; browser via spread em [localDb.ts](../../src/services/localDb.ts)) já propaga qualquer campo do payload — a persistência do novo campo não exige handler IPC novo.
- **Restrição estrutural:** `synchronize: true` no TypeORM ([database.ts](../../electron/database.ts)) sincroniza o schema no `initialize()`. Remover `environment`/`svn_releases` da entidade **apagaria as colunas (e os dados) antes de qualquer migração**. Há precedente de "normalização preguiçosa" em `normalizeActivityOrdersForMonth`, mas nenhum mecanismo de migração formal.
- `electron/` não importa nada de `src/` (dois `tsconfig`), então a lógica de migração no main process não pode reaproviar o utilitário do renderer.

### Decisões de design

**Modelo de dados**

- Nova coluna `deployments: string | null` (`@Column({ type: 'text', nullable: true })`) na `Activity`, contendo JSON no formato **objeto indexado pelo ambiente**:
  ```json
  { "Desenvolvimento": ["12345", "12346"], "Homologação": ["12346"] }
  ```
  - Presença da chave = ambiente marcado. Array vazio = marcado sem releases (estado válido: "já subi, não anotei a release").
  - Chaves usam os mesmos literais pt-BR do type `ActivityEnvironment` (um único vocabulário, como `status`/`attendance_type`). Sem palavras de ruído como `"environment"`/`"releases"` no JSON — importante porque a busca global faz `LIKE` no texto da coluna.
  - Vazio/sem marcação → `null` (não `'{}'`).
- Tipo em memória no renderer: `Deployment = { environment: ActivityEnvironment; releases: string[] }`, sempre em **ordem fixa** dsv → hmg → prd após o parse.
- `ActivityData` (renderer) passa a ter `deployments: string | null` e **perde** `environment` e `svn_releases`. A entidade TypeORM **mantém** as duas colunas legadas marcadas `@deprecated` (somente leitura pelo backfill), a serem removidas em plano futuro após uma versão publicada.
- **Backfill na inicialização** (`backfillLegacyDeployments` em `database.ts`, chamado uma vez em `initDatabase` logo após `initialize()`): para cada linha com `deployments IS NULL` e (`environment IS NOT NULL` ou `svn_releases IS NOT NULL`), monta o JSON e **zera as colunas legadas** na mesma gravação (mover, não copiar — isso torna a operação naturalmente idempotente e evita "ressuscitar" dados quando o usuário limpar as publicações pela UI nova).
  - `environment` + `svn_releases` → `{ [environment]: releases }`.
  - `environment` sem releases → `{ [environment]: [] }`.
  - `svn_releases` **sem** `environment` → ver **Decisão pendente 1**.
- Fallback browser (`localDb.ts`): mesma conversão aplicada em `getStoredActivities()` na leitura (dados de dev; sem cerimônia).

**Formulário — uma seção só (substitui as duas atuais)**

```
┌ Publicações por ambiente (uso interno) ─────────────────────────────────────┐
│                                                                             │
│  ●  [✓ </> Desenvolvimento ]   [ 12345 × ] [ 12346 × ] [ digite e use vírgula… ]   │
│  │                                                                          │
│  ●  [✓ 🧪 Homologação    ]   [ 12346 × ] [ digite e use vírgula… ]   ↓ Repetir releases de Desenvolvimento │
│  │                                                                          │
│  ○  [  🚀 Produção        ]   Ainda não publicado — clique para marcar.     │
│                                                                             │
│  Marque os ambientes em que esta atividade foi publicada e informe as        │
│  releases SVN de cada um (opcional). Não incluído no relatório DOCX.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Uma linha por ambiente**, ordem fixa dsv → hmg → prd (lê como um pipeline). Coluna esquerda: marcador do "trilho" (ponto colorido preenchido quando marcado, vazio quando não; linha vertical fina conectando — `border-l border-border` via pseudo-elemento; puro CSS, sem lib).
- **Toggle** = botão pill com ícone + nome, `aria-pressed`, cores `ENVIRONMENT_SELECTED_COLORS[env]` quando marcado e neutro (`bg-muted/40 text-muted-foreground`) quando não — mesma linguagem visual do seletor atual, então o usuário não reaprende nada.
- **Releases** = `InputTags` já existente (validação numérica, vírgula/Enter/Tab, colar CSV, backspace remove), habilitado só quando a linha está marcada. Placeholder: `Releases SVN (opcional) — ex: 12345, 12346`.
- Linha **não marcada** mostra texto discreto e clicável "Ainda não publicado — clique para marcar" (clicar marca e foca o input). Sem input visível → menos ruído, e a diferença entre "publicado sem release" e "não publicado" fica explícita.
- **Desmarcar não destrói**: as releases da linha ficam retidas em estado local do editor; re-marcar as traz de volta na mesma sessão. Só a serialização (o que vai para o payload) ignora ambientes desmarcados. Zero custo de "desfazer" sem modal.
- **Atalho "↓ Repetir releases de <ambiente anterior>"**: aparece em uma linha marcada e vazia quando alguma linha acima tem releases (o caso "subi a mesma release em dsv e hmg no mesmo dia" vira dois cliques). Botão `btn btn-ghost` pequeno, texto `text-xs`.
- Digitar uma release em linha desmarcada não é possível (input oculto) — evita o estado incoerente "release sem ambiente".
- Auto-save: `deployments` entra no `buildFormFingerprint` (serializado), então cada mudança dispara o auto-save como os demais campos.

**Exibição — componente de pipeline reutilizado (lista + detalhe)**

```
Lista (size="sm", inline na linha do cabeçalho do card):
   [ </> dsv · 12345, 12346 ] › [ 🧪 hmg · 12346 ] › [ 🚀 prd ]      ← prd apagado (não publicado)

Detalhe (linha de status): mesmos chips em size="md", sem releases.
Detalhe (bloco "Publicações por ambiente (uso interno)"):
   </> Desenvolvimento    [12345 ⧉] [12346 ⧉]
   🧪 Homologação         [12346 ⧉]
   🚀 Produção            Ainda não publicado
```

- Regra de renderização: **nada** quando não há nenhum ambiente marcado (comportamento atual preservado — cards sem marcação continuam limpos). Quando há **pelo menos um**, mostra os **três** slots: marcados coloridos (`ENVIRONMENT_COLORS`), não marcados em contorno apagado (`border-dashed border-border text-muted-foreground/60`, `title="Ainda não publicado em Produção"`). Isso responde de relance à pergunta real do usuário — "até onde essa entrega já foi?" — sem precisar abrir a atividade.
- Separador `›` (`fa-chevron-right text-[9px] text-muted-foreground/50`) entre slots reforça a leitura de pipeline.
- Releases dentro do chip da lista: até **3** por ambiente + `+n` (mantém o card baixo); cada número continua **copiável ao clique** (comportamento de `copyTextToClipboard` preservado, com `stopPropagation` para não abrir o detalhe).
- No detalhe, o bloco lista as três linhas com chips copiáveis (mesmo estilo dos chips atuais `bg-primary/10 text-primary`) e "Ainda não publicado" para as não marcadas; rodapé "Este campo não é exportado para o relatório DOCX."

**Busca e filtro**

- Busca global (`searchActivities` no Electron, fallback em `SearchBar.tsx` e filtro local em `ActivitiesPage.tsx`): trocar `svn_releases LIKE` por `deployments LIKE` — números de release continuam encontráveis; buscar "Produção" passa a encontrar atividades publicadas em Produção (efeito colateral útil).
- **Filtro "Ambiente"** na barra de filtros da lista (`Select` ao lado de Status/Atendimento): "Todos" / Desenvolvimento / Homologação / Produção → mantém só atividades com aquele ambiente marcado. Barato e responde "o que subiu para prd este mês". Marcado como opcional (Fase 5).

**Componentes obsoletos**

- `EnvironmentSelector.tsx` (+ teste) deixa de ser usado → **remover**. `EnvironmentBadge.tsx` é absorvido pelo novo componente de pipeline (o chip marcado é o mesmo visual) → remover após a troca nas duas páginas, ou manter como peça interna do pipeline se simplificar — decidir na implementação, sem duplicar estilo.
- `environmentColors.ts` e `svnReleases.ts` **permanecem** (reuso integral).

**DOCX**

- Sem alteração em [report-generator.ts](../../electron/report-generator.ts). Atualizar o teste de regressão para garantir que nem os nomes de ambiente vindos de `deployments` nem os números de release aparecem no `document.xml`.

### Decisões pendentes (para aprovação)

1. **Releases legadas sem ambiente** (atividades anteriores ao plano 41 que têm `svn_releases` mas `environment = null`): para qual ambiente migrar? **Recomendação:** `Homologação` — o texto original do campo dizia "apoiar publicações e homologação" e é o destino mais comum de uma release anotada. Alternativas: `Desenvolvimento` (hipótese mais conservadora) ou `Produção`. Escolha única, aplicada no backfill.
2. **Slots não marcados na lista**: exibir os três slots sempre que houver ao menos um marcado (recomendado — leitura de pipeline) **ou** exibir só os marcados (mais compacto, menos informação). O plano assume a primeira.
3. **Nome da seção/bloco**: "Publicações por ambiente (uso interno)" (recomendado, casa com o nome do app) vs. "Ambientes e releases (uso interno)".

### Steps

**Fase 1 — Modelo, tipos e utilitário puro (base para tudo)**
1. Em [electron/entities/Activity.ts](../../electron/entities/Activity.ts): adicionar `@Column({ type: 'text', nullable: true }) deployments!: string | null // JSON { ambiente: releases[] } — publicações por ambiente (uso interno, não exportado no DOCX)`. Marcar `environment` e `svn_releases` com comentário `@deprecated — legado, migrado para deployments no backfill; remover em versão futura`. Manter o type `ActivityEnvironment`.
2. Em [src/vite-env.d.ts](../../src/vite-env.d.ts): adicionar `deployments: string | null` a `ActivityData`; **remover** `environment` e `svn_releases` da interface (renderer não os usa mais). Manter `ActivityEnvironment`. *parallel with 1*
3. Criar [src/utils/deployments.ts](../../src/utils/deployments.ts): `type Deployment`, `type DeploymentsStored = Partial<Record<ActivityEnvironment, string[]>>`, `parseDeployments(raw: string | null | undefined): Deployment[]` (tolerante a JSON inválido → `[]`; ignora chaves desconhecidas; normaliza/dedupe releases via `normalizeSvnReleaseToken`; ordena por `ENVIRONMENTS`), `serializeDeployments(list: Deployment[]): string | null` (ordem fixa, dedupe, `null` se vazio), `isDeployedTo(list, env)`, `getAllReleases(list)`, `migrateLegacyDeployments(environment, svnReleases, fallbackEnv): string | null` (regra da Decisão 1). *depends on 2*
4. Criar [src/utils/deployments.test.ts](../../src/utils/deployments.test.ts): parse de JSON válido/inválido/chave desconhecida, ordem fixa independente da ordem do JSON, array vazio preservado como "marcado sem releases", dedupe e normalização de releases, serialização `null` quando vazio, round-trip, e os quatro casos da migração legada. *depends on 3*

**Fase 2 — Persistência e migração de dados**
5. Em [electron/database.ts](../../electron/database.ts): criar `backfillLegacyDeployments(repo: Repository<Activity>, fallbackEnv)` (exportada para teste) que seleciona `deployments IS NULL AND (environment IS NOT NULL OR svn_releases IS NOT NULL)`, monta o JSON com lógica local mínima (parse CSV numérico + objeto por ambiente — sem importar de `src/`), **zera** `environment`/`svn_releases` e salva em lote. Chamar em `initDatabase` após `dataSource.initialize()`. *depends on 1*
6. Em `searchActivities` ([database.ts](../../electron/database.ts)): substituir `.orWhere('activity.svn_releases LIKE :like')` por `.orWhere('activity.deployments LIKE :like')`. *depends on 1*
7. Em [src/services/localDb.ts](../../src/services/localDb.ts): default `deployments: null` no `saveActivity`; remover defaults `environment`/`svn_releases`; em `getStoredActivities()` aplicar `migrateLegacyDeployments` para registros antigos que ainda carreguem os campos legados. *depends on 3*
8. Testes em [electron/database.test.ts](../../electron/database.test.ts): persistir/atualizar/limpar `deployments`; backfill (semear linhas com combinações legadas via repo, chamar `backfillLegacyDeployments`, conferir JSON gerado e colunas legadas zeradas; segunda chamada não altera nada); busca por número de release e por nome de ambiente via `deployments`. Substituir os testes atuais de `environment`/`svn_releases`. *depends on 5, 6*

**Fase 3 — Componente editor (formulário)**
9. Criar [src/components/DeploymentsEditor.tsx](../../src/components/DeploymentsEditor.tsx): props `{ value: Deployment[]; onChange: (next: Deployment[]) => void; idPrefix?: string }`. Renderiza as três linhas na ordem de `ENVIRONMENTS`; toggle pill (`aria-pressed`, `type="button"`, ids `${idPrefix}-toggle-<abbr>`), trilho lateral em CSS, `InputTags` por linha (ids `${idPrefix}-releases-<abbr>`) com `validateTag`/`normalizeTag` de `svnReleases.ts`; estado local de releases retidas para linhas desmarcadas; texto clicável "Ainda não publicado — clique para marcar"; botão "↓ Repetir releases de <env>" quando aplicável. Tudo com tokens de tema (sem cor crua). *depends on 3*
10. Criar [src/components/DeploymentsEditor.test.tsx](../../src/components/DeploymentsEditor.test.tsx) (jsdom): renderiza três linhas; marcar chama `onChange` com o ambiente incluído (releases `[]`); adicionar release via vírgula atualiza só aquela linha; desmarcar remove do `onChange` mas re-marcar restaura as releases retidas; "Repetir releases" copia da linha anterior; ordem sempre dsv→hmg→prd no `onChange`. *depends on 9*
11. Em [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx): `ActivityForm` troca `svn_releases: string` + `environment: string` por `deployments: Deployment[]`; `buildActivityPayload` → `deployments: serializeDeployments(nextForm.deployments)`; `buildFormFingerprint` → `deployments: serializeDeployments(...)`; `loadedForm` → `parseDeployments(activity.deployments)`. Remover imports/handlers de `svnReleases`/`EnvironmentSelector` e as duas seções; renderizar **uma** seção `#activity-form-deployments-section` (mesmo lugar, mesmo estilo `border border-border/60 rounded-lg p-4 bg-muted/20`) com label "Publicações por ambiente (uso interno)", `DeploymentsEditor` e texto de ajuda. `onChange` → `setForm` + `setAutoSaveStatus('idle')`. *depends on 9*

**Fase 4 — Componente de exibição (lista + detalhe)**
12. Criar [src/components/DeploymentPipeline.tsx](../../src/components/DeploymentPipeline.tsx): props `{ deployments: Deployment[]; size?: 'sm' | 'md'; showReleases?: boolean; maxReleasesPerEnv?: number }`. Retorna `null` se vazio; caso contrário renderiza os três slots (marcado colorido com ícone + `ENVIRONMENT_ABBR`; não marcado tracejado/apagado com `title`), separadores `›`, releases copiáveis (`copyTextToClipboard`, `stopPropagation`) com truncamento `+n`. `aria-label` por slot ("Publicado em Produção — releases 12345" / "Ainda não publicado em Produção"). *depends on 3*
13. Criar [src/components/DeploymentPipeline.test.tsx](../../src/components/DeploymentPipeline.test.tsx): nada quando vazio; três slots quando há um marcado; releases truncadas com `+n`; clique em release chama cópia e não propaga; slot não marcado tem o `title` correto. *depends on 12*
14. Em [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx): remover `getCompactSvnReleases`, o bloco de chips de release e `EnvironmentBadge`; na linha do cabeçalho do card renderizar `<DeploymentPipeline size="sm" showReleases deployments={parseDeployments(activity.deployments)} />`; filtro de texto local passa a testar `a.deployments`. *depends on 12*
15. Em [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx): na linha de status trocar `EnvironmentBadge` por `<DeploymentPipeline size="md" />` (sem releases); substituir o bloco `#activity-detail-svn-releases` por `#activity-detail-deployments` com as três linhas (badge + chips copiáveis ou "Ainda não publicado") e o rodapé de "não exportado". Exibir o bloco só quando há ao menos um ambiente marcado. *depends on 12*
16. Em [src/components/SearchBar.tsx](../../src/components/SearchBar.tsx): fallback browser testa `a.deployments`. *depends on 2*
17. Remover `EnvironmentSelector.tsx` + `EnvironmentSelector.test.tsx`; remover `EnvironmentBadge.tsx` + teste **se** o pipeline não o usar internamente (sem duplicar estilo). Conferir com `tsc`/grep que nada mais referencia `svn_releases`/`environment` em `src/`. *depends on 11, 14, 15*

**Fase 5 — Filtro por ambiente na lista (opcional)**
18. Em [ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx): estado `filterEnvironment`, `Select` "Ambiente" (Todos + `ENVIRONMENTS`) ao lado dos filtros existentes, predicado `isDeployedTo(parseDeployments(a.deployments), filterEnvironment)`, incluído em `hasActiveFilters`/`clearFilters`. *depends on 14*

**Fase 6 — DOCX, E2E e validação**
19. Em [electron/report-generator.integration.test.ts](../../electron/report-generator.integration.test.ts): substituir os dois testes atuais (svn/environment) por um que gera o DOCX com `deployments` preenchido em dsv+hmg+prd e afirma que nenhum número de release, nenhum nome de ambiente e nenhum placeholder `{{activity_deployments}}` aparece no `document.xml`; atualizar a fixture base (remover `svn_releases`, adicionar `deployments: null`). Atualizar [src/utils/validation.test.ts](../../src/utils/validation.test.ts) na mesma linha. *depends on 1*
20. Em [e2e/fixtures/activityFixtures.ts](../../e2e/fixtures/activityFixtures.ts): trocar `svn_releases: null` por `deployments: null`. Em [e2e/app.spec.ts](../../e2e/app.spec.ts): (a) atualizar "copies an svn release number…" para criar com `deployments: '{"Homologação":["<release>"]}'` e clicar no chip em `#activity-detail-deployments`; (b) substituir "selects an environment…" por "marks deployments per environment…": marcar Desenvolvimento, digitar duas releases, marcar Homologação, usar "Repetir releases", desmarcar/re-marcar Homologação (releases voltam), salvar; conferir na lista os chips `dsv`/`hmg` com releases e `prd` apagado; abrir o detalhe e conferir o bloco de publicações; (c) filtro por ambiente (se Fase 5 entrar). **Escrito pelo Claude; execução do Playwright é do usuário** (`e2e-test-ownership`). *depends on 11, 14, 15*
21. Validação final: `npm run test` (Vitest) + `npm run build` (tsc dos dois processos) ; E2E rodado pelo usuário. *depends on all*
22. Ao concluir, invocar a skill `shipit-release-and-doc-sync` (modo Doc Sync) para CHANGELOG `[Unreleased]`, TODO/DONE e [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (entidade `Activity`: nova coluna `deployments`, colunas legadas deprecadas, backfill na inicialização). *depends on 21*

### Relevant files
- [electron/entities/Activity.ts](../../electron/entities/Activity.ts) — coluna `deployments`; `environment`/`svn_releases` mantidas como legado deprecado.
- [electron/database.ts](../../electron/database.ts) — `backfillLegacyDeployments` chamado em `initDatabase`; `searchActivities` usa `deployments`.
- [electron/database.test.ts](../../electron/database.test.ts) — persistência, backfill idempotente, busca.
- [electron/report-generator.integration.test.ts](../../electron/report-generator.integration.test.ts) — regressão de não-exportação.
- [src/vite-env.d.ts](../../src/vite-env.d.ts) — `ActivityData.deployments`; remoção dos campos legados do contrato do renderer.
- [src/utils/deployments.ts](../../src/utils/deployments.ts) (+ `.test.ts`) — parse/serialize/ordem/migração legada.
- [src/utils/svnReleases.ts](../../src/utils/svnReleases.ts), [src/utils/environmentColors.ts](../../src/utils/environmentColors.ts) — reuso sem alteração.
- [src/components/DeploymentsEditor.tsx](../../src/components/DeploymentsEditor.tsx) (+ `.test.tsx`) — editor de três linhas (toggle + `InputTags`).
- [src/components/DeploymentPipeline.tsx](../../src/components/DeploymentPipeline.tsx) (+ `.test.tsx`) — exibição dsv › hmg › prd para lista/detalhe.
- [src/components/InputTags.tsx](../../src/components/InputTags.tsx) — reuso sem alteração.
- [src/components/EnvironmentSelector.tsx](../../src/components/EnvironmentSelector.tsx), [src/components/EnvironmentBadge.tsx](../../src/components/EnvironmentBadge.tsx) — removidos (o segundo condicionado ao reuso interno).
- [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx) — estado/payload/fingerprint/load + seção única.
- [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx) — pipeline no card, filtro de texto, filtro por ambiente (opcional).
- [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx) — pipeline na linha de status + bloco de publicações.
- [src/components/SearchBar.tsx](../../src/components/SearchBar.tsx) — fallback de busca.
- [src/services/localDb.ts](../../src/services/localDb.ts) — default + migração legada na leitura.
- [e2e/fixtures/activityFixtures.ts](../../e2e/fixtures/activityFixtures.ts), [e2e/app.spec.ts](../../e2e/app.spec.ts) — fixtures e cenários.
- [src/utils/validation.test.ts](../../src/utils/validation.test.ts) — fixture de `ActivityData`.

### Gotchas
- **`synchronize: true` derruba colunas removidas da entidade.** Por isso `environment` e `svn_releases` **ficam** na entidade nesta versão; só o backfill as lê. Removê-las agora perderia os dados antes da migração.
- **Backfill move, não copia.** Zerar as colunas legadas na mesma gravação é o que garante idempotência sem flag de controle e evita que uma atividade cujo usuário limpou as publicações (`deployments = null`) seja "re-migrada" no próximo startup. Consequência: rollback para uma versão anterior não recupera o campo legado (aceitável: campo interno, e o JSON continua no banco).
- **Formato do JSON afeta a busca.** `LIKE` roda no texto bruto da coluna: chaves como `"environment"`/`"releases"` fariam qualquer termo assim casar com todas as atividades. O formato objeto-por-ambiente evita isso.
- **`[]` ≠ ausência.** Ambiente marcado sem releases é estado válido e precisa sobreviver ao parse/serialize (não filtrar arrays vazios).
- **Dois processos TS.** A lógica de backfill em `electron/database.ts` não pode importar `src/utils/deployments.ts`; manter uma versão mínima local (CSV numérico → objeto) e cobrir com teste próprio.
- **Auto-save**: sem `deployments` no `buildFormFingerprint`, a mudança não dispararia o auto-save em modo edição.
- **`stopPropagation` nos chips da lista**: o card inteiro navega ao clique; copiar release não pode abrir o detalhe (comportamento atual a preservar).
- **Sem cores cruas**: só `chart-*`, `muted`, `border`, `primary` (regra do projeto). Trilho e slots tracejados via utilitários Tailwind com tokens.
- **Acentos** nos literais (`'Homologação'`, `'Produção'`): usar exatamente as mesmas strings do type em enum, JSON, tokens e testes.
- **E2E**: o Electron não sobe no sandbox; Claude escreve, o usuário executa.

### Verificação
1. `npm run dev` em banco com atividades antigas (algumas só com `environment`, outras só com `svn_releases`, outras com ambos): após abrir, lista e detalhe mostram as publicações migradas; reiniciar o app não altera nada (idempotência).
2. Criar atividade: marcar dsv, digitar `12345, 12346`; marcar hmg e usar "Repetir releases"; desmarcar hmg e re-marcar (releases voltam); salvar → card mostra `dsv · 12345, 12346 › hmg · 12345, 12346 › prd` (prd apagado). Editar e limpar tudo → card sem chips e `deployments = null`.
3. Criar segunda atividade só com prd em outra data — nada impede; card mostra dsv/hmg apagados e prd colorido.
4. Busca global por um número de release e por "Produção" encontra as atividades certas; filtro "Ambiente" (se incluído) reduz a lista corretamente.
5. Gerar DOCX do mês: nenhum número de release nem nome de ambiente no documento.
6. `npm run test` + `npm run build` verdes; `npm run test:e2e` executado pelo usuário.

### Fora de escopo (considerações futuras)
- **Duplicar atividade** (copiar descrição/escopo/links para uma nova atividade em outra data, sem evidências) — facilitaria o caso "outra atividade só para prd", mas é feature própria; vale um plano curto se o usuário quiser.
- **Remoção física** das colunas `environment`/`svn_releases` da entidade — plano futuro, após uma versão publicada com o backfill.
- **Datas por ambiente** (quando subiu em cada um): o modelo JSON comporta evoluir para `{ "Produção": { "releases": [...], "date": "..." } }` sem migrar novamente, mas não entra agora.
