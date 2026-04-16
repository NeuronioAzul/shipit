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

O script pode usar `gh copilot` para gerar mensagens de commit e entradas de CHANGELOG automaticamente. Se não estiver instalado, o script faz fallback para entrada manual.

```bash
# Instalar extensão Copilot CLI
gh extension install github/gh-copilot

# Testar
gh copilot suggest -t shell "list files"
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

# Pular changelog automático
python docs/scripts/release.py --skip-changelog

# Pular commit de mudanças pendentes
python docs/scripts/release.py --skip-commit

# Combinações
python docs/scripts/release.py --version 1.3.0 --skip-changelog --dry-run
```

### Passos do script (detalhados)

| Step | Descrição | Pode pular? |
|------|-----------|-------------|
| 1 | Validar ambiente (git, gh, auth, branch) | Não |
| 2-3 | Detectar e commitar mudanças pendentes | `--skip-commit` |
| 4 | Atualizar CHANGELOG.md | `--skip-changelog` |
| 5 | Bump de versão no `package.json` | Não |
| 6 | Push para `origin/dev` | Não |
| 7 | Criar PR (dev → main) | Não (detecta existente) |
| 8 | Squash merge do PR | Não |
| 9 | Criar tag + sincronizar dev | Não (detecta existente) |
| 10 | Aguardar CI/CD draft release | Não (timeout 5min) |
| 11 | Publicar release (draft → published) | Não |

### Resumibilidade

O script detecta estado atual e pula passos já concluídos:

- Se PR já existe → reutiliza
- Se PR já foi mergeado → pula
- Se tag já existe → pula criação
- Se release já está publicada → pula

Isso significa que se o script falhar no meio, você pode re-executar e ele continuará de onde parou.

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
