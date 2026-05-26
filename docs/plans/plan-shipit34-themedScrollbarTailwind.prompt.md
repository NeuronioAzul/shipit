## Plan: Scrollbar temática global com Tailwind

Implementar uma scrollbar global que acompanhe o tema ativo em todo o app, usando tokens do sistema de tema já integrado ao Tailwind v4, com visibilidade estável quando houver overflow para evitar salto de layout.

**Steps**
1. Fase 1: adicionar tokens de scrollbar em todos os temas no arquivo [src/themes/themes.css](src/themes/themes.css), cobrindo track, thumb, hover, tamanho e raio. Depende de nenhuma etapa anterior.
2. Fase 1: expor os novos tokens no bloco @theme inline em [src/index.css](src/index.css), para manter integração com o modelo de tokens do Tailwind v4. Depende da etapa 1.
3. Fase 2: criar um stylesheet global de scrollbar na pasta de temas (novo arquivo), com regras WebKit e fallback padrão (scrollbar-color e scrollbar-width), sempre consumindo tokens de tema. Depende das etapas 1 e 2.
4. Fase 2: importar o novo stylesheet global em [src/index.css](src/index.css) com ordem de carga estável para não conflitar com estilos já existentes. Depende da etapa 3.
5. Fase 3: refatorar as regras de scrollbar hardcoded do tema cyberpunk em [src/themes/cyberpunk-effects.css](src/themes/cyberpunk-effects.css), mantendo apenas exceções necessárias (dropdown e timepicker). Paralelo com etapa 6, após etapa 3.
6. Fase 3: aplicar scrollbar-gutter: stable nos hosts reais de rolagem para manter visibilidade estável quando necessário, cobrindo [src/components/AppLayout.tsx](src/components/AppLayout.tsx), [src/components/SearchBar.tsx](src/components/SearchBar.tsx), [src/components/TextEvidenceModal.tsx](src/components/TextEvidenceModal.tsx), [src/components/TextEvidenceEditor.tsx](src/components/TextEvidenceEditor.tsx), [src/components/Select.tsx](src/components/Select.tsx) e [src/components/TimePicker.tsx](src/components/TimePicker.tsx). Paralelo com etapa 5, após etapa 3.
7. Fase 4: ajuste fino visual em Windows/Electron (largura, contraste, hover) para manter leitura e clique confortáveis, inspirado no padrão VS Code sem quebrar acessibilidade. Depende das etapas 5 e 6.
8. Fase 5: criar/ajustar cenário E2E para validar troca de tema + estabilidade de layout em áreas com overflow, no arquivo [e2e/app.spec.ts](e2e/app.spec.ts). Depende da etapa 7.
9. Fase 5: validação final manual e por build para garantir ausência de regressões. Depende da etapa 8.

**Relevant files**
- [src/themes/themes.css](src/themes/themes.css) — novos tokens de scrollbar por tema (11 temas).
- [src/index.css](src/index.css) — integração de tokens e import do stylesheet global.
- [src/themes/cyberpunk-effects.css](src/themes/cyberpunk-effects.css) — remoção de hardcode e alinhamento ao modelo global.
- [src/components/AppLayout.tsx](src/components/AppLayout.tsx) — host principal de rolagem.
- [src/components/SearchBar.tsx](src/components/SearchBar.tsx) — dropdown com overflow.
- [src/components/TextEvidenceModal.tsx](src/components/TextEvidenceModal.tsx) — corpo da modal com overflow.
- [src/components/TextEvidenceEditor.tsx](src/components/TextEvidenceEditor.tsx) — editor com overflow.
- [src/components/Select.tsx](src/components/Select.tsx) — dropdown portalizado com overflow.
- [src/components/TimePicker.tsx](src/components/TimePicker.tsx) — colunas com overflow.
- [e2e/app.spec.ts](e2e/app.spec.ts) — cobertura E2E de tema + scrollbar.

**Verification**
1. Rodar npm run dev no Windows e alternar os 11 temas na tela de configurações, validando mudança visual da scrollbar.
2. Validar manualmente os 6 pontos de overflow mapeados para confirmar trilho/thumb temáticos e visibilidade estável.
3. Confirmar que não há deslocamento lateral inesperado de layout ao aparecer rolagem.
4. Rodar npm run test:e2e com o cenário novo/ajustado.
5. Rodar npm run build para validação final de compilação.

**Decisions**
- Escopo definido: global em todo o app.
- Comportamento definido: visível quando necessário com reserva estável de espaço.
- Direção técnica: tema via tokens e integração Tailwind v4, evitando hardcode.

**Further Considerations**
1. Recomendação de largura: 8px nos temas padrão e 10px nos temas de alto contraste para melhor acessibilidade.
2. Critério de aceite visual: aparência inspirada no VS Code, mas sempre respeitando a paleta do tema ativo do ShipIt.
