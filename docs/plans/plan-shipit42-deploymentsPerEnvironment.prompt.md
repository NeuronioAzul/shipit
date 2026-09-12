## Plan: Publicações por ambiente em uma única atividade (dsv / hmg / prd + releases)

Substituir os dois campos internos independentes de hoje — **Ambiente** (um único valor, plano 41) e **Releases SVN** (lista plana, plano 37) — por um único bloco **"Publicações por ambiente (uso interno)"** no formulário de atividade. Em uma mesma atividade o usuário marca em quais ambientes ela já foi publicada (**Desenvolvimento**, **Homologação**, **Produção**) e, ao lado de cada marcação, informa os números de release SVN daquele ambiente. Continua sendo possível criar outra atividade marcando só Produção em outra data — o modelo não impõe nada; apenas deixa de obrigar "uma atividade por ambiente".

A abordagem recomendada persiste tudo em **uma coluna JSON** (`deployments`, texto nullable — mesmo padrão de `link_ref`), com utilitário puro de parse/serialização, um editor de três linhas (toggle colorido + `InputTags` reaproveitado) e um componente de exibição em formato de **pipeline** (dsv › hmg › prd) reutilizado na lista e no detalhe. As colunas legadas `environment` e `svn_releases` são **removidas da entidade nesta versão**. Na primeira abertura após a atualização, **antes de qualquer tela do app**, um aviso bloqueante (30 s) explica a mudança; ao confirmar, o app faz **backup do banco**, roda a migração (`environment` + suas releases → `deployments`) e só então sincroniza o schema (que remove as colunas) e libera a tela. Releases antigas **sem ambiente são descartadas** (não migram, não são exibidas, não são guardadas — mas continuam no backup). O campo continua **interno e fora do DOCX**.

### Decisões tomadas (11/09/2026)

1. **Releases antigas sem ambiente não migram, não serão mais exibidas e são excluídas junto com a coluna legada** — nada é guardado no banco ativo. **Atividades que já tinham `environment` marcado migram para `deployments` levando suas releases.**
2. **Exibição em pipeline** na lista e no detalhe: quando há ao menos um ambiente marcado, mostrar os três slots (não marcados apagados).
3. **Nome da seção/bloco:** "Publicações por ambiente (uso interno)".
4. **Backup + aviso antes de qualquer exclusão de dados, na ordem aviso → backup → migração.** Antes de abrir a tela do app, um modal de alerta bem chamativo, que só pode ser fechado após **30 segundos**, informa: que a atualização traz mudanças importantes; que será feito o backup do banco; **onde** o backup ficará (para downgrade); e **como voltar a versão anterior** do app para recuperar informações do backup. Só depois da confirmação o app executa backup → migração. Se o backup falhar, **nada é alterado**.

### Contexto

- `Activity` tem `environment: ActivityEnvironment | null` (um só valor) e `svn_releases: string | null` (CSV). Não há vínculo entre release e ambiente, e uma atividade só "cabe" em um ambiente — daí a necessidade atual de 3 atividades para o mesmo trabalho.
- O formulário ([ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx)) renderiza duas seções separadas (`#activity-form-environment-section` e `#activity-form-svn-releases-section`); lista e detalhe mostram `EnvironmentBadge` na linha de status e chips de release (copiáveis) em bloco próprio.
- Peças prontas para reuso: tokens `ENVIRONMENTS` / `ENVIRONMENT_COLORS` / `ENVIRONMENT_SELECTED_COLORS` / `ENVIRONMENT_ICONS` / `ENVIRONMENT_ABBR` em [environmentColors.ts](../../src/utils/environmentColors.ts); `normalizeSvnReleaseToken` / `serializeSvnReleases` em [svnReleases.ts](../../src/utils/svnReleases.ts); componente [InputTags.tsx](../../src/components/InputTags.tsx); `copyTextToClipboard` em [clipboard.ts](../../src/utils/clipboard.ts).
- `saveActivity` (Electron via `Object.assign`/`repo.create`; browser via spread em [localDb.ts](../../src/services/localDb.ts)) já propaga qualquer campo do payload — a persistência do novo campo não exige handler IPC novo.
- **Inicialização hoje** ([main.ts](../../electron/main.ts) `app.whenReady`): `initDatabase()` → `cleanupTrash()` → protocolos → `createWindow()` → `createTray()` → `startSchedulers()` → updater. `initDatabase` ([database.ts](../../electron/database.ts)) cria o `DataSource` com `synchronize: true`, e o `initialize()` sincroniza o schema na hora: colunas que sumiram da entidade são **dropadas (com os dados) antes de qualquer código nosso rodar**. Para avisar → fazer backup → migrar → remover colunas, o banco precisa ser aberto com `synchronize: false` e o `dataSource.synchronize()` (API pública do TypeORM) chamado explicitamente só no fim. Os testes ([database.test.ts](../../electron/database.test.ts)) usam `sqljs` em memória e passam por `initDatabase` — continuam funcionando (a tabela ainda não existe → sem migração → sync imediato).
- Banco em `userData/shipit.db` (`getDbPath`); configurações em `userData/settings.json` (`loadSettings`/`saveSettingsFile`, com chave interna `__internalUpdate` filtrada de `getPublicSettings` — padrão a seguir para estado interno). Já existem `app:openFileInFolder` (revela arquivo na pasta), `openExternalSafely` (abre link http/https no navegador) e `app:getVersion`. Repositório de releases: `https://github.com/NeuronioAzul/shipit/releases` (de `package.json`).
- E2E ([e2e/app.spec.ts](../../e2e/app.spec.ts)) lança o app real com um `userData` isolado (`createShipItTestProfileEnv`), então é possível **semear um `shipit.db` legado** antes do launch para testar o fluxo completo; `sql.js` (já em devDependencies) exporta o banco como `Uint8Array` para gravar em disco.
- `electron/` não importa nada de `src/` (dois `tsconfig`), então a lógica de migração no main process não pode reaproveitar o utilitário do renderer.

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
- `ActivityData` (renderer) ganha `deployments: string | null` e **perde** `environment` e `svn_releases`. A entidade TypeORM também **perde as duas colunas** (removidas do `Activity.ts`). O type `ActivityEnvironment` permanece (é o vocabulário das chaves).
- Fallback browser (`localDb.ts`): conversão em `getStoredActivities()` na leitura (converte `environment` em `deployments` e apaga `environment`/`svn_releases` do objeto; dados de dev, sem aviso nem backup).

