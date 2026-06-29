#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShipIt — Script Automatizado de Release v2 (Python)

Versão 2: SEM dependência do GitHub Copilot CLI. As mensagens de commit, a
entrada do CHANGELOG e o corpo do PR podem ser geradas automaticamente pelo
Claude CLI (`claude -p`), quando disponível no PATH (ou via SHIPIT_CLAUDE_BIN);
caso contrário — ou com --no-ai — o fluxo cai para criação manual (editor/inline).
Nenhuma chamada a `gh copilot` é feita.

Automatiza o fluxo completo de release:
  validar ambiente → commit → bump version → CHANGELOG (IA ou manual) →
  push → PR (dev → main) → squash merge → tag → aguardar draft → aguardar workflow →
  validar assets → publicar release

Uso:
  python docs/scripts/release.py                          # Modo interativo
  python docs/scripts/release.py --version 1.3.0          # Versão específica
  python docs/scripts/release.py --dry-run                # Simulação sem executar
  python docs/scripts/release.py --resume-from tag --version 1.5.2    # Retomar a partir da tag
  python docs/scripts/release.py --skip-changelog          # Pular geração de changelog
  python docs/scripts/release.py --skip-commit             # Pular commit de mudanças pendentes
  python docs/scripts/release.py --skip-pull-request       # Retomar após PR já mergeado
  python docs/scripts/release.py --ci-timeout 5400         # Timeout em segundos para o workflow CI/CD
  python docs/scripts/release.py --skip-asset-validation   # Pular validação de assets (emergência)
  python docs/scripts/release.py --no-ai                   # Desativar geração via Claude CLI

Requer: Python 3.10+, git, gh CLI (autenticado com escopos repo + write:packages)
Opcional: Claude CLI (`claude`) no PATH para geração automática de textos.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import time
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

# ================================================================================================
# Constantes e configuração
# ================================================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
PACKAGE_JSON = PROJECT_ROOT / "package.json"
CHANGELOG_FILE = PROJECT_ROOT / "CHANGELOG.md"

TIMEOUT_CI_SECONDS = 300  # 5 minutos para aguardar a draft release aparecer
POLL_INTERVAL_SECONDS = 15
TIMEOUT_WORKFLOW_SECONDS = 5400  # 90 minutos para builds Windows + macOS + Linux
WORKFLOW_POLL_INTERVAL_SECONDS = 30
WORKFLOW_NAME = "Build & Release"
CHANGELOG_COMMIT_LIMIT = 40
RESUME_CHECKPOINTS = ("tag", "draft", "workflow", "publish")
WORKTREE_WARNING_TEXT = "NAO SALVE NADA ATE O SCRIPT TERMINAR"

# --- Geração de texto via Claude CLI (opcional, com fallback manual) ---
CLAUDE_BIN_ENV = "SHIPIT_CLAUDE_BIN"  # caminho do executável (sobrepõe o PATH)
AI_TIMEOUT_SECONDS = 180
AI_ENABLED = True  # desativado por --no-ai; também requer o 'claude' disponível

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
    BLINK = "\033[5m"


def supports_color() -> bool:
    """Verifica se o terminal suporta cores ANSI."""
    if os.environ.get("NO_COLOR"):
        return False
    if sys.platform == "win32":
        return os.environ.get("TERM") or os.environ.get("WT_SESSION") or True
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


USE_COLOR = supports_color()


def supports_blink() -> bool:
    """Verifica se o terminal provavelmente suporta blink ANSI."""
    if not USE_COLOR:
        return False
    if sys.platform == "win32":
        return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


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


# ================================================================================================
# Geração de texto via Claude CLI (opcional)
# ================================================================================================


def _claude_executable() -> str | None:
    """Resolve o executável do Claude CLI.

    Prioriza a variável de ambiente SHIPIT_CLAUDE_BIN (caminho completo) e, em
    seguida, busca no PATH via `shutil.which` (que respeita o PATHEXT no Windows
    e encontra `claude.cmd`/`claude.exe`). Retorna None se não encontrar."""
    override = os.environ.get(CLAUDE_BIN_ENV, "").strip()
    if override:
        return override if os.path.isfile(override) else shutil.which(override)
    return shutil.which("claude")


def _ai_available() -> bool:
    """True se a geração por IA está habilitada (sem --no-ai) e o CLI foi achado."""
    return AI_ENABLED and _claude_executable() is not None


def _strip_code_fences(text: str) -> str:
    """Remove cercas de código (```), caso o modelo as inclua ao redor da resposta."""
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _print_block(text: str, prefix: str = "  | ") -> None:
    """Imprime um bloco de texto com prefixo, para revisão pelo usuário."""
    for line in text.splitlines():
        print(f"{prefix}{line}")


def _run_claude(prompt: str, *, timeout: int = AI_TIMEOUT_SECONDS) -> str | None:
    """Executa o Claude CLI em modo headless (`claude -p`) e devolve o texto gerado.

    Degrada para None — preservando o fluxo manual — se o binário não existir,
    falhar, exceder o timeout ou devolver conteúdo vazio. Roda com cwd temporário
    (fora do repositório) para não carregar contexto/CLAUDE.md/MCP do projeto."""
    exe = _claude_executable()
    if not exe:
        return None

    base = [exe, "-p", "--output-format", "text"]
    run_kwargs: dict[str, object] = dict(
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=tempfile.gettempdir(),
        timeout=timeout,
        check=False,
    )

    if os.name == "nt" and exe.lower().endswith((".cmd", ".bat")):
        # Shims .cmd/.bat (instalação via npm no Windows) não são executáveis
        # diretos: passamos pelo interpretador de comandos e enviamos o prompt
        # via STDIN para evitar escape de quebras de linha/aspas na linha de comando.
        comspec = os.environ.get("COMSPEC", "cmd.exe")
        cmd = [comspec, "/c", *base]
        run_kwargs["input"] = prompt
    else:
        # Executável nativo (.exe/unix): prompt como argumento é o mais confiável.
        cmd = [exe, "-p", prompt, "--output-format", "text"]

    try:
        result = subprocess.run(cmd, **run_kwargs)
    except subprocess.TimeoutExpired:
        print_warning(f"Claude CLI excedeu {timeout}s; seguindo no fluxo manual.")
        return None
    except OSError as exc:
        print_warning(f"Não foi possível executar o Claude CLI ({exc}); fluxo manual.")
        return None

    if result.returncode != 0:
        detail = (result.stderr or "").strip().splitlines()
        print_warning(
            "Claude CLI retornou erro"
            + (f": {detail[-1]}" if detail else "")
            + "; seguindo no fluxo manual."
        )
        return None

    return _strip_code_fences((result.stdout or "").strip()) or None


