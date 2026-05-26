## Plan: Detalhes da Atividade (Excluir + Seletor de Mês)

Implementar o botão de excluir na tela de detalhes com confirmação modal, e substituir o bloco de modo de navegação por um seletor de mês no mesmo espaço. A estratégia é reaproveitar os padrões já existentes de exclusão e de navegação por mês para reduzir risco de regressão.

**Steps**
1. Fase 1 — Definir contrato funcional da feature.
2. Confirmar que o comportamento alvo é: remover totalmente o toggle activity-nav-mode-toggle, navegar no detalhe por mês selecionado, e excluir atividade com confirmação explícita. Esta etapa bloqueia as demais.
3. Fase 2 — Refatorar navegação do detalhe para mês selecionável.
4. Em [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx), remover estado e dependência de navMode, criar estado de mês selecionado e centralizar recarga de siblings por month_reference. Depends on 2.
5. Em [src/components/ActivityNav.tsx](src/components/ActivityNav.tsx), remover o bloco com id activity-nav-mode-toggle e inserir controle de mês no lugar (recomendado: padrão com chevrons + label MM/YYYY já usado no app). Depends on 4.
6. Ajustar navegação por teclado ArrowLeft/ArrowRight no detalhe para operar sempre sobre a lista do mês selecionado, mantendo guardas de digitação. Depends on 4.
7. Fase 3 — Adicionar exclusão da atividade na tela de detalhe.
8. Em [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx), adicionar botão Excluir ao lado de Editar e modal de confirmação com role alertdialog, aria-modal, aria-labelledby, fechamento por clique fora e Escape. Depends on 2.
9. Reutilizar fluxo de exclusão já consolidado: chamada deleteActivity, toast de sucesso/erro e redirecionamento para /activities?month={mês selecionado}. Depends on 8.
10. Fase 4 — Consistência e IDs para automação.
11. Padronizar IDs novos para testes e manutenção (ex.: activity-nav-month-selector, activity-detail-btn-delete, activity-detail-delete-modal) e validar sincronia entre os dois ActivityNav (topo/rodapé). Depends on 5 and 8.
12. Fase 5 — Testes e validação.
13. Atualizar [e2e/app.spec.ts](e2e/app.spec.ts) com cenários de: abrir/cancelar/confimar exclusão no detalhe; ausência do toggle antigo; troca de mês afetando prev/next. Depends on 9 and 11.
14. Adicionar teste unitário de helper de mês (se extraído) para cálculo/formatação MM/YYYY. Parallel with step 13.
15. Executar validação final com build + testes unitários + E2E. Depends on 13 and 14.

**Relevant files**
- [src/pages/ActivityDetailPage.tsx](src/pages/ActivityDetailPage.tsx) — núcleo da feature (estado de mês, exclusão, modal, navegação pós-delete).
- [src/components/ActivityNav.tsx](src/components/ActivityNav.tsx) — troca do toggle por seletor de mês.
- [src/pages/ActivitiesPage.tsx](src/pages/ActivitiesPage.tsx) — referência de modal e fluxo de exclusão.
- [src/pages/DashboardPage.tsx](src/pages/DashboardPage.tsx) — referência visual/comportamental do seletor de mês.
- [src/services/localDb.ts](src/services/localDb.ts) — fallback browser para getActivities/deleteActivity.
- [src/utils/keyboardGuards.ts](src/utils/keyboardGuards.ts) — manter proteção de atalhos durante digitação.
- [e2e/app.spec.ts](e2e/app.spec.ts) — regressão funcional da feature.

**Verification**
1. Confirmar que activity-nav-mode-toggle não existe mais no detalhe.
2. Confirmar que o seletor de mês está no lugar do toggle e muda o contexto de navegação prev/next.
3. Confirmar modal de exclusão acessível, cancelamento sem efeito e confirmação com delete efetivo.
4. Confirmar redirecionamento correto para lista no mês selecionado após exclusão.
5. Executar npm run build.
6. Executar npm run test.
7. Executar npm run test:e2e.

**Decisions**
- Reutilizar deleteActivity atual (hard-delete) sem alterar regra de banco nesta entrega.
- Substituir totalmente o modo scope por navegação baseada em mês no detalhe.
- Reutilizar padrão de seletor de mês existente no app para manter consistência.
- Escopo excluído: redesign amplo da tela e alterações estruturais em backend/entidades.

**Further Considerations**
1. Seletor de mês: recomendação principal = chevrons + label (consistente com Dashboard/Atividades). Alternativa = dropdown completo.
2. Caso de último item do mês: manter redirecionamento para lista do mês com estado vazio + toast de confirmação.
3. IDs estáveis para E2E devem entrar no escopo para evitar flakiness nos testes.
