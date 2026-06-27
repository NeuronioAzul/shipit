---
name: shipit-release-and-doc-sync
description: Use ao concluir um desenvolvimento ou publicar uma versão do ShipIt. Orquestra a sincronização da documentação (CHANGELOG, TODO, DONE, ARCHITECTURE, README) com o estado real do código E o fluxo de release (bump de versão, geração do changelog a partir dos commits, mover tarefas concluídas para DONE com a versão, e disparo do docs/scripts/release.py). Substitui a geração de changelog via Copilot CLI por geração feita pelo próprio Claude. Gatilhos típicos: "fazer release", "publicar versão", "release X.Y.Z", "bump", "subir versão", "sincronizar documentação", "atualizar changelog", "atualizar docs", "terminei a feature, atualiza tudo".
---

# ShipIt — Release & Doc Sync

Skill orquestradora para o fim de um ciclo de trabalho no ShipIt!. Tem **dois modos**. Identifique qual o usuário quer antes de agir; na dúvida, pergunte.

| Modo | Quando | Faz |
|---|---|---|
| **Doc Sync** | Terminou uma feature/correção, sem publicar ainda | Atualiza docs e `[Unreleased]` do CHANGELOG. **Não** faz bump nem tag. |
| **Release** | Vai publicar uma nova versão | Doc Sync + bump + finaliza CHANGELOG + move TODO→DONE com versão + dispara `release.py`. |

Fonte da verdade é **sempre o código**, não os docs antigos. Nunca invente números (testes, IPC, componentes) — verifique no código.

---

## Modo Doc Sync

Para a auditoria documental profunda, **siga o playbook existente** em <../../../docs/plans/plan-documentationUpdate.prompt.md>  (fases, checklists e verificação cruzada). O resumo operacional:

1. **Coletar contexto**: versão em `package.json`, data atual, último release no topo do `CHANGELOG.md`, e `git log <ultima-tag>..HEAD --no-merges` + working tree.
2. **CHANGELOG.md** → escrever as mudanças na seção `## [Unreleased]`, categorias Keep a Changelog em pt-BR: `Adicionado`, `Alterado`, `Corrigido`, `Removido`. Não mover para uma versão lançada sem release real.
3. **docs/TODO.md** → marcar/remover itens concluídos. Mover o que foi concluído para `docs/DONE.md`.
4. **docs/DONE.md** → registrar o que foi feito (ver formato abaixo). Anotar a versão se já tiver sido lançada, ou `[Unreleased]` se ainda não.
5. **docs/ARCHITECTURE.md** e **CLAUDE.md** → atualizar **apenas se** mudou estrutura: IPC handlers, rotas, entidades/campos, temas, schedulers, dependências, regras ou gotchas.
6. **README.md / DEVELOPMENT.md / DEPENDENCIES.md** → atualizar se a mudança for visível ao usuário, ao setup ou às dependências.
7. **Validar**: rodar `npm run test` quando uma contagem de testes for citada/atualizada. `npm run build` só se solicitado.
8. **Entregar** um resumo: arquivos alterados, validações executadas e pendências.

Regra de ouro: este modo é **documental** — não altere código de produto, testes ou build para "fazer a doc bater".

---

## Modo Release

> ⚠️ `docs/scripts/release.py` é **interativo** e executa operações de **rede destrutivas-irreversíveis** (push, PR, squash merge na `main`, tag, publish no GitHub Releases). **Sempre confirme com o usuário** antes de dispará-lo. Prepare tudo localmente primeiro.

### 1. Definir a versão

- Versão atual: campo `version` em `package.json`.
- Decidir patch/minor/major (semver) com base nas mudanças. Confirmar com o usuário.

### 2. Gerar o CHANGELOG (substitui o Copilot CLI)

O `release.py` tentaria gerar o changelog via `gh copilot`. **Nós geramos aqui, melhor**, e depois rodamos o script com `--skip-changelog`.

1. `git log <ultima-tag>..HEAD --no-merges --oneline` para listar os commits do ciclo (e revisar diffs relevantes).
2. Promover o conteúdo de `## [Unreleased]` para uma nova seção `## [X.Y.Z] — AAAA-MM-DD` (data de hoje), no formato Keep a Changelog em pt-BR, mais novo no topo. Completar com o que faltar dos commits. Deixar `## [Unreleased]` vazio acima.
3. Mostrar a entrada ao usuário para aprovação.

### 3. Mover tarefas concluídas TODO → DONE

- Marcar no `docs/TODO.md` o que entrou nesta versão e mover para `docs/DONE.md` anotado com `vX.Y.Z`.
- Manter no TODO só o que continua pendente.

### 4. Disparar o release (com confirmação)

Como o CHANGELOG já está pronto, rode pulando a etapa do changelog:

```bash
python docs/scripts/release.py --version X.Y.Z --skip-changelog
```

Flags úteis (ver cabeçalho do `release.py`): `--dry-run` (simular — **comece por aqui** se houver dúvida), `--skip-commit`, `--skip-pull-request` (retomar após PR mergeado), `--resume-from {tag|draft|workflow|publish}`, `--ci-timeout SEG`.

O script ainda cuida de: validar ambiente → commitar pendências (incluindo CHANGELOG/DONE que editamos) → bump do `package.json` → push → PR dev→main → squash merge → tag → aguardar CI/CD (build Win/macOS/Linux) → validar assets → publicar.

### 5. Pós-release

- Confirmar a release publicada no GitHub.
- Garantir que `## [Unreleased]` ficou vazio para o próximo ciclo.

---

## Formato do DONE.md

```markdown
### vX.Y.Z — AAAA-MM-DD
- Descrição objetiva do que foi concluído (espelha o CHANGELOG, em linguagem de tarefa).
```

Itens concluídos ainda não lançados vão sob `### [Unreleased]` no DONE até o release.

## Lembretes

- pt-BR em textos; inglês em identificadores.
- Não fabricar contagens — verificar no código (`npm run test` para testes; `electron/preload.ts` / `electron/main.ts` para IPC).
- Não tocar em `package.json` manualmente no fluxo de release: o `release.py` faz o bump.
- Preservar mudanças não relacionadas já presentes no working tree.