def _generate_changelog_with_claude(version: str, commits: str) -> str | None:
    """Gera as seções do CHANGELOG (Keep a Changelog, pt-BR) a partir dos commits."""
    prompt = (
        f"Gere a entrada do CHANGELOG para a versão {version} do app desktop "
        f'"ShipIt!" (Electron), em português do Brasil, seguindo o padrão '
        f"Keep a Changelog.\n\n"
        f"Commits desde a última release (base do que mudou):\n{commits}\n\n"
        f"Regras OBRIGATÓRIAS de saída:\n"
        f"- Responda APENAS com seções markdown de nível '### ' entre: "
        f"Adicionado, Alterado, Corrigido, Removido, Segurança.\n"
        f"- Inclua somente as seções aplicáveis (omita as vazias).\n"
        f"- Use bullets '- ' com foco no usuário final (o que muda para quem usa "
        f"o app), agrupando mudanças relacionadas.\n"
        f"- NÃO inclua o cabeçalho de versão (ex.: '## [{version}]'), nem qualquer "
        f"texto antes/depois, nem cercas de código (```).\n"
        f"- Ignore commits puramente internos de release (bump de versão, "
        f"'preparar release', merges e ajustes do próprio CHANGELOG)."
    )
    return _run_claude(prompt)


def _generate_commit_message_with_claude(staged_summary: str) -> str | None:
    """Gera o assunto de um commit (Conventional Commits, pt-BR) das mudanças staged."""
    prompt = (
        "Gere a linha de ASSUNTO de um commit no padrão Conventional Commits, em "
        "português do Brasil, para as mudanças staged abaixo.\n\n"
        f"{staged_summary}\n\n"
        "Regras: responda APENAS com uma única linha (até ~72 caracteres), sem "
        "corpo, sem aspas e sem cercas de código."
    )
    return _run_claude(prompt, timeout=120)


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


def _get_current_branch_name() -> str:
    """Obtém o nome da branch atual para mensagens de recuperação."""
    result = run_cmd(["git", "branch", "--show-current"], check=False)
    branch = result.stdout.strip()
    return branch or "(desconhecida)"


def _summarize_worktree_changes() -> dict[str, list[str]]:
    """Resume staged, unstaged e untracked da worktree atual."""
    result = run_cmd(
        ["git", "status", "--porcelain=v1", "--untracked-files=all"],
        check=False,
    )
    summary = {
        "raw_lines": [],
        "staged": [],
        "unstaged": [],
        "untracked": [],
    }
    if result.returncode != 0:
        return summary

    for raw_line in result.stdout.splitlines():
        if not raw_line:
            continue
        summary["raw_lines"].append(raw_line)
        if raw_line.startswith("?? "):
            summary["untracked"].append(raw_line[3:])
            continue
        index_status = raw_line[0]
        worktree_status = raw_line[1]
        file_path = raw_line[3:]
        if index_status != " ":
            summary["staged"].append(file_path)
        if worktree_status != " ":
            summary["unstaged"].append(file_path)

    return summary


def _print_critical_worktree_warning() -> None:
    """Exibe um aviso muito visível antes de guardar mudanças locais."""
    banner = "!" * max(72, len(WORKTREE_WARNING_TEXT) + 12)
    style = Colors.BOLD + Colors.RED
    if supports_blink():
        style += Colors.BLINK
        banner_lines = [banner, f"!!! {WORKTREE_WARNING_TEXT} !!!", banner]
    else:
        banner_lines = [
            banner,
            banner,
            f"!!! {WORKTREE_WARNING_TEXT} !!!",
            banner,
            banner,
        ]

    print()
    for line in banner_lines:
        print(_c(style, line))
    print()


def _write_recovery_metadata(metadata: dict[str, object]) -> str:
    """Persiste metadados de recuperação em arquivo temporário."""
    with tempfile.NamedTemporaryFile(
        mode="w",
        delete=False,
        encoding="utf-8",
        suffix=".json",
        prefix="shipit-release-recovery-",
    ) as temp_file:
        json.dump(metadata, temp_file, ensure_ascii=False, indent=2)
        temp_file.write("\n")
        return temp_file.name


