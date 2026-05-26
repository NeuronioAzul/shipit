## Plan: Compatibilidade do userData

Corrigir a regressão de caminho de dados fixando explicitamente o `userData` de produção no legado `%APPDATA%\shipit`, mantendo `npm run dev` no caminho separado `%APPDATA%\ShipIt!` e preservando o isolamento E2E existente. A correção deve acontecer antes de qualquer `app.getPath('userData')`, porque banco, evidências, relatórios e settings dependem desse caminho.

**Steps**
1. Confirmar a regra de identidade e caminho no runtime
   - Em `electron/runtime-paths.ts`, documentar por helpers explícitos a diferença entre nome visual (`ShipIt!`) e diretório de dados de produção (`shipit`).
   - Adicionar constantes como `PRODUCTION_USER_DATA_DIR_NAME = 'shipit'` e `DEVELOPMENT_USER_DATA_DIR_NAME = 'ShipIt!'`.
   - Corrigir o desalinhamento de `APP_ID`: hoje `runtime-paths.ts` usa `br.com.neuronioazul.shipit`, enquanto `package.json` usa `com.neuronioazul.shipit`. Recomendação: alinhar o runtime ao `package.json` para não criar identidade Windows divergente.
   - Dependência: nenhuma.

2. Criar helper central para configurar `userData`
   - Adicionar função testável em `electron/runtime-paths.ts`, por exemplo `configureUserDataDir(app, env)` ou expandir `configureTestUserDataDir()` para cobrir todos os modos.
   - Usar uma árvore de decisão simples para configurar `userData`: se `SHIPIT_TEST_USER_DATA_DIR` estiver definido, usar o perfil temporário marcado; senão, se `app.isPackaged` for true, usar `appData/shipit`; senão, usar `appData/ShipIt!` para desenvolvimento.
   - O helper deve ser chamado antes de qualquer uso de `app.getPath('userData')`.
   - Depende do step 1.

3. Integrar o helper cedo no processo principal
   - Em `electron/main.ts`, substituir a chamada direta a `configureTestUserDataDir(app)` pelo novo helper geral.
   - Manter `app.setName('ShipIt!')` para marca/UX, mas impedir que isso altere o caminho de dados em produção.
   - Garantir que `app.setAppUserModelId(APP_ID)` use o mesmo `APP_ID` do `package.json`.
   - Verificar que `initDatabase()`, protocolos `shipit-evidence://`, settings e reports continuam sendo inicializados depois da configuração de `userData`.
   - Depende do step 2.

4. Tratar dados
   - Se `%APPDATA%\ShipIt!` e `%APPDATA%\shipit` existirem, usar somente `%APPDATA%\shipit` como `userData`, não fazer nada com a pasta `%APPDATA%\ShipIt!`.
   - Não remover `%APPDATA%\ShipIt!` automaticamente em produção; vou remover manualmente se necessário.
   - Depende do step 3.

5. Atualizar testes unitários de runtime paths
   - Em `electron/runtime-paths.test.ts`, testar:
     - produção/packaged resolve `userData` para `appData/shipit`.
     - desenvolvimento resolve `userData` para `appData/ShipIt!`.
     - E2E com `SHIPIT_TEST_USER_DATA_DIR` continua tendo prioridade e marcador de segurança.
     - `APP_ID` runtime permanece igual ao `build.appId` do `package.json`.
   - Se houver helper de migração/diagnóstico, testar os cenários de origem/destino vazio, destino existente e ausência de origem.
   - Depende dos steps 1-4.

6. Atualizar E2E de isolamento e path esperado
   - Em `e2e/app.spec.ts`, manter o teste que garante que E2E usa perfil temporário e não toca `%APPDATA%\shipit`.
   - Adicionar ou ajustar validação indireta para garantir que a expectativa de produção continua sendo `shipit`, mas sem lançar um app packaged real no E2E padrão.
   - Se necessário, criar teste unitário em vez de E2E para o modo packaged simulado, porque Playwright roda contra build não empacotado.
   - Depende do step 5.

