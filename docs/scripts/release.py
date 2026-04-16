#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShipIt — Script Automatizado de Release (Python)

Automatiza o fluxo completo de release:
  validar ambiente → commit → CHANGELOG via Copilot CLI → bump version →
  push → PR (dev → main) → squash merge → tag → aguardar CI/CD draft → publicar release

Uso:
  python docs/scripts/release.py                          # Modo interativo
  python docs/scripts/release.py --version 1.3.0          # Versão específica
  python docs/scripts/release.py --dry-run                # Simulação sem executar
  python docs/scripts/release.py --skip-changelog          # Pular geração de changelog
  python docs/scripts/release.py --skip-commit             # Pular commit de mudanças pendentes

Requer: Python 3.10+, git, gh CLI (autenticado com escopos repo + write:packages)
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ================================================================================================
# Constantes e configuração
# ================================================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
PACKAGE_JSON = PROJECT_ROOT / "package.json"
CHANGELOG_FILE = PROJECT_ROOT / "CHANGELOG.md"

TIMEOUT_CI_SECONDS = 300  # 5 minutos para aguardar CI/CD draft
POLL_INTERVAL_SECONDS = 15

# ================================================================================================
# Output colorido (ANSI)
# ================================================================================================

class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    CYAN = "\033[0;36m"
    MAGENTA = "\033[0;35m"
    NC = "\033[0m"
    BOLD = "\033[1m"


def supports_color() -> bool:
    """Verifica se o terminal suporta cores ANSI."""
    if os.environ.get("NO_COLOR"):
        return False
    if sys.platform == "win32":
        return os.environ.get("TERM") or os.environ.get("WT_SESSION") or True
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


USE_COLOR = supports_color()


def _c(color: str, text: str) -> str:
    if USE_COLOR:
        return f"{color}{text}{Colors.NC}"
    return text


def print_header(text: str) -> None:
    line = "━" * 60
    print(f"\n{_c(Colors.BOLD + Colors.CYAN, line)}")
    print(f"{_c(Colors.BOLD + Colors.CYAN, f'  {text}')}")
    print(f"{_c(Colors.BOLD + Colors.CYAN, line)}\n")


def print_step(text: str) -> None:
    print(f"{_c(Colors.BOLD + Colors.BLUE, '▶')} {_c(Colors.BOLD, text)}")


def print_success(text: str) -> None:
    print(f"{_c(Colors.GREEN, '✔')} {text}")


def print_warning(text: str) -> None:
    print(f"{_c(Colors.YELLOW, '⚠')} {text}")


def print_error(text: str) -> None:
    print(f"{_c(Colors.RED, '✖')} {text}")


def print_info(text: str) -> None:
    print(f"{_c(Colors.CYAN, 'ℹ')} {text}")


def print_dry_run(text: str) -> None:
    print(f"{_c(Colors.MAGENTA, '[DRY-RUN]')} {text}")


# ================================================================================================
# Utilitários
# ================================================================================================

def run_cmd(
    args: list[str],
    capture: bool = True,
    check: bool = True,
    cwd: Path | None = None,
) -> subprocess.CompletedProcess:
    """Executa comando e retorna resultado."""
    return subprocess.run(
        args,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        cwd=cwd or PROJECT_ROOT,
        check=check,
    )


