## Plan: Navegação Global na TitleBar

Adicionar botões Voltar/Avançar ao lado esquerdo do campo de busca com comportamento de histórico global (estilo VS Code), mantendo drag/no-drag correto na titlebar, atalhos Alt+←/Alt+→ globais, e ajustando a tela de detalhes para usar apenas ←/→ na navegação local entre atividades. Na tela do Dashboard  ←/→ na navegação local entre os meses.

**Steps**
1. Fase 1 — Modelo de histórico global (React Router)
2. Criar um provider de histórico de navegação (novo arquivo proposto: src/contexts/NavigationHistoryContext.tsx) com API explícita: canGoBack, canGoForward, goBack, goForward.
3. Registrar entradas de rota com pathname + search + hash, ignorar duplicatas consecutivas e limpar “forward stack” quando houver nova navegação após voltar. Definir limite de histórico (ex.: 100 entradas) para evitar crescimento indefinido. *depends on 2*
4. Fase 2 — Integração no fluxo de rotas
5. Integrar o provider dentro de HashRouter em src/App.tsx, envolvendo ElectronNavigator e Routes para capturar toda navegação do app (sidebar, busca, navegação por detalhe e navegação disparada pelo tray). *depends on 2*
6. Garantir que navegação via goBack/goForward não gere entrada duplicada no stack (flag de “time-travel” ou mecanismo equivalente). *depends on 5*
7. Fase 3 — UI na janela do aplicativo
8. Em src/components/TitleBar.tsx, inserir grupo de navegação à esquerda do bloco central de busca: botão Voltar e botão Avançar, com IDs estáveis para testes e acessibilidade (title e aria-label).
9. Aplicar WebkitAppRegion no-drag somente no grupo dos novos botões e manter a área livre da titlebar arrastável. Validar que logo, busca e controles continuem interativos sem perder área de drag. *depends on 8*
10. Manter botões sempre visíveis e desabilitados quando não houver histórico disponível. *depends on 8*
11. Fase 4 — Atalhos de teclado e conflito de comportamento
12. Adicionar atalhos globais Alt+← e Alt+→ para histórico do app, com guardas para não disparar quando o foco estiver em input, textarea, select ou elemento contenteditable. *depends on 5*
13. Ajustar src/pages/ActivityDetailPage.tsx: trocar navegação local de Alt+←/Alt+→ para apenas ←/→ entre atividade anterior/próxima, aplicando guardas de foco equivalentes para evitar conflito com edição de texto. *depends on 12*
14. Fase 5 — Cobertura de testes
15. Atualizar e2e/app.spec.ts com cenários de histórico global:
16. Validar estado inicial dos botões (visíveis e desabilitados).
17. Validar fluxo de navegação com clique em Voltar/Avançar restaurando rota completa (incluindo query string quando existir).
18. Validar atalhos globais Alt+←/Alt+→.
19. Validar contrato estrutural drag/no-drag na titlebar incluindo o novo grupo de botões. *depends on 8*
20. Validar nova regra local da tela de detalhe com ←/→ para navegação entre atividades (criando massa mínima de 2 atividades no teste). *depends on 13*
21. Fase 6 — Validação manual final
22. Testar em tema padrão e cyberpunk: posição/alinhamento dos botões, estado disabled, comportamento de atalhos, e preservação de área de arraste da janela.
23. Testar em janela normal e maximizada para confirmar consistência visual e funcional da titlebar.

**Relevant files**
- d:/Programacao/Electron/ship-it/src/App.tsx — ponto de integração de HashRouter, ElectronNavigator e Routes.
- d:/Programacao/Electron/ship-it/src/components/TitleBar.tsx — inserir controles Voltar/Avançar ao lado esquerdo da busca e manter contrato drag/no-drag.
- d:/Programacao/Electron/ship-it/src/pages/ActivityDetailPage.tsx — ajustar atalho local de navegação entre atividades para setas sem Alt.
- d:/Programacao/Electron/ship-it/e2e/app.spec.ts — ampliar cobertura E2E para histórico global, atalhos e contrato de app-region.
- Novo arquivo proposto: src/contexts/NavigationHistoryContext.tsx — estado global do histórico e API de navegação.

**Verification**
1. Executar npm run test para confirmar estabilidade da suíte de unidade/integração.
2. Executar npm run build antes do E2E para evitar validação em bundle desatualizado.
3. Executar npm run test:e2e com os novos cenários de histórico e atalhos.
4. Rodar npm run dev e validar manualmente em pelo menos 2 temas (dark e cyberpunk) e 2 estados de janela (normal/maximizada).

**Decisions**
- Histórico: global completo, incluindo query params.
- Atalho global: Alt+← e Alt+→ em toda aplicação.
- Estado visual: botões sempre visíveis e desabilitados sem histórico disponível.
- Conflito na tela de detalhe: Alt+setas fica reservado ao histórico global; navegação local entre atividades passa para setas ←/→.
- Incluído no escopo: botões na titlebar, estado de histórico, atalhos e testes.
- Excluído do escopo: persistência de histórico entre reinicializações do app, alterações em menu de contexto e ajustes de tray/menu nativo.

**Further Considerations**
1. Definir política de compactação do stack quando houver ciclos de navegação repetidos (manter todas as entradas vs. deduplicação ampliada).
2. Avaliar suporte futuro para botões laterais do mouse (XButton1/XButton2) usando o mesmo serviço de histórico global.
3. Considerar telemetria simples (somente dev logs) para depurar casos de navegação inesperada durante rollout.

**Update Changelog**
changelog: Adiciona a nova funcionalidade de navegação global com botões Voltar/Avançar na titlebar, atalhos de teclado e ajustes na navegação local da tela de detalhes e do Dashboard.