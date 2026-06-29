---
description: "Audite e sincronize a documentação do ShipIt com o estado real do código, sem alterar funcionalidades, atualize os arquivos de documentação. Use após releases, features grandes ou mudanças em arquitetura, IPC, dependências, rotas, temas ou testes."
agent: "agent"
argument-hint: "Escopo opcional: full sync, release docs, quick audit, docs específicos"
---

# Plan: Atualização de Documentação do Projeto (Reutilizável)

**TL;DR**: plano reutilizável para auditar e sincronizar a documentação do ShipIt com o estado real do código. Use após releases, features significativas ou mudanças em arquitetura, IPC, dependências, rotas, temas, testes, empacotamento ou fluxos principais.

---

## Objetivo

Atualizar os documentos do projeto para que eles reflitam o código atual, sem inventar funcionalidades e sem transformar uma atualização documental em alteração de produto.

Ao final, entregar:

1. Documentos atualizados e consistentes entre si.
2. Um resumo do que mudou por arquivo.
3. Validações executadas e qualquer validação não executada com motivo.
4. Problemas encontrados que ficaram pendentes, com indicação clara de follow-up.

---

## Modos de Execução

Use o modo pedido pelo usuário. Se nenhum modo for informado, use **Full sync**.

| Modo | Quando usar | Escopo |
|------|-------------|--------|
| **Full sync** | Após feature grande, release ou documentação desatualizada | Todas as fases deste plano |
| **Release docs** | Preparação de tag/release | CHANGELOG, README, TODO, DEVELOPMENT, DEPENDENCIES, release workflow e links |
| **Quick audit** | Verificação sem edições grandes | Coleta de contexto + lista objetiva de gaps; só editar se o usuário pedir |
| **Targeted docs** | Usuário cita documentos específicos | Apenas docs pedidos + verificação cruzada mínima |

---

## Regras de Execução

- Use o código como fonte da verdade. Documentos antigos são referência, não prova.
- Não altere código de produto, testes ou build para “fazer a documentação bater”. Este plano é documental.
- Não faça bump de versão em `package.json` nem crie tag/release, a menos que o usuário peça explicitamente.
- Não mova mudanças de `[Unreleased]` para uma versão lançada sem evidência de release/tag.
- Não fabrique screenshots, números de testes, contagens de IPC, nomes de componentes ou links de download.
- Preserve mudanças não relacionadas já existentes no working tree.
- Prefira atualizar textos com afirmações verificáveis e datas reais.
- Se uma validação falhar por problema pré-existente, registre o bloqueio e continue a auditoria documental quando possível.

---

## Pré-execução: Coleta de Contexto

Colete os dados abaixo antes de editar. Quando possível, faça leituras em paralelo, mas aplique edições de forma coordenada para manter consistência entre documentos.

### Estado do repositório

1. **Working tree** → arquivos modificados, não rastreados e mudanças relevantes já presentes.
2. **Versão atual** → `package.json` → campo `version`.
3. **Data atual** → data de execução do plano.
4. **Último release documentado** → primeira seção versionada em `CHANGELOG.md`.
5. **Mudanças desde o último release** → `git log`/diff quando necessário, mais mudanças não commitadas relevantes.

### Código-fonte como fonte da verdade

6. **IPC exposto no preload** → `electron/preload.ts` → métodos/eventos expostos via `contextBridge`.
7. **IPC registrado no main** → `electron/main.ts` → canais `ipcMain.handle` e eventos relacionados.
8. **Contrato renderer** → `src/vite-env.d.ts` → interface `ElectronAPI` e tipos de dados.
9. **Componentes** → `src/components/` → todos os `.tsx`.
10. **Páginas** → `src/pages/` → todos os `.tsx`.
11. **Rotas** → `src/App.tsx` → todas as rotas reais do `HashRouter`.
12. **Entidades** → `electron/entities/` → entidades, campos-chave, relações e enums.
13. **Serviços/fallbacks** → `src/services/` → especialmente `localDb.ts`.
14. **Temas** → `src/themes/themes.ts` e `src/themes/*.css` → contagem, ids, categorias e mecanismo.
15. **Background jobs/protocolos** → `electron/main.ts` → schedulers, protocolos customizados e integrações do tray.
16. **Dependências e scripts** → `package.json` → `dependencies`, `devDependencies`, `scripts`, `engines`, `build`.
17. **Workflows de CI/CD** → `.github/workflows/` → gatilhos, jobs, Node/npm, testes e artefatos.
18. **Assets de release** → `build/`, `public/assets/`, `extraResources` no `package.json`.

