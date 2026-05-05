## Plan: Atualizações, Ícones e Limpeza Segura

Corrigir a duplicação de notificações de atualização removendo o uso de `autoUpdater.checkForUpdatesAndNotify()` e passando o fluxo para notificações próprias do ShipIt, com ícone/click controlados. Em paralelo, isolar todos os testes em um perfil temporário com marcador de segurança, para limpar artefatos de teste sem tocar na instalação real do Windows 11; limpeza global de cache de ícones ficará como rotina manual opt-in.

**Steps**
1. Consolidar identidade e caminhos do app no main process
   - Criar/extraír helpers em `d:\Programacao\Electron\ship-it\electron\runtime-paths.ts` ou módulo equivalente para `APP_ID`, `APP_NAME`, resolução de assets públicos, ícone de janela, ícone de notificação e modo de teste.
   - Reaproveitar o padrão já existente em `getSoundsDir()` de `electron/main.ts`, mas tornar a resolução reutilizável para `BrowserWindow`, `Tray`, `Notification` e testes.
   - Adicionar fallback explícito quando um ícone não existir ou `nativeImage.createFromPath()` ficar vazio.
   - Dependência: nenhuma; deve ser feito antes dos ajustes de janela/notificação.

2. Corrigir fluxo de auto-update e remover notificações duplicadas
   - Em `d:\Programacao\Electron\ship-it\electron\main.ts`, substituir todas as chamadas a `autoUpdater.checkForUpdatesAndNotify()` por `autoUpdater.checkForUpdates()`.
   - Manter `autoUpdater.autoDownload = true` e os eventos `checking-for-update`, `update-available`, `update-not-available`, `update-downloaded` e `error`, mas garantir que apenas as notificações customizadas do ShipIt sejam exibidas.
   - Criar helper testável para mostrar notificação de atualização com título/body em pt-BR, ícone ShipIt e `notification.on('click')` chamando um helper central de foco/navegação da janela principal.
   - Adicionar proteção contra chamadas concorrentes de `app:checkForUpdate` e contra notificação repetida da mesma versão/status, para evitar duplicação por cliques rápidos ou reemissão de eventos.
   - Dependência: step 1.

3. Garantir que clique em notificação abra/focalize o ShipIt correto
   - Centralizar `show/focus/restore` da janela em helper usado por tray, alertas e update notifications.
   - Para notificações de update, ao clicar: restaurar se minimizado, mostrar, focar e navegar para `/settings` ou manter a tela atual com status de atualização visível; recomendação: navegar para `/settings` porque é onde o estado de update já existe.
   - Implementar/verificar `app.requestSingleInstanceLock()` com handler de `second-instance` para evitar uma segunda janela Electron quando o Windows ativar o app por toast/atalho.
   - Preservar o comportamento de tray que intercepta fechamento, mas garantir que `app.exit(0)` em teste continue funcionando.
   - Dependência: step 2.

4. Corrigir identidade visual no Windows e taskbar
   - Em `d:\Programacao\Electron\ship-it\electron\main.ts`, definir nome/AppUserModelId com constantes do app antes de criar janelas/notificações; manter `com.neuronioazul.shipit` para produção.
   - Alinhar o ícone do `BrowserWindow`, notificações, tray e `electron-builder` para a mesma fonte canônica. Hoje a janela usa `public/assets/images/icons/ShipIt.ico`, enquanto `package.json` usa `build/icon.ico`; o plano deve comparar os arquivos e escolher uma fonte canônica ou garantir que `build/icon.ico` seja gerado/copiado a partir dela.
   - Garantir que o ícone de notificação use `ShipIt.ico`/PNG compatível e fallback local, nunca o ícone padrão do Electron.
   - Em modo de teste/E2E, usar identidade isolada opcional (`ShipIt! Test` e AppUserModelId sufixado) para não agrupar notificações com a versão instalada, sem alterar o appId de produção.
   - Dependência: steps 1 e 3.

