## Plan: Links clicáveis no DOCX

Corrigir o bloco de referência do relatório DOCX para que ele monte um conteúdo híbrido por atividade: primeiro os links vindos de `link_ref`, um por linha e rotulados como `link 01`, `link 02`, etc., com hyperlink externo em `word/_rels/document.xml.rels`; depois de uma linha em branco, manter as referências das evidências com `PAGEREF` exatamente como hoje. A menor mudança fica isolada em `generateDocxReport`, atacando também o gate atual que só preenche a célula quando há evidências.

**Steps**
1. Fase 1 — consolidar os dados de referência por atividade em `d:\Programacao\Electron\ship-it\electron\report-generator.ts`. No laço que hoje gera `activityPageRefs` e nas iterações de preenchimento da tabela do Encarte A, montar uma estrutura por atividade com `bookmarks` e `links` parseados de `act.link_ref` (trim por linha, remoção de vazios, preservando ordem digitada). Esta fase depende do fluxo atual em `generateDocxReport` e substitui a checagem `activityPageRefs.size > 0` por uma condição "tem links válidos e/ou tem evidências".
2. Fase 2 — adicionar suporte a hyperlinks externos em DOCX no mesmo arquivo. Reaproveitar o scan existente de `rId` em `word/_rels/document.xml.rels` para alocar relacionamentos de hyperlink sem colisão, criando um helper pequeno para registrar `Relationship` com `Type=.../hyperlink` e `TargetMode=External`.
3. Fase 3 — compor o XML da célula de referência do Encarte A. Evoluir `buildPageRefRuns` para um builder mais amplo, ou criar um builder irmão, que escreva: links primeiro (`link 01`, `link 02`, um por linha, texto visível sem URL completa), uma linha em branco após o último link quando também houver evidências, e abaixo o conteúdo atual de `Página/Páginas` com `PAGEREF`. Se houver só links, não inserir bloco de páginas; se houver só evidências, manter a saída atual.
4. Fase 4 — tratar robustez mínima sem expandir escopo. Ignorar linhas em branco; aceitar somente URLs `http/https` para relationships externos; manter linhas inválidas fora do DOCX em vez de quebrar a geração; não alterar banco, formulário ou UX desta issue.
5. Fase 5 — ampliar testes de integração em `d:\Programacao\Electron\ship-it\electron\report-generator.integration.test.ts`. Adicionar caso com `link_ref` multiline + evidências para validar a ordem do conteúdo no `word/document.xml`, a presença de `w:hyperlink` com rIds dedicados e os `Target`s corretos em `word/_rels/document.xml.rels`, além de confirmar que o bloco `PAGEREF` continua presente após os links.
6. Adicionar um segundo teste de regressão para atividade com links e sem evidências, cobrindo o bug atual do gate que impede preencher a célula; opcionalmente adicionar um terceiro caso com linhas vazias/whitespace para garantir normalização. Este passo é paralelo ao passo 5 depois que a estratégia final do builder estiver definida.
7. Validar com `npx vitest run electron/report-generator.integration.test.ts` e depois `npm run build`, já que o projeto usa Electron + decorators TypeORM e o build é a verificação decisiva de tipos/compilação.
8. Fazer verificação manual gerando um relatório com múltiplos links e evidências, abrindo o DOCX no Word para confirmar: labels curtos clicáveis, navegação correta para cada URL, linha em branco entre links e referências de páginas, e manutenção da numeração de páginas das evidências.
9. Documentar a correção seguindo o `docs\plan-documentationUpdate.prompt.md`

**Relevant files**
- `d:\Programacao\Electron\ship-it\electron\report-generator.ts` — ponto central da correção; hoje monta `activityPageRefs`, faz o scan de `rId`, injeta páginas de evidência e preenche a célula de referência com `buildPageRefRuns`.
- `d:\Programacao\Electron\ship-it\electron\report-generator.integration.test.ts` — suíte adequada para validar o ZIP DOCX, `document.xml`, `document.xml.rels` e regressões do gerador.
- `d:\Programacao\Electron\ship-it\src\pages\ActivityFormPage.tsx` — referência do comportamento de entrada e persistência de `link_ref` como texto multiline; não deve exigir mudança nesta issue.
- `d:\Programacao\Electron\ship-it\src\pages\ActivityDetailPage.tsx` — referência do parsing atual por quebra de linha (`parseLinks`), útil para alinhar o comportamento esperado no gerador sem precisar mexer na UI.

**Verification**
1. Executar `npx vitest run electron/report-generator.integration.test.ts`.
2. Executar `npm run build`.
3. Gerar um DOCX real com uma atividade contendo 2+ links e 2+ evidências e validar manualmente no Word a clicabilidade, o texto curto `link 01`/`link 02`, a separação por linha em branco e a preservação das referências de páginas.

**Decisions**
- Inclui apenas a montagem do DOCX e testes do gerador.
- Exclui mudanças de schema, migração, validação de formulário, alteração visual da tela de atividade e mudança no formato persistido de `link_ref`.
- Ordem dos links no DOCX deve seguir exatamente a ordem digitada no campo `Links de Referência`.
- O rótulo visível recomendado é `link 01`, `link 02`, etc., em minúsculas, por aderir ao exemplo do requisito.
- Quando houver links e evidências, os links vêm primeiro; as referências de evidência continuam abaixo após uma linha em branco.
- Quando não houver evidências, os links ainda devem aparecer; isso corrige o gate atual que hoje depende só de bookmarks.