**Fluxo de inicialização (aviso → backup → migração)**

```
app.whenReady
  ├─ openDatabase()                      initialize() com synchronize:false
  ├─ needsLegacyMigration()              PRAGMA table_info(activities) tem "environment"?
  │     ├─ não → finalizeDatabase()      dataSource.synchronize() → fluxo normal de hoje
  │     └─ sim → pendingMigration = { fromVersion, toVersion, plannedBackupPath, userDataDir, backupsDir, countdownSeconds }
  │              (NÃO sincroniza, NÃO roda cleanupTrash/schedulers ainda)
  ├─ protocolos, createWindow(), createTray()
  └─ renderer (App.tsx) → app:getStartupMigration()
        ├─ null → app normal
        └─ pendente → renderiza SOMENTE <MigrationGate/> (opaco, sem layout, sem rotas, sem chamadas db:*)
              fase "aviso"  ── 30 s ──▶ botão "Entendi, fazer backup e atualizar"
              fase "executando" → app:runStartupMigration()
                    main: PRAGMA wal_checkpoint(TRUNCATE) → copiar shipit.db (+ -wal/-shm/-journal se existirem)
                          → verificar cópia (tamanho igual + cabeçalho "SQLite format 3\0")
                          → migrateLegacyEnvironmentColumns() → dataSource.synchronize()
                          → cleanupTrash() + startSchedulers() → salvar __migrationNotice em settings.json
                          → { success: true, backupPath }   |   { success: false, stage: 'backup'|'migration', error }
              fase "concluído" → resumo (caminho do backup, instruções de downgrade) → "Abrir o ShipIt!"
              fase "erro"      → nada foi alterado (se falhou no backup) → "Tentar novamente" / "Fechar o app"
```

- **Backup antes de qualquer escrita**: nome `shipit-backup-antes-v<toVersion>-<YYYYMMDD-HHmmss>.db` em `userData/backups/` (pasta criada se não existir; backups nunca são apagados automaticamente). O caminho é decidido **antes** do aviso, para constar nele.
- **Falha no backup = abortar**: sem cópia verificada, não roda migração nem `synchronize()`; o banco fica exatamente como estava e a versão anterior do app continua abrindo-o. Falha na migração (após backup OK): mostrar erro com o caminho do backup e instruções de downgrade; o app fecha ao confirmar.
- **Guarda no main**: enquanto `pendingMigration` existir, `getDb()` lança `Erro: banco aguardando migração` — defesa extra caso algum handler `db:*` seja chamado antes da hora (o renderer já não chama, pois só o gate é montado).
- **Versão anterior**: a partir desta versão o app grava `lastRunVersion` em `settings.json` a cada início; para esta migração, `fromVersion = settings.lastRunVersion ?? 'anterior a <toVersion>'` (na prática o texto cita a última publicada antes desta: **1.13.x**).
- **Countdown configurável só para testes**: `SHIPIT_E2E_MIGRATION_COUNTDOWN_SECONDS` (env, lido no main, default 30) chega ao renderer no payload do gate.