5. Isolar dados de teste e criar rotina automática de limpeza segura
   - Adicionar modo de teste explícito (`PLAYWRIGHT`/`NODE_ENV=test` mais `SHIPIT_TEST_USER_DATA_DIR`) que chama `app.setPath('userData', testDir)` antes de qualquer uso de `app.getPath('userData')`.
   - O diretório de teste deve conter marcador como `.shipit-test-profile`; cleanup só pode remover diretórios com esse marcador e prefixo esperado.
   - Atualizar `e2e/app.spec.ts` ou criar helpers globais para criar diretório temporário, passar env para `electron.launch`, registrar marcador e remover tudo no `afterAll`/teardown após `app.exit(0)`.
   - Não apagar nem modificar `%APPDATA%\shipit`, registros de auto-launch/instalador ou qualquer pasta da instalação real.
   - Incluir logs/erros úteis se o cleanup não puder remover algum arquivo por handle aberto.
   - Paralelo possível: pode ser feito em paralelo com steps 2-4 depois que o helper de modo de teste do step 1 existir.

6. Adicionar rotina manual opt-in para cache de ícones do Windows
   - Criar script/documentação em `d:\Programacao\Electron\ship-it\docs\scripts\clear-shipit-icon-cache.ps1` ou local equivalente.
   - Default deve ser dry-run/WhatIf; execução real precisa flag explícita.
   - Avisar que cache de ícones do Windows é global e pode exigir reiniciar Explorer; a rotina não roda automaticamente nos testes.
   - A rotina não deve excluir dados do ShipIt instalado, banco, evidências, relatórios, settings nem chaves de produção; no máximo limpar caches globais do shell quando o usuário optar.
   - Dependência: step 5 para manter a distinção entre limpeza automática e manual.

7. Criar testes unitários de auto-update/notificações
   - Extrair lógica testável para módulo como `d:\Programacao\Electron\ship-it\electron\update-notifications.ts` ou equivalente, evitando testar diretamente todo o `main.ts` monolítico.
   - Testar que o fluxo usa `checkForUpdates()` e nunca `checkForUpdatesAndNotify()`.
   - Testar `update-available`, `update-downloaded`, `update-not-available` e `error`: eventos IPC enviados ao renderer, mensagens em pt-BR, ícone ShipIt resolvido e exatamente uma notificação por versão/status.
   - Testar clique da notificação usando fake `Notification`: deve chamar helper de foco/navegação da janela existente e não criar `BrowserWindow` novo.
   - Dependência: steps 1-3.

8. Criar testes de identidade visual/caminhos
   - Testar helpers de asset path em dev/test/packaged simulado.
   - Testar que os paths configurados em `package.json` existem e que a fonte canônica de ícone está alinhada com `BrowserWindow`/notificação.
   - Testar fallback de `nativeImage` quando ícone ausente ou inválido.
   - Dependência: steps 1 e 4.

9. Criar/ajustar testes E2E de isolamento e limpeza
   - Em `d:\Programacao\Electron\ship-it\e2e\app.spec.ts` e/ou novos specs, validar via `app.evaluate()` que `app.getPath('userData')` aponta para diretório temporário com marcador, não para o diretório de produção.
   - Criar artefatos de teste (db/settings/evidences/trash/reports temporários) e validar que são removidos no teardown.
   - Adicionar teste/checagem para garantir que o cleanup se recusa a remover diretório sem marcador.
   - Dependência: step 5.

10. Verificação manual Windows 11 para o que não é confiável automatizar
   - Rodar build local e, se necessário, artefato portátil/test-mode para não alterar a instalação real.
   - Verificar visualmente: taskbar com ícone ShipIt, toast em pt-BR com ícone ShipIt, nenhum toast em inglês “New version available”, clique do toast foca a janela existente do ShipIt e não abre janela Electron separada.
   - Executar a rotina manual de cache primeiro em dry-run; só aplicar se o ícone antigo/corrompido persistir.
   - Dependência: steps 2-6.