def confirm(prompt: str, default: str = "n") -> bool:
    """Solicita confirmação do usuário."""
    if default == "y":
        hint = f"[{_c(Colors.GREEN, 'S')}/{_c(Colors.BOLD, 'n')}]"
    else:
        hint = f"[{_c(Colors.BOLD, 's')}/{_c(Colors.RED, 'N')}]"
    try:
        response = input(f"{_c(Colors.YELLOW, '❯')} {prompt} {hint}: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        return False
    if not response:
        response = default
    return response in ("s", "y", "sim", "yes")


def get_current_version() -> str:
    """Lê a versão atual do package.json."""
    data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    return data["version"]


def suggest_versions(current: str) -> dict[str, str]:
    """Sugere próximas versões baseadas em Semantic Versioning."""
    parts = current.split(".")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    return {
        "patch": f"{major}.{minor}.{patch + 1}",
        "minor": f"{major}.{minor + 1}.0",
        "major": f"{major + 1}.0.0",
    }


def validate_version(version: str) -> bool:
    """Valida formato X.Y.Z."""
    return bool(re.match(r"^\d+\.\d+\.\d+$", version))


def copilot_available() -> bool:
    """Verifica se gh copilot está disponível."""
    try:
        result = run_cmd(["gh", "copilot", "--", "--version"], check=False)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def _strip_copilot_tool_logs(text: str) -> str:
    """Remove linhas de log de execução de tools do output do gh copilot.

    O copilot em modo -s ainda emite logs de tool calls (● Read file, ✗ Permission denied, etc.)
    antes da resposta final. Esta função remove essas linhas.
    """
    lines = text.splitlines()
    clean_lines: list[str] = []
    in_tool_block = False

    for line in lines:
        stripped = line.lstrip()
        # Detectar início de bloco de tool call
        if stripped.startswith(("● ", "✗ ", "✓ ")):
            in_tool_block = True
            continue
        # Linhas de detalhes de tool call (indentadas com │ ou └)
        if in_tool_block and stripped.startswith(("│", "└")):
            # Verificar se é a última linha do bloco (└)
            if stripped.startswith("└"):
                in_tool_block = False
            continue
        # Linha normal → fim de qualquer bloco residual
        in_tool_block = False
        clean_lines.append(line)

    # Remover linhas vazias no início
    while clean_lines and not clean_lines[0].strip():
        clean_lines.pop(0)

    return "\n".join(clean_lines)


def copilot_prompt(prompt: str, allow_tools: list[str] | None = None) -> str | None:
    """Executa prompt via gh copilot em modo não-interativo. Retorna resposta ou None."""
    cmd = ["gh", "copilot", "-p", prompt, "-s", "--no-color"]
    if allow_tools:
        for tool in allow_tools:
            cmd.extend(["--allow-tool", tool])
    else:
        # Sem tools = output mais limpo
        cmd.append("--available-tools=")
    try:
        result = run_cmd(cmd, check=False)
        if result.returncode == 0 and result.stdout.strip():
            return _strip_copilot_tool_logs(result.stdout.strip())
    except FileNotFoundError:
        pass
    return None


# ================================================================================================
# Step 1: Validação de ambiente
# ================================================================================================

def check_environment() -> bool:
    """Verifica pré-requisitos: git, gh CLI, autenticação, branch."""
    print_header("Step 1/11 — Validação de Ambiente")
    ok = True

    # git
    print_step("Verificando git...")
    try:
        result = run_cmd(["git", "--version"])
        print_success(f"git encontrado: {result.stdout.strip()}")
    except FileNotFoundError:
        print_error("git não encontrado. Instale em https://git-scm.com/")
        ok = False

    # gh CLI
    print_step("Verificando gh CLI...")
    try:
        result = run_cmd(["gh", "--version"])
        version_line = result.stdout.strip().splitlines()[0]
        print_success(f"gh encontrado: {version_line}")
    except FileNotFoundError:
        print_error("gh CLI não encontrado. Instale em https://cli.github.com/")
        ok = False
        return ok  # Sem gh não dá para continuar verificações

    # gh auth
    print_step("Verificando autenticação gh...")
    result = run_cmd(["gh", "auth", "status"], check=False)
    auth_output = result.stdout + result.stderr
    if result.returncode != 0:
        print_error("gh não autenticado. Execute: gh auth login")
        ok = False
    else:
        print_success("gh autenticado")
        # Verificar escopos
        if "repo" not in auth_output.lower():
            print_warning("Escopo 'repo' pode não estar presente. Verifique com: gh auth status")

    # gh copilot (opcional)
    print_step("Verificando gh copilot...")
    if copilot_available():
        print_success("gh copilot disponível (será usado para gerar commit messages e CHANGELOG)")
    else:
        print_warning("gh copilot não disponível. Commit messages e CHANGELOG serão manuais.")
        print_info("Instale com: gh extension install github/gh-copilot")

    # Rate limit
    print_step("Verificando rate limit da API GitHub...")
    result = run_cmd(["gh", "api", "rate_limit", "--jq", ".rate.remaining"], check=False)
    if result.returncode == 0:
        remaining = result.stdout.strip()
        print_info(f"Rate limit restante: {remaining} requisições")
        if remaining.isdigit() and int(remaining) < 50:
            print_warning("Rate limit baixo. Considere aguardar antes de prosseguir.")
    else:
        print_warning("Não foi possível verificar rate limit.")

    # Branch atual
    print_step("Verificando branch atual...")
    result = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    branch = result.stdout.strip()
    if branch != "dev":
        print_warning(f"Branch atual é '{branch}', esperado 'dev'.")
        if not confirm("Deseja continuar mesmo assim?"):
            ok = False
    else:
        print_success(f"Branch: {branch}")

    return ok


# ================================================================================================
# Step 2-3: Detectar mudanças e commit
# ================================================================================================

def has_uncommitted_changes() -> bool:
    """Verifica se há mudanças não commitadas."""
    result = run_cmd(["git", "status", "--porcelain"])
    return bool(result.stdout.strip())


def do_commit(dry_run: bool) -> None:
    """Commita mudanças pendentes."""
    print_header("Step 2-3/11 — Commit de Mudanças Pendentes")

    if not has_uncommitted_changes():
        print_success("Nenhuma mudança pendente. Pulando commit.")
        return

    print_step("Mudanças detectadas:")
    result = run_cmd(["git", "status", "--short"])
    for line in result.stdout.strip().splitlines():
        print(f"  {line}")

    if dry_run:
        print_dry_run("Faria git add -A && git commit")
        return

    # Stage tudo para o diff ficar disponível
    run_cmd(["git", "add", "-A"])

    # Tentar usar gh copilot para gerar mensagem
    commit_msg = None
    if copilot_available():
        print_step("Gerando mensagem de commit via gh copilot...")
        diff_stat = run_cmd(["git", "diff", "--cached", "--stat"], check=False).stdout.strip()
        diff_short = run_cmd(["git", "diff", "--cached", "--no-ext-diff", "--no-color", "--stat"], check=False).stdout.strip()
        prompt = (
            "Generate a concise git commit message in conventional commits format "
            "(feat/fix/chore/docs/refactor prefix) for the following staged changes. "
            "Reply ONLY with the commit message, nothing else.\n\n"
            f"Diff stat:\n{diff_stat}\n\n"
            f"Changed files:\n{diff_short}"
        )
        suggested = copilot_prompt(prompt)
        if suggested:
            # Limpar possíveis backticks ou prefixos da resposta
            suggested = suggested.strip().strip("`").strip('"').strip("'")
            # Pegar só a primeira linha se veio multi-linha
            suggested = suggested.splitlines()[0].strip()
            print_info(f"Sugestão do Copilot: {_c(Colors.CYAN, suggested)}")
            if confirm("Usar esta mensagem?", "y"):
                commit_msg = suggested
            else:
                print_info("Mensagem recusada. Usando entrada manual.")
    else:
        print_info("gh copilot não disponível. Usando entrada manual.")

    if commit_msg is None:
        try:
            commit_msg = input(f"{_c(Colors.YELLOW, '❯')} Mensagem do commit: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            print_error("Commit cancelado.")
            sys.exit(1)

    if not commit_msg:
        print_error("Mensagem vazia. Commit cancelado.")
        sys.exit(1)

    run_cmd(["git", "commit", "-m", commit_msg])
    print_success("Commit realizado com sucesso.")


# ================================================================================================
# Step 4: Atualizar CHANGELOG.md com IA
# ================================================================================================

def update_changelog(version: str, dry_run: bool) -> None:
    """Atualiza CHANGELOG.md com entrada para a nova versão."""
    print_header("Step 4/11 — Atualizar CHANGELOG.md")

    today = datetime.now().strftime("%Y-%m-%d")
    section_header = f"## [{version}] — {today}"

    # Verificar se já existe entrada para esta versão
    changelog_content = CHANGELOG_FILE.read_text(encoding="utf-8")
    if f"## [{version}]" in changelog_content:
        print_success(f"CHANGELOG já contém entrada para [{version}]. Pulando.")
        return

    # Obter diff desde última tag
    result = run_cmd(["git", "describe", "--tags", "--abbrev=0"], check=False)
    last_tag = result.stdout.strip() if result.returncode == 0 else ""

    diff_range = f"{last_tag}..HEAD" if last_tag else "HEAD~20..HEAD"
    diff_result = run_cmd(["git", "log", diff_range, "--oneline", "--no-merges"], check=False)
    commits = diff_result.stdout.strip() if diff_result.returncode == 0 else "(sem commits)"

    # Tentar usar gh copilot para gerar entry
    changelog_entry = None
    if copilot_available():
        print_step("Gerando entrada do CHANGELOG via gh copilot...")
        prompt = (
            f"Gere uma entrada de CHANGELOG em português (pt-BR) no formato Keep a Changelog "
            f"para a versão {version}. Use SOMENTE as seções aplicáveis entre: "
            f"### Adicionado, ### Corrigido, ### Alterado. "
            f"Cada item deve ser um bullet point com '- '. "
            f"NÃO inclua cabeçalho de versão (## [x.y.z]), apenas as seções e bullets. "
            f"Responda SOMENTE com o conteúdo markdown, sem explicações.\n\n"
            f"Commits desde a última release:\n{commits}"
        )
        suggested = copilot_prompt(prompt)
        if suggested:
            # Limpar possíveis code fences da resposta
            suggested = re.sub(r"^```[a-z]*\n?", "", suggested)
            suggested = re.sub(r"\n?```$", "", suggested)
            # Remover texto de "raciocínio" do copilot antes do conteúdo real
            # O conteúdo real começa com "### " (seção Keep a Changelog)
            section_match = re.search(r"^### ", suggested, re.MULTILINE)
            if section_match:
                suggested = suggested[section_match.start():]
            suggested = suggested.strip()
            print()
            print_info("Entrada gerada pelo Copilot:")
            print(f"{_c(Colors.CYAN, '─' * 50)}")
            print(suggested)
            print(f"{_c(Colors.CYAN, '─' * 50)}")
            print()
            if confirm("Usar esta entrada no CHANGELOG?", "y"):
                changelog_entry = suggested
            else:
                print_info("Entrada recusada. Usando entrada manual.")
    else:
        print_info("gh copilot não disponível. Usando entrada manual.")

    if changelog_entry is None:
        print_info("Commits desde a última tag:")
        print(commits)
        print()
        print_info("Escreva a entrada do CHANGELOG (termine com linha vazia):")
        lines = []
        try:
            while True:
                line = input()
                if line == "":
                    break
                lines.append(line)
        except (EOFError, KeyboardInterrupt):
            pass
        changelog_entry = "\n".join(lines) if lines else f"- Atualização para versão {version}"

    # Montar nova seção
    new_section = f"\n{section_header}\n\n{changelog_entry}\n"

    if dry_run:
        print_dry_run(f"Inseriria no CHANGELOG:\n{new_section}")
        return

    # Inserir após a linha "## [Unreleased]" ou após o cabeçalho
    marker = "## [Unreleased]"
    if marker in changelog_content:
        # Encontrar o próximo "## [" após Unreleased para inserir antes dele
        unreleased_idx = changelog_content.index(marker)
        rest = changelog_content[unreleased_idx + len(marker):]
        next_section_match = re.search(r"\n## \[", rest)
        if next_section_match:
            insert_pos = unreleased_idx + len(marker) + next_section_match.start()
            updated = (
                changelog_content[:insert_pos]
                + "\n"
                + new_section
                + changelog_content[insert_pos:]
            )
        else:
            updated = changelog_content + "\n" + new_section
    else:
        # Inserir após o cabeçalho (primeiros "---")
        separator_idx = changelog_content.find("---")
        if separator_idx != -1:
            after_sep = changelog_content.find("\n", separator_idx)
            updated = (
                changelog_content[: after_sep + 1]
                + "\n"
                + new_section
                + changelog_content[after_sep + 1:]
            )
        else:
            updated = changelog_content + "\n" + new_section

    CHANGELOG_FILE.write_text(updated, encoding="utf-8")
    print_success("CHANGELOG.md atualizado.")

    # Auto-commit
    run_cmd(["git", "add", str(CHANGELOG_FILE)])
    run_cmd(["git", "commit", "-m", f"docs: atualizar CHANGELOG para {version}"])
    print_success("Commit do CHANGELOG realizado.")


# ================================================================================================
# Step 5: Bump version
# ================================================================================================

def bump_version(version: str, dry_run: bool) -> str:
    """Atualiza a versão no package.json."""
    print_header("Step 5/11 — Bump de Versão")

    current = get_current_version()
    print_info(f"Versão atual: {current}")

    if version:
        new_version = version
    else:
        suggestions = suggest_versions(current)
        print()
        print(f"  1) patch → {_c(Colors.GREEN, suggestions['patch'])}")
        print(f"  2) minor → {_c(Colors.YELLOW, suggestions['minor'])}")
        print(f"  3) major → {_c(Colors.RED, suggestions['major'])}")
        print(f"  4) custom")
        print()

        try:
            choice = input(f"{_c(Colors.YELLOW, '❯')} Escolha [1-4] (padrão: 1): ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            sys.exit(1)

        if choice in ("", "1"):
            new_version = suggestions["patch"]
        elif choice == "2":
            new_version = suggestions["minor"]
        elif choice == "3":
            new_version = suggestions["major"]
        elif choice == "4":
            try:
                new_version = input(f"{_c(Colors.YELLOW, '❯')} Versão customizada (X.Y.Z): ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                sys.exit(1)
        else:
            new_version = suggestions["patch"]

    # Remover prefixo 'v' se presente
    new_version = new_version.lstrip("v")

    if not validate_version(new_version):
        print_error(f"Versão inválida: '{new_version}'. Formato esperado: X.Y.Z")
        sys.exit(1)

    if new_version == current:
        print_warning(f"Versão {new_version} já é a versão atual.")
        if not confirm("Deseja continuar sem alterar a versão?"):
            sys.exit(1)
        return new_version

    if dry_run:
        print_dry_run(f"Atualizaria package.json: {current} → {new_version}")
        return new_version

    # Atualizar package.json
    pkg_content = PACKAGE_JSON.read_text(encoding="utf-8")
    updated = pkg_content.replace(f'"version": "{current}"', f'"version": "{new_version}"', 1)
    PACKAGE_JSON.write_text(updated, encoding="utf-8")
    print_success(f"package.json atualizado: {current} → {new_version}")

    # Commit
    run_cmd(["git", "add", str(PACKAGE_JSON)])
    run_cmd(["git", "commit", "-m", f"chore: bump version to {new_version}"])
    print_success("Commit de bump de versão realizado.")

    return new_version


# ================================================================================================
# Step 6: Push dev branch
# ================================================================================================

def push_dev(dry_run: bool) -> None:
    """Envia commits para origin/dev."""
    print_header("Step 6/11 — Push dev Branch")

    if dry_run:
        print_dry_run("Faria: git push origin dev")
        return

    run_cmd(["git", "push", "origin", "dev"])
    print_success("Push para origin/dev realizado.")


# ================================================================================================
# Step 7: Criar PR (dev → main)
# ================================================================================================

def create_pr(version: str, dry_run: bool) -> int | None:
    """Cria PR de dev → main. Retorna número do PR."""
    print_header("Step 7/11 — Criar PR (dev → main)")

    # Verificar se já existe PR aberto
    print_step("Verificando PRs existentes...")
    result = run_cmd(
        ["gh", "pr", "list", "--base", "main", "--head", "dev", "--state", "open", "--json", "number,title"],
        check=False,
    )
    if result.returncode == 0 and result.stdout.strip() not in ("", "[]"):
        prs = json.loads(result.stdout)
        if prs:
            pr_number = prs[0]["number"]
            pr_title = prs[0]["title"]
            print_success(f"PR existente encontrado: #{pr_number} — {pr_title}")
            return pr_number

    # Verificar se PR já foi mergeado recentemente
    result = run_cmd(
        ["gh", "pr", "list", "--base", "main", "--head", "dev", "--state", "merged", "--json", "number,title", "--limit", "1"],
        check=False,
    )

    title = f"Release v{version}"
    body = f"## Release v{version}\n\nBump de versão e atualização do CHANGELOG para v{version}."

    if dry_run:
        print_dry_run(f"Criaria PR: '{title}' (dev → main)")
        return None

    print_step(f"Criando PR: {title}")
    result = run_cmd([
        "gh", "pr", "create",
        "--base", "main",
        "--head", "dev",
        "--title", title,
        "--body", body,
    ])
    # Extrair número do PR da URL retornada
    pr_url = result.stdout.strip()
    pr_match = re.search(r"/pull/(\d+)", pr_url)
    if pr_match:
        pr_number = int(pr_match.group(1))
        print_success(f"PR #{pr_number} criado: {pr_url}")
        return pr_number

    print_success(f"PR criado: {pr_url}")
    return None


# ================================================================================================
# Step 8: Merge PR
# ================================================================================================

def merge_pr(pr_number: int | None, dry_run: bool) -> None:
    """Faz squash merge do PR."""
    print_header("Step 8/11 — Merge PR (squash)")

    if pr_number is None:
        if dry_run:
            print_dry_run("Faria squash merge do PR")
            return
        print_error("Número do PR desconhecido. Faça merge manualmente.")
        sys.exit(1)

    # Verificar se já foi mergeado
    result = run_cmd(
        ["gh", "pr", "view", str(pr_number), "--json", "state"],
        check=False,
    )
    if result.returncode == 0:
        state = json.loads(result.stdout).get("state", "")
        if state == "MERGED":
            print_success(f"PR #{pr_number} já foi mergeado. Pulando.")
            return

    if dry_run:
        print_dry_run(f"Faria: gh pr merge {pr_number} --squash --delete-branch=false")
        return

    if not confirm(f"Fazer squash merge do PR #{pr_number}?", "y"):
        print_warning("Merge cancelado pelo usuário.")
        sys.exit(1)

    result = run_cmd([
        "gh", "pr", "merge", str(pr_number),
        "--squash",
        "--delete-branch=false",
    ], check=False)

    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout).strip()
        print_error(f"Falha ao mergear PR: {error_msg}")
        print_info("Tente mergear manualmente via GitHub ou: gh pr merge --squash")
        sys.exit(1)

    print_success(f"PR #{pr_number} mergeado com squash.")


# ================================================================================================
# Step 9: Criar e enviar tag
# ================================================================================================

def create_and_push_tag(version: str, dry_run: bool) -> None:
    """Cria tag e envia para origin. Sincroniza dev com main."""
    print_header("Step 9/11 — Criar e Enviar Tag")

    tag_name = f"v{version}"

    # Verificar se tag já existe
    result = run_cmd(["git", "tag", "-l", tag_name])
    if result.stdout.strip():
        print_success(f"Tag {tag_name} já existe localmente. Pulando criação.")
        # Verificar se está no remote
        result = run_cmd(["git", "ls-remote", "--tags", "origin", tag_name], check=False)
        if result.stdout.strip():
            print_success(f"Tag {tag_name} já existe no remote.")
            return

        if dry_run:
            print_dry_run(f"Faria: git push origin {tag_name}")
            return
        run_cmd(["git", "push", "origin", tag_name])
        print_success(f"Tag {tag_name} enviada para origin.")
        return

    if dry_run:
        print_dry_run(f"Faria: git checkout main && git pull && git tag -a {tag_name}")
        print_dry_run(f"Faria: git push origin {tag_name}")
        print_dry_run("Faria: git checkout dev && git merge main")
        return

    # Checkout main e pull
    print_step("Atualizando branch main...")
    run_cmd(["git", "checkout", "main"])
    run_cmd(["git", "pull", "origin", "main"])

    # Criar tag
    print_step(f"Criando tag {tag_name}...")
    run_cmd(["git", "tag", "-a", tag_name, "-m", f"Release {tag_name}"])
    run_cmd(["git", "push", "origin", tag_name])
    print_success(f"Tag {tag_name} criada e enviada.")

    # Sincronizar dev com main
    print_step("Sincronizando dev com main...")
    run_cmd(["git", "checkout", "dev"])
    run_cmd(["git", "merge", "main", "-m", f"chore: sync dev with main after {tag_name}"])
    run_cmd(["git", "push", "origin", "dev"])
    print_success("Branch dev sincronizada com main.")


# ================================================================================================
# Step 10: Aguardar CI/CD draft release
# ================================================================================================

def wait_for_draft_release(version: str, dry_run: bool) -> None:
    """Aguarda CI/CD criar o draft release no GitHub."""
    print_header("Step 10/11 — Aguardar CI/CD Draft Release")

    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(f"Aguardaria draft release para {tag_name} (timeout: {TIMEOUT_CI_SECONDS}s)")
        return

    print_step(f"Aguardando CI/CD criar draft release para {tag_name}...")
    print_info(f"Timeout: {TIMEOUT_CI_SECONDS}s (poll a cada {POLL_INTERVAL_SECONDS}s)")

    elapsed = 0
    while elapsed < TIMEOUT_CI_SECONDS:
        result = run_cmd(
            ["gh", "release", "view", tag_name, "--json", "isDraft,name"],
            check=False,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            release_name = data.get("name", tag_name)
            print_success(f"Release encontrada: {release_name}")
            if data.get("isDraft"):
                print_info("Release está em modo draft (CI/CD ainda pode estar buildando).")
            return

        remaining = TIMEOUT_CI_SECONDS - elapsed
        print(f"  ⏳ Aguardando... ({elapsed}s / {TIMEOUT_CI_SECONDS}s)", end="\r")
        time.sleep(POLL_INTERVAL_SECONDS)
        elapsed += POLL_INTERVAL_SECONDS

    print()
    print_warning(f"Timeout de {TIMEOUT_CI_SECONDS}s atingido. Release pode ainda não existir.")
    print_info(f"Verifique manualmente: gh release view {tag_name}")
    if not confirm("Deseja continuar para a publicação mesmo assim?"):
        sys.exit(1)


# ================================================================================================
# Step 11: Publicar release
# ================================================================================================

def publish_release(version: str, dry_run: bool) -> None:
    """Publica a release (draft → published)."""
    print_header("Step 11/11 — Publicar Release")

    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(f"Faria: gh release edit {tag_name} --draft=false --latest")
        return

    # Verificar se release existe
    result = run_cmd(
        ["gh", "release", "view", tag_name, "--json", "isDraft,url"],
        check=False,
    )
    if result.returncode != 0:
        print_error(f"Release {tag_name} não encontrada.")
        print_info(f"Crie manualmente: gh release create {tag_name} --draft --generate-notes")
        sys.exit(1)

    data = json.loads(result.stdout)
    release_url = data.get("url", "")

    if not data.get("isDraft"):
        print_success(f"Release {tag_name} já está publicada.")
        print_info(f"URL: {release_url}")
        return

    if not confirm(f"Publicar release {tag_name}? (draft → published)", "y"):
        print_warning("Publicação cancelada.")
        print_info(f"Publique manualmente: gh release edit {tag_name} --draft=false --latest")
        return

    result = run_cmd([
        "gh", "release", "edit", tag_name,
        "--draft=false",
        "--latest",
    ], check=False)

    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout).strip()
        print_error(f"Falha ao publicar: {error_msg}")
        print_info(f"Tente manualmente: gh release edit {tag_name} --draft=false --latest")
        sys.exit(1)

    print_success(f"Release {tag_name} publicada com sucesso!")
    print()
    print(f"  🚀 {_c(Colors.BOLD + Colors.GREEN, release_url)}")
    print()


# ================================================================================================
# Main
# ================================================================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="ShipIt — Script Automatizado de Release",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python release.py                    Modo interativo
  python release.py --version 1.3.0    Versão específica
  python release.py --dry-run          Simulação sem executar
  python release.py --skip-changelog   Pular geração de changelog
  python release.py --skip-commit      Pular commit de pendências
        """,
    )
    parser.add_argument(
        "--version", "-v",
        type=str,
        default="",
        help="Versão para release (X.Y.Z). Se omitida, será solicitada interativamente.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula todos os passos sem executar comandos destrutivos.",
    )
    parser.add_argument(
        "--skip-changelog",
        action="store_true",
        help="Pula a atualização automática do CHANGELOG.md.",
    )
    parser.add_argument(
        "--skip-commit",
        action="store_true",
        help="Pula o commit de mudanças não commitadas.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dry_run = args.dry_run

    print_header("ShipIt — Release Automatizada")

    if dry_run:
        print_warning("Modo DRY-RUN ativado. Nenhuma ação destrutiva será executada.\n")

    # Step 1: Validação de ambiente
    if not check_environment():
        print_error("Validação de ambiente falhou. Corrija os erros acima e tente novamente.")
        sys.exit(1)

    # Step 2-3: Commit (condicional)
    if not args.skip_commit:
        do_commit(dry_run)
    else:
        print_info("Commit pulado (--skip-commit).")

    # Step 5: Bump version (antes do changelog para ter a versão definida)
    version = bump_version(args.version, dry_run)

    # Step 4: Atualizar CHANGELOG (depois do bump para saber a versão)
    if not args.skip_changelog:
        update_changelog(version, dry_run)
    else:
        print_info("CHANGELOG pulado (--skip-changelog).")

    # Step 6: Push dev
    push_dev(dry_run)

    # Step 7: Criar PR
    pr_number = create_pr(version, dry_run)

    # Step 8: Merge PR
    merge_pr(pr_number, dry_run)

    # Step 9: Criar e enviar tag
    create_and_push_tag(version, dry_run)

    # Step 10: Aguardar CI/CD
    wait_for_draft_release(version, dry_run)

    # Step 11: Publicar release
    publish_release(version, dry_run)

    # Resumo final
    print_header("Release Concluída!")
    print_success(f"Versão: v{version}")
    print_success("Todos os passos concluídos com sucesso.")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Operação cancelada pelo usuário.")
        sys.exit(130)
    except subprocess.CalledProcessError as e:
        print_error(f"Comando falhou: {' '.join(e.cmd)}")
        if e.stderr:
            print_error(f"Saída: {e.stderr.strip()}")
        sys.exit(1)