**Aviso de atualização (antes da tela do app)**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  ⚠  (ícone grande pulsando, faixa superior em warning)                        │
│                                                                               │
│  ATUALIZAÇÃO IMPORTANTE — ShipIt! 1.14.0                                      │
│                                                                               │
│  Esta atualização traz mudanças importantes na forma como as atividades       │
│  guardam ambientes e releases (Desenvolvimento / Homologação / Produção).      │
│                                                                               │
│  ▸ O que vai acontecer ao continuar                                           │
│    1. Backup completo do seu banco de dados (nada é apagado antes disso).     │
│    2. Conversão das atividades para o novo formato de publicações.            │
│    3. Releases antigas que não tinham ambiente marcado NÃO serão mantidas —   │
│       elas continuam apenas no backup.                                        │
│                                                                               │
│  ▸ Onde ficará o backup                                                       │
│    C:\Users\…\AppData\Roaming\ShipIt!\backups\shipit-backup-antes-v1.14.0-…db  │
│    [ Copiar caminho ]  [ Abrir pasta ]                                        │
│                                                                               │
│  ▸ Se precisar voltar para a versão anterior (1.13.x)                         │
│    1. Feche o ShipIt!.                                                        │
│    2. Baixe e instale a versão anterior em github.com/NeuronioAzul/shipit/    │
│       releases  [ Abrir página de versões ].                                  │
│    3. Na pasta de dados (C:\Users\…\AppData\Roaming\ShipIt!), renomeie        │
│       shipit.db para shipit-novo.db e copie o backup acima como shipit.db.    │
│    4. Abra o ShipIt! — os dados voltam ao estado anterior à atualização.      │
│       Atividades criadas depois da atualização não estarão no backup.         │
│                                                                               │
│  ████████████████████░░░░░░░░░░  (barra esvaziando em 30 s)                    │
│                     [ Entendi, fazer backup e atualizar (23 s) ]              │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Opaco** (`bg-background`) e em tela cheia: nada do app aparece atrás — é literalmente "antes da tela do app". Sem fechar por `Esc` ou clique fora; sem botão "X".
- **Chamativo com tokens do tema**: faixa superior `bg-warning/15 border-warning`, ícone `fa-triangle-exclamation text-warning animate-pulse`, título em `text-warning`, blocos com `border-l-4 border-warning`; a barra de progresso (`bg-warning`) esvazia durante os 30 s. Nenhuma cor crua. `role="alertdialog"`, `aria-modal`, `aria-live="polite"` no contador.
- **Botão único** desabilitado até o fim da contagem, com o número regressivo no rótulo; ao zerar: "Entendi, fazer backup e atualizar". A contagem começa ao montar.
- **Fase "executando"**: lista de etapas com estado (○ pendente / ⟳ em andamento / ✓ concluída): "Backup do banco", "Conversão dos dados", "Atualização do banco". Botão oculto.
- **Fase "concluído"**: título em `text-success`, "Backup salvo em: <caminho>" com "Copiar caminho"/"Abrir pasta", as mesmas instruções de downgrade (mantidas para o usuário reler) e botão "Abrir o ShipIt!" (liberado de imediato). Ao clicar, o gate some e o app monta normalmente.
- **Fase "erro"**: título `text-destructive`; se falhou no backup: "Nada foi alterado. Verifique espaço em disco/permissões." + "Tentar novamente" / "Fechar o app"; se falhou na migração: "Seu backup está em <caminho>" + instruções de downgrade + "Fechar o app".
- **Depois**: o resumo fica acessível em Configurações › "Backup do banco de dados" (caminho do último backup, "Abrir pasta") — opcional (Fase 5b), mas barato e útil para quem fechou o aviso rápido.

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
- Auto-save: `deployments` (serializado) entra no `buildFormFingerprint`, então cada mudança dispara o auto-save como os demais campos.

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

- Regra de renderização: **nada** quando não há nenhum ambiente marcado (cards sem marcação continuam limpos). Quando há **pelo menos um**, mostra os **três** slots: marcados coloridos (`ENVIRONMENT_COLORS`), não marcados em contorno apagado (`border-dashed border-border text-muted-foreground/60`, `title="Ainda não publicado em Produção"`). Responde de relance "até onde essa entrega já foi?".
- Separador `›` (`fa-chevron-right text-[9px] text-muted-foreground/50`) entre slots reforça a leitura de pipeline.
- Releases dentro do chip da lista: até **3** por ambiente + `+n` (mantém o card baixo); cada número continua **copiável ao clique** (`copyTextToClipboard`, com `stopPropagation` para não abrir o detalhe).
- No detalhe, o bloco lista as três linhas com chips copiáveis (mesmo estilo dos chips atuais `bg-primary/10 text-primary`) e "Ainda não publicado" para as não marcadas; rodapé "Este campo não é exportado para o relatório DOCX."

**Busca e filtro**

- Busca global (`searchActivities` no Electron, fallback em `SearchBar.tsx` e filtro local em `ActivitiesPage.tsx`): trocar `svn_releases LIKE` por `deployments LIKE` — números de release continuam encontráveis; buscar "Produção" passa a encontrar atividades publicadas em Produção (efeito colateral útil).
- **Filtro "Ambiente"** na barra de filtros da lista (`Select` ao lado de Status/Atendimento): "Todos" / Desenvolvimento / Homologação / Produção → mantém só atividades com aquele ambiente marcado. Opcional (Fase 5).

**Componentes obsoletos**

- `EnvironmentSelector.tsx` (+ teste) deixa de ser usado → **remover**. `EnvironmentBadge.tsx` é absorvido pelo novo componente de pipeline (o chip marcado é o mesmo visual) → remover após a troca nas duas páginas, ou manter como peça interna do pipeline se simplificar — decidir na implementação, sem duplicar estilo.
- `environmentColors.ts` e `svnReleases.ts` **permanecem** (reuso integral; `parseSvnReleasesStored` segue útil para a migração no `localDb`).

**DOCX**

- Sem alteração em [report-generator.ts](../../electron/report-generator.ts) (remover o comentário que cita `svn_releases`, trocando por `deployments`). Atualizar o teste de regressão para garantir que nem os nomes de ambiente vindos de `deployments` nem os números de release aparecem no `document.xml`.

### Steps

