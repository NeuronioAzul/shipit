## Plan: Menu do App ao Lado do Logo

Implementar um menu customizado na barra superior, ao lado do logo, com seções File/Edit/View/Help, atalhos globais e ações integradas ao Electron/React já existente. A abordagem recomendada é centralizar comandos em um registro único (renderer), delegar ações privilegiadas ao processo principal via IPC e manter o comportamento de salvar contextual por tela.

**Steps**
1. Fase 1 — Contrato funcional e arquitetura do menu.
2. Definir o menu como dropdown custom no topo (sem menu nativo do SO), ancorado na `TitleBar`, com estados de abertura/fechamento, foco por teclado e fechamento por `Esc`/click fora. *base para todas as fases*
3. Criar um catálogo de comandos (IDs, rótulos, atalhos, seção, tipo da ação) para evitar lógica duplicada e permitir evolução futura (ex.: desabilitar itens por contexto). *depends on 2*
4. Fase 2 — IPC e capacidades faltantes no processo principal.
5. Em `electron/main.ts`, adicionar handlers ausentes para suportar itens do menu: abrir pasta de relatórios, abrir pasta de evidências, comando explícito de sair, comandos de edição (`undo/redo/cut/copy/paste/selectAll`) e zoom (`in/out/reset`). *depends on 3*
6. Em `electron/preload.ts` e `src/vite-env.d.ts`, expor e tipar os novos métodos para consumo seguro no renderer. *depends on 5*
7. Fase 3 — UI do menu na barra superior e execução de comandos.
8. Integrar botão/menu ao lado do logo em `src/components/TitleBar.tsx`, respeitando `WebkitAppRegion: no-drag` para elementos clicáveis e mantendo o layout atual (histórico + busca + controles da janela). *depends on 6*
9. Implementar execução dos comandos por seção:
10. File: nova atividade, abrir relatórios, abrir evidências, salvar contextual, configurações, sair. *depends on 8*
11. Edit: copiar/recortar/colar/selecionar tudo/desfazer/refazer e foco na busca (`Ctrl+F`). *depends on 8*
12. View: zoom in/out/reset e ações de minimizar/maximizar/fechar reaproveitando handlers existentes de janela. *depends on 8*
13. Help: sobre, verificar atualizações, manual do usuário, reportar problema no GitHub. *depends on 8*
14. Fase 4 — Salvar contextual (`Ctrl+S`) por tela.
15. Definir um contrato de `save-context` no renderer (event bus simples ou registry de handlers) para que o menu acione salvar somente em telas com dados editáveis (ex.: atividade/perfil/configurações) e seja no-op seguro nas demais. *depends on 8*
16. Integrar telas de formulário para registrar/desregistrar handler de save contextual e reportar resultado (salvo/sem alterações/indisponível) com feedback visual. *depends on 15*
17. Fase 5 — Manual do Usuário e ajuda.
18. Criar uma nova página de Manual do Usuário (rota dedicada) com conteúdo inicial estático + FAQ (sem mídia nesta fase), mantendo padrão visual e navegação atuais. *parallel with step 16 after step 8*
19. Integrar item “Reportar um Problema” para abrir externamente `https://github.com/NeuronioAzul/shipit/issues`, aproveitando a política de links externos já existente no main process. *depends on 8*
20. Fase 6 — Atalhos globais e conflitos.
21. Implementar atalhos do menu com guardas para não interferir em digitação (`isTypingTarget`) e harmonizar com atalhos já existentes (`Ctrl+K`, `Alt+Setas`, navegação local por setas). *depends on 8*
22. Padronizar `CommandOrControl` para compatibilidade macOS/Windows/Linux e definir `Redo` compatível (`Ctrl+Y` e opcional `Ctrl+Shift+Z`). *depends on 21*
23. Fase 7 — Testes e validação.
24. Adicionar testes E2E em `e2e/app.spec.ts` para: abrir/fechar menu, executar comandos críticos (navegação, foco busca, manual, atualizar, link de issue externo sem sair da rota), e atalhos principais. *depends on 13 and 21*
25. Adicionar testes unitários focados nos helpers de mapeamento de comandos/atalhos e no contrato de save contextual para reduzir regressão. *parallel with step 24*
26. Executar validação final: `npm run build`, `npm run test`, `npm run test:e2e` + checklist manual para abertura de pastas, ações de janela e usabilidade do menu com mouse/teclado. *depends on 24 and 25*