**Relevant files**
- `d:\Programacao\Electron\ship-it\electron\main.ts` — fluxo principal do Electron, `app.setAppUserModelId`, `createWindow`, `createTray`, schedulers, `Notification`, eventos do `autoUpdater`, IPC `app:checkForUpdate` e `app:installUpdate`.
- `d:\Programacao\Electron\ship-it\electron\preload.ts` — ponte `checkForUpdate`, `installUpdate`, `onUpdateStatus`; confirmar se o contrato continua suficiente.
- `d:\Programacao\Electron\ship-it\src\pages\SettingsPage.tsx` — botão “Verificar atualizações” e exibição de status; ajustar apenas se o novo contrato de update exigir.
- `d:\Programacao\Electron\ship-it\src\vite-env.d.ts` — tipos de `UpdateStatusData`/`checkForUpdate`, caso o contrato passe a devolver estado adicional como `already-checking`.
- `d:\Programacao\Electron\ship-it\package.json` — `build.appId`, `productName`, `build.win.icon`, scripts de teste/build e possível script manual de limpeza.
- `d:\Programacao\Electron\ship-it\playwright.config.ts` — possível global setup/teardown e garantias de execução serial.
- `d:\Programacao\Electron\ship-it\e2e\app.spec.ts` — launch env atual e teardown; adicionar isolamento de `userData` e testes de cleanup.
- `d:\Programacao\Electron\ship-it\electron\database.ts` e `d:\Programacao\Electron\ship-it\electron\report-generator.ts` — usam `app.getPath('userData')`; devem ser protegidos indiretamente por `app.setPath('userData', testDir)` cedo no main process.
- `d:\Programacao\Electron\ship-it\electron\database.test.ts` — referência existente de isolamento em unit tests via mock de `app.getPath('userData')`.
- `d:\Programacao\Electron\ship-it\public\assets\images\icons\ShipIt.ico`, `d:\Programacao\Electron\ship-it\public\assets\images\icons\favicon-96x96.png`, `d:\Programacao\Electron\ship-it\build\icon.ico` — fontes de ícone a alinhar/verificar.
- `d:\Programacao\Electron\ship-it\docs\scripts\clear-shipit-icon-cache.ps1` — novo script/documentação manual opt-in para cache de ícones.

**Verification**
1. Rodar `rg "checkForUpdatesAndNotify"` e confirmar que não há uso restante em código de produção.
2. Rodar testes unitários novos/focados para update, notificações, paths e identidade visual.
3. Rodar `npm run test` para garantir a suíte Vitest completa.
4. Rodar `npm run build`, obrigatório porque E2E usa `dist/` e `dist-electron/`.
5. Rodar `npm run test:e2e` e confirmar que o perfil temporário é criado/removido, sem escrita em `%APPDATA%\shipit`.
6. Fazer smoke manual no Windows 11 com build portátil/test-mode: um único toast em pt-BR, ícone ShipIt na notificação/taskbar, clique focando a janela existente.
7. Opcional/manual: executar o script de cache em dry-run; aplicar somente se ainda houver ícone antigo/corrompido no shell.

**Decisions**
- Usar `checkForUpdates()` em vez de `checkForUpdatesAndNotify()` para impedir a notificação automática em inglês do Electron/electron-updater.
- Automatizar limpeza apenas de perfil temporário de teste com marcador; não tocar automaticamente no cache global de ícones do Windows, registros globais ou dados da instalação real.
- Fornecer limpeza de cache de ícones como rotina manual opt-in, com dry-run padrão e aviso de impacto global.
- Testes automatizados cobrirão lógica, paths, deduplicação, click handler e isolamento; validações visuais nativas de taskbar/toast ficam como smoke manual no Windows, porque APIs de automação não leem com confiabilidade o visual real do Action Center/taskbar.

**Further Considerations**
1. Para simular “nova versão disponível” sem depender do GitHub real, preferir testes unitários com `autoUpdater` fake; E2E deve validar integração segura, não o serviço externo.
2. Se for necessário testar instalador/NSIS, criar etapa manual separada usando diretório de instalação temporário e nunca desinstalar/limpar a versão real instalada.
3. Após estabilizar, registrar no `docs/TODO.md` ou changelog apenas no momento da implementação, para evitar documentação prometendo correção antes dos testes passarem.
