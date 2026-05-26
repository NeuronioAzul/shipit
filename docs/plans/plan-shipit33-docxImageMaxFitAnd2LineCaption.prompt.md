## Plan: DOCX Image Max Fit + Legenda 2 Linhas

Objetivo: garantir que a imagem da evidência ocupe a área máxima possível da página sem estourar layout, considerando área livre de imagem de 27 cm de largura por 15 cm de altura, já descontando/acomodando legenda de até 2 linhas com truncamento em reticências quando ultrapassar esse limite.

**Steps**
1. Fase 1 - Regras de layout (base).
2. Consolidar constantes de layout no fluxo do gerador DOCX: largura máxima da imagem (27 cm), altura máxima da imagem (15 cm), reserva fixa para 2 linhas de legenda e espaçamento, mantendo o padrão atual de unidade EMU. Esta etapa bloqueia 3-6.
3. Criar helper de composição de legenda para imagem com estas regras: normalizar texto, montar no máximo 2 linhas e truncar excedente com reticências na segunda linha; incluir tratamento de textos longos sem espaço. Esta etapa bloqueia 5-6.
4. Atualizar o cálculo de escala proporcional da imagem para usar altura máxima efetiva (altura útil - reserva fixa da legenda), mantendo limite por largura e altura. Depende de 2.
5. Atualizar o builder XML da página de evidência para renderizar legenda em no máximo 2 linhas visuais (linha 1 + quebra opcional + linha 2) mantendo estilo e alinhamento atuais. Depende de 3-4.
6. Integrar os novos helpers no fluxo de geração das evidências de imagem (somente imagens), substituindo o sizing atual. Depende de 3-5.
7. Fase 2 - Testes automatizados.
8. Adicionar testes unitários cobrindo: escala proporcional, impacto da reserva fixa, composição em 2 linhas, truncamento com reticências e casos de borda (acentos, token longo sem espaços). Depende de 3-4.
9. Estender testes de integração DOCX para validar no XML final: dimensões de imagem limitadas pela nova altura efetiva e estrutura de legenda com no máximo 2 linhas em cenários de legenda longa e imagem grande. Depende de 5-6.
10. Fase 3 - Validação final.
11. Executar validação focada e suíte completa; em seguida validar build para garantir compilação limpa.
12. Executar verificação manual em DOCX real: imagem no limite máximo permitido após reserva, legenda limitada a 2 linhas e ausência de overflow visual na página da evidência.

**Relevant files**
- d:/Programacao/Electron/ship-it/electron/report-generator.ts - regra atual de fit proporcional.
- d:/Programacao/Electron/ship-it/electron/report-generator.ts - builder XML da página de evidência e legenda.
- d:/Programacao/Electron/ship-it/electron/report-generator.ts - ponto de integração da escala e montagem das páginas.
- d:/Programacao/Electron/ship-it/electron/report-generator.test.ts - base de testes unitários a expandir.
- d:/Programacao/Electron/ship-it/electron/report-generator.integration.test.ts - cobertura de integração existente para evidência de imagem.
- d:/Programacao/Electron/ship-it/electron/__fixtures__/template.docx - template usado pelos testes de integração.
- d:/Programacao/Electron/ship-it/docs/coisas para fazer e publicar.md - item de backlog que este plano atende.

**Verification**
1. Rodar validação focada: npx vitest run electron/report-generator.test.ts electron/report-generator.integration.test.ts.
2. Rodar suíte completa: npm run test.
3. Rodar validação de compilação: npm run build.
4. Gerar ao menos 2 DOCX de prova: imagem muito grande com legenda curta; imagem com legenda longa que excede 2 linhas no texto original.
5. Abrir no Word e confirmar: imagem maximizada dentro do limite útil da página, legenda em até 2 linhas com reticências quando necessário, sem quebra visual indevida.

**Decisions**
- Legenda acima de 2 linhas: truncar com reticências.
- Área livre para imagem: 27 cm (largura) x 15 cm (altura).
- Reserva de espaço para legenda: fixa para 2 linhas em todos os casos.
- Escopo incluído: páginas de evidência de imagem no Encarte B.
- Escopo excluído: layout de evidência de texto, redesign de template/margens e mudanças de UI.

Se aprovar este plano, o próximo passo é executar exatamente nesta ordem.
