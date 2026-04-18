# Plan: Atualização de Documentação do Projeto (Reutilizável)

**TL;DR**: Plano reutilizável para sincronizar toda a documentação do ShipIt com o estado atual do código. Execute este plano após cada release ou conjunto significativo de mudanças.

---

## Pré-execução: Coleta de Contexto

Antes de iniciar, colete automaticamente:

1. **Versão atual** → `package.json` → campo `version`
2. **Data atual** → data de execução do plano
3. **Contagem de IPC** → `electron/preload.ts` → contar todos os métodos expostos via `contextBridge`
4. **Lista de componentes** → `src/components/` → listar todos os `.tsx`
5. **Lista de páginas** → `src/pages/` → listar todos os `.tsx`
6. **Lista de entidades** → `electron/entities/` → listar todos os `.ts`
7. **Rotas** → `src/App.tsx` → extrair todas as `<Route>`
8. **Temas** → `src/themes/themes.ts` → contar e listar temas registrados
9. **Dependências** → `package.json` → listar `dependencies` e `devDependencies` com versões
10. **Scripts** → `package.json` → listar todos os scripts de build/test/dev
11. **Contagem de testes** → executar `npm run test` e capturar total
12. **Último CHANGELOG entry** → `CHANGELOG.md` → ler a versão mais recente documentada

Armazenar esses dados como referência para comparação em cada fase.

---

## Fase 1: CHANGELOG.md

**Arquivo**: `CHANGELOG.md`

### Checklist

- [ ] A versão no topo do CHANGELOG corresponde à versão do `package.json`?
- [ ] Existe uma entry `[Unreleased]` para mudanças ainda não versionadas?
- [ ] Todas as features novas desde o último release estão documentadas?
- [ ] Categorias corretas (Adicionado, Alterado, Corrigido, Removido)?
- [ ] Formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/)?
- [ ] Links de comparação no rodapé estão atualizados?

### O que verificar

1. Comparar os commits desde a última versão documentada com as entries do CHANGELOG
2. Novos componentes, IPC handlers, entidades ou páginas devem aparecer em "Adicionado"
3. Mudanças de comportamento devem aparecer em "Alterado"
4. Bug fixes devem aparecer em "Corrigido"
5. Se a versão do `package.json` for maior que a última entry, criar nova seção de release com a data atual

---

## Fase 2: README.md

**Arquivo**: `README.md`

### Checklist

- [ ] Badge de versão no topo corresponde à versão do `package.json`?
- [ ] Seção "Funcionalidades" lista todas as features atuais?
- [ ] Links de download estão corretos para a versão atual?
- [ ] Seção "Requisitos do Sistema" está atualizada (Node.js, npm, plataformas)?
- [ ] Seção "Primeiros Passos" reflete o fluxo atual do app?
- [ ] FAQ está atualizada com perguntas relevantes?
- [ ] Nenhuma seção está truncada ou incompleta?
- [ ] Screenshots/placeholders refletem o estado visual atual?

### O que verificar

1. Contar features listadas vs features reais (rotas, componentes, capabilities)
2. Verificar se novas funcionalidades (componentes, temas, etc.) estão mencionadas
3. Verificar se instruções de instalação funcionam nas 3 plataformas
4. Verificar se os links para documentação interna (`docs/`) estão corretos

---

## Fase 3: docs/TODO.md

**Arquivo**: `docs/TODO.md`

### Checklist

- [ ] Header mostra a versão e data atuais?
- [ ] Todas as fases concluídas estão marcadas como `✅`?
- [ ] Novas fases/tarefas foram adicionadas para trabalho recente?
- [ ] Todas as checkboxes `[x]` correspondem a funcionalidades realmente implementadas?
- [ ] Seção "Backlog" reflete itens pendentes reais?
- [ ] Não há fases ou itens duplicados?

### O que verificar

1. Cruzar fases documentadas com features existentes no código
2. Verificar se algum componente/página/IPC novo não tem fase correspondente
3. Verificar se o Backlog tem itens que já foram implementados (mover para fase completa)

---

## Fase 4: docs/ARCHITECTURE.md

**Arquivo**: `docs/ARCHITECTURE.md`

### Checklist

- [ ] Diagrama de processos (Main ↔ Preload ↔ Renderer) está correto?
- [ ] Contagem de IPC handlers corresponde ao total real em `preload.ts`?
- [ ] Tabela de IPC handlers lista TODOS os métodos atuais com prefixos corretos?
- [ ] Tabela de componentes lista TODOS os componentes em `src/components/`?
- [ ] Tabela de rotas lista TODAS as rotas em `App.tsx`?
- [ ] Entidades do banco de dados (6 entities) estão corretas com campos e relações?
- [ ] Seção de temas reflete o sistema atual (quantidade, categorias, mecanismo)?
- [ ] Background schedulers estão documentados?
- [ ] Custom protocols (`shipit-evidence://`, `shipit-sfx://`) estão documentados?
- [ ] Seção de Design Decisions está atualizada?

### O que verificar

1. **IPC** — comparar lista de métodos no doc vs métodos reais em `electron/preload.ts`
2. **Componentes** — comparar tabela no doc vs arquivos em `src/components/`
3. **Rotas** — comparar tabela no doc vs `<Route>` em `src/App.tsx`
4. **Entidades** — comparar diagrama/tabela no doc vs arquivos em `electron/entities/`
5. **Temas** — comparar contagem/lista no doc vs `src/themes/themes.ts`

