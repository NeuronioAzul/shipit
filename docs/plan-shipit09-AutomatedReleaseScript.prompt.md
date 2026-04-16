# Plan: Automated Release Script (Python)

Script Python (`docs/scripts/release.py`) + documentação para automatizar o fluxo completo de release do ShipIt: validar ambiente → commit → atualizar CHANGELOG via Copilot CLI → bump version → push → PR (dev → main) → squash merge → tag → aguardar CI/CD draft → publicar release. Modelado no padrão do `docs/exemplo-publicador/publish.sh` mas adaptado para Python + Windows.

---

## Phase 1 — Script `docs/scripts/release.py`

### Step 1: Validação de ambiente (bloqueante)
- Checar `git`, `gh --version`, `gh auth status` (escopos `repo`, `write:packages`)
- Checar que branch atual é `dev` (warn se não)
- Checar rate limit da API GitHub: `gh api rate_limit`
- Mensagens de erro claras com instruções de correção para cada falha

### Step 2: Detectar mudanças não commitadas
- `git status --porcelain` → se limpo, pula para Step 4

### Step 3: Commit (condicional)
- `git add -A`, prompt para mensagem ou auto-gerar via `gh copilot suggest`
- Fallback para prompt manual se Copilot CLI indisponível

### Step 4: Atualizar CHANGELOG.md com IA (opcional, `--skip-changelog` para pular)
- Usar `gh copilot` para gerar entrada baseada no diff desde última tag
- Inserir seção `## [X.Y.Z] - YYYY-MM-DD` no formato Keep a Changelog (pt-BR)
- Se Copilot CLI indisponível: fallback manual
- Auto-commit da mudança do CHANGELOG

### Step 5: Bump version
- Ler versão atual de `package.json`, sugerir patch/minor/major/custom
- Atualizar `package.json` via string replacement
- Commit: `chore: bump version to X.Y.Z`

### Step 6: Push dev branch
- `git push origin dev`

### Step 7: Criar PR (dev → main)
- `gh pr create --base main --head dev --title "Release vX.Y.Z" --body "<changelog>"`
- Detectar PR existente e reutilizar

### Step 8: Merge PR (depende de Step 7)
- `gh pr merge <N> --squash --delete-branch=false`
- Não deletar branch dev

### Step 9: Criar e enviar tag (depende de Step 8)
- `git checkout main && git pull origin main`
- `git tag -a vX.Y.Z -m "Release vX.Y.Z"` → `git push origin vX.Y.Z`
- Voltar para dev: `git checkout dev && git merge main` (sync)

### Step 10: Aguardar CI/CD draft release (depende de Step 9)
- Poll `gh release view vX.Y.Z --json isDraft` até existir (timeout 5min)

### Step 11: Publicar release
- `gh release edit vX.Y.Z --draft=false --latest`
- Exibir URL final da release

### Cross-cutting concerns
- `--dry-run`: mostra tudo sem executar
- `--version X.Y.Z`, `--skip-changelog`, `--skip-commit`, `--help`
- Output colorido (ANSI), confirmações interativas em cada passo destrutivo
- Resumability: detecta estado atual (PR existe? tag existe?) e pula passos concluídos
- Compatibilidade Windows (subprocess.run, paths, encoding)
- Strings UI em português (pt-BR), identificadores em inglês

---

## Phase 2 — Documentação (paralelo com Phase 1)

### Step 12: `docs/scripts/RELEASE_GUIDE.md`
- Guia passo a passo do processo completo de release
- Pré-requisitos (Python, gh CLI, autenticação)
- Como instalar e configurar gh CLI + testar token (`gh auth status`, `gh auth token`)
- Exemplos de uso do script (interativo, automatizado, dry-run)
- Explicação que CI/CD cria draft release ao enviar tag
- Comando para draft → published: `gh release edit vX.Y.Z --draft=false --latest`
- Como fazer teste de publicação como draft antes de usar em produção
- Melhores práticas

### Step 13: `docs/scripts/RELEASE_TROUBLESHOOTING.md`
- Erros comuns: auth, token scopes, merge conflicts, tag duplicada, CI não triggou, rate limiting
- Comandos de verificação (checklist)
- Como completar cada passo manualmente se script falhar

### Step 14: `docs/scripts/README.md`
- Overview dos scripts em `docs/scripts/`
- Quick reference para `release.py`
- Links para RELEASE_GUIDE e TROUBLESHOOTING

---

## Phase 3 — Integração

### Step 15: Atualizar `docs/TODO.md`
- Registrar task concluída para o script de automação de release

---

## Relevant Files

| File | Action |
|------|--------|
| `docs/scripts/release.py` | **NEW** — Script principal |
| `docs/scripts/RELEASE_GUIDE.md` | **NEW** — Guia de release |
| `docs/scripts/RELEASE_TROUBLESHOOTING.md` | **NEW** — Troubleshooting |
| `docs/scripts/README.md` | **NEW** — Overview dos scripts |
| `docs/exemplo-publicador/publish.sh` | **REF** — Padrão de output colorido, dry-run, prompts, git ops |
| `.github/workflows/release.yml` | **REF** — CI/CD (trigger `v*.*.*`, draft release) |
| `package.json` | **READ/MODIFY** (via script) — campo `version` |
| `CHANGELOG.md` | **READ/MODIFY** (via script) — formato Keep a Changelog |
| `docs/TODO.md` | **MODIFY** — registrar task concluída |

---

## Verification

1. `python docs/scripts/release.py --dry-run` — mostra todos os passos sem executar
2. `python docs/scripts/release.py --help` — mostra usage
3. Rodar sem git/gh — deve mostrar erro claro com instruções
4. Rodar com token expirado — deve mostrar fix instructions
5. Teste end-to-end com tag de teste, verificar CI/CD cria draft e script publica
6. Idempotência: rodar quando PR já existe → detecta e reutiliza
7. Compatibilidade Windows (subprocess, paths, encoding UTF-8)
8. Review dos .md — renderizam corretamente, comandos copy-pasteable

---

## Decisions

- **Python** (não bash): pedido explícito + melhor compatibilidade Windows
- **gh CLI obrigatório**: essencial para PR, merge, release
- **Copilot CLI para changelog**: user tem instalado; fallback manual se indisponível
- **Branch model**: confirmado dev → PR → main → tag
- **Merge strategy**: confirmado `--squash` (commit limpo na main)
- **Dev branch preservada**: nunca deletar após merge
- **Post-release sync**: após tag, script faz `git checkout dev && git merge main`