### Validações quantitativas

19. **Contagem de testes** → executar `npm run test` e capturar arquivos/testes passados. Se falhar, registrar o total parcial e o erro.
20. **E2E** → não executar por padrão; verificar documentação sobre `npm run test:e2e` e registrar se a execução completa foi solicitada.
21. **Build** → executar `npm run build` apenas se a atualização documental depender de saída gerada ou se o usuário pedir validação completa; caso contrário, não é obrigatório para docs-only.

### Inventário documental

22. **Documentos principais** → `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CLAUDE.md`.
23. **Docs técnicos** → `docs/TODO.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/DEPENDENCIES.md`.
24. **Planos reutilizáveis** → `docs/plan-*.prompt.md` e este arquivo, quando o próprio processo documental mudou.
25. **Links internos** → paths relativos entre README, docs e `CLAUDE.md`.

Registre os dados coletados em uma tabela curta de referência antes de editar mentalmente; não precisa criar arquivo temporário.

---

## Fase 1: CHANGELOG.md

**Arquivo**: `CHANGELOG.md`

### Checklist

- [ ] Existe uma seção `[Unreleased]` para mudanças ainda não versionadas?
- [ ] A versão no topo, quando versionada, corresponde ao release real e não apenas ao `package.json` em desenvolvimento?
- [ ] Features novas desde o último release estão documentadas?
- [ ] Correções e mudanças comportamentais aparecem nas categorias corretas?
- [ ] Categorias seguem Keep a Changelog em pt-BR: `Adicionado`, `Alterado`, `Corrigido`, `Removido`, quando aplicável?
- [ ] Links de comparação no rodapé estão corretos ou marcados como pendentes?

### O que verificar

1. Comparar commits/diffs desde a última versão documentada com as entradas existentes.
2. Novos componentes, páginas, IPC handlers, entidades, dependências ou workflows devem aparecer em `Adicionado`.
3. Mudanças de comportamento devem aparecer em `Alterado` ou `Corrigido`, conforme o caso.
4. Se `package.json` estiver em versão `-dev`, mantenha mudanças em `[Unreleased]` até confirmação de release.
5. Não reescreva histórico antigo sem necessidade.

---

## Fase 2: README.md

**Arquivo**: `README.md`

### Checklist

- [ ] Badge de versão reflete o último release público, ou deixa claro que a versão atual está em desenvolvimento.
- [ ] Seção `Funcionalidades` lista as capacidades atuais do produto.
- [ ] Links de download apontam para releases corretas e não para artefatos inexistentes.
- [ ] Requisitos do sistema estão coerentes com `package.json` e targets do electron-builder.
- [ ] Primeiros Passos refletem o fluxo real do app.
- [ ] Evidências, relatórios, temas, busca, tray, alertas, atualizações e lixeira estão descritos quando existirem.
- [ ] FAQ está atualizada com perguntas úteis e verificáveis.
- [ ] Screenshots/placeholders não prometem imagens inexistentes como se fossem reais.
- [ ] Links para docs internos funcionam.

### O que verificar

1. Comparar funcionalidades listadas com rotas, componentes e IPC reais.
2. Verificar se novas funcionalidades aparecem em linguagem de usuário final, não só técnica.
3. Conferir instruções de instalação nas três plataformas.
4. Manter conteúdo de desenvolvimento resumido, apontando para `docs/DEVELOPMENT.md` e `CONTRIBUTING.md`.

---

## Fase 3: docs/TODO.md

**Arquivo**: `docs/TODO.md`

### Checklist

