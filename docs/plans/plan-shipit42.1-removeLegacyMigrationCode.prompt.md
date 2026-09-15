## Plan: Limpeza pós-migração — remover o código de uso único do plano 42

Remover do app tudo o que o [plano 42](plan-shipit42-deploymentsPerEnvironment.prompt.md) adicionou **apenas para migrar** os bancos antigos (`environment`/`svn_releases` → `deployments`): detecção de schema legado, migração em SQL, backup pré-migração, aviso bloqueante (`MigrationGate`), handlers IPC, tipos, testes e o spec E2E de migração. Depois que a versão com a migração estiver publicada e as instalações conhecidas tiverem migrado, esse código vira peso morto — funções nunca mais chamadas, um componente que nunca mais monta e um caminho de inicialização que nunca mais executa. O objetivo é deixar o app **sem sujeira de migração**, mantendo somente a infraestrutura mínima e genérica (sync explícito de schema e chaves internas de `settings.json`) e uma **guarda de segurança** de poucas linhas para quem pular a versão intermediária.

> **Premissa desta redação:** o pedido cita "última atualização do plano `plan-shipit43-duplicateActivity`", mas o plano 43 (duplicar atividade) ainda não foi implementado e não tem migração. O código de migração/backup/aviso é do **plano 42** — é dele que este plano limpa. Se a intenção era outra, ajustar antes de aprovar.

### Pré-condições (não implementar antes)

1. A versão que publica o plano 42 (prevista **1.14.0**) já foi lançada pelo `release_v2.py` e está disponível no GitHub Releases.
2. Pelo menos **uma versão de distância**: este plano entra em uma release posterior (1.15.0 ou seguinte), nunca na mesma release do plano 42.
3. As instalações conhecidas já abriram a 1.14.x ao menos uma vez (o aviso foi confirmado e o backup criado). Registrar aqui a data/versão em que isso foi verificado: `____`.
4. Anotar o hash do commit do plano 42 (`git log --oneline -- electron/db-backup.ts | tail -1`) no CHANGELOG desta limpeza, para que o código removido possa ser recuperado do histórico se um dia for necessário.

### Contexto

Inventário do que o plano 42 deixou e que só serve à migração (verificado no código em 14/09/2026):