def _resolve_stash_reference(expected_message: str) -> tuple[str | None, str | None]:
    """Localiza a referência e o commit do stash recém-criado."""
    result = run_cmd(
        ["git", "stash", "list", "--format=%gd%x09%gs", "-n", "1"],
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None, None

    first_line = result.stdout.splitlines()[0]
    parts = first_line.split("\t", 1)
    stash_ref = parts[0].strip()
    stash_subject = parts[1].strip() if len(parts) > 1 else ""
    if expected_message not in stash_subject:
        return None, None

    sha_result = run_cmd(["git", "rev-parse", stash_ref], check=False)
    stash_commit = sha_result.stdout.strip() if sha_result.returncode == 0 else None
    return stash_ref, stash_commit


def _print_manual_stash_recovery(metadata: dict[str, object]) -> None:
    """Imprime comandos prontos para restaurar manualmente o stash salvo."""
    recovery_target = str(metadata.get("stash_commit") or metadata.get("stash_ref"))
    print_info("Restauração manual disponível com os comandos abaixo:")
    print(f"  git stash list --date=local")
    print(f"  git stash show -p \"{recovery_target}\"")
    print(f"  git stash apply --index \"{recovery_target}\"")


def _stash_worktree_for_git_region(reason: str) -> dict[str, object] | None:
    """Guarda staged/unstaged/untracked antes de operações Git sensíveis."""
    summary = _summarize_worktree_changes()
    if not summary["raw_lines"]:
        return None

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    current_branch = _get_current_branch_name()
    stash_message = f"shipit-release-safeguard-{timestamp}-{reason}"

    _print_critical_worktree_warning()
    print_warning(
        "Mudanças locais detectadas antes de uma operação Git que exige worktree limpa."
    )
    print_warning(
        "As alterações serão guardadas temporariamente em um stash nomeado e restauradas ao final."
    )
    print_info(f"Branch atual: {current_branch}")
    print_info(
        "Resumo: "
        f"staged={len(summary['staged'])}, "
        f"unstaged={len(summary['unstaged'])}, "
        f"untracked={len(summary['untracked'])}"
    )
    for line in summary["raw_lines"][:10]:
        print(f"  {line}")
    omitted = len(summary["raw_lines"]) - min(len(summary["raw_lines"]), 10)
    if omitted > 0:
        print(f"  ... (+{omitted} arquivo(s))")

    run_cmd(["git", "stash", "push", "-u", "-m", stash_message])
    stash_ref, stash_commit = _resolve_stash_reference(stash_message)
    if not stash_ref:
        print_error("Não foi possível localizar o stash de proteção recém-criado.")
        sys.exit(1)

    recovery_metadata: dict[str, object] = {
        "timestamp": datetime.now().isoformat(),
        "reason": reason,
        "branch": current_branch,
        "stash_message": stash_message,
        "stash_ref": stash_ref,
        "stash_commit": stash_commit,
        "worktree": summary,
    }
    recovery_file = _write_recovery_metadata(recovery_metadata)
    recovery_metadata["recovery_file"] = recovery_file

    print_success(f"Mudanças locais guardadas em {stash_ref}.")
    print_info(f"Arquivo de recuperação: {recovery_file}")
    print_warning("Nao salve novos arquivos ate a restauracao automatica terminar.")
    return recovery_metadata


def _restore_stashed_worktree(metadata: dict[str, object]) -> None:
    """Restaura automaticamente o stash salvo; mantém o stash se a restauração falhar."""
    stash_ref = str(metadata["stash_ref"])
    apply_target = str(metadata.get("stash_commit") or stash_ref)

    print_step("Restaurando mudanças locais guardadas...")
    apply_result = run_cmd(
        ["git", "stash", "apply", "--index", apply_target],
        check=False,
    )
    if apply_result.returncode != 0:
        error_msg = (apply_result.stderr or apply_result.stdout).strip()
        print_error(
            f"Falha ao restaurar automaticamente as mudanças locais: {error_msg}"
        )
        print_warning("O stash de proteção foi preservado para restauração manual.")
        recovery_file = metadata.get("recovery_file")
        if recovery_file:
            print_info(f"Arquivo de recuperação: {recovery_file}")
        _print_manual_stash_recovery(metadata)
        sys.exit(1)

    drop_result = run_cmd(["git", "stash", "drop", stash_ref], check=False)
    if drop_result.returncode != 0:
        error_msg = (drop_result.stderr or drop_result.stdout).strip()
        print_warning(
            "As mudanças foram restauradas, mas o stash de proteção nao foi removido. "
            f"Remova manualmente se desejar: {error_msg}"
        )
    print_success("Mudanças locais restauradas com sucesso.")


def _run_git_region_with_worktree_safeguard(
    reason: str,
    git_region: Callable[[], None],
    dry_run: bool,
) -> None:
    """Executa uma região Git sensível protegendo a worktree quando necessário."""
    if dry_run:
        git_region()
        return

    recovery_metadata = _stash_worktree_for_git_region(reason)
    try:
        git_region()
    except Exception:
        if recovery_metadata is not None:
            print_warning(
                "A operacao protegida falhou; o stash de protecao foi mantido intacto."
            )
            recovery_file = recovery_metadata.get("recovery_file")
            if recovery_file:
                print_info(f"Arquivo de recuperação: {recovery_file}")
            _print_manual_stash_recovery(recovery_metadata)
        raise

    if recovery_metadata is not None:
        _restore_stashed_worktree(recovery_metadata)


def _print_release_summary(
    version: str,
    workflow_summary: dict | None,
    release_data: dict | None,
) -> None:
    """Imprime o resumo final da release, independente do checkpoint de entrada."""
    print_header("Release Concluída!")
    print_success(f"Versão: v{version}")
    if release_data:
        assets = release_data.get("assets", []) or []
        url = release_data.get("url", "")
        is_draft = bool(release_data.get("isDraft"))
        status_label = "draft" if is_draft else "published"
        print_info(f"Status no momento da validação: {status_label}")
        print_info(f"Assets anexados: {len(assets)}")
        for asset in assets:
            name = asset.get("name", "?")
            print(f"  • {name}")
        if url:
            print_info(f"Release URL: {url}")
    if workflow_summary and workflow_summary.get("url"):
        print_info(f"Workflow run:  {workflow_summary['url']}")
    print_success("Todos os passos concluídos com sucesso.")
    print()


def run_release_from_checkpoint(
    version: str,
    checkpoint: str,
    dry_run: bool,
    ci_timeout: int,
    skip_asset_validation: bool,
) -> tuple[dict | None, dict | None]:
    """Retoma a release a partir de um checkpoint explícito."""
    print_info(f"Retomando release v{version} a partir do checkpoint '{checkpoint}'.")

    workflow_summary: dict | None = None
    release_data: dict | None = None

    if checkpoint == "tag":
        verify_release_on_main(version, dry_run)
        create_and_push_tag(version, dry_run)

    if checkpoint in ("tag", "draft"):
        wait_for_draft_release(version, dry_run)

    if checkpoint in ("tag", "draft", "workflow"):
        workflow_summary = wait_for_release_workflow_completion(
            version,
            ci_timeout,
            dry_run,
        )

    release_data = validate_release_assets(
        version,
        skip_asset_validation,
        dry_run,
    )
    publish_release(version, dry_run)
    return workflow_summary, release_data


# ================================================================================================
# Step 1: Validação de ambiente
# ================================================================================================


def check_environment() -> bool:
    """Verifica pré-requisitos: git, gh CLI, autenticação, branch."""
    print_header("Step 1/13 — Validação de Ambiente")
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
        # Causa comum no Windows: a variável GITHUB_TOKEN/GH_TOKEN está definida com
        # um token inválido/expirado — o gh tenta usá-la e a autenticação falha, e o
        # `gh auth login` se recusa a salvar credenciais enquanto ela existir.
        if os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN"):
            print_warning(
                "GITHUB_TOKEN/GH_TOKEN está definido no ambiente. Se o token for "
                "inválido, remova a variável (e abra um novo terminal) antes de rodar "
                "'gh auth login' — ou defina um token válido (repo + write:packages)."
            )
        ok = False
    else:
        print_success("gh autenticado")
        # Verificar escopos
        if "repo" not in auth_output.lower():
            print_warning(
                "Escopo 'repo' pode não estar presente. Verifique com: gh auth status"
            )

    # Rate limit
    print_step("Verificando rate limit da API GitHub...")
    result = run_cmd(
        ["gh", "api", "rate_limit", "--jq", ".rate.remaining"], check=False
    )
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
    print_header("Step 2-3/13 — Commit de Mudanças Pendentes")

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

    # Stage tudo
    run_cmd(["git", "add", "-A"])

    # Sugestão de mensagem via Claude CLI (quando disponível); Enter aceita o padrão.
    default_msg = "chore: preparar release"
    if _ai_available():
        print_step("Gerando mensagem de commit com o Claude CLI...")
        stat = run_cmd(["git", "diff", "--cached", "--stat"], check=False).stdout.strip()
        status = run_cmd(["git", "status", "--short"], check=False).stdout.strip()
        suggestion = _generate_commit_message_with_claude(
            f"Arquivos (git diff --cached --stat):\n{stat}\n\nStatus (git status --short):\n{status}"
        )
        if suggestion:
            first_line = suggestion.splitlines()[0].strip()
            if first_line:
                default_msg = first_line

    try:
        entered = input(
            f"{_c(Colors.YELLOW, '❯')} Mensagem do commit [{default_msg}]: "
        ).strip()
    except (EOFError, KeyboardInterrupt):
        print()
        print_error("Commit cancelado.")
        sys.exit(1)

    commit_msg = entered or default_msg

    run_cmd(["git", "commit", "-m", commit_msg])
    print_success("Commit realizado com sucesso.")


# ================================================================================================
# Step 4: Atualizar CHANGELOG.md com IA
# ================================================================================================


def _collect_changelog_via_editor(initial: str | None = None) -> str | None:
    """Abre um editor externo e devolve o conteúdo escrito. Quando `initial` é
    informado (ex.: texto gerado pela IA), abre o editor já preenchido para
    revisão. Retorna None se o editor não puder ser iniciado."""
    import tempfile

    editor = os.environ.get("EDITOR") or os.environ.get("VISUAL")
    if not editor:
        editor = "notepad" if sys.platform == "win32" else "nano"

    if initial:
        template = (
            initial.rstrip()
            + "\n\n"
            + "# Revise/edite o texto acima. Linhas iniciadas com '#' são ignoradas.\n"
            + "# Salve e feche o editor para confirmar.\n"
        )
    else:
        template = (
            "### Adicionado\n"
            "- \n"
            "\n"
            "### Corrigido\n"
            "- \n"
            "\n"
            "### Alterado\n"
            "- \n"
            "\n"
            "# Remova as seções não aplicáveis e as linhas iniciadas com '#'.\n"
            "# Salve e feche o editor para confirmar.\n"
        )

    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    )
    try:
        tmp.write(template)
        tmp.close()
        try:
            subprocess.run([editor, tmp.name], check=False)
        except FileNotFoundError:
            print_warning(f"Editor '{editor}' não encontrado.")
            return None
        with open(tmp.name, "r", encoding="utf-8") as f:
            content = f.read()
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    # Remover linhas de comentário (começando com '#' que NÃO sejam headings markdown).
    cleaned_lines: list[str] = []
    for line in content.splitlines():
        stripped = line.lstrip()
        # Headings markdown começam com '#' seguido de espaço e texto. Comentários
        # do template começam com '# ' mas em coluna 0 também — diferenciamos
        # pelo conteúdo: se a linha começar com '###' é heading; '# ' isolado é comentário.
        if stripped.startswith("#") and not stripped.startswith("###"):
            continue
        cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines).strip()
    if not cleaned:
        return None
    return cleaned


