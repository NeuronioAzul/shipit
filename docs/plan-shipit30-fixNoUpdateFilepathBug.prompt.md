# Plan: Fix "No update filepath provided" on restart

O bug ocorre porque `electron-updater` guarda o caminho do arquivo baixado **apenas em memória**. Ao reiniciar o app, a referência é perdida — mas nosso `settings.json` ainda tem `downloadedVersion`, então `buildInitialUpdateState` ([electron/main.ts](electron/main.ts#L254)) restaura `status: 'downloaded'` e mostra "Instalar agora". Clicar dispara `quitAndInstall()` que falha sem o filepath. Já existe um plano detalhado em [docs/plan-shipit30-fixNoUpdateFilepathBug.prompt.md](docs/plan-shipit30-fixNoUpdateFilepathBug.prompt.md) — confirmei que o código atual ainda bate com o "antes" descrito lá.

## Steps

1. **Patch 1** — Em [electron/main.ts](electron/main.ts#L254) `buildInitialUpdateState`: (a) trocar guard `!app.isPackaged` por `!app.isPackaged && !isE2EFakeUpdaterEnabled`; (b) quando `persistedState.downloadedVersion` existe, retornar `status: 'available'` (não `'downloaded'`), preservando `version` e `attentionVisible`. Usuário re-baixa e instala na mesma sessão.
2. **Patch 2** — Em [electron/update-notifications.ts](electron/update-notifications.ts#L374) `installUpdate`: envolver `quitAndInstall()` em try/catch; no catch, `sendStatus(createState('available', { version: currentState.version, error: getErrorMessage(error), attentionVisible: currentState.attentionVisible }))`. Fallback defensivo. *parallel com step 1*
3. **Teste unit** — Adicionar em [electron/update-notifications.test.ts](electron/update-notifications.test.ts) caso: estado `downloaded`, `quitAndInstall` mockado lança erro, asserir `sendStatus` chamado com `'available'` + mensagem de erro. *depends on step 2*
4. **Teste E2E** — Em [e2e/app.spec.ts](e2e/app.spec.ts) novo cenário: fake updater com `available` v X → baixar via UI → resetar service via `__shipitResetUpdateService` (simula restart) → asserir botão "Baixar" visível e "Instalar agora" ausente. *depends on step 1*

## Relevant files

- [electron/main.ts](electron/main.ts#L254) — `buildInitialUpdateState`, degradar `downloaded` → `available` no startup
- [electron/update-notifications.ts](electron/update-notifications.ts#L374) — `installUpdate`, try/catch defensivo
- [electron/update-notifications.test.ts](electron/update-notifications.test.ts) — novo unit test
- [e2e/app.spec.ts](e2e/app.spec.ts) — novo E2E

## Verification

1. `npm run test` — novo teste passa, 120 existentes continuam verdes.
2. `npm run test:e2e` — novo cenário passa, fluxos do fake updater intactos.
3. Smoke manual em build empacotado: download → encerrar → reabrir → status mostra "Baixar atualização vX.Y.Z" (não "Instalar agora") → re-download → instala sem erro.

## Decisions

- Incluído: degradar estado obsoleto e try/catch defensivo.
- Excluído: persistir o filepath entre restarts (exigiria integração mais profunda com `electron-updater` e é mais arriscado que re-baixar).
- Após restart o usuário precisa baixar de novo (~poucos MB) — trade-off aceitável vs. complexidade de persistir o arquivo.