**Fase 1 — Modelo, tipos e utilitário puro (base para tudo)**
1. Em [electron/entities/Activity.ts](../../electron/entities/Activity.ts): adicionar `@Column({ type: 'text', nullable: true }) deployments!: string | null // JSON { ambiente: releases[] } — publicações por ambiente (uso interno, não exportado no DOCX)`; **remover** as colunas `environment` e `svn_releases`. Manter o type `ActivityEnvironment`.
2. Em [src/vite-env.d.ts](../../src/vite-env.d.ts): adicionar `deployments: string | null` a `ActivityData`; **remover** `environment` e `svn_releases`. Manter `ActivityEnvironment`. *parallel with 1*
3. Criar [src/utils/deployments.ts](../../src/utils/deployments.ts): `type Deployment`, `type DeploymentsStored = Partial<Record<ActivityEnvironment, string[]>>`, `parseDeployments(raw: string | null | undefined): Deployment[]` (tolerante a JSON inválido → `[]`; ignora chaves desconhecidas; normaliza/dedupe releases via `normalizeSvnReleaseToken`; ordena por `ENVIRONMENTS`), `serializeDeployments(list: Deployment[]): string | null` (ordem fixa, dedupe, `null` se vazio), `isDeployedTo(list, env)`, `getAllReleases(list)`, `migrateLegacyDeployments(environment: ActivityEnvironment | null, svnReleases: string | null): string | null` (retorna `null` quando `environment` é `null` — Decisão 1; usado só pelo `localDb`). *depends on 2*
4. Criar [src/utils/deployments.test.ts](../../src/utils/deployments.test.ts): parse de JSON válido/inválido/chave desconhecida, ordem fixa independente da ordem do JSON, array vazio preservado como "marcado sem releases", dedupe e normalização de releases, serialização `null` quando vazio, round-trip, e a migração legada (env sem releases, env com releases, releases sem env → `null`). *depends on 3*

**Fase 2 — Abertura do banco, backup e migração (main process)**
5. Em [electron/database.ts](../../electron/database.ts): dividir `initDatabase` em `openDatabase(overrides)` (cria o `DataSource` com `synchronize: false` e chama `initialize()`), `needsLegacyMigration(ds): Promise<boolean>` (`PRAGMA table_info(activities)` contém `environment`; `false` se a tabela não existe), `migrateLegacyEnvironmentColumns(ds)` (SQL cru: `ALTER TABLE activities ADD COLUMN deployments text` se faltar; `SELECT id, environment, svn_releases … WHERE environment IS NOT NULL AND deployments IS NULL`; monta o JSON com parse CSV numérico local; `UPDATE`; idempotente; linhas só com `svn_releases` não são tocadas) e `finalizeDatabase(ds)` (`await ds.synchronize()`, que remove `environment`/`svn_releases`). `initDatabase(overrides)` = `openDatabase` + (se **não** precisa migrar) `finalizeDatabase` — mantém a assinatura usada pelos testes e por `getDb()`. Novo estado `migrationPending: boolean`; `getDb()` lança `'Banco de dados aguardando migração'` enquanto pendente. *depends on 1*
6. Criar [electron/db-backup.ts](../../electron/db-backup.ts) (sem dependência do Electron; testável em Vitest): `buildBackupPath(backupsDir, toVersion, now)` → `shipit-backup-antes-v<toVersion>-<YYYYMMDD-HHmmss>.db`; `createDatabaseBackup({ dbPath, backupPath })` → cria a pasta, copia `shipit.db` e os sidecars `-wal`/`-shm`/`-journal` que existirem, verifica (tamanho igual ao original e cabeçalho `SQLite format 3\0`), retorna `{ backupPath, bytes }` ou lança `DatabaseBackupError` sem deixar cópia parcial (remove o arquivo em caso de falha na verificação). *parallel with 5*
7. Testes: [electron/db-backup.test.ts](../../electron/db-backup.test.ts) (diretório temporário: cópia + sidecars, verificação de cabeçalho, nome com versão/timestamp, falha em arquivo inexistente/cabeçalho inválido sem deixar resíduo, pasta criada) e, em [electron/database.test.ts](../../electron/database.test.ts): persistir/atualizar/limpar `deployments`; `needsLegacyMigration` `false` em banco novo; **migração**: após `initDatabase`, simular o schema antigo por SQL cru (`ALTER TABLE activities ADD COLUMN environment text` / `svn_releases text`), inserir linhas com as três combinações legadas, conferir `needsLegacyMigration === true`, chamar `migrateLegacyEnvironmentColumns` e conferir o JSON gerado só nas linhas com `environment`; `finalizeDatabase` → `PRAGMA table_info` sem as duas colunas e com `deployments`; segunda chamada da migração é no-op; `getDb()` lança enquanto `migrationPending`; busca por número de release e por nome de ambiente via `deployments`. Remover os testes atuais de `environment`/`svn_releases`. *depends on 5, 6*
8. Em [electron/main.ts](../../electron/main.ts): no `app.whenReady`, trocar `initDatabase()` por `openDatabase()` + `needsLegacyMigration()`; se **não** precisar: `finalizeDatabase()`, `cleanupTrash()`, `startSchedulers()` como hoje; se precisar: montar `pendingMigration = { fromVersion: settings.lastRunVersion ?? null, toVersion: app.getVersion(), plannedBackupPath, backupsDir, userDataDir, releasesUrl, countdownSeconds }` e **adiar** `cleanupTrash`/`startSchedulers`. Gravar `lastRunVersion` em `settings.json` **somente após** o banco estar pronto (no fluxo normal, logo após `finalizeDatabase`; no fluxo de migração, ao final de `app:runStartupMigration`). Novos handlers: `app:getStartupMigration` (retorna `pendingMigration | null`), `app:runStartupMigration` (`PRAGMA wal_checkpoint(TRUNCATE)` → `createDatabaseBackup` → `migrateLegacyEnvironmentColumns` → `finalizeDatabase` → `cleanupTrash` → `startSchedulers` → salva `__migrationNotice { fromVersion, toVersion, backupPath, migratedAt }` e `lastRunVersion` em `settings.json` → limpa `pendingMigration`; em erro retorna `{ success: false, stage, error, backupPath? }` e **não** avança de etapa), `app:getLastMigrationNotice` (lê `__migrationNotice`), `app:openReleasesPage` (`openExternalSafely(releasesUrl)`). Reaproveitar `app:openFileInFolder` para "Abrir pasta". Expor em [electron/preload.ts](../../electron/preload.ts) e tipar em [src/vite-env.d.ts](../../src/vite-env.d.ts) (`StartupMigrationInfo`, `StartupMigrationResult`). *depends on 5, 6*
9. Em `searchActivities` ([database.ts](../../electron/database.ts)): substituir `.orWhere('activity.svn_releases LIKE :like')` por `.orWhere('activity.deployments LIKE :like')`. *depends on 1*
10. Em [src/services/localDb.ts](../../src/services/localDb.ts): default `deployments: null` no `saveActivity`; remover defaults `environment`/`svn_releases`; em `getStoredActivities()` converter registros antigos com `environment` via `migrateLegacyDeployments` e apagar as chaves `environment`/`svn_releases` dos objetos (persistindo de volta). *depends on 3*

