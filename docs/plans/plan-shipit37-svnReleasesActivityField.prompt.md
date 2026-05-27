## Plan: Campo SVN Releases em Atividades

Adicionar suporte a releases SVN no cadastro de atividades como campo opcional em seção separada, com entrada estilo tags (separação por vírgula), validação de somente números, exibição em formulário/detalhes/lista, participação na busca e exclusão explícita do DOCX. A abordagem recomendada é persistir em coluna de texto na Activity com serialização CSV normalizada e criar componente próprio de tags para evitar nova dependência.

**Steps**
1. Fase 1 - Contrato de dados e persistência (base para tudo)
2. Adicionar coluna opcional svn_releases na entidade Activity em d:/Programacao/Electron/ship-it/electron/entities/Activity.ts (nullable text) e manter compatibilidade com base existente.
3. Atualizar o tipo ActivityData em d:/Programacao/Electron/ship-it/src/vite-env.d.ts para incluir svn_releases: string | null, garantindo tipagem ponta a ponta.
4. Ajustar fallback browser em d:/Programacao/Electron/ship-it/src/services/localDb.ts para default do novo campo ao criar atividade e preservação ao editar. *parallel with step 3*
5. Fase 2 - Utilitário de parsing/normalização de releases (reuso frontend)
6. Criar utilitário dedicado em d:/Programacao/Electron/ship-it/src/utils/svnReleases.ts com funções para: converter CSV em tags, validar token numérico, remover entradas vazias/duplicadas e serializar tags para persistência.
7. Criar testes unitários em d:/Programacao/Electron/ship-it/src/utils/svnReleases.test.ts cobrindo vírgula, espaços, colagem, duplicados e caracteres inválidos. *depends on 6*
8. Fase 3 - Componente InputTags e integração no formulário
9. Criar componente de input tags em d:/Programacao/Electron/ship-it/src/components/InputTags.tsx com comportamento de transformar em badge ao digitar vírgula/Enter/Tab, remoção por X/backspace e paste parsing. *depends on 6*
10. Integrar o novo campo no estado e no submit da ActivityFormPage em d:/Programacao/Electron/ship-it/src/pages/ActivityFormPage.tsx (interface ActivityForm, buildActivityPayload, buildFormFingerprint e load de edição). *depends on 2, 3, 6, 9*
11. Inserir seção separada no formulário (abaixo de Links de Referência) com texto explícito: não incluído no relatório de serviço (DOCX), mantendo o campo opcional e sem limite explícito.
12. Reutilizar validação de token numérico no fluxo do formulário; impedir inclusão de tags inválidas e exibir feedback curto de erro local quando necessário. *depends on 6*
13. Fase 4 - Exibição e busca
14. Exibir badges de svn_releases na tela de detalhes da atividade em d:/Programacao/Electron/ship-it/src/pages/ActivityDetailPage.tsx em bloco próprio, separado de Links de Referência. *depends on 6*
15. Exibir badges compactadas na lista de atividades em d:/Programacao/Electron/ship-it/src/pages/ActivitiesPage.tsx (ex: primeiras N tags + indicador de restante para evitar poluição visual). *depends on 6*
16. Incluir svn_releases nos filtros locais de texto em ActivitiesPage e na busca backend em d:/Programacao/Electron/ship-it/electron/database.ts (searchActivities com OR LIKE no novo campo). *depends on 2, 6*
17. Fase 5 - Garantia de não exportação no DOCX
18. Manter report generator sem mapear svn_releases em d:/Programacao/Electron/ship-it/electron/report-generator.ts e documentar no trecho de mapeamento de placeholders que o campo é interno e não exportável.
19. Adicionar teste de não regressão em d:/Programacao/Electron/ship-it/electron/report-generator.integration.test.ts garantindo que valores de svn_releases não aparecem no document.xml gerado. *depends on 2*
20. Fase 6 - Testes de integração e regressão
21. Expandir testes de banco em d:/Programacao/Electron/ship-it/electron/database.test.ts para cobrir criação, edição e busca de svn_releases.
22. Adicionar cenário E2E em d:/Programacao/Electron/ship-it/e2e/app.spec.ts para: criar atividade com releases por vírgula, validar badges no formulário, conferir exibição em detalhes/lista e confirmar busca por número da release.
23. Executar validação completa: testes unitários, build e E2E focal dessa feature.

**Relevant files**
- d:/Programacao/Electron/ship-it/electron/entities/Activity.ts - adicionar coluna svn_releases no modelo TypeORM.
- d:/Programacao/Electron/ship-it/src/vite-env.d.ts - estender ActivityData com svn_releases.
- d:/Programacao/Electron/ship-it/src/services/localDb.ts - sincronizar fallback localStorage com novo campo.
- d:/Programacao/Electron/ship-it/src/pages/ActivityFormPage.tsx - integrar campo no estado, payload, fingerprint e seção separada.
- d:/Programacao/Electron/ship-it/src/components/InputTags.tsx - novo componente de tags com UX de vírgula para badge.
- d:/Programacao/Electron/ship-it/src/utils/svnReleases.ts - normalização/validação de tokens numéricos.
- d:/Programacao/Electron/ship-it/src/utils/svnReleases.test.ts - testes unitários do parser e regras.
- d:/Programacao/Electron/ship-it/src/pages/ActivityDetailPage.tsx - renderizar badges no detalhe da atividade.
- d:/Programacao/Electron/ship-it/src/pages/ActivitiesPage.tsx - renderizar badges na lista e incluir campo em filtro local.
- d:/Programacao/Electron/ship-it/electron/database.ts - incluir svn_releases na busca global searchActivities.
- d:/Programacao/Electron/ship-it/electron/report-generator.ts - manter exclusão explícita do campo no DOCX.
- d:/Programacao/Electron/ship-it/electron/database.test.ts - cenários de persistência e busca do novo campo.
- d:/Programacao/Electron/ship-it/electron/report-generator.integration.test.ts - teste negativo de não exportação para DOCX.
- d:/Programacao/Electron/ship-it/e2e/app.spec.ts - cobertura ponta a ponta da UX de tags.

**Verification**
1. Rodar testes unitários focais de utilitário e database para validar parsing, persistência e busca de svn_releases.
2. Rodar suíte de relatório para confirmar que DOCX continua sem o campo e sem regressões de placeholders.
3. Rodar build completo para validar tipagem entre renderer/electron e decorators TypeORM.
4. Rodar cenário E2E focal da feature (cadastro por vírgula, badges, detalhe, lista, busca).
5. Validar manualmente no app: seção separada no formulário, mensagem explícita de não exportação e comportamento de tags no tema atual.

**Decisions**
- Entrada será por lista separada por vírgula, com transformação imediata em badges no estilo InputTags.
- Cada tag aceita somente números; campo opcional e sem limite explícito.
- O campo será exibido em formulário, detalhes e lista de atividades.
- O campo participará da busca local e da busca global via backend.
- O campo não será incluído no relatório DOCX e isso ficará explícito na UI e no código.
- Escopo inclui somente modelagem/UX/busca dentro de Activity; não inclui automação de publicação de homologação/produção.

**Further Considerations**
1. Recomenda-se não adicionar dependência externa de UI para tags nesta entrega; componente próprio reduz risco de conflito visual com o design atual e evita aumento de bundle.
2. Recomenda-se padronizar serialização CSV sem espaços excedentes para melhorar previsibilidade da busca e reduzir variações de armazenamento.