## Plan: Menu de Contexto e Links Externos

Implementar menu de contexto de clique direito no BrowserWindow para ações de edição (copiar, recortar e colar) e garantir que todos os links externos abram fora do app via navegador padrão (ou cliente de e-mail), preservando segurança de navegação interna do HashRouter.

**Steps**
1. Fase 1 — Política de navegação externa no processo principal.
2. Em electron/main.ts, adicionar helpers de validação de URL externa (http, https, mailto) e função centralizada para abrir externamente com shell.openExternal. Esta função deve rejeitar protocolos não permitidos e erros sem quebrar o app. *depends on 1*
3. No createWindow em electron/main.ts, configurar webContents.setWindowOpenHandler para interceptar target=_blank e abrir externamente quando aplicável; sempre retornar deny para impedir nova janela interna. *depends on 2*
4. No createWindow em electron/main.ts, configurar webContents.on('will-navigate') para bloquear navegações externas na janela principal, abrindo externamente quando a URL for externa permitida e permitindo apenas navegação interna do app (file:// local + hash router). *depends on 2*
5. Fase 2 — Menu de contexto de clique direito.
6. No createWindow em electron/main.ts, registrar webContents.on('context-menu') e montar Menu.buildFromTemplate com papéis nativos de edição: copy, cut, paste. Incluir variações por contexto:
   - campo editável: cut/copy/paste (opcionalmente undo/redo/selectAll)
   - texto selecionado não editável: copy
   - sem ações válidas: não abrir menu. *parallel with step 3 after step 1*
7. Garantir que o menu respeite permissões do contexto (ex.: recortar/colar desabilitados quando indisponíveis via editFlags). *depends on 6*
8. Fase 3 — Ajustes no renderer para consistência de links.
9. Revisar links externos existentes em src/pages/ActivityDetailPage.tsx, src/components/ActivityBar.tsx e src/pages/SettingsPage.tsx para manter consistência de comportamento e atributos de segurança (target/rel quando aplicável), sem alterar links internos baseados em React Router. *depends on 3 and 4*
10. Fase 4 — Cobertura de testes e validação.
11. Em e2e/app.spec.ts, adicionar cenário para validar que clicar em link externo não navega a aplicação para fora da rota atual (janela principal permanece no app). *depends on 3 and 4*
12. Registrar uma verificação automatizada de contexto quando possível (ex.: assertivas de interceptação de navegação externa) e complementar com checklist manual do menu de contexto, já que menu nativo pode ter limitação de inspeção em E2E. *depends on 6 and 7*
13. Fase 5 — Validação final.
14. Executar npm run build, npm run test e npm run test:e2e; depois validar manualmente no app:
   - clique direito em input/textarea e confirmar copiar/recortar/colar
   - clique direito em texto selecionado fora de input e confirmar copiar
   - clique em links http/https e mailto, confirmando abertura externa e permanência da rota no app. *depends on 11 and 12*

**Relevant files**
- d:/Programacao/Electron/ship-it/electron/main.ts — criar política de links externos e menu de contexto no BrowserWindow/webContents.
- d:/Programacao/Electron/ship-it/src/pages/ActivityDetailPage.tsx — links externos de referência já renderizados em anchor.
- d:/Programacao/Electron/ship-it/src/components/ActivityBar.tsx — link mailto no modal Sobre.
- d:/Programacao/Electron/ship-it/src/pages/SettingsPage.tsx — link mailto na seção Sobre.
- d:/Programacao/Electron/ship-it/e2e/app.spec.ts — cenários de regressão para comportamento de links externos e estabilidade de rota.

**Verification**
1. npm run build
2. npm run test
3. npm run test:e2e
4. Checklist manual em dev e em build empacotada: menu de contexto (copiar/recortar/colar) e abertura externa de links.

**Decisions**
- Abordagem recomendada: resolver no processo principal (webContents handlers), sem depender de IPC novo para abrir links.
- Escopo incluído: clique direito com ações de edição e abertura externa de links.
- Escopo excluído: criação de menu superior completo (File/Edit/View/Help) e novos atalhos globais além do necessário para esta feature.

**Further Considerations**
1. Menu mínimo vs menu completo de edição: Recomendação padrão = copy/cut/paste + copy para texto selecionado, com undo/redo/selectAll como opcional leve mais atalhos.
2. Política de protocolos: Recomendação = permitir apenas http, https e mailto para reduzir risco e comportamento inesperado.