**Fase 3 — Aviso bloqueante no renderer (MigrationGate)**
11. Criar [src/components/MigrationGate.tsx](../../src/components/MigrationGate.tsx): props `{ info: StartupMigrationInfo; onFinished: () => void }`; máquina de fases `notice → running → done | error`; contador regressivo a partir de `info.countdownSeconds` (`setInterval` 1 s, limpo no unmount) com barra de progresso e botão desabilitado até zero; em `running` chama `window.electronAPI.runStartupMigration()` e mostra as três etapas; em `done` mostra caminho do backup (retornado pelo main), "Copiar caminho" (`copyTextToClipboard`), "Abrir pasta" (`openFileInFolder(backupPath)`), "Abrir página de versões" (`openReleasesPage`), instruções numeradas de downgrade (com `userDataDir` e `fromVersion` interpolados) e "Abrir o ShipIt!" → `onFinished`; em `error` distingue `stage === 'backup'` ("Nada foi alterado", "Tentar novamente"/"Fechar o app" via `app:quit`) de `stage === 'migration'` (caminho do backup + downgrade + "Fechar o app"). Opaco, tela cheia, `role="alertdialog"`, sem `Esc`/clique fora, tokens `warning`/`success`/`destructive`. Ids: `#migration-gate`, `#migration-gate-countdown`, `#migration-gate-confirm`, `#migration-gate-backup-path`, `#migration-gate-open-app`. *depends on 8*
12. Em [src/App.tsx](../../src/App.tsx): antes de montar layout/rotas, estado `startupMigration: 'checking' | StartupMigrationInfo | null`; no mount, se `window.electronAPI` existir, chamar `getStartupMigration()`; enquanto `'checking'` renderiza tela vazia (`bg-background`); se houver info, renderiza **somente** `<MigrationGate/>`; ao `onFinished`, monta o app normal. No browser (sem `electronAPI`) segue direto. *depends on 11*
13. Criar [src/components/MigrationGate.test.tsx](../../src/components/MigrationGate.test.tsx) (jsdom, `vi.useFakeTimers`): botão desabilitado com rótulo "(30 s)" e habilita após 30 s; textos obrigatórios presentes (mudanças importantes, backup, caminho planejado, passos de downgrade com `userDataDir` e link de versões); clique chama `runStartupMigration` e exibe etapas; `done` mostra o caminho retornado e "Abrir o ShipIt!" dispara `onFinished`; `error` no backup mostra "Nada foi alterado" e "Tentar novamente" re-chama a API; `error` na migração mostra caminho do backup e não oferece "Tentar novamente"; `Esc` não fecha. *depends on 11*

**Fase 4 — Componente editor (formulário)**
14. Criar [src/components/DeploymentsEditor.tsx](../../src/components/DeploymentsEditor.tsx): props `{ value: Deployment[]; onChange: (next: Deployment[]) => void; idPrefix?: string }`. Renderiza as três linhas na ordem de `ENVIRONMENTS`; toggle pill (`aria-pressed`, `type="button"`, ids `${idPrefix}-toggle-<abbr>`), trilho lateral em CSS, `InputTags` por linha (ids `${idPrefix}-releases-<abbr>`) com `validateTag`/`normalizeTag` de `svnReleases.ts`; estado local de releases retidas para linhas desmarcadas; texto clicável "Ainda não publicado — clique para marcar"; botão "↓ Repetir releases de <env>" quando aplicável. Tudo com tokens de tema (sem cor crua). *depends on 3*
15. Criar [src/components/DeploymentsEditor.test.tsx](../../src/components/DeploymentsEditor.test.tsx) (jsdom): renderiza três linhas; marcar chama `onChange` com o ambiente incluído (releases `[]`); adicionar release via vírgula atualiza só aquela linha; desmarcar remove do `onChange` mas re-marcar restaura as releases retidas; "Repetir releases" copia da linha anterior; ordem sempre dsv→hmg→prd no `onChange`. *depends on 14*
16. Em [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx): `ActivityForm` troca `svn_releases: string` + `environment: string` por `deployments: Deployment[]`; `buildActivityPayload` → `deployments: serializeDeployments(nextForm.deployments)`; `buildFormFingerprint` → `deployments: serializeDeployments(...)`; `loadedForm` → `parseDeployments(activity.deployments)`. Remover imports/handlers de `svnReleases`/`EnvironmentSelector` e as duas seções; renderizar **uma** seção `#activity-form-deployments-section` (mesmo lugar, mesmo estilo `border border-border/60 rounded-lg p-4 bg-muted/20`) com label "Publicações por ambiente (uso interno)", `DeploymentsEditor` e texto de ajuda. `onChange` → `setForm` + `setAutoSaveStatus('idle')`. *depends on 14*