**Relevant files**
- `d:/Programacao/Electron/ship-it/src/components/TitleBar.tsx` — ponto de integração do menu ao lado do logo e controle de foco/no-drag.
- `d:/Programacao/Electron/ship-it/src/App.tsx` — inclusão da rota do Manual.
- `d:/Programacao/Electron/ship-it/src/components/SearchBar.tsx` — reaproveitar foco programático da busca (`Ctrl+F`).
- `d:/Programacao/Electron/ship-it/src/contexts/NavigationHistoryContext.tsx` — evitar conflito com atalhos globais existentes.
- `d:/Programacao/Electron/ship-it/src/pages/ActivityFormPage.tsx` — handler de save contextual.
- `d:/Programacao/Electron/ship-it/src/pages/ProfilePage.tsx` — handler de save contextual.
- `d:/Programacao/Electron/ship-it/src/pages/SettingsPage.tsx` — handler de save contextual + atualização.
- `d:/Programacao/Electron/ship-it/src/components/Header.tsx` — reuso/integração da ação “Sobre o ShipIt!”.
- `d:/Programacao/Electron/ship-it/electron/main.ts` — novos handlers IPC de menu (pastas, edição, zoom, sair).
- `d:/Programacao/Electron/ship-it/electron/preload.ts` — bridge dos novos comandos.
- `d:/Programacao/Electron/ship-it/src/vite-env.d.ts` — tipagem da API estendida.
- `d:/Programacao/Electron/ship-it/e2e/app.spec.ts` — cenários de regressão de menu e atalhos.
- Novos artefatos esperados: componente de menu no renderer e página de Manual do Usuário em `src/pages`.

**Verification**
1. Executar `npm run build` para validar tipos e bundle do renderer/main.
2. Executar `npm run test` para cobrir regressões unitárias/integration.
3. Executar `npm run test:e2e` para validar fluxos de navegação, atalhos e links externos.
4. Checklist manual:
5. Abrir menu via mouse e teclado; navegar entre seções; fechar com `Esc` e click fora.
6. Validar `Ctrl+N`, `Ctrl+S`, `Ctrl+F`, `Ctrl+Q`, zoom e comandos de janela.
7. Confirmar abertura de pastas de relatórios/evidências no sistema operacional.
8. Confirmar Help > Reportar Problema abrindo no navegador externo sem alterar rota do app.

**Decisions**
- Menu será **somente dropdown customizado ao lado do logo**.
- `Ctrl+S` seguirá estratégia de **salvar contexto atual** e ignorar com segurança quando não houver alterações.
- Manual do Usuário inicial será **página estática com seções e FAQ** (sem mídia nesta entrega).
- URL de “Reportar um Problema”: `https://github.com/NeuronioAzul/shipit/issues/new`.
- Escopo excluído desta entrega: menu nativo completo do SO e editor avançado de documentação multimídia.

**Further Considerations**
1. Itens úteis adicionais (recomendação para fase 2):
2. File: “Gerar Relatório do mês atual” (`Ctrl+G`) para acelerar fluxo principal, modal para confirmar o mês atual com o usuário, dando a opção de trocar o mês com o seletor de meses.
3. View: “Tela Cheia” (`F11`) e “Alternar barra lateral” (`Ctrl+B`) para produtividade.
4. Help: “Atalhos de teclado” e “Notas da versão” (changelog) para onboarding e suporte.