---

## Fase 5: docs/DEVELOPMENT.md

**Arquivo**: `docs/DEVELOPMENT.md`

### Checklist

- [ ] Requisitos de Node.js e npm correspondem aos engines no `package.json`?
- [ ] Todos os scripts npm estão listados com descrição correta?
- [ ] Estrutura de diretórios reflete o estado atual do projeto?
- [ ] Contagem de testes corresponde ao resultado real de `npm run test`?
- [ ] Instruções de setup funcionam (clone → install → dev)?
- [ ] Targets de build (Windows, macOS, Linux) estão corretos?
- [ ] Seção de CI/CD reflete o workflow atual?

### O que verificar

1. Executar mentalmente o fluxo de setup e verificar se cada passo funciona
2. Verificar se novos scripts foram adicionados ao `package.json` mas não ao doc
3. Verificar se a árvore de diretórios inclui novos diretórios/arquivos significativos

---

## Fase 6: docs/DEPENDENCIES.md

**Arquivo**: `docs/DEPENDENCIES.md`

### Checklist

- [ ] Data de última atualização é recente?
- [ ] Todas as dependências de produção estão listadas com versões corretas?
- [ ] Todas as devDependencies estão listadas com versões corretas?
- [ ] Novas dependências adicionadas desde a última atualização estão documentadas?
- [ ] Dependências removidas foram retiradas da lista?
- [ ] Requisitos do sistema (Node.js, npm, OS) estão corretos?

### O que verificar

1. Comparar `dependencies` e `devDependencies` do `package.json` com a lista no doc
2. Para cada dependência nova, adicionar descrição breve do propósito
3. Atualizar data de última atualização para a data de execução

---

## Fase 7: .github/copilot-instructions.md

**Arquivo**: `.github/copilot-instructions.md`

### Checklist

- [ ] Versão no header corresponde ao `package.json`?
- [ ] Tech Stack table está completa e com versões corretas?
- [ ] Tabela de IPC Handlers reflete todos os grupos e métodos atuais?
- [ ] Contagem de IPC handlers está correta (ex: "70+ methods")?
- [ ] Lista de rotas corresponde ao `App.tsx`?
- [ ] Lista de componentes (em File Structure e Conventions) está completa?
- [ ] Seção de Theming documenta todos os temas e mecanismo atual?
- [ ] Seção de Database/entities lista todas as 6 entidades com campos-chave?
- [ ] Background schedulers estão corretos?
- [ ] Gotchas estão atualizadas?
- [ ] Roadmap Context reflete as fases reais concluídas?

### O que verificar

Este é o arquivo mais crítico — é a referência principal para o AI assistant.
1. Cruzar CADA seção com o código real
2. Garantir que convenções documentadas são seguidas no código
3. Verificar se novos padrões/convenções emergentes estão capturados

---

## Fase 8: Verificação Cruzada

### Consistência entre documentos

- [ ] A versão é a mesma em TODOS os arquivos: `package.json`, README badge, CHANGELOG entry, TODO header, copilot-instructions header
- [ ] A contagem de testes é consistente entre DEVELOPMENT.md, copilot-instructions.md e TODO.md
- [ ] A contagem de IPC handlers é consistente entre ARCHITECTURE.md e copilot-instructions.md
- [ ] A contagem de temas é consistente entre todos os documentos
- [ ] A contagem de componentes é consistente entre ARCHITECTURE.md e copilot-instructions.md
- [ ] Links internos entre documentos funcionam (paths relativos corretos)

### Validação de formato

- [ ] Nenhum arquivo com seções truncadas ou incompletas
- [ ] Tabelas markdown renderizam corretamente
- [ ] Sem warnings significativos de markdown lint

---

## Como Executar Este Plano

1. **Inicie pela Pré-execução** — colete todos os dados de referência do código
2. **Execute Fases 1-7 em paralelo** — cada fase é independente
3. **Fase 8 por último** — verificação cruzada depende das fases anteriores
4. **Documente o que mudou** — ao final, liste brevemente as alterações feitas em cada arquivo para referência futura

### Frequência Recomendada

| Trigger | Fases a executar |
|---------|-----------------|
| **Após cada release** | Todas (1-8) |
| **Após adicionar IPC handlers** | 4 (ARCHITECTURE), 7 (copilot-instructions) |
| **Após adicionar componentes/páginas** | 4, 5, 7 |
| **Após adicionar dependências** | 6 (DEPENDENCIES) |
| **Após completar fase do TODO** | 1 (CHANGELOG), 3 (TODO), 7 (copilot-instructions) |
| **Verificação rápida periódica** | 8 (Verificação Cruzada) |

---

## Estado Atual Conhecido (para referência na próxima execução)

> Atualize esta seção ao final de cada execução do plano.

- **Última execução**: _(preencher)_
- **Versão**: _(preencher)_
- **IPC handlers**: _(preencher)_
- **Componentes**: _(preencher)_
- **Páginas**: _(preencher)_
- **Temas**: _(preencher)_
- **Testes**: _(preencher)_
- **Problemas encontrados**: _(preencher)_
