# Scripts — ShipIt

> Documentação dos scripts utilitários do projeto.

---

## Scripts disponíveis

| Script | Linguagem | Descrição |
|--------|-----------|-----------|
| [`release.py`](release.py) | Python 3.10+ | Automação completa do fluxo de release |
| [`create-docx-template.ps1`](create-docx-template.ps1) | PowerShell | Geração do template DOCX para relatórios |

---

## `release.py` — Automação de Release

Automatiza o fluxo completo de release do ShipIt:

```
validar ambiente → commit → CHANGELOG → bump version → push →
PR (dev → main) → squash merge → tag → aguardar CI/CD → publicar release
```

### Quick Start

```bash
# Simulação (recomendado na primeira vez)
python docs/scripts/release.py --dry-run

# Release interativa
python docs/scripts/release.py

# Release com versão específica
python docs/scripts/release.py --version 1.3.0
```

### Flags

| Flag | Descrição |
|------|-----------|
| `--version X.Y.Z` | Define a versão (pula prompt interativo) |
| `--dry-run` | Simula sem executar nada |
| `--skip-changelog` | Pula atualização do CHANGELOG.md |
| `--skip-commit` | Pula commit de mudanças pendentes |
| `--help` | Exibe ajuda |

### Pré-requisitos

- Python 3.10+
- Git
- GitHub CLI (`gh`) autenticado com escopos `repo` + `write:packages`

### Documentação completa

- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) — Guia passo a passo do processo de release
- [RELEASE_TROUBLESHOOTING.md](RELEASE_TROUBLESHOOTING.md) — Erros comuns e soluções

---

## `create-docx-template.ps1` — Template DOCX

Script PowerShell para gerar o template base do relatório de serviço DOCX. Usado durante o desenvolvimento do gerador de relatórios.

```powershell
.\docs\scripts\create-docx-template.ps1
```
