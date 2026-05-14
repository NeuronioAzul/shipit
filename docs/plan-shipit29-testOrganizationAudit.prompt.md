## Plan: Test Organization Audit

Confirmar que a organização atual de testes do projeto Electron + React + Vite + TypeORM segue boa prática, manter a estrutura colocalizada já adotada, aplicar pequenos ajustes opcionais de descoberta/ambiente apenas quando houver volume justificando, e descartar migração para Jest.

**Steps**
1. Confirmar localização atual dos arquivos de teste. Mapear `src/**/*.test.{ts,tsx}`, `electron/**/*.test.{ts,tsx}` colocalizados e `e2e/*.spec.ts` separados. Resultado esperado: 11 arquivos de unidade/integração mais 1 arquivo E2E, todos respeitando o padrão da stack.
2. Validar a configuração do runner. Confirmar que `vite.config.ts` inclui `src/**/*.test.{ts,tsx}` e `electron/**/*.test.{ts,tsx}`, exclui `**/e2e/**` e `**/dist-electron/**`, e que `globals: true` está habilitado para que `describe/it/expect` funcionem sem import explícito.
3. Manter a colocação atual sem mover testes. Não criar `__tests__/`. Não consolidar testes por feature em pasta separada. A colocação ao lado da implementação preserva descoberta, refactor e simplicidade.
4. Padronizar o sufixo `*.integration.test.ts` apenas para testes que tocam I/O real (template DOCX, banco com `sql.js`, geração de arquivos). Já existe `electron/report-generator.integration.test.ts`. Aplicar o mesmo sufixo somente em casos novos com esse perfil; não renomear testes unitários atuais.
5. Padronizar ambiente jsdom para testes de renderer. Hoje `src/pages/ProfilePage.test.tsx` declara `// @vitest-environment jsdom` no topo do arquivo. Manter assim enquanto houver poucos testes de componente. Se passar a haver volume relevante de `.test.tsx`, avaliar `environmentMatchGlobs` no `vite.config.ts` para aplicar jsdom a `*.tsx` automaticamente. Sem ação obrigatória agora.
6. Centralizar mocks reutilizáveis somente quando houver duplicação real. Os mocks atuais (`toast`, `electronAPI`, `Select`) vivem dentro de `src/pages/ProfilePage.test.tsx`. Mover para `src/test/` só se aparecer um segundo teste de página repetindo a mesma fabrica. Caso contrário, manter inline para evitar over-engineering.
7. Manter `e2e/` isolado. Pasta dedicada, sufixo `*.spec.ts`, fixtures em `e2e/fixtures/`, lançamento via `playwright`. Não unificar runner com Vitest. Não migrar fixtures para `src/`.
8. Descartar migração para Jest. O renderer usa Vite, o alias `@/*`, plugin React e Tailwind ja são reaproveitados via `vitest/config`. Em Jest, precisaria de `ts-jest` ou `babel-jest`, duplicação de resolvers e perda de paridade com o build. A API de teste de Vitest já é compatível com a sintaxe de Jest (`vi.mock` no lugar de `jest.mock`). Suíte atual saudável com 134 testes em 11 arquivos.

**Relevant files**
- `d:\Programacao\Electron\ship-it\vite.config.ts` — bloco `test` com `include`, `exclude`, `globals`, base para qualquer ajuste futuro de `environmentMatchGlobs`.
- `d:\Programacao\Electron\ship-it\playwright.config.ts` — configuração isolada de E2E; nenhum acoplamento com Vitest.
- `d:\Programacao\Electron\ship-it\src\utils\validation.test.ts` — exemplo de teste unitário node colocalizado.
- `d:\Programacao\Electron\ship-it\src\utils\monthReference.test.ts` — exemplo de teste utilitário node.
- `d:\Programacao\Electron\ship-it\src\utils\activityMonthNavigation.test.ts` — exemplo de teste utilitário node.
- `d:\Programacao\Electron\ship-it\src\menu\appMenuCatalog.test.ts` — teste de catálogo de menu.
- `d:\Programacao\Electron\ship-it\src\menu\saveContextRegistry.test.ts` — teste de registry com reset helper.
- `d:\Programacao\Electron\ship-it\src\pages\ProfilePage.test.tsx` — único teste de componente atual; referência para o padrão jsdom + mocks locais.
- `d:\Programacao\Electron\ship-it\electron\database.test.ts` — teste de persistência com `sql.js`.
- `d:\Programacao\Electron\ship-it\electron\report-generator.test.ts` — teste unitário do gerador.
- `d:\Programacao\Electron\ship-it\electron\report-generator.integration.test.ts` — referência do sufixo `integration.test.ts` para I/O real.
- `d:\Programacao\Electron\ship-it\electron\runtime-paths.test.ts` — teste de helpers de path.
- `d:\Programacao\Electron\ship-it\electron\update-notifications.test.ts` — teste de notificações de update.
- `d:\Programacao\Electron\ship-it\e2e\app.spec.ts` — referência do padrão Playwright Electron com sufixo `spec.ts`.
- `d:\Programacao\Electron\ship-it\e2e\fixtures` — pasta para fixtures específicas de E2E; não deve ser reusada por unidade.
- `d:\Programacao\Electron\ship-it\.github\copilot-instructions.md` — instrução já consolidada: unit em `*.test.ts` colocalizado, E2E em `e2e/`, `sql.js` para DB em testes.

**Verification**
1. Rodar `npm run test` e confirmar 11 arquivos descobertos, todos passando.
2. Rodar `npm run test -- src/pages/ProfilePage.test.tsx` e confirmar o teste de componente jsdom isolado passa.
3. Rodar `npm run test:e2e` (sob demanda) e confirmar que apenas `e2e/app.spec.ts` é executado, sem coleta cruzada com Vitest.
4. Conferir que `vite.config.ts` não inclui `e2e/` no `include` e que `playwright.config.ts` aponta apenas para `./e2e`.
5. Repetir auditoria sempre que aparecer um novo padrão (segundo `.test.tsx`, segundo teste de página com mock duplicado, ou primeiro teste de hook). Só agir quando houver duplicação real.

**Decisions**
- Manter colocação dos testes ao lado do código de produção.
- Manter `e2e/` como suíte separada com sufixo `*.spec.ts` e fixtures próprias.
- Continuar Vitest como runner único de unidade/integração. Não introduzir Jest.
- Adotar sufixo `*.integration.test.ts` apenas para testes com I/O real.
- Aceitar `// @vitest-environment jsdom` por arquivo enquanto houver poucos testes de componente. Avaliar `environmentMatchGlobs` somente após volume justificar.
- Não criar `src/test/` antes de haver duplicação efetiva de mocks/fabricas entre testes.

**Further Considerations**
1. Se for adicionada cobertura de hooks ou contextos React, mantê-los colocalizados em `src/contexts/` ou `src/hooks/` com sufixo `.test.tsx`.
2. Se a integração com banco crescer, considerar isolar fábricas de `sql.js` em helper compartilhado dentro de `electron/__fixtures__/` somente quando dois ou mais arquivos passarem a precisar do mesmo bootstrap.
3. Cobertura de código (`--coverage`) não está habilitada hoje; se for ativada, configurar `coverage.exclude` para `dist-electron/`, `e2e/`, `release/` e arquivos de tipos.
4. Para CI, manter `npm run test` rápido (sem E2E) como gate principal e rodar `npm run test:e2e` em job separado com `pretest:e2e` já garantindo build atualizado.
