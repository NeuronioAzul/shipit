## Plan: Correções da Busca na Titlebar e Cyberpunk

Corrigir a experiência da busca na janela do app em dois eixos: preservar área clicável para arraste da janela e estabilizar o SearchBar no tema cyberpunk sem alterar o visual global do tema ou dos outros temas existentes. A estratégia recomendada é ajustar o contrato drag/no-drag na TitleBar, definir largura máxima responsiva do SearchBar (320/420/520) e aplicar correção pontual no cyberpunk com exclusão do SearchBar das regras globais agressivas de clip-path/pseudo-elemento.

**Steps**
1. Fase 1 — Ajuste de contrato de arraste da janela: revisar a composição de TitleBar para que apenas os elementos interativos fiquem em no-drag e a área ao redor volte a ser drag. Dependência: nenhuma.
2. Fase 1.1 — Em src/components/TitleBar.tsx, remover no-drag da faixa central ampla e manter centralização visual do SearchBar sem transformar toda a região central em área não arrastável. Depende do passo 1.
3. Fase 1.2 — Em src/components/SearchBar.tsx, aplicar no-drag somente ao contêiner real da busca e ajustar classes para largura máxima responsiva (320/420/520), removendo crescimento que ocupa espaço excessivo da menubar. Depende do passo 1.1.
4. Fase 2 — Correção pontual do tema cyberpunk no SearchBar: em src/themes/cyberpunk-effects.css, excluir o dropdown da busca (#searchbar-results) das regras globais de rounded-lg + bg-card (normal, ::before e :hover) para evitar clip-path e overlays indevidos. Pode rodar em paralelo ao passo 3 após entendimento do passo 1.
5. Fase 2.1 — Também excluir #searchbar-results das regras globais de scanline de cards ([class*=bg-card][class*=border]) e aplicar regra dedicada ao dropdown da busca para manter posicionamento absoluto estável, sem deslocamento vertical e sem sumiço de conteúdo/ícones. Depende do passo 4.
6. Fase 3 — Cobertura de regressão automatizada: ampliar e2e/app.spec.ts com cenário da busca no cyberpunk. Depende dos passos 3 e 5.
7. Fase 3.1 — No teste E2E, validar: foco na busca (Ctrl+K), digitação com 2+ caracteres, visibilidade do input/ícone, dropdown visível, dropdown ancorado logo abaixo do input (sem deslocar para baixo) e limite de largura aplicado na viewport de teste. Depende do passo 6.
8. Fase 3.2 — Incluir assertiva estrutural do contrato drag/no-drag nos elementos de titlebar/searchbar (via estilo inline/computed style), já que arraste nativo de janela não é confiável para automação end-to-end. Depende do passo 6.
9. Fase 4 — Validação final manual e comandos de teste: confirmar comportamento em tema padrão e cyberpunk, com e sem resultados de busca, em janela normal e maximizada. Depende dos passos 7 e 8.

**Relevant files**
- d:/Programacao/Electron/ship-it/src/components/TitleBar.tsx — ajustar região drag/no-drag da área central da titlebar.
- d:/Programacao/Electron/ship-it/src/components/SearchBar.tsx — aplicar largura máxima responsiva e no-drag local ao campo de busca.
- d:/Programacao/Electron/ship-it/src/themes/cyberpunk-effects.css — exclusões pontuais e estabilização do dropdown/ícones do SearchBar no tema cyberpunk.
- d:/Programacao/Electron/ship-it/e2e/app.spec.ts — adicionar cenários de regressão para SearchBar e cyberpunk.

**Verification**
1. Executar npm run test para garantir que a suíte Vitest existente permanece íntegra.
2. Executar npm run test:e2e para validar os novos cenários da titlebar/searchbar no Electron.
3. Rodar manualmente npm run dev e verificar checklist: área de arraste livre ao redor da busca, input estável ao digitar no cyberpunk, ícone visível, dropdown sem deslocamento e alinhado ao input.
4. Repetir validação manual em pelo menos dois tamanhos de janela (normal e maximizada) para confirmar a estratégia responsiva de largura máxima.

**Decisions**
- Largura da busca: responsiva em 320/420/520 por breakpoint.
- Escopo cyberpunk: correção pontual (não refatorar regras globais do tema inteiro).
- Testes: incluir cobertura automatizada de regressão (E2E) + checklist manual.
- Incluído: correções da titlebar/searchbar e tema cyberpunk relacionadas ao bug reportado.
- Excluído: redesign geral da menubar ou revisão completa de todos os componentes cyberpunk fora da busca.

**Further Considerations**
1. Se houver novos conflitos de tema em outros dropdowns, considerar uma fase futura para endurecer seletores globais do cyberpunk por contexto (main e classes explícitas) em vez de seletor amplo por substring.
2. Caso o comportamento de drag varie por plataforma no futuro (macOS/Linux), registrar testes manuais específicos por SO no pipeline de release.