**Fase 5 — Componente de exibição (lista + detalhe)**
17. Criar [src/components/DeploymentPipeline.tsx](../../src/components/DeploymentPipeline.tsx): props `{ deployments: Deployment[]; size?: 'sm' | 'md'; showReleases?: boolean; maxReleasesPerEnv?: number }`. Retorna `null` se vazio; caso contrário renderiza os três slots (marcado colorido com ícone + `ENVIRONMENT_ABBR`; não marcado tracejado/apagado com `title`), separadores `›`, releases copiáveis (`copyTextToClipboard`, `stopPropagation`) com truncamento `+n`. `aria-label` por slot ("Publicado em Produção — releases 12345" / "Ainda não publicado em Produção"). *depends on 3*
18. Criar [src/components/DeploymentPipeline.test.tsx](../../src/components/DeploymentPipeline.test.tsx): nada quando vazio; três slots quando há um marcado; releases truncadas com `+n`; clique em release chama cópia e não propaga; slot não marcado tem o `title` correto. *depends on 17*
19. Em [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx): remover `getCompactSvnReleases`, o bloco de chips de release e `EnvironmentBadge`; na linha do cabeçalho do card renderizar `<DeploymentPipeline size="sm" showReleases deployments={parseDeployments(activity.deployments)} />`; filtro de texto local passa a testar `a.deployments`. *depends on 17*
20. Em [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx): na linha de status trocar `EnvironmentBadge` por `<DeploymentPipeline size="md" />` (sem releases); substituir o bloco `#activity-detail-svn-releases` por `#activity-detail-deployments` com as três linhas (badge + chips copiáveis ou "Ainda não publicado") e o rodapé de "não exportado". Exibir o bloco só quando há ao menos um ambiente marcado. *depends on 17*
21. Em [src/components/SearchBar.tsx](../../src/components/SearchBar.tsx): fallback browser testa `a.deployments`. *depends on 2*
22. Remover `EnvironmentSelector.tsx` + `EnvironmentSelector.test.tsx`; remover `EnvironmentBadge.tsx` + teste **se** o pipeline não o usar internamente (sem duplicar estilo). Conferir com `tsc`/grep que nada em `src/`, `electron/` e `e2e/` referencia `svn_releases` ou `environment` (exceto o type `ActivityEnvironment`, `migrateLegacy…` e os testes de migração). *depends on 16, 19, 20*

**Fase 5b — Opcionais**
23. Filtro "Ambiente" em [ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx): estado `filterEnvironment`, `Select` (Todos + `ENVIRONMENTS`) ao lado dos filtros existentes, predicado `isDeployedTo(parseDeployments(a.deployments), filterEnvironment)`, incluído em `hasActiveFilters`/`clearFilters`. *depends on 19*
24. Seção "Backup do banco de dados" em [SettingsPage.tsx](../../src/pages/SettingsPage.tsx): lê `getLastMigrationNotice()`; mostra data, versão e caminho do último backup com "Abrir pasta"; some se não houver. *depends on 8*