7. Atualizar documentação
   - Atualizar `docs/ARCHITECTURE.md` para explicar que `productName`/`app.setName()` é marca visual, enquanto `userData` é fixado por compatibilidade.
   - Atualizar `README.md` se necessário para confirmar `%APPDATA%\shipit` como pasta de dados da instalação.
   - Atualizar `CHANGELOG.md` e `docs/TODO.md` registrando a correção de compatibilidade e a separação entre produção/dev/E2E.
   - Opcional: atualizar `docs/coisas para fazer e publicar.md` marcando o item como planejado/endereçado após implementação.
   - Pode ocorrer em paralelo com os testes depois que a decisão técnica estiver implementada.

8. Verificação automatizada e manual
   - Rodar `npm run test` para validar helpers e regressões.
   - Rodar `npm run build` para garantir compilação renderer/Electron.
   - Rodar `npm run test:e2e` para confirmar que o perfil temporário continua isolado.
   - Rodar `npm run dev` e verificar que `app.getPath('userData')` aponta para `%APPDATA%\ShipIt!`.
   - Gerar build/portable ou unpacked e verificar manualmente que `app.getPath('userData')` aponta para `%APPDATA%\shipit` e reconhece `shipit.db` existente.
   - Testar cenário com `%APPDATA%\shipit` existente e `%APPDATA%\ShipIt!` existente para garantir que a produção prioriza o legado e não apaga dados.

**Relevant files**
- `electron/runtime-paths.ts` — constantes de identidade, helpers de path, test profile e novo helper geral de `userData`.
- `electron/main.ts` — chamada inicial obrigatória antes de database/settings/protocols e identidade Windows.
- `electron/database.ts` — usa `app.getPath('userData')` para `shipit.db`, evidências e trash; possível local de migração/diagnóstico se não ficar em módulo próprio.
- `electron/report-generator.ts` — usa `app.getPath('userData')` como fallback para relatórios.
- `electron/runtime-paths.test.ts` — cobertura de produção/dev/test, appId e caminhos.
- `e2e/app.spec.ts` — isolamento Playwright e expectativa de não tocar produção.
- `package.json` — `build.appId`, `productName`, ícones e scripts; deve ficar alinhado com runtime.
- `README.md`, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, `docs/TODO.md` — documentação do caminho de dados e compatibilidade.

**Verification**
1. `npm run test` deve passar com novos testes de path e appId.
2. `npm run build` deve passar sem erro TypeScript/Electron.
3. `npm run test:e2e` deve passar e continuar usando perfil temporário marcado.
4. `npm run dev` deve usar `%APPDATA%\ShipIt!`, separado da instalação real.
5. Build empacotado/portable deve usar `%APPDATA%\shipit` e reconhecer banco/settings/evidências existentes.
6. Busca textual `rg "getPath\('userData'\)|setPath\('userData'" electron` deve mostrar que a configuração acontece antes dos usos dependentes.

**Decisions**
- Não mudar `productName` para `shipit`; manter `ShipIt!` como nome visual do app.
- Corrigir por `app.setPath('userData', ...)`, não por renomear a marca ou depender da derivação automática do Electron.
- Produção/instalador deve preservar `%APPDATA%\shipit` para compatibilidade.
- Desenvolvimento local deve continuar separado em `%APPDATA%\ShipIt!`.
- E2E/testes continuam isolados em diretório temporário com marcador, sem tocar produção ou dev.
- Nenhuma rotina deve apagar automaticamente dados de `%APPDATA%\ShipIt!` ou `%APPDATA%\shipit`; migração, se implementada, deve copiar de forma conservadora e deixar origem intacta.

**Further Considerations**
1. Se usuários já criaram dados úteis em `%APPDATA%\ShipIt!` durante a versão problemática, a implementação deve preferir cópia conservadora para `%APPDATA%\shipit` quando o destino estiver ausente/vazio.
2. O termo correto nos docs deve ser “pasta de dados do aplicativo” ou `userData`, não “pasta de instalação”, para evitar confusão com a pasta do executável/NSIS.
3. Depois da implementação, vale criar um pequeno comando/diagnóstico interno ou log de startup exibindo o `userData` ativo durante builds de teste/manual.
