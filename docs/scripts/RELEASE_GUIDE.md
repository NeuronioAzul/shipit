# Guia de Release — ShipIt

> Guia passo a passo para publicar uma nova versão do ShipIt usando o script automatizado `release.py`.

---

## Pré-requisitos

### Software necessário

| Ferramenta | Versão mínima | Instalação |
| ---------- | ------------- | ---------- |
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| Git | 2.x | [git-scm.com](https://git-scm.com/) |
| GitHub CLI (`gh`) | 2.x | [cli.github.com](https://cli.github.com/) |

### Autenticação GitHub CLI

```bash
# Login (primeira vez)
gh auth login

# Verificar status
gh auth status

# Verificar token (debug)
gh auth token
```

**Escopos necessários**: `repo`, `write:packages`

Se faltarem escopos:

```bash
gh auth refresh -s repo,write:packages
```

### Copilot CLI (opcional)

O script pode usar `gh copilot` para gerar mensagens de commit e entradas de CHANGELOG automaticamente. O Copilot CLI já vem integrado no `gh` CLI 2.x — não precisa instalar extensão. Se não estiver disponível, o script faz fallback para entrada manual.

```bash
# Verificar se está disponível (já vem built-in no gh 2.x)
gh copilot -- --version

# Testar com um prompt simples
gh copilot -p "Say hello" -s
```

---

## Processo de Release

### Visão geral

```
dev branch → commit → bump version → push → PR → merge → tag → CI/CD → publish
```

O CI/CD (GitHub Actions) é acionado automaticamente quando uma tag `v*.*.*` é enviada. O workflow:

1. Cria um **draft** GitHub Release
2. Builda o app em 3 plataformas (Windows, macOS, Linux)
3. Faz upload dos artefatos (`.exe`, `.msi`, `.dmg`, `.AppImage`, `.deb`, `.rpm`)

O script `release.py` cuida de todos os passos locais e remotos, incluindo aguardar o CI e publicar a release.

### Usando o script

```bash
# Navegar para a raiz do projeto
cd d:\Programacao\Electron\ship-it

# Modo interativo (recomendado)
python docs/scripts/release.py

# Versão específica
python docs/scripts/release.py --version 1.3.0

# Simulação (não executa nada)
python docs/scripts/release.py --dry-run

# Retomar de um checkpoint explícito
python docs/scripts/release.py --resume-from tag --version 1.5.2

# Pular changelog automático
python docs/scripts/release.py --skip-changelog

# Pular commit de mudanças pendentes
python docs/scripts/release.py --skip-commit

# Retomar após PR já mergeado em main
python docs/scripts/release.py --version 1.3.3 --skip-commit --skip-changelog --skip-pull-request

# Combinações
python docs/scripts/release.py --version 1.3.0 --skip-changelog --dry-run
```

### Retomada por checkpoint

O modo recomendado para retomar uma release interrompida é `--resume-from`:

```bash
# Recomeçar na criação/envio da tag (valida origin/main antes)
python docs/scripts/release.py --resume-from tag --version X.Y.Z

# Recomeçar aguardando a draft release
python docs/scripts/release.py --resume-from draft --version X.Y.Z

# Recomeçar aguardando apenas o workflow CI/CD
python docs/scripts/release.py --resume-from workflow --version X.Y.Z

# Recomeçar na validação final/publicação
python docs/scripts/release.py --resume-from publish --version X.Y.Z
```

Os flags antigos `--skip-commit`, `--skip-changelog` e `--skip-pull-request` continuam existindo por compatibilidade, mas o caminho preferido para retomada é `--resume-from`.

### Passos do script (detalhados)

| Step | Descrição | Pode pular? |
|------|-----------|-------------|
| 1 | Validar ambiente (git, gh, auth, branch) | Não |
| 2-3 | Detectar e commitar mudanças pendentes | `--skip-commit` |
| 4 | Bump de versão no `package.json` | Não |
| 5 | Atualizar `CHANGELOG.md` | `--skip-changelog` |
| 6 | Push para `origin/dev` | Não |
| 7 | Criar PR (dev → main) | `--skip-pull-request` se já mergeado |
| 8 | Squash merge do PR | `--skip-pull-request` se já mergeado |
| 9 | Criar tag + sincronizar dev | Não (detecta existente) |
| 10 | Aguardar a draft release aparecer | Não |
| 11 | Aguardar o workflow CI/CD concluir | Não |
| 12 | Validar assets da release | `--skip-asset-validation` |
| 13 | Publicar release com notas amigáveis (draft → published) | Não |

### Resumibilidade

O script detecta estado atual e pula passos já concluídos. Além disso, o modo `--resume-from` permite escolher o checkpoint inicial explicitamente.

Exemplos práticos:

```bash
# O PR já foi mergeado e você quer recomeçar na tag
python docs/scripts/release.py --resume-from tag --version X.Y.Z

# A tag já existe e você só quer esperar/publicar
python docs/scripts/release.py --resume-from draft --version X.Y.Z
```

Comportamentos idempotentes atuais:

- Se PR já existe → reutiliza
- Se PR já foi mergeado → pula
- Se o processo caiu após o merge do PR → use `--resume-from tag --version X.Y.Z`; o script confirma que `origin/main` já contém a versão antes de criar a tag
- Se tag já existe → pula criação
- Se release já está publicada → pula

### Notas da release publicadas

No Step 13, o script publica a release com um corpo amigável em Markdown:

- Título da versão (`ShipIt vX.Y.Z`)
- Bloco de mudanças extraído da seção correspondente no `CHANGELOG.md`
- Instruções rápidas de atualização para usuário final
- Referências de documentação (`CHANGELOG.md` e `README.md`)

Com isso, a release publicada deixa de depender apenas do texto automático `What's Changed`.

### Remover releases anteriores

Para remover releases antigas no GitHub, apague a release e, se quiser limpar completamente, também a tag.

```bash
# 1) Listar releases
gh release list --limit 20

# 2) Excluir uma release específica
gh release delete vX.Y.Z --yes

# 3) (Opcional, recomendado) Excluir a tag remota
git push --delete origin vX.Y.Z

# 4) (Opcional) Excluir a tag local
git tag -d vX.Y.Z
```

Exemplo real:

```bash
gh release delete v1.5.0 --yes
git push --delete origin v1.5.0
git tag -d v1.5.0
```

### Proteção automática de worktree

Se houver arquivos tracked/untracked pendentes quando o Step 9 precisar trocar de branch (`dev` → `main` → `dev`), o script agora:

1. Exibe um aviso vermelho destacado.
2. Cria um stash nomeado com snapshot das mudanças locais.
3. Executa a região sensível da tag/sincronização.
4. Faz `git stash apply --index` ao final.

Quando esse aviso aparecer, **não salve novos arquivos até a restauração terminar**. Se a restauração automática falhar, o stash é preservado e o script imprime os comandos de recuperação manual.

---

## Release manual (sem script)

Se preferir fazer manualmente ou o script falhar:

```bash
# 1. Garantir que está na branch dev
git checkout dev

# 2. Commitar mudanças pendentes
git add -A
git commit -m "feat: descrição das mudanças"

# 3. Atualizar CHANGELOG.md (editar manualmente)
# Adicionar seção ## [X.Y.Z] — YYYY-MM-DD

# 4. Bump version no package.json
# Editar "version": "X.Y.Z"
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"

# 5. Push
git push origin dev

# 6. Criar PR
gh pr create --base main --head dev --title "Release vX.Y.Z" --body "Release vX.Y.Z"

# 7. Merge PR
gh pr merge <PR_NUMBER> --squash --delete-branch=false

# 8. Criar tag
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z

# 9. Sincronizar dev
git checkout dev
git merge main -m "chore: sync dev with main"
git push origin dev

# 10. Aguardar CI/CD criar draft release
gh run list --workflow=release.yml --limit 1

# 11. Publicar
gh release edit vX.Y.Z --draft=false --latest

# Verificar
gh release view vX.Y.Z
```

---

## Teste seguro (draft)

Para testar o processo sem publicar para usuários:

1. Rode `python docs/scripts/release.py --dry-run` para simular
2. Na etapa de publicação, recuse a confirmação — a release ficará como draft
3. Verifique os artefatos no GitHub Releases (draft)
4. Se tudo estiver correto, publique: `gh release edit vX.Y.Z --draft=false --latest`
5. Se algo deu errado, delete: `gh release delete vX.Y.Z --yes && git push --delete origin vX.Y.Z`

---

## Melhores práticas

1. **Sempre rode `--dry-run` primeiro** para conferir o que será feito
2. **Mantenha o CHANGELOG atualizado** durante o desenvolvimento, não só na release
3. **Use commits convencionais** (`feat:`, `fix:`, `chore:`, `docs:`) para facilitar a geração do changelog
4. **Teste localmente antes da release**: `npm run test && npm run build`
5. **Verifique os artefatos** no draft release antes de publicar
6. **Bumps de versão seguem Semantic Versioning**:
   - `patch` (1.2.3 → 1.2.4): correções de bugs
   - `minor` (1.2.3 → 1.3.0): novas funcionalidades retrocompatíveis
   - `major` (1.2.3 → 2.0.0): mudanças que quebram compatibilidade
7. **Se o banner vermelho de proteção aparecer, não salve nada** até o script confirmar a restauração automática da worktree