**Fase 6 — DOCX, E2E e validação**
25. Em [electron/report-generator.integration.test.ts](../../electron/report-generator.integration.test.ts): substituir os dois testes atuais (svn/environment) por um que gera o DOCX com `deployments` preenchido em dsv+hmg+prd e afirma que nenhum número de release, nenhum nome de ambiente e nenhum placeholder `{{activity_deployments}}` aparece no `document.xml`; atualizar a fixture base (remover `svn_releases`, adicionar `deployments: null`). Atualizar [src/utils/validation.test.ts](../../src/utils/validation.test.ts) na mesma linha. *depends on 1*
26. Em [e2e/fixtures/activityFixtures.ts](../../e2e/fixtures/activityFixtures.ts): trocar `svn_releases: null` por `deployments: null`. Em [e2e/app.spec.ts](../../e2e/app.spec.ts): (a) atualizar "copies an svn release number…" para criar com `deployments: '{"Homologação":["<release>"]}'` e clicar no chip em `#activity-detail-deployments`; (b) substituir "selects an environment…" por "marks deployments per environment…": marcar Desenvolvimento, digitar duas releases, marcar Homologação, usar "Repetir releases", desmarcar/re-marcar Homologação (releases voltam), salvar; conferir na lista os chips `dsv`/`hmg` com releases e `prd` apagado; abrir o detalhe e conferir o bloco de publicações; (c) confirmar que em banco novo o `MigrationGate` **não** aparece; (d) filtro por ambiente (se o passo 23 entrar). *depends on 16, 19, 20*
27. Criar [e2e/migration.spec.ts](../../e2e/migration.spec.ts) com launch próprio: gerar com `sql.js` um `shipit.db` **legado** (tabela `activities` com `environment`/`svn_releases`, três linhas nas combinações legadas + perfil) e gravá-lo no `userData` de teste antes do launch, com `SHIPIT_E2E_MIGRATION_COUNTDOWN_SECONDS=2`; asserções: `#migration-gate` visível e nada do app atrás; botão desabilitado com contador, habilita após ~2 s; `Esc` não fecha; clicar → etapas → `done` com caminho do backup; arquivo do backup existe em `userData/backups/` com cabeçalho SQLite e mesmo tamanho do original; `PRAGMA table_info` (via `sql.js` lendo o arquivo) mostra `deployments` e não mostra `environment`/`svn_releases`; "Abrir o ShipIt!" → lista mostra as atividades migradas (pipeline com `dsv`/`hmg`) e a "só svn_releases" sem chips; relaunch → gate não aparece; `settings.json` tem `__migrationNotice` e `lastRunVersion`. **Escrito pelo Claude; execução do Playwright é do usuário** (`e2e-test-ownership`). *depends on 8, 11, 12*
28. Validação final: `npm run test` (Vitest) + `npm run build` (tsc dos dois processos); E2E rodado pelo usuário. *depends on all*
29. Ao concluir, invocar a skill `shipit-release-and-doc-sync` (modo Doc Sync) para CHANGELOG `[Unreleased]` (registrar explicitamente: aviso bloqueante na primeira abertura, backup em `userData/backups/`, remoção das colunas e descarte das releases sem ambiente, instruções de downgrade), TODO/DONE e [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (entidade `Activity`: coluna `deployments`; fluxo de inicialização `openDatabase → needsLegacyMigration → [gate] → backup → migração → finalizeDatabase`; handlers `app:getStartupMigration`/`app:runStartupMigration`/`app:getLastMigrationNotice`/`app:openReleasesPage`; chaves internas `__migrationNotice`/`lastRunVersion` em `settings.json`; módulo `db-backup.ts`). *depends on 28*

### Relevant files
- [electron/entities/Activity.ts](../../electron/entities/Activity.ts) — coluna `deployments`; remoção de `environment`/`svn_releases`.
- [electron/database.ts](../../electron/database.ts) — `openDatabase`/`needsLegacyMigration`/`migrateLegacyEnvironmentColumns`/`finalizeDatabase`, guarda em `getDb()`, `searchActivities` com `deployments`.
- [electron/db-backup.ts](../../electron/db-backup.ts) (+ `.test.ts`) — backup verificado do `shipit.db` (novo).
- [electron/main.ts](../../electron/main.ts) — fluxo de inicialização condicionado, `pendingMigration`, handlers `app:getStartupMigration`/`app:runStartupMigration`/`app:getLastMigrationNotice`/`app:openReleasesPage`, `lastRunVersion`.
- [electron/preload.ts](../../electron/preload.ts), [src/vite-env.d.ts](../../src/vite-env.d.ts) — exposição e tipos (`StartupMigrationInfo`, `StartupMigrationResult`, `ActivityData.deployments`).
- [src/App.tsx](../../src/App.tsx) — gate antes de layout/rotas.
- [src/components/MigrationGate.tsx](../../src/components/MigrationGate.tsx) (+ `.test.tsx`) — aviso bloqueante de 30 s, execução, resultado.
- [electron/database.test.ts](../../electron/database.test.ts) — persistência, migração, guarda, busca.
- [electron/report-generator.ts](../../electron/report-generator.ts) — só comentário; [report-generator.integration.test.ts](../../electron/report-generator.integration.test.ts) — regressão de não-exportação.
- [src/utils/deployments.ts](../../src/utils/deployments.ts) (+ `.test.ts`) — parse/serialize/ordem/migração legada (localDb).
- [src/utils/svnReleases.ts](../../src/utils/svnReleases.ts), [src/utils/environmentColors.ts](../../src/utils/environmentColors.ts), [src/utils/clipboard.ts](../../src/utils/clipboard.ts) — reuso sem alteração.
- [src/components/DeploymentsEditor.tsx](../../src/components/DeploymentsEditor.tsx) (+ `.test.tsx`) — editor de três linhas (toggle + `InputTags`).
- [src/components/DeploymentPipeline.tsx](../../src/components/DeploymentPipeline.tsx) (+ `.test.tsx`) — exibição dsv › hmg › prd para lista/detalhe.
- [src/components/InputTags.tsx](../../src/components/InputTags.tsx) — reuso sem alteração.
- [src/components/EnvironmentSelector.tsx](../../src/components/EnvironmentSelector.tsx), [src/components/EnvironmentBadge.tsx](../../src/components/EnvironmentBadge.tsx) — removidos (o segundo condicionado ao reuso interno).
- [src/pages/ActivityFormPage.tsx](../../src/pages/ActivityFormPage.tsx) — estado/payload/fingerprint/load + seção única.
- [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx) — pipeline no card, filtro de texto, filtro por ambiente (opcional).
- [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx) — pipeline na linha de status + bloco de publicações.
- [src/pages/SettingsPage.tsx](../../src/pages/SettingsPage.tsx) — seção de backup (opcional).
- [src/components/SearchBar.tsx](../../src/components/SearchBar.tsx) — fallback de busca.
- [src/services/localDb.ts](../../src/services/localDb.ts) — default + migração legada na leitura.
- [e2e/fixtures/activityFixtures.ts](../../e2e/fixtures/activityFixtures.ts), [e2e/app.spec.ts](../../e2e/app.spec.ts), [e2e/migration.spec.ts](../../e2e/migration.spec.ts) — fixtures e cenários (incluindo banco legado semeado).
- [src/utils/validation.test.ts](../../src/utils/validation.test.ts) — fixture de `ActivityData`.

### Gotchas
- **A ordem é o coração da entrega:** `openDatabase` (sem sync) → detectar → **aviso** → **backup verificado** → migração → `synchronize()`. Se o sync rodar antes, as colunas (e os dados de `environment`) somem sem aviso nem backup. Cobrir com testes unitários e com o E2E de banco legado.
- **Enquanto a migração está pendente, nada pode tocar o banco**: `cleanupTrash`, `startSchedulers`, handlers `db:*`, badge da lixeira do `Header`, etc. O renderer só monta o `MigrationGate` (sem layout), e `getDb()` lança como defesa extra. Não esquecer de rodar `cleanupTrash`/`startSchedulers` **depois** da migração.
- **Backup falhou → abortar tudo**: não migrar, não sincronizar; o app da versão anterior continua abrindo o banco intacto. Nunca deixar cópia parcial (remover em falha de verificação).
- **WAL**: fazer `PRAGMA wal_checkpoint(TRUNCATE)` antes de copiar para que `shipit.db` contenha tudo; copiar os sidecars mesmo assim.
- **SQLite + `synchronize()` recria a tabela** para dropar colunas (TypeORM copia os dados das colunas restantes). `deployments` precisa existir na tabela antes do sync (por isso o `ADD COLUMN` na migração) — caso contrário o sync a criaria vazia depois de descartar o que já tínhamos calculado.
- **Descarte irreversível no banco ativo** das releases sem ambiente e das colunas legadas: só o backup as preserva (decisão do usuário; registrar no CHANGELOG e no aviso).
- **Texto do aviso é parte do produto**: precisa citar explicitamente (1) mudanças importantes, (2) que o backup será feito, (3) o caminho do backup, (4) o passo a passo de downgrade. O teste do componente verifica esses quatro itens.
- **Countdown**: 30 s reais em produção; override por env apenas para E2E. Contador limpo no unmount (StrictMode monta duas vezes em dev).
- **Formato do JSON afeta a busca.** `LIKE` roda no texto bruto da coluna: chaves como `"environment"`/`"releases"` fariam qualquer termo assim casar com todas as atividades. O formato objeto-por-ambiente evita isso.
- **`[]` ≠ ausência.** Ambiente marcado sem releases é estado válido e precisa sobreviver ao parse/serialize (não filtrar arrays vazios).
- **Dois processos TS.** A migração e o backup em `electron/` não podem importar `src/`; manter parse CSV numérico local e cobrir com teste próprio.
- **Auto-save**: sem `deployments` no `buildFormFingerprint`, a mudança não dispararia o auto-save em modo edição.
- **`stopPropagation` nos chips da lista**: o card inteiro navega ao clique; copiar release não pode abrir o detalhe.
- **Sem cores cruas**: só `warning`/`success`/`destructive`/`chart-*`/`muted`/`border`/`primary` (regra do projeto).
- **Acentos** nos literais (`'Homologação'`, `'Produção'`): usar exatamente as mesmas strings do type em enum, JSON, tokens e testes.
- **E2E**: o Electron não sobe no sandbox; Claude escreve, o usuário executa.

### Verificação
1. `npm run dev` com um `shipit.db` da versão atual contendo atividades (só `environment`, `environment` + `svn_releases`, só `svn_releases`): o app abre **direto no aviso** (nada do app atrás), botão desabilitado com contador de 30 s, `Esc`/clique fora não fecham; o aviso mostra o caminho planejado do backup e os passos de downgrade.
2. Após 30 s, "Entendi, fazer backup e atualizar" → etapas Backup ✓ / Conversão ✓ / Atualização ✓ → tela de conclusão com o caminho; "Abrir pasta" revela o arquivo em `userData/backups/`; o arquivo abre em um visualizador SQLite e contém as colunas antigas.
3. "Abrir o ShipIt!" → lista: as duas primeiras atividades aparecem migradas no pipeline; a terceira aparece sem publicações. `PRAGMA table_info(activities)` no `shipit.db`: sem `environment`/`svn_releases`, com `deployments`. Reiniciar o app: sem aviso, tudo igual.
4. **Simular falha de backup** (ex.: tornar `userData/backups` um arquivo, ou sem permissão): a tela de erro diz que nada foi alterado; o `shipit.db` continua com as colunas antigas; "Tentar novamente" após corrigir conclui normalmente.
5. **Simular downgrade**: instalar a versão anterior, copiar o backup como `shipit.db` conforme as instruções do aviso, abrir → atividades com ambiente/releases como antes.
6. Criar atividade: marcar dsv, digitar `12345, 12346`; marcar hmg e usar "Repetir releases"; desmarcar hmg e re-marcar (releases voltam); salvar → card mostra `dsv · 12345, 12346 › hmg · 12345, 12346 › prd` (prd apagado). Editar e limpar tudo → card sem chips e `deployments = null`.
7. Criar segunda atividade só com prd em outra data — nada impede; card mostra dsv/hmg apagados e prd colorido.
8. Busca global por um número de release e por "Produção" encontra as atividades certas; filtro "Ambiente" (se incluído) reduz a lista corretamente.
9. Gerar DOCX do mês: nenhum número de release nem nome de ambiente no documento.
10. `npm run test` + `npm run build` verdes; `npm run test:e2e` (incluindo `migration.spec.ts`) executado pelo usuário.

### Fora de escopo (considerações futuras)
- **Duplicar atividade** — ver [plan-shipit43-duplicateActivity](plan-shipit43-duplicateActivity.prompt.md).
- **Backups periódicos/manuais** do banco (botão "Fazer backup agora" em Configurações, retenção): o módulo `db-backup.ts` já nasce reutilizável para isso.
- **Mecanismo genérico de migrações versionadas** (tabela `schema_version`): esta entrega usa detecção por schema (`PRAGMA`), suficiente para um caso; se surgirem mais migrações destrutivas, vale formalizar.
- **Datas por ambiente** (quando subiu em cada um): o modelo JSON comporta evoluir para `{ "Produção": { "releases": [...], "date": "..." } }` sem migrar novamente, mas não entra agora.