- [ ] Header mostra versão e data atuais.
- [ ] Fases concluídas estão marcadas como `✅` ou `[x]` de forma consistente.
- [ ] Trabalho recente tem fase/tarefa correspondente.
- [ ] Backlog não contém itens já implementados.
- [ ] Fases não estão duplicadas nem fora de ordem sem justificativa.
- [ ] Itens pendentes são claros o bastante para virar tarefa futura.

### O que verificar

1. Cruzar fases documentadas com funcionalidades existentes no código.
2. Mover backlog implementado para fase concluída ou registrar como concluído.
3. Adicionar tarefas pendentes reais descobertas durante a auditoria.

---

## Fase 4: docs/ARCHITECTURE.md

**Arquivo**: `docs/ARCHITECTURE.md`

### Checklist

- [ ] Diagrama Main ↔ Preload ↔ Renderer está correto.
- [ ] Contagem de IPC exposto e canais registrados está coerente com o código.
- [ ] Tabela de IPC lista grupos e métodos atuais com prefixos corretos.
- [ ] Componentes em `src/components/` estão todos representados ou a regra de agrupamento está clara.
- [ ] Rotas de `src/App.tsx` estão todas documentadas.
- [ ] Entidades do banco refletem campos, relações, enums e soft-delete atuais.
- [ ] Temas refletem contagem, categorias, ids e mecanismo atual.
- [ ] Background schedulers, tray e protocolos customizados estão documentados.
- [ ] Decisões arquiteturais refletem padrões reais do projeto.

### O que verificar

1. Comparar `electron/preload.ts`, `electron/main.ts` e `src/vite-env.d.ts` para detectar drift de IPC.
2. Comparar tabela de componentes com arquivos reais.
3. Comparar diagrama/tabela de entidades com decorators TypeORM.
4. Verificar se mudanças recentes em ordenação, busca, relatórios ou fallback local aparecem como comportamento documentado quando forem relevantes para arquitetura.

---

## Fase 5: docs/DEVELOPMENT.md

**Arquivo**: `docs/DEVELOPMENT.md`

### Checklist

- [ ] Requisitos de Node.js e npm correspondem aos `engines`.
- [ ] Todos os scripts npm estão listados com descrição correta.
- [ ] Estrutura de diretórios reflete arquivos e pastas significativos atuais.
- [ ] Contagem de testes corresponde ao resultado real de `npm run test`.
- [ ] Setup `clone → npm install → npm run dev` está correto.
- [ ] Targets de build batem com `package.json`.
- [ ] CI/CD reflete workflows reais.
- [ ] Notas sobre Electron rebuild, Tailwind v4, TypeORM e Playwright estão atualizadas.

### O que verificar

1. Comparar scripts do `package.json` com a tabela do doc.
2. Atualizar árvore de diretórios somente para itens relevantes; não listar build output como fonte principal.
3. Registrar pré-requisitos ou gotchas descobertos em testes recentes.

---

## Fase 6: docs/DEPENDENCIES.md

**Arquivo**: `docs/DEPENDENCIES.md`

### Checklist

- [ ] Data de última atualização é a data de execução.
- [ ] Todas as `dependencies` aparecem com versões corretas.
- [ ] Todas as `devDependencies` aparecem com versões corretas.
- [ ] Dependências removidas não permanecem documentadas.
- [ ] Cada dependência tem propósito breve e correto.
- [ ] Requisitos de Node.js, npm e OS batem com `package.json` e build targets.

### O que verificar

1. Comparar `package.json` com a lista do doc, dependência por dependência.
2. Separar produção, desenvolvimento/teste, empacotamento e tipos quando fizer sentido.
3. Não extrapolar riscos de segurança sem evidência; se houver auditoria de vulnerabilidades, registre comando e resultado.

---

## Fase 7: CONTRIBUTING.md e Metadados do Projeto

**Arquivos**: `CONTRIBUTING.md`, `package.json`, `.github/workflows/*`, docs de release quando existirem

### Checklist

- [ ] Pré-requisitos de contribuição batem com `engines`.
- [ ] Fluxo de setup, build, testes e PR corresponde ao estado atual.
- [ ] Convenções documentadas ainda são verdadeiras.
- [ ] Instruções para adicionar entidades, páginas, IPC e evidências estão coerentes com o código.
- [ ] Workflows de release/CI citados existem e usam versões corretas de Node/npm.
- [ ] Nomes de artefatos e targets batem com `package.json`.

