## Plan: ShipIt 32 Evidence Count Split

Plano pronto para a feature e alinhado com suas decisões:
1. incluir também o Dashboard
2. mostrar sempre os dois contadores, inclusive quando um tipo for 0

No modo atual de planejamento, eu não escrevo arquivos do workspace diretamente. Registrei o plano completo em /memories/session/plan.md e deixei o nome proposto no padrão pedido: plan-shipit32-evidenceCountByType.prompt.md (em docs/plans).

**Steps**
1. Criar o arquivo de plano na pasta [docs/plans](docs/plans) com o nome plan-shipit32-evidenceCountByType.prompt.md.
2. Centralizar a lógica de contagem por tipo (imagem/texto) em util compartilhado para evitar filtros duplicados.
3. Atualizar a lista de atividades em [src/pages/ActivitiesPage.tsx](src/pages/ActivitiesPage.tsx#L93) para exibir dois pares ícone+quantidade.
4. Atualizar o cabeçalho de evidências no detalhe em [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx#L645) para contagem separada.
5. Atualizar a coluna de evidências no Dashboard em [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx#L327) para o mesmo padrão.
6. Garantir acessibilidade: ícones decorativos com aria-hidden e rótulos textuais claros em português para leitura assistiva.
7. Ajustar testes (contagem e renderização por tipo) com foco em lista, detalhe e dashboard.
8. Validar regressão visual e funcional antes de concluir.

**Relevant files**
- [src/pages/ActivitiesPage.tsx](src/pages/ActivitiesPage.tsx#L93)
- [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx#L645)
- [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx#L327)
- [src/vite-env.d.ts](src/vite-env.d.ts#L145)
- [electron/entities/Evidence.ts](electron/entities/Evidence.ts#L13)
- [e2e/app.spec.ts](e2e/app.spec.ts)
- [src/components/EvidenceUpload.tsx](src/components/EvidenceUpload.tsx#L413)

**Verification**
1. Rodar npm run test e confirmar suíte verde.
2. Validar cenário misto (imagens + textos) mostrando contagem separada em lista, detalhe e dashboard.
3. Validar cenários de borda: só imagem, só texto, sem evidências.
4. Verificar leitura/acessibilidade dos contadores por teclado e leitores de tela.
5. Verificar contraste e legibilidade nos temas principais, incluindo alto contraste e cyberpunk.

**Decisions**
- Escopo inclui Dashboard além de lista e detalhe.
- Exibição sempre com ambos os tipos, mesmo com valor zero.
- Sem mudanças de banco/IPC: somente camada de apresentação usando dados já existentes.