def _collect_changelog_inline() -> str:
    """Coleta entrada do CHANGELOG via stdin. Encerra ao receber uma linha vazia."""
    print_info(
        "Digite a entrada do CHANGELOG (com foco no usuário final). "
        "Pressione Enter em uma linha vazia para finalizar."
    )
    lines: list[str] = []
    try:
        while True:
            line = input()
            if line == "":
                break
            lines.append(line)
    except (EOFError, KeyboardInterrupt):
        print()
    return "\n".join(lines).strip()


def _prompt_changelog_fallback(version: str, commits: str) -> str:
    """UX de criação da entrada do CHANGELOG: IA (Claude CLI), editor, inline ou abortar."""
    print()
    print_info("Commits considerados:")
    commit_lines = commits.splitlines()
    for line in commit_lines[:20]:
        print(f"  {line}")
    if len(commit_lines) > 20:
        print(f"  ... (+{len(commit_lines) - 20} commits)")
    print()

    fallback_entry = f"- Atualização para versão {version}"
    ai = _ai_available()

    while True:
        print_info("Como deseja criar a entrada do CHANGELOG?")
        if ai:
            print(f"  {_c(Colors.GREEN, 'c')}) Gerar com Claude CLI (recomendado)")
        print(f"  {_c(Colors.CYAN, 'e')}) Abrir editor externo")
        print(f"  {_c(Colors.YELLOW, 'm')}) Digitar inline no terminal")
        print(f"  {_c(Colors.RED, 'a')}) Abortar release")
        default = "c" if ai else "e"
        options = f"{'c/' if ai else ''}e/m/a"
        try:
            choice = (
                input(f"{_c(Colors.YELLOW, '❯')} Escolha [{options}] (padrão: {default}): ")
                .strip()
                .lower()
                or default
            )
        except (EOFError, KeyboardInterrupt):
            print()
            print_error("Release cancelada.")
            sys.exit(1)

        if choice == "a":
            print_error("Release cancelada pelo usuário.")
            sys.exit(1)

        if choice == "c" and ai:
            print_step("Gerando entrada do CHANGELOG com o Claude CLI...")
            generated = _generate_changelog_with_claude(version, commits)
            if not generated:
                print_warning("A IA não retornou conteúdo. Escolha outra opção.")
                continue
            print()
            print_info("Texto gerado:")
            _print_block(generated)
            print()
            try:
                sub = (
                    input(
                        f"{_c(Colors.YELLOW, '❯')} Usar este texto? "
                        f"[s=sim / e=editar / r=regerar / m=manual] (padrão: s): "
                    )
                    .strip()
                    .lower()
                    or "s"
                )
            except (EOFError, KeyboardInterrupt):
                print()
                print_error("Release cancelada.")
                sys.exit(1)
            if sub == "s":
                return generated
            if sub == "e":
                edited = _collect_changelog_via_editor(initial=generated)
                if edited:
                    return edited
                print_warning("Editor não retornou conteúdo.")
                continue
            if sub == "r":
                continue
            # "m" → entrada inline
            return _collect_changelog_inline() or fallback_entry

        if choice == "e":
            result = _collect_changelog_via_editor()
            if result:
                return result
            print_warning("Editor não retornou conteúdo. Caindo para entrada inline.")
            return _collect_changelog_inline() or fallback_entry

        if choice == "m":
            return _collect_changelog_inline() or fallback_entry

        print_warning("Opção inválida.")


def update_changelog(version: str, dry_run: bool) -> None:
    """Atualiza CHANGELOG.md com entrada para a nova versão."""
    print_header("Step 5/13 — Atualizar CHANGELOG.md")

    today = datetime.now().strftime("%Y-%m-%d")
    section_header = f"## [{version}] — {today}"

    # Verificar se já existe entrada para esta versão
    changelog_content = CHANGELOG_FILE.read_text(encoding="utf-8")
    if f"## [{version}]" in changelog_content:
        print_success(f"CHANGELOG já contém entrada para [{version}]. Pulando.")
        return

    # Listar commits recentes para exibir ao usuário no fallback manual do CHANGELOG.
    # Preferimos `-n LIMIT` ao range `last_tag..HEAD` porque em branches longos
    # essa última faixa pode trazer dezenas de commits.
    diff_result = run_cmd(
        [
            "git",
            "log",
            f"-n{CHANGELOG_COMMIT_LIMIT}",
            "--oneline",
            "--no-merges",
        ],
        check=False,
    )
    commits = (
        diff_result.stdout.strip() if diff_result.returncode == 0 else "(sem commits)"
    )
    # v2: entrada do CHANGELOG criada manualmente (editor externo ou inline).
    # Em geral, o changelog já foi preparado antes e o script roda com --skip-changelog.
    changelog_entry = _prompt_changelog_fallback(version, commits)

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
        rest = changelog_content[unreleased_idx + len(marker) :]
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
                + changelog_content[after_sep + 1 :]
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
# Step 4: Bump version
# ================================================================================================


def bump_version(version: str, dry_run: bool) -> str:
    """Atualiza a versão no package.json."""
    print_header("Step 4/13 — Bump de Versão")

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
            choice = input(
                f"{_c(Colors.YELLOW, '❯')} Escolha [1-4] (padrão: 1): "
            ).strip()
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
                new_version = input(
                    f"{_c(Colors.YELLOW, '❯')} Versão customizada (X.Y.Z): "
                ).strip()
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
    updated = pkg_content.replace(
        f'"version": "{current}"', f'"version": "{new_version}"', 1
    )
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
    print_header("Step 6/13 — Push dev Branch")

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
    print_header("Step 7/13 — Criar PR (dev → main)")

    # Verificar se já existe PR aberto
    print_step("Verificando PRs existentes...")
    result = run_cmd(
        [
            "gh",
            "pr",
            "list",
            "--base",
            "main",
            "--head",
            "dev",
            "--state",
            "open",
            "--json",
            "number,title",
        ],
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
        [
            "gh",
            "pr",
            "list",
            "--base",
            "main",
            "--head",
            "dev",
            "--state",
            "merged",
            "--json",
            "number,title",
            "--limit",
            "1",
        ],
        check=False,
    )

    title = f"Release v{version}"
    # Corpo do PR a partir do bloco do CHANGELOG da versão (curado/gerado por IA);
    # fallback para um resumo genérico caso a seção ainda não exista.
    changelog_block, _ = _extract_changelog_block_for_version(version)
    if changelog_block:
        body = f"## Release v{version}\n\n{changelog_block}"
    else:
        body = (
            f"## Release v{version}\n\n"
            f"Bump de versão e atualização do CHANGELOG para v{version}."
        )

    if dry_run:
        print_dry_run(f"Criaria PR: '{title}' (dev → main)")
        return None

    print_step(f"Criando PR: {title}")
    result = run_cmd(
        [
            "gh",
            "pr",
            "create",
            "--base",
            "main",
            "--head",
            "dev",
            "--title",
            title,
            "--body",
            body,
        ]
    )
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
    print_header("Step 8/13 — Merge PR (squash)")

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

    result = run_cmd(
        [
            "gh",
            "pr",
            "merge",
            str(pr_number),
            "--squash",
            "--delete-branch=false",
        ],
        check=False,
    )

    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout).strip()
        print_error(f"Falha ao mergear PR: {error_msg}")
        print_info("Tente mergear manualmente via GitHub ou: gh pr merge --squash")
        sys.exit(1)

    print_success(f"PR #{pr_number} mergeado com squash.")


def verify_release_on_main(version: str, dry_run: bool) -> None:
    """Confirma que origin/main já contém a versão da release antes de pular PR."""
    print_header("Step 7-8/13 — PR pulado")
    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(
            f"Verificaria se origin/main contém package.json version={version} antes de criar {tag_name}"
        )
        return

    print_step("Verificando se a release já está em origin/main...")
    fetch_result = run_cmd(["git", "fetch", "origin", "main"], check=False)
    if fetch_result.returncode != 0:
        error_msg = (fetch_result.stderr or fetch_result.stdout).strip()
        print_error(f"Não foi possível atualizar origin/main: {error_msg}")
        sys.exit(1)

    show_result = run_cmd(["git", "show", "origin/main:package.json"], check=False)
    if show_result.returncode != 0:
        error_msg = (show_result.stderr or show_result.stdout).strip()
        print_error(f"Não foi possível ler package.json em origin/main: {error_msg}")
        sys.exit(1)

    try:
        main_version = json.loads(show_result.stdout)["version"]
    except (json.JSONDecodeError, KeyError) as e:
        print_error(f"package.json inválido em origin/main: {e}")
        sys.exit(1)

    if main_version != version:
        print_error(
            f"origin/main está na versão {main_version}, mas a release solicitada é {version}."
        )
        print_info(
            "Não use --skip-pull-request até o PR da release estar mergeado em main."
        )
        sys.exit(1)

    print_success(f"origin/main já contém a versão {version}.")
    print_info("Criação e merge do PR pulados; continuando a partir da tag.")


# ================================================================================================
# Step 9: Criar e enviar tag
# ================================================================================================


def create_and_push_tag(version: str, dry_run: bool) -> None:
    """Cria tag e envia para origin. Sincroniza dev com main."""
    print_header("Step 9/13 — Criar e Enviar Tag")

    tag_name = f"v{version}"

    # Verificar se tag já existe
    result = run_cmd(["git", "tag", "-l", tag_name])
    if result.stdout.strip():
        print_success(f"Tag {tag_name} já existe localmente. Pulando criação.")
        # Verificar se está no remote
        result = run_cmd(
            ["git", "ls-remote", "--tags", "origin", tag_name], check=False
        )
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

    def _tag_sync_region() -> None:
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
        run_cmd(
            ["git", "merge", "main", "-m", f"chore: sync dev with main after {tag_name}"]
        )
        run_cmd(["git", "push", "origin", "dev"])
        print_success("Branch dev sincronizada com main.")

    _run_git_region_with_worktree_safeguard(
        reason="step9-tag-sync",
        git_region=_tag_sync_region,
        dry_run=dry_run,
    )


# ================================================================================================
# Step 10: Aguardar draft release aparecer
# ================================================================================================


def wait_for_draft_release(version: str, dry_run: bool) -> None:
    """Aguarda a draft release ser criada no GitHub (job create-release do workflow)."""
    print_header("Step 10/13 — Aguardar Draft Release")

    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(
            f"Aguardaria draft release para {tag_name} (timeout: {TIMEOUT_CI_SECONDS}s)"
        )
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
                print_info(
                    "Release está em modo draft (CI/CD ainda pode estar buildando)."
                )
            return

        remaining = TIMEOUT_CI_SECONDS - elapsed
        print(f"  ⏳ Aguardando... ({elapsed}s / {TIMEOUT_CI_SECONDS}s)", end="\r")
        time.sleep(POLL_INTERVAL_SECONDS)
        elapsed += POLL_INTERVAL_SECONDS

    print()
    print_warning(
        f"Timeout de {TIMEOUT_CI_SECONDS}s atingido. Release pode ainda não existir."
    )
    print_info(f"Verifique manualmente: gh release view {tag_name}")
    if not confirm("Deseja continuar para a publicação mesmo assim?"):
        sys.exit(1)


# ================================================================================================
# Step 11: Aguardar workflow CI/CD concluir
# ================================================================================================


def _get_tag_sha(tag_name: str) -> str | None:
    """Retorna o SHA do commit apontado pela tag, ou None."""
    result = run_cmd(["git", "rev-list", "-n", "1", tag_name], check=False)
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return None


def _find_workflow_run(tag_name: str, tag_sha: str | None) -> dict | None:
    """Localiza o run mais recente do workflow Build & Release para a tag."""
    result = run_cmd(
        [
            "gh", "run", "list",
            "--workflow", WORKFLOW_NAME,
            "--event", "push",
            "--limit", "30",
            "--json",
            "databaseId,headBranch,headSha,status,conclusion,url,displayTitle,createdAt",
        ],
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        runs = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    # Tag pushes aparecem com headBranch == tag_name
    for run in runs:
        if run.get("headBranch") == tag_name:
            return run
    if tag_sha:
        for run in runs:
            if run.get("headSha") == tag_sha:
                return run
    return None


def wait_for_release_workflow_completion(
    version: str, timeout_seconds: int, dry_run: bool
) -> dict | None:
    """Aguarda o workflow Build & Release concluir com `conclusion: success`."""
    print_header("Step 11/13 — Aguardar Workflow CI/CD")

    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(
            f"Aguardaria conclusão de '{WORKFLOW_NAME}' para {tag_name} "
            f"(timeout: {timeout_seconds}s)"
        )
        return None

    tag_sha = _get_tag_sha(tag_name)
    if tag_sha:
        print_info(f"SHA da tag {tag_name}: {tag_sha[:12]}")

    print_step(f"Procurando workflow run para {tag_name}...")
    print_info(
        f"Timeout: {timeout_seconds}s (poll a cada {WORKFLOW_POLL_INTERVAL_SECONDS}s)"
    )

    elapsed = 0
    run_summary: dict | None = None
    while elapsed < timeout_seconds:
        run_summary = _find_workflow_run(tag_name, tag_sha)
        if run_summary:
            break
        print(
            f"  ⏳ Aguardando run aparecer... ({elapsed}s / {timeout_seconds}s)",
            end="\r",
        )
        time.sleep(WORKFLOW_POLL_INTERVAL_SECONDS)
        elapsed += WORKFLOW_POLL_INTERVAL_SECONDS

    if not run_summary:
        print()
        print_error(
            f"Workflow run para {tag_name} não encontrado dentro do timeout."
        )
        print_info(f"Verifique manualmente: gh run list --workflow \"{WORKFLOW_NAME}\"")
        sys.exit(1)

    run_id = run_summary["databaseId"]
    run_url = run_summary.get("url", "")
    print()
    print_success(f"Run encontrado: #{run_id}")
    if run_url:
        print_info(f"URL: {run_url}")

    last_line_len = 0
    while elapsed < timeout_seconds:
        result = run_cmd(
            [
                "gh", "run", "view", str(run_id),
                "--json", "status,conclusion,jobs,url",
            ],
            check=False,
        )
        if result.returncode != 0:
            time.sleep(WORKFLOW_POLL_INTERVAL_SECONDS)
            elapsed += WORKFLOW_POLL_INTERVAL_SECONDS
            continue

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            time.sleep(WORKFLOW_POLL_INTERVAL_SECONDS)
            elapsed += WORKFLOW_POLL_INTERVAL_SECONDS
            continue

        status = data.get("status", "")
        conclusion = data.get("conclusion") or ""
        jobs = data.get("jobs", []) or []

        job_parts = []
        for job in jobs:
            jname = job.get("name", "?")
            jstatus = job.get("status", "")
            jconc = job.get("conclusion") or ""
            if jstatus == "completed":
                mark = "✔" if jconc == "success" else "✖"
            elif jstatus == "in_progress":
                mark = "⏵"
            else:
                mark = "⏳"
            job_parts.append(f"{mark} {jname}")

        line = " | ".join(job_parts) if job_parts else f"status={status}"
        line_full = f"  [{elapsed}s] {line}"
        if len(line_full) > 110:
            line_full = line_full[:107] + "..."
        # Limpa a linha anterior
        print("\r" + " " * max(last_line_len, len(line_full)), end="\r")
        print(line_full, end="\r")
        last_line_len = len(line_full)

        if status == "completed":
            print()
            run_summary = {
                "databaseId": run_id,
                "url": run_url or data.get("url", ""),
                "status": status,
                "conclusion": conclusion,
                "jobs": jobs,
            }
            if conclusion == "success":
                print_success("Workflow concluído com sucesso.")
                return run_summary
            print_error(f"Workflow concluiu com '{conclusion}'.")
            print_info(f"Logs:  gh run view {run_id} --log")
            print_info(f"Rerun: gh run rerun {run_id}")
            sys.exit(1)

        time.sleep(WORKFLOW_POLL_INTERVAL_SECONDS)
        elapsed += WORKFLOW_POLL_INTERVAL_SECONDS

    print()
    print_error(f"Timeout de {timeout_seconds}s atingido aguardando workflow.")
    print_info(f"Verifique manualmente: gh run view {run_id} --url")
    sys.exit(1)


# ================================================================================================
# Step 12: Validar assets antes de publicar
# ================================================================================================


def expected_release_assets(version: str) -> list[str]:
    """Lista de assets esperados na release final, conforme o workflow atual."""
    v = version
    return [
        f"ShipIt-{v}-Windows-x64-Setup.exe",
        f"ShipIt-{v}-Windows-x64-Portable.exe",
        f"ShipIt-{v}-Windows-x64.msi",
        f"ShipIt-{v}-Windows-x64-Setup.exe.blockmap",
        "latest.yml",
        f"ShipIt-{v}-macOS-arm64.dmg",
        f"ShipIt-{v}-macOS-arm64.dmg.blockmap",
        f"ShipIt-{v}-macOS-x64.dmg",
        f"ShipIt-{v}-macOS-x64.dmg.blockmap",
        "latest-mac.yml",
        f"ShipIt-{v}-Linux-x86_64.AppImage",
        f"ShipIt-{v}-Linux-amd64.deb",
        f"ShipIt-{v}-Linux-x86_64.rpm",
        "latest-linux.yml",
    ]


def validate_release_assets(
    version: str, skip: bool, dry_run: bool
) -> dict | None:
    """Valida que a release tem todos os assets esperados e que o upload concluiu."""
    print_header("Step 12/13 — Validar Assets da Release")

    tag_name = f"v{version}"

    if dry_run:
        print_dry_run(f"Validaria assets da release {tag_name}")
        return None

    if skip:
        print_warning("Validação de assets pulada (--skip-asset-validation).")
        return None

    result = run_cmd(
        [
            "gh", "release", "view", tag_name,
            "--json", "isDraft,assets,url,tagName",
        ],
        check=False,
    )
    if result.returncode != 0:
        print_error(f"Release {tag_name} não encontrada.")
        sys.exit(1)

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        print_error("Resposta inválida do GitHub para a release.")
        sys.exit(1)

    is_draft = bool(data.get("isDraft"))
    assets = data.get("assets", []) or []
    expected = expected_release_assets(version)
    asset_by_name = {a.get("name", ""): a for a in assets}

    print_info(f"Release isDraft: {is_draft}")
    print_info(f"Assets encontrados: {len(assets)} / esperados: {len(expected)}")

    missing: list[str] = []
    not_uploaded: list[str] = []
    for name in expected:
        asset = asset_by_name.get(name)
        if asset is None:
            missing.append(name)
            print_error(f"  • {name} (faltando)")
            continue
        state = asset.get("state") or ""
        if state and state != "uploaded":
            not_uploaded.append(name)
            print_warning(f"  • {name} (state={state})")
        else:
            print_success(f"  • {name}")

    if missing or not_uploaded:
        print()
        print_error("Validação de assets falhou.")
        if missing:
            print_info(f"Assets faltando: {len(missing)}")
        if not_uploaded:
            print_info(f"Assets com upload incompleto: {not_uploaded}")
        print()
        print_info("Comandos úteis para diagnóstico:")
        print(f"  gh release view {tag_name} --json isDraft,assets,url")
        print(f"  gh run list --workflow \"{WORKFLOW_NAME}\" --event push --limit 5")
        print("  gh run rerun <run_id>")
        if not is_draft:
            print()
            print_error(
                "Atenção: a release JÁ FOI PUBLICADA mas está com assets incompletos. "
                "Reverta para draft antes de re-rodar o workflow:"
            )
            print(f"  gh release edit {tag_name} --draft=true")
            print("  gh run rerun <run_id>")
        sys.exit(1)

    if not is_draft:
        print_warning(
            f"Release {tag_name} já está publicada — assets completos, validação OK."
        )
    else:
        print_success("Todos os assets esperados estão presentes e completos.")

    return data


# ================================================================================================
# Helpers: notas amigáveis da release
# ================================================================================================


def _extract_changelog_block_for_version(version: str) -> tuple[str | None, str | None]:
    """Extrai o bloco de markdown da versão no CHANGELOG e a data do cabeçalho.

    Retorna (bloco_markdown, data_yyyy_mm_dd).
    """
    changelog_content = CHANGELOG_FILE.read_text(encoding="utf-8")
    header_pattern = re.compile(
        rf"^## \[{re.escape(version)}\](?:\s*[—-]\s*(\d{{4}}-\d{{2}}-\d{{2}}))?\s*$",
        re.MULTILINE,
    )

    header_match = header_pattern.search(changelog_content)
    if not header_match:
        return None, None

    release_date = header_match.group(1)
    section_start = header_match.end()

    next_section_match = re.search(
        r"^## \[[^\]]+\]",
        changelog_content[section_start:],
        flags=re.MULTILINE,
    )
    if next_section_match:
        section_end = section_start + next_section_match.start()
    else:
        section_end = len(changelog_content)

    section_body = changelog_content[section_start:section_end].strip()
    if not section_body:
        return None, release_date

    return section_body, release_date


def build_release_notes(version: str) -> str:
    """Monta um corpo de release amigável para usuário final com referência de docs."""
    changelog_block, release_date = _extract_changelog_block_for_version(version)

    release_title = f"## ShipIt v{version}"
    if release_date:
        release_title = f"{release_title} — {release_date}"

    if changelog_block:
        changes_markdown = changelog_block
    else:
        changes_markdown = textwrap.dedent(
            """
            ### Alterado
            - Atualização geral do aplicativo para a versão atual.
            - Consulte o CHANGELOG para detalhes técnicos completos.
            """
        ).strip()

    return "\n\n".join(
        [
            release_title,
            (
                "Esta versão foi preparada para melhorar a experiência de uso no dia a dia,\n"
                "com foco em clareza para usuário final e registro técnico resumido."
            ),
            changes_markdown.strip(),
            textwrap.dedent(
                """
                ### Como atualizar
                - Baixe o instalador adequado ao seu sistema na lista de Assets desta release.
                - Feche o ShipIt antes de executar o instalador.
                - Abra o app após a instalação para concluir a atualização.
                """
            ).strip(),
            textwrap.dedent(
                """
                ### Documentação rápida
                - Histórico completo das mudanças: CHANGELOG.md
                - Guia geral de instalação e uso: README.md
                """
            ).strip(),
        ]
    )


# ================================================================================================
# Step 13: Publicar release
# ================================================================================================


def publish_release(version: str, dry_run: bool) -> None:
    """Publica a release (draft → published)."""
    print_header("Step 13/13 — Publicar Release")

    tag_name = f"v{version}"
    release_notes = build_release_notes(version)

    if dry_run:
        print_dry_run("Geraria notas amigáveis da release a partir do CHANGELOG.")
        print_dry_run(f"Faria: gh release edit {tag_name} --notes-file <arquivo.md> --draft=false --latest")
        return

    # Verificar se release existe
    result = run_cmd(
        ["gh", "release", "view", tag_name, "--json", "isDraft,url"],
        check=False,
    )
    if result.returncode != 0:
        print_error(f"Release {tag_name} não encontrada.")
        print_info(
            f"Crie manualmente: gh release create {tag_name} --draft --notes-file <arquivo.md>"
        )
        sys.exit(1)

    data = json.loads(result.stdout)
    release_url = data.get("url", "")

    if not data.get("isDraft"):
        print_success(f"Release {tag_name} já está publicada.")
        print_info(f"URL: {release_url}")
        return

    print_step("Montando notas amigáveis da release...")
    print_info("Prévia das notas que serão publicadas:")
    print(f"{_c(Colors.CYAN, '─' * 50)}")
    print(release_notes)
    print(f"{_c(Colors.CYAN, '─' * 50)}")

    if not confirm(f"Publicar release {tag_name}? (draft → published)", "y"):
        print_warning("Publicação cancelada.")
        print_info(
            f"Publique manualmente: gh release edit {tag_name} --notes-file <arquivo.md> --draft=false --latest"
        )
        return

    notes_file_path: str | None = None
    try:
        notes_file = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".md",
            delete=False,
            encoding="utf-8",
        )
        notes_file.write(release_notes)
        notes_file.close()
        notes_file_path = notes_file.name

        result = run_cmd(
            [
                "gh",
                "release",
                "edit",
                tag_name,
                "--notes-file",
                notes_file_path,
                "--draft=false",
                "--latest",
            ],
            check=False,
        )
    finally:
        if notes_file_path and result.returncode == 0:
            try:
                os.unlink(notes_file_path)
            except OSError:
                pass

    if result.returncode != 0:
        error_msg = (result.stderr or result.stdout).strip()
        print_error(f"Falha ao publicar: {error_msg}")
        if notes_file_path:
            print_info(f"Arquivo de notas preservado para retry manual: {notes_file_path}")
        print_info(
            f"Tente manualmente: gh release edit {tag_name} --notes-file <arquivo.md> --draft=false --latest"
        )
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
        description="ShipIt — Script Automatizado de Release v2 (sem GitHub Copilot)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Exemplos:
              python release.py                    Modo interativo
              python release.py --version 1.3.0    Versão específica
              python release.py --dry-run          Simulação sem executar
              python release.py --resume-from tag --version 1.5.2
                                                  Retomar a partir da criação da tag
              python release.py --skip-changelog   Pular geração de changelog
              python release.py --skip-commit      Pular commit de pendências
              python release.py --skip-pull-request
                                                  Retomar após PR já mergeado em main
            """
        ).strip(),
    )
    parser.add_argument(
        "--version",
        "-v",
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
        "--resume-from",
        choices=RESUME_CHECKPOINTS,
        default="",
        help=(
            "Retoma a release a partir de um checkpoint explícito "
            f"({', '.join(RESUME_CHECKPOINTS)}). Requer --version e não pode ser "
            "combinado com --skip-commit, --skip-changelog ou --skip-pull-request."
        ),
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
    parser.add_argument(
        "--skip-pull-request",
        "--skip-pr",
        "--resume-after-pr",
        dest="skip_pull_request",
        action="store_true",
        help=(
            "Pula a criação e o merge do PR. Use apenas para retomar uma release "
            "quando o PR já foi mergeado em main."
        ),
    )
    parser.add_argument(
        "--ci-timeout",
        type=int,
        default=TIMEOUT_WORKFLOW_SECONDS,
        help=(
            "Timeout em segundos para aguardar o workflow CI/CD concluir "
            f"(padrão: {TIMEOUT_WORKFLOW_SECONDS})."
        ),
    )
    parser.add_argument(
        "--skip-asset-validation",
        action="store_true",
        help="Pula a validação de assets antes de publicar (uso emergencial).",
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        help=(
            "Desativa a geração de textos via Claude CLI (CHANGELOG e mensagem de "
            "commit), forçando o fluxo manual mesmo com o 'claude' disponível."
        ),
    )
    args = parser.parse_args()

    if args.version:
        args.version = args.version.lstrip("v")
        if not validate_version(args.version):
            parser.error("--version deve seguir o formato X.Y.Z.")

    if args.resume_from:
        if not args.version:
            parser.error("--resume-from requer --version X.Y.Z.")
        incompatible_flags = []
        if args.skip_commit:
            incompatible_flags.append("--skip-commit")
        if args.skip_changelog:
            incompatible_flags.append("--skip-changelog")
        if args.skip_pull_request:
            incompatible_flags.append("--skip-pull-request")
        if incompatible_flags:
            parser.error(
                "--resume-from não pode ser combinado com "
                + ", ".join(incompatible_flags)
                + "."
            )

    return args


def main() -> None:
    args = parse_args()
    dry_run = args.dry_run

    global AI_ENABLED
    AI_ENABLED = not args.no_ai

    print_header("ShipIt — Release Automatizada v2")

    if dry_run:
        print_warning("Modo DRY-RUN ativado. Nenhuma ação destrutiva será executada.\n")

    # Status da geração automática de textos (CHANGELOG, commit) via Claude CLI.
    if args.no_ai:
        print_info("Geração por IA desativada (--no-ai). Textos serão criados manualmente.")
    elif _claude_executable():
        print_info("Claude CLI detectado — geração automática de textos habilitada.")
    else:
        print_warning(
            "Claude CLI não encontrado no PATH — usando fluxo manual. "
            f"Defina {CLAUDE_BIN_ENV} com o caminho do executável para habilitar a IA."
        )

    # Step 1: Validação de ambiente
    if not check_environment():
        print_error(
            "Validação de ambiente falhou. Corrija os erros acima e tente novamente."
        )
        sys.exit(1)

    if args.resume_from:
        workflow_summary, release_data = run_release_from_checkpoint(
            version=args.version,
            checkpoint=args.resume_from,
            dry_run=dry_run,
            ci_timeout=args.ci_timeout,
            skip_asset_validation=args.skip_asset_validation,
        )
        _print_release_summary(args.version, workflow_summary, release_data)
        return

    # Step 2-3: Commit (condicional)
    if not args.skip_commit:
        do_commit(dry_run)
    else:
        print_info("Commit pulado (--skip-commit).")

    # Step 4: Bump version (antes do changelog para ter a versão definida)
    version = bump_version(args.version, dry_run)

    # Step 5: Atualizar CHANGELOG (depois do bump para saber a versão)
    if not args.skip_changelog:
        update_changelog(version, dry_run)
    else:
        print_info("CHANGELOG pulado (--skip-changelog).")

    # Step 6: Push dev
    push_dev(dry_run)

    if args.skip_pull_request:
        verify_release_on_main(version, dry_run)
    else:
        # Step 7: Criar PR
        pr_number = create_pr(version, dry_run)

        # Step 8: Merge PR
        merge_pr(pr_number, dry_run)

    # Step 9: Criar e enviar tag
    create_and_push_tag(version, dry_run)

    # Step 10: Aguardar a draft release aparecer
    wait_for_draft_release(version, dry_run)

    # Step 11: Aguardar o workflow CI/CD concluir todos os builds
    workflow_summary = wait_for_release_workflow_completion(
        version, args.ci_timeout, dry_run
    )

    # Step 12: Validar assets antes de publicar
    release_data = validate_release_assets(
        version, args.skip_asset_validation, dry_run
    )

    # Step 13: Publicar release
    publish_release(version, dry_run)
    _print_release_summary(version, workflow_summary, release_data)


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