### O que verificar

1. Atualizar `CONTRIBUTING.md` quando mudanças arquiteturais ou scripts afetam contribuidores.
2. Conferir se a documentação de release menciona draft, tags semver, auto-update e artefatos reais.
3. Não editar `package.json` neste plano, exceto se o usuário pediu explicitamente uma mudança documental em metadados.

---

## Fase 8: CLAUDE.md

**Arquivo**: `CLAUDE.md` (raiz do projeto — carregado automaticamente pelo Claude Code)

### Checklist

- [ ] Versão atual reflete o `package.json`.
- [ ] Stack está completa e com versões corretas; lista de "não usa" continua verdadeira.
- [ ] Regras invioláveis (segurança Electron, protocolos, idioma, tokens Tailwind, dois processos TS) continuam corretas.
- [ ] Mapa "onde mexer" aponta para os arquivos certos (IPC, entidades, páginas, temas, DOCX).
- [ ] Gotchas e Convenções incluem aprendizados recentes que evitam erro recorrente.
- [ ] Os três arquivos de tarefa (rascunho/TODO/DONE) e o fluxo de release estão descritos corretamente.
- [ ] Links internos para `docs/` funcionam.

### O que verificar

Este é o arquivo mais crítico para o Claude Code no projeto.

1. Cruze cada seção com o código real.
2. Prefira descrições estáveis a contagens frágeis quando o doc não precisa de número exato.
3. Atualize padrões emergentes quando eles ajudam futuras alterações.
4. Não inclua detalhes temporários ou ruído de uma task específica, a menos que seja uma prática recorrente.

---

## Fase 9: Planos e Prompts Reutilizáveis

**Arquivos**: `docs/plan-*.prompt.md`, `.github/prompts/*.prompt.md` se existirem

### Checklist

- [ ] Planos reutilizáveis ainda descrevem o fluxo correto.
- [ ] Prompts com intenção de slash command têm `description` útil e, se aplicável, frontmatter válido.
- [ ] Nomes de arquivo não confundem escopo (`*.prompt.md` vs documentação comum).
- [ ] Planos antigos não contradizem docs atuais ou decisões já tomadas.

### O que verificar

1. Se o usuário usa um arquivo como prompt recorrente, melhorar descrição, escopo, regras de execução e saída esperada.
2. Se a intenção for slash prompt oficial do VS Code, recomendar localização em `.github/prompts/` ou no diretório de prompts do usuário.
3. Não mover arquivos de `docs/` sem autorização, pois eles também funcionam como histórico de planejamento.

---

## Fase 10: Verificação Cruzada

Execute esta fase por último.

### Consistência entre documentos

- [ ] Versão, último release e estado `-dev` estão consistentes.
- [ ] Contagem de testes é a mesma em README/DEVELOPMENT/TODO/CLAUDE.md quando citada.
- [ ] Contagem de IPC é consistente ou documentada como aproximada de forma intencional.
- [ ] Contagem de temas é consistente.
- [ ] Componentes/páginas/rotas/entidades batem entre ARCHITECTURE e CLAUDE.md.
- [ ] Dependências e scripts batem com `package.json`.
- [ ] Links internos usam paths relativos corretos.
- [ ] README e CONTRIBUTING não duplicam detalhes técnicos extensos que pertencem a `docs/DEVELOPMENT.md`.

### Validação de formato

- [ ] Nenhum arquivo tem seções truncadas ou placeholders acidentais.
- [ ] Tabelas Markdown renderizam corretamente.
- [ ] Links internos foram verificados por leitura ou busca.
- [ ] Não há referências a arquivos removidos ou artefatos não existentes.
- [ ] Não há datas futuras, versões inventadas ou contagens não verificadas.

---

## Comandos Úteis de Auditoria

Use os comandos conforme necessário, adaptando ao shell disponível.