| Área | Itens de uso único |
| --- | --- |
| [electron/database.ts](../../electron/database.ts) | `needsLegacyMigration`, `migrateLegacyEnvironmentColumns`, `parseLegacyReleasesCsv`, `LegacyActivityRow`, `migrationPending` + `setMigrationPending`/`isMigrationPending` e as checagens em `getDb()`/`initDatabase()` |
| [electron/db-backup.ts](../../electron/db-backup.ts) (+ `.test.ts`) | módulo inteiro (`buildBackupPath`, `createDatabaseBackup`, `DatabaseBackupError`) — só chamado por `runStartupMigration` |
| [electron/main.ts](../../electron/main.ts) | `pendingMigration`, `databaseReady`, `prepareDatabaseOnStartup`, `startDatabaseDependentServices`, `runStartupMigration`, `resolveMigrationCountdownSeconds`, `DEFAULT_MIGRATION_COUNTDOWN_SECONDS`, `RELEASES_URL`, tipos `StartupMigrationInfo`/`StartupMigrationResult`/`MigrationNoticeData`, `MIGRATION_NOTICE_SETTINGS_KEY`, `readMigrationNotice`, handlers `app:getStartupMigration`, `app:runStartupMigration`, `app:getLastMigrationNotice`, `app:openReleasesPage`, env `SHIPIT_E2E_MIGRATION_COUNTDOWN_SECONDS` |
| [electron/preload.ts](../../electron/preload.ts) / [src/vite-env.d.ts](../../src/vite-env.d.ts) | `getStartupMigration`, `runStartupMigration`, `getLastMigrationNotice`, `openReleasesPage`; interfaces `StartupMigrationInfo`, `StartupMigrationResult`, `MigrationNoticeData` |
| [src/App.tsx](../../src/App.tsx) | `useStartupMigration`, estado `'checking'`, render condicional do gate |
| [src/components/MigrationGate.tsx](../../src/components/MigrationGate.tsx) (+ `.test.tsx`) | componente inteiro |
| [src/pages/SettingsPage.tsx](../../src/pages/SettingsPage.tsx) | seção `#settings-backup-section`, estado `migrationNotice`, chamada `getLastMigrationNotice`, import de `copyTextToClipboard` |
| [src/services/localDb.ts](../../src/services/localDb.ts) | `StoredActivity`, `migrateStoredActivities`, import de `migrateLegacyDeployments` |
| [src/utils/deployments.ts](../../src/utils/deployments.ts) (+ `.test.ts`) | `migrateLegacyDeployments` e seu `describe` |
| [electron/database.test.ts](../../electron/database.test.ts) | `describe('Legacy schema migration (plano 42)')` e os imports correspondentes |
| [e2e/migration.spec.ts](../../e2e/migration.spec.ts) | spec inteiro; em [e2e/app.spec.ts](../../e2e/app.spec.ts) o teste `does not show the migration gate on a fresh database` |
| Docs | [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (seção `db-backup.ts`, diagrama "Fluxo de migração na inicialização", handlers, componentes, `settings.json`), [CLAUDE.md](../../CLAUDE.md) (linha "Migração destrutiva de schema" e gotcha do sync), [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) (menção ao `migration.spec.ts` e contagens), [DEPENDENCIES.md](../../docs/DEPENDENCIES.md) (contagem de cenários E2E) |

O que **fica** (infraestrutura genérica, pequena e documentada, não específica do plano 42):

- `openDatabase()` / `finalizeDatabase()` / `initDatabase()` com `synchronize: false` nas opções e `dataSource.synchronize()` explícito — é o mecanismo que permite fazer migrações antes do sync no futuro (regra do `CLAUDE.md`).
- Chaves internas de `settings.json` (`isInternalSettingsKey`, `getInternalSettings`, `writeInternalSetting`) e `__lastRunVersion` (`readLastRunVersion`, gravada quando o banco fica pronto) — úteis para a guarda abaixo e para qualquer migração futura.
- `InputTags` com `autoFocus`/`onFocus` — usado pelo `DeploymentsEditor`.
- O arquivo `__migrationNotice` em `settings.json` de quem migrou: dado inerte, sem código lendo. Não apagar (evita mais código de limpeza); mencionar no CHANGELOG que o caminho do backup continua em `{userData}/backups/`.

### Decisões de design

**Guarda de schema (o único remanescente "consciente" da migração)**

Quem pular a 1.14.x e instalar direto a versão limpa cairia no `finalizeDatabase()` com `environment`/`svn_releases` ainda no banco: o `synchronize()` dropa as colunas **sem aviso e sem backup**. Para fechar essa porta com o mínimo de código, manter uma guarda declarativa em `database.ts`:

```ts
/** Colunas que denunciam um schema anterior a uma migração já removida do app. */
const UNSUPPORTED_LEGACY_SCHEMA = [
  { table: 'activities', column: 'environment', migrateWithVersion: '1.14.x' },
] as const

export async function findUnsupportedLegacySchema(ds): Promise<{ column; migrateWithVersion } | null>
```

- `app.whenReady` → `openDatabase()` → `findUnsupportedLegacySchema()`; se encontrar: `dialog.showErrorBox('Banco de dados de uma versão antiga', 'Instale e abra a versão 1.14.x do ShipIt! antes desta para migrar seus dados com backup: https://github.com/NeuronioAzul/shipit/releases')` e `app.quit()` **sem** chamar `finalizeDatabase()` — o arquivo fica intocado. Caso contrário, fluxo normal.
- ~20 linhas (constante + função + `if` no startup) substituindo ~900 linhas de código de migração. Sem UI React, sem IPC, sem backup.
- Ver **Decisão pendente 1** para a alternativa "remover tudo".

**Inicialização volta a ser linear**

```
app.whenReady → openDatabase → findUnsupportedLegacySchema? (erro + quit) → finalizeDatabase → cleanupTrash → startSchedulers → __lastRunVersion → protocolos → createWindow → tray → updater
```

`App.tsx` volta a montar `ThemeProvider → HashRouter → …` diretamente, sem estado `'checking'`.

**Testes**: remover os de migração/backup/gate; adicionar um teste de banco para `findUnsupportedLegacySchema` (banco novo → `null`; tabela com `environment` → objeto com `migrateWithVersion: '1.14.x'`) e um E2E curto que semeia um `shipit.db` legado (reaproveitar o `seedLegacyDatabase` do `migration.spec.ts` antes de apagá-lo) e verifica que o app **fecha sem alterar o arquivo** (hash antes/depois igual) — a caixa de diálogo nativa não é observável pelo Playwright, então a asserção é "processo encerrado + arquivo intacto".

### Decisões pendentes (para aprovação)

1. **Manter a guarda de schema** (recomendado — evita perda silenciosa de dados para quem pular a 1.14.x; custo ~20 linhas) **ou remover absolutamente tudo** e aceitar o risco (o único usuário conhecido já migrou). O plano assume a guarda.
2. **`db-backup.ts`**: remover (recomendado — YAGNI; o plano 42 listou "backups periódicos/manuais" como ideia futura, mas não há tarefa concreta; o módulo fica no histórico do git) **ou** manter como utilitário à espera de uso. O plano assume remover.
3. **Seção "Backup do banco de dados" em Configurações**: remover (recomendado — o backup continua no disco e o CHANGELOG da 1.14.0 documenta a pasta) **ou** manter como consulta permanente. O plano assume remover.

### Steps

**Fase 0 — Pré-condições e rastreabilidade**
1. Confirmar as pré-condições acima (versão 1.14.x publicada, instalações migradas) e registrar o hash do commit do plano 42 para referência no CHANGELOG.

**Fase 1 — Processo principal (Electron)**
2. Em [electron/database.ts](../../electron/database.ts): remover `needsLegacyMigration`, `migrateLegacyEnvironmentColumns`, `parseLegacyReleasesCsv`, `LegacyActivityRow`, `migrationPending`, `setMigrationPending`, `isMigrationPending` e as checagens em `getDb()`/`initDatabase()`/`finalizeDatabase()`/`resetDatabase()`. Adicionar `UNSUPPORTED_LEGACY_SCHEMA` + `findUnsupportedLegacySchema(ds)` (reaproveita `getActivityColumns`; generalizar para `getTableColumns(ds, table)`). Manter `openDatabase`/`finalizeDatabase`/`initDatabase` com o comentário explicando o sync explícito.
3. Remover [electron/db-backup.ts](../../electron/db-backup.ts) e [electron/db-backup.test.ts](../../electron/db-backup.test.ts) (`git rm`). *parallel with 2*
4. Em [electron/main.ts](../../electron/main.ts): remover `pendingMigration`, `databaseReady`, `prepareDatabaseOnStartup`, `startDatabaseDependentServices`, `runStartupMigration`, `resolveMigrationCountdownSeconds`, `DEFAULT_MIGRATION_COUNTDOWN_SECONDS`, `RELEASES_URL`, os três tipos, `MIGRATION_NOTICE_SETTINGS_KEY`, `readMigrationNotice` e os quatro handlers. Reescrever o `app.whenReady` linear (seção "Inicialização volta a ser linear"), com `findUnsupportedLegacySchema` → `dialog.showErrorBox` + `app.quit()`. Manter `isInternalSettingsKey`/`getInternalSettings`/`writeInternalSetting`/`readLastRunVersion` e a gravação de `__lastRunVersion`. *depends on 2, 3*
5. Em [electron/preload.ts](../../electron/preload.ts) e [src/vite-env.d.ts](../../src/vite-env.d.ts): remover os quatro métodos e as três interfaces. *depends on 4*
6. Testes em [electron/database.test.ts](../../electron/database.test.ts): apagar o `describe('Legacy schema migration (plano 42)')` e imports; adicionar `describe('Unsupported legacy schema guard')` (banco novo → `null`; `ALTER TABLE activities ADD COLUMN environment text` → objeto com `column: 'environment'` e `migrateWithVersion: '1.14.x'`; `finalizeDatabase` **não** é chamado pelo teste — a guarda é só detecção). *depends on 2*

**Fase 2 — Renderer**
7. Em [src/App.tsx](../../src/App.tsx): remover `useStartupMigration`, o estado `'checking'`, o render do gate e os imports; `App` volta a retornar a árvore direta. *depends on 5*
8. Remover [src/components/MigrationGate.tsx](../../src/components/MigrationGate.tsx) e [src/components/MigrationGate.test.tsx](../../src/components/MigrationGate.test.tsx). *depends on 7*
9. Em [src/pages/SettingsPage.tsx](../../src/pages/SettingsPage.tsx): remover a seção `#settings-backup-section`, o estado `migrationNotice`, a chamada a `getLastMigrationNotice` e o import de `copyTextToClipboard` (conferir que nada mais o usa no arquivo) e o tipo `MigrationNoticeData` do import. *depends on 5*
10. Em [src/services/localDb.ts](../../src/services/localDb.ts): remover `StoredActivity`, `migrateStoredActivities` e o import; `getStoredActivities` volta a `JSON.parse` direto. Em [src/utils/deployments.ts](../../src/utils/deployments.ts): remover `migrateLegacyDeployments` (e o import de `parseSvnReleasesStored` se ficar sem uso); em [deployments.test.ts](../../src/utils/deployments.test.ts) remover o `describe('migrateLegacyDeployments')`. *parallel with 7*
11. `npx tsc --noEmit` + `npx tsc -p tsconfig.electron.json --noEmit` + grep de guarda: nenhuma ocorrência de `MigrationGate`, `StartupMigration`, `migrateLegacy`, `db-backup`, `runStartupMigration`, `SHIPIT_E2E_MIGRATION_COUNTDOWN_SECONDS` em `src/`, `electron/`, `e2e/`. *depends on 2–10*

**Fase 3 — E2E**
12. Em [e2e/app.spec.ts](../../e2e/app.spec.ts): remover o teste `does not show the migration gate on a fresh database` (não há mais gate). Criar [e2e/legacy-schema-guard.spec.ts](../../e2e/legacy-schema-guard.spec.ts) com launch próprio: semear `shipit.db` legado (mover `seedLegacyDatabase` do `migration.spec.ts` para `e2e/fixtures/legacyDatabase.ts`), calcular hash SHA-256 do arquivo, lançar o app, aguardar o processo encerrar (`app.waitForEvent('close')` com timeout), conferir que o hash não mudou e que não existe `{userData}/backups/`. Remover [e2e/migration.spec.ts](../../e2e/migration.spec.ts). Rodar com `env -u ELECTRON_RUN_AS_NODE npx playwright test` após `npm run build`. *depends on 4*

**Fase 4 — Validação, documentação e entrega**
13. `npm run test` + `npm run build` + `env -u ELECTRON_RUN_AS_NODE npx playwright test` (suíte inteira). *depends on all*
14. Invocar a skill `shipit-release-and-doc-sync` (Doc Sync): CHANGELOG `[Unreleased]` → `Removido` (código de migração/backup/aviso do plano 42, com o hash de referência e a nota "quem ainda estiver em versão ≤ 1.13 deve instalar a 1.14.x primeiro; o backup criado na 1.14.x continua em `{userData}/backups/`") e `Alterado` (guarda de schema); DONE.md com `> Plano:` para este arquivo; [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (remover seção `db-backup.ts` e o diagrama de migração, descrever a guarda, atualizar handlers/componentes/`settings.json`, recontar handlers e métodos do preload no código); [CLAUDE.md](../../CLAUDE.md) (linha do mapa "Migração destrutiva de schema" passa a apontar para o padrão documentado no plano 42 + `findUnsupportedLegacySchema`; gotcha do sync mantido); [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) e [DEPENDENCIES.md](../../docs/DEPENDENCIES.md) (contagens de testes/cenários, remover menção ao `migration.spec.ts`). *depends on 13*
15. **Não commitar manualmente.** Deixar o working tree pronto e disparar (com confirmação do usuário) `python docs/scripts/release_v2.py` — o commit, o bump e o CI/CD são do script. *depends on 14*

### Relevant files
- [electron/database.ts](../../electron/database.ts) — remoção da migração; nova guarda `findUnsupportedLegacySchema`.
- [electron/db-backup.ts](../../electron/db-backup.ts), [electron/db-backup.test.ts](../../electron/db-backup.test.ts) — removidos.
- [electron/main.ts](../../electron/main.ts) — startup linear + guarda com `dialog.showErrorBox`; remoção de handlers e estado de migração.
- [electron/preload.ts](../../electron/preload.ts), [src/vite-env.d.ts](../../src/vite-env.d.ts) — remoção de 4 métodos/3 tipos.
- [electron/database.test.ts](../../electron/database.test.ts) — troca do bloco de migração pelo da guarda.
- [src/App.tsx](../../src/App.tsx), [src/components/MigrationGate.tsx](../../src/components/MigrationGate.tsx) (+ test), [src/pages/SettingsPage.tsx](../../src/pages/SettingsPage.tsx) — remoção do gate e da seção de backup.
- [src/services/localDb.ts](../../src/services/localDb.ts), [src/utils/deployments.ts](../../src/utils/deployments.ts) (+ test) — remoção da migração do fallback.
- [e2e/app.spec.ts](../../e2e/app.spec.ts), [e2e/migration.spec.ts](../../e2e/migration.spec.ts) (removido), [e2e/legacy-schema-guard.spec.ts](../../e2e/legacy-schema-guard.spec.ts) (novo), `e2e/fixtures/legacyDatabase.ts` (novo).
- Docs: `CHANGELOG.md`, `docs/DONE.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/DEVELOPMENT.md`, `docs/DEPENDENCIES.md`.

### Gotchas
- **Nunca na mesma release do plano 42.** Se a limpeza for publicada junto, ninguém migra com backup — a guarda recusaria todos os bancos antigos.
- **`finalizeDatabase()` continua destrutivo** para colunas ausentes das entidades. A guarda tem de rodar **antes** dele e encerrar o app sem sincronizar; cobrir com o E2E de hash intacto.
- **`getDb()` sem guarda de pendência**: ao remover `migrationPending`, garantir que `cleanupTrash`/`startSchedulers` só rodem depois de `finalizeDatabase` (o startup linear já garante).
- **`InputTags.autoFocus`/`onFocus` não são sujeira**: o `DeploymentsEditor` usa. Não remover.
- **Chave `__migrationNotice` órfã** em `settings.json` de quem migrou: inerte; não escrever código só para apagá-la.
- **Diálogo nativo não aparece no Playwright**: a asserção do E2E é "processo encerrou + arquivo intacto + sem pasta `backups/`", não o texto do diálogo.
- **Contagens em docs** (handlers, métodos do preload, testes, cenários) devem ser recontadas no código após a remoção — nunca copiar os números do plano 42.
- **E2E na sessão do Claude:** rodar com `env -u ELECTRON_RUN_AS_NODE` (ver `docs/DEVELOPMENT.md`).

### Verificação
1. Banco novo (`userData` vazio): app abre direto na tela normal; `PRAGMA table_info(activities)` tem `deployments` e não tem `environment`.
2. Banco já migrado pela 1.14.x: abre normalmente, sem aviso; Configurações não mostra mais a seção de backup; `{userData}/backups/` continua intacta.
3. Banco legado (≤ 1.13, com `environment`): aparece a caixa de erro nativa com a instrução de instalar a 1.14.x, o app fecha e o `shipit.db` fica byte a byte igual (sem `backups/`).
4. `grep -rn "MigrationGate\|StartupMigration\|migrateLegacy\|db-backup\|runStartupMigration" src electron e2e` → vazio.
5. `npm run test`, `npm run build` e `env -u ELECTRON_RUN_AS_NODE npx playwright test` verdes; contagens atualizadas nos docs.
6. Entrega via `python docs/scripts/release_v2.py` (com confirmação) — sem commit manual.

### Fora de escopo
- Mecanismo genérico de migrações versionadas (tabela `schema_version`): só vale a pena quando houver a segunda migração destrutiva; a guarda declarativa cobre o caso atual.
- Backups periódicos/manuais do banco: se virarem tarefa, recuperar `db-backup.ts` do histórico do git (hash anotado no CHANGELOG desta limpeza).
- Plano 43 (duplicar atividade) e plano 44 (PDF) — independentes; podem ser implementados antes ou depois.
