# Troubleshooting — Release do ShipIt

> Soluções para erros comuns durante o processo de release.

---

## Autenticação

### `gh: not logged in`

```bash
# Login interativo
gh auth login

# Verificar status
gh auth status
```

### `insufficient scope` / Escopo de token insuficiente

```bash
# Renovar token com escopos necessários
gh auth refresh -s repo,write:packages

# Verificar escopos atuais
gh auth status
```

### Token expirado

```bash
# Re-autenticar
gh auth login --web

# Ou renovar
gh auth refresh
```

### `gh auth token` retorna vazio

O token pode estar armazenado no credential manager do sistema. Tente:
```bash
gh auth status  # mostra se está autenticado
gh auth login   # re-autentica se necessário
```

---

## Git

### `not on branch dev`

O script espera que você esteja na branch `dev`. Para trocar:
```bash
git checkout dev
```

Se houver mudanças não commitadas:
```bash
git stash
git checkout dev
git stash pop
```

### Merge conflicts ao sincronizar dev com main

Se o merge de `main` em `dev` (Step 9) falhar:

```bash
# Resolver conflitos manualmente
git checkout dev
git merge main
# Editar arquivos conflitantes
git add .
git commit -m "chore: resolve merge conflicts"
git push origin dev
```

### Tag duplicada

Se a tag `vX.Y.Z` já existe:

```bash
# Verificar se já está no remote
git ls-remote --tags origin vX.Y.Z

# Se precisar recriar (CUIDADO: pode triggar CI novamente)
git tag -d vX.Y.Z              # deleta local
git push --delete origin vX.Y.Z  # deleta remote
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### `fatal: tag 'vX.Y.Z' already exists`

O script detecta tags existentes e pula a criação. Se precisar forçar:
```bash
git tag -d vX.Y.Z
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

---

## Pull Requests

### PR não pode ser criado — `already exists`

O script detecta PRs existentes automaticamente. Se precisar fechar e recriar:

```bash
# Listar PRs abertos
gh pr list --base main --head dev

# Fechar PR
gh pr close <NUMBER>

# Recriar
gh pr create --base main --head dev --title "Release vX.Y.Z"
```

### Merge falhou — `merge conflict`

Resolva conflitos localmente:

```bash
git checkout dev
git merge main
# Resolver conflitos
git add .
git commit -m "fix: resolve merge conflicts with main"
git push origin dev
# Tentar merge novamente
gh pr merge <NUMBER> --squash --delete-branch=false
```

### Merge falhou — `required status checks`

Se o repositório tem branch protection rules que exigem checks:

```bash
# Verificar status dos checks
gh pr checks <NUMBER>

# Aguardar checks passarem, depois:
gh pr merge <NUMBER> --squash --delete-branch=false
```

---

## CI/CD

### CI/CD não triggou após push da tag

Verifique se o workflow está configurado corretamente:

```bash
# Listar workflows
gh workflow list

# Ver runs recentes
gh run list --workflow=release.yml --limit 5

# Ver logs do run
gh run view <RUN_ID> --log
```

Possíveis causas:
- Tag não segue o padrão `v*.*.*` (ex: `v1.3` sem patch)
- Workflow desabilitado no repositório
- Erro de sintaxe no `.github/workflows/release.yml`

### Draft release não aparece

O draft release é criado pelo job `create-release` no workflow. Se não apareceu:

```bash
# Verificar se o workflow rodou
gh run list --workflow=release.yml --limit 3

# Ver status do run
gh run view <RUN_ID>

# Criar release manualmente
gh release create vX.Y.Z --draft --generate-notes
```

### Build falhou em uma plataforma

```bash
# Ver logs do run com falha
gh run view <RUN_ID> --log-failed

# Re-executar jobs falhados
gh run rerun <RUN_ID> --failed
```

---

## Rate Limiting

### `API rate limit exceeded`

```bash
# Verificar rate limit atual
gh api rate_limit --jq '.rate'

# Resultado mostra:
# - limit: limite total
# - remaining: requisições restantes
# - reset: timestamp de reset (Unix)
```

Se o limite foi atingido, aguarde o reset (geralmente 1 hora) ou use um token com mais permissões.

---

## Script

### `ModuleNotFoundError` ou `SyntaxError`

O script requer Python 3.10+ (usa `X | Y` union types):

```bash
python --version  # deve ser 3.10+

# No Windows, se python3 não funcionar:
py --version
py docs/scripts/release.py --help
```

### Script falhou no meio — como continuar?

O script é **resumível**. Simplesmente re-execute:

```bash
python docs/scripts/release.py --version X.Y.Z
```

Ele detecta:
- PR existente → reutiliza
- PR já mergeado → pula merge
- Tag existente → pula criação
- Release publicada → pula publicação

### Encoding/caracteres estranhos no Windows

Se os caracteres Unicode (✔, ✖, ▶) não aparecem corretamente:

```powershell
# Configurar terminal para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

# Ou usar Windows Terminal (suporta UTF-8 nativamente)
```

---

## Checklist de Verificação

Execute estes comandos para verificar o estado atual antes de re-executar o script:

```bash
# Branch atual
git rev-parse --abbrev-ref HEAD

# Mudanças pendentes
git status --short

# Versão no package.json
node -e "console.log(require('./package.json').version)"

# Última tag
git describe --tags --abbrev=0

# PRs abertos dev → main
gh pr list --base main --head dev --state open

# Releases
gh release list --limit 5

# Status do CI
gh run list --workflow=release.yml --limit 3
```

---

## Completar passos manualmente

Se o script falhar e não conseguir recuperar, complete os passos restantes:

| Step | Comando manual |
|------|---------------|
| Commit | `git add -A && git commit -m "mensagem"` |
| Bump | Editar `package.json` → `git commit -m "chore: bump version to X.Y.Z"` |
| Push | `git push origin dev` |
| PR | `gh pr create --base main --head dev --title "Release vX.Y.Z"` |
| Merge | `gh pr merge <N> --squash --delete-branch=false` |
| Tag | `git checkout main && git pull && git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z` |
| Sync dev | `git checkout dev && git merge main && git push origin dev` |
| Publicar | `gh release edit vX.Y.Z --draft=false --latest` |