```bash
npm run test
npm run build
rg "Version|Versão|1\." README.md CHANGELOG.md docs CLAUDE.md
rg "ipcMain\.handle|contextBridge|electronAPI" electron src
rg --files src/components src/pages electron/entities .github/workflows docs
```

Observações:

- Use `npm run test` para obter a contagem real de testes quando essa contagem for documentada.
- Use `npm run build` como validação complementar, não como requisito obrigatório de uma edição docs-only.
- Se o ambiente não tiver `rg`, use a busca equivalente disponível.

---

## Como Executar Este Plano

1. **Defina o modo**: full sync, release docs, quick audit ou targeted docs.
2. **Colete o contexto**: gere um snapshot curto com versão, data, contagens e docs afetados.
3. **Identifique gaps**: compare código vs documentação antes de editar.
4. **Edite em lotes pequenos**: mantenha termos, números e versões consistentes entre arquivos.
5. **Rode validações**: no mínimo `npm run test` quando contagem de testes for atualizada; build se solicitado ou necessário.
6. **Faça verificação cruzada**: procure divergências de versão, contagens, links e nomes.
7. **Atualize o estado conhecido**: preencha a seção final deste plano quando ele for usado como registro da execução.
8. **Finalize com resumo**: liste arquivos alterados, validações e pendências.

---

## Frequência Recomendada

| Trigger | Fases a executar |
|---------|------------------|
| **Após cada release** | 1-10 |
| **Após feature grande** | 1-10, ajustando profundidade conforme impacto |
| **Após adicionar IPC handlers** | 4, 8, 10 |
| **Após adicionar componentes/páginas/rotas** | 2, 4, 5, 8, 10 |
| **Após adicionar entidades/campos de banco** | 4, 5, 8, 10 |
| **Após adicionar dependências/scripts** | 5, 6, 7, 10 |
| **Após mudar CI/CD ou empacotamento** | 2, 5, 7, 10 |
| **Após completar fase do TODO** | 1, 3, 8, 10 |
| **Verificação rápida periódica** | Pré-execução + 10 |

---

## Estado Atual Conhecido (para referência na próxima execução)

> Atualize esta seção ao final de cada execução real do plano. Não use esta seção como fonte da verdade sem reconferir o código.

- **Última execução do plano**: 2026-05-26 — Full sync documental pós-v1.6.0
- **Versão em `package.json`**: 1.6.0
- **Último release documentado**: v1.6.0 (publicado em 2026-05-26)
- **Data da execução**: 2026-05-26
- **IPC exposto no preload**: 57 chamadas `ipcRenderer.invoke` + 4 listeners `ipcRenderer.on`
- **IPC registrado no main**: 57 handlers `ipcMain.handle`
- **Componentes**: 19 arquivos `.tsx` em `src/components/` (adicionados `UpdateModal`, `UpdateStatusPanel`)
- **Páginas/rotas**: 9 arquivos em `src/pages/`; 9 rotas em `src/App.tsx` incluindo `/manual`
- **Contextos**: 3 (`ThemeContext`, `NavigationHistoryContext`, `UpdateStateContext`)
- **Entidades**: 6 (`UserProfile`, `Activity`, `Evidence`, `Report`, `ActivityReport`, `Alert`)
- **Temas**: 11 temas registrados (`light`, `dark`, `colorful`, `rose-violet`, `minimalist`, `futuristic`, `ocean`, `sunset`, `high-contrast`, `high-contrast-dark`, `cyberpunk`)
- **Dependências prod/dev**: 21 produção / 19 desenvolvimento
- **Scripts npm**: 10 scripts
- **Testes**: `npm run test` — 12 arquivos, 147 testes passando
- **E2E declarados**: 36 cenários Playwright (`e2e/app.spec.ts`)
- **Build**: não executado; alteração foi documental e `npm run test` bastou para a contagem verificada
- **Documentos alterados**: `CHANGELOG.md`, `README.md`, `.github/copilot-instructions.md`, `docs/TODO.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/DEPENDENCIES.md`, este plano.
- **Problemas encontrados**: Playwright E2E não executado nesta auditoria; alguns planos históricos em `docs/plans/` ainda preservam contagens antigas como registro de execução, sem afetar a documentação principal.
