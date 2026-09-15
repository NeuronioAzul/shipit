#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShipIt — Script Automatizado de Release v2 (Python)

Versão 2: SEM dependência do GitHub Copilot CLI. As mensagens de commit, a
entrada do CHANGELOG e o corpo do PR podem ser geradas automaticamente pelo
Claude CLI (`claude -p`), quando disponível no PATH (ou via SHIPIT_CLAUDE_BIN);
caso contrário — ou com --no-ai — o fluxo cai para criação manual (editor/inline).
Nenhuma chamada a `gh copilot` é feita.

Textos gerados pela IA:
  - Commit (Step 2-3): mensagem completa no padrão Conventional Commits
    (`tipo(escopo): assunto` + corpo em bullets + rodapé BREAKING CHANGE quando
    aplicável), produzida a partir do DIFF real das mudanças staged — não só da
    lista de arquivos. O cabeçalho é validado e a mensagem pode ser revisada,
    editada no editor externo ou regerada antes do commit.
  - CHANGELOG (Step 5): entrada Keep a Changelog escrita para o USUÁRIO FINAL,
    a partir da seção [Unreleased] (fonte principal, quando existir) e dos
    commits desde a última tag (assunto + corpo), sem detalhes de desenvolvimento.
    Ao publicar, o conteúdo de [Unreleased] é movido para a versão.

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
  python docs/scripts/release.py --model                   # Forçar modelo do Claude CLI

Requer: Python 3.10+, git, gh CLI (autenticado com escopos repo + write:packages)
Opcional: Claude CLI (`claude`) no PATH para geração automática de textos.
  - SHIPIT_CLAUDE_BIN: caminho do executável (quando fora do PATH).
  - SHIPIT_CLAUDE_MODEL: modelo passado em `--model` (ex.: sonnet), útil quando o
    CLI instalado não suporta o modelo padrão configurado.
"""

import argparse
import fnmatch
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
from dataclasses import dataclass
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
CLAUDE_MODEL_ENV = "SHIPIT_CLAUDE_MODEL"  # opcional: modelo passado em `--model` (ex.: sonnet)
AI_TIMEOUT_SECONDS = 180
AI_ENABLED = True  # desativado por --no-ai; também requer o 'claude' disponível
AI_DIFF_CHAR_BUDGET = 60_000  # tamanho máximo (chars) do diff enviado ao Claude
AI_DIFF_PER_FILE_BUDGET = 12_000  # limite por arquivo; o excedente é truncado
AI_PROMPT_ARG_MAX_CHARS = 6_000  # prompts maiores vão por STDIN (limite da linha de comando)
AI_DIFF_EXCLUDED_PATTERNS = (  # gerados/binários: só o nome do arquivo vai para a IA
    "package-lock.json", "*.lock", "*.snap", "*.min.js", "*.min.css", "*.map",
    "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico", "*.icns", "*.svg", "*.webp",
    "*.mp3", "*.wav", "*.ogg", "*.docx", "*.pdf", "*.zip", "*.db", "*.sqlite",
)
PROJECT_CONTEXT_FOR_AI = (
    'O "ShipIt!" é um aplicativo desktop (Windows, macOS e Linux) usado por engenheiros '
    "para registrar atividades de trabalho, anexar evidências (imagens/arquivos) e gerar "
    "relatórios DOCX no padrão institucional do MEC. Os usuários finais NÃO são "
    "desenvolvedores. Internamente: Electron + React + TypeORM/SQLite."
)

# --- Conventional Commits (mensagem de commit do Step 2-3) ---
CONVENTIONAL_COMMIT_TYPES = (
    "feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci",
    "chore", "revert",
)
CONVENTIONAL_COMMIT_HEADER_RE = re.compile(
    r"^(?P<type>" + "|".join(CONVENTIONAL_COMMIT_TYPES) + r")"
    r"(\((?P<scope>[a-z0-9][a-z0-9._/-]*(,\s?[a-z0-9][a-z0-9._/-]*)*)\))?"
    r"(?P<breaking>!)?: (?P<subject>\S.*)$"
)
COMMIT_SUBJECT_MAX_LEN = 72
COMMIT_SCOPE_HINTS = (
    "electron, renderer, ui, activities, evidences, reports, docx, db, settings, "
    "themes, ipc, e2e, tests, docs, release, ci, deps"
)

# --- CHANGELOG (Step 5): commits de mecânica de release que não viram bullet ---
RELEASE_NOISE_COMMIT_RE = re.compile(
    r"^(chore: bump version|docs: atualizar CHANGELOG|Release v\d|"
    r"chore: sync dev with main|Merge (branch|pull request))",
    re.IGNORECASE,
)

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


def _claude_candidate_paths() -> list[str]:
    """Locais de instalação comuns do Claude CLI, para quando não está no PATH.

    Cobre o instalador nativo (`~/.local/bin`, usado em todas as plataformas) e
    instalações via npm, tornando a detecção portátil entre máquinas/usuários."""
    home = Path.home()
    candidates: list[Path] = []
    if os.name == "nt":
        candidates += [
            home / ".local" / "bin" / "claude.exe",  # instalador nativo (oficial)
            home / ".local" / "bin" / "claude",
        ]
        appdata = os.environ.get("APPDATA", "")
        localappdata = os.environ.get("LOCALAPPDATA", "")
        if appdata:
            candidates.append(Path(appdata) / "npm" / "claude.cmd")  # npm global
        if localappdata:
            candidates.append(
                Path(localappdata) / "Programs" / "claude" / "claude.exe"
            )
    else:
        candidates += [
            home / ".local" / "bin" / "claude",  # instalador nativo (oficial)
            Path("/usr/local/bin/claude"),
            Path("/opt/homebrew/bin/claude"),
        ]
    return [str(p) for p in candidates]


def _claude_executable() -> str | None:
    """Resolve o executável do Claude CLI de forma portátil entre máquinas.

    Ordem de resolução:
      1. SHIPIT_CLAUDE_BIN (caminho completo do executável);
      2. PATH, via `shutil.which` (respeita o PATHEXT no Windows: .exe/.cmd);
      3. locais de instalação conhecidos (`~/.local/bin`, npm global, etc.).
    Retorna None se não encontrar — e o fluxo cai para criação manual."""
    override = os.environ.get(CLAUDE_BIN_ENV, "").strip()
    if override:
        return override if os.path.isfile(override) else shutil.which(override)

    found = shutil.which("claude")
    if found:
        return found

    for candidate in _claude_candidate_paths():
        if os.path.isfile(candidate):
            return candidate
    return None


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
    model = os.environ.get(CLAUDE_MODEL_ENV, "").strip()
    if model:
        base += ["--model", model]
    run_kwargs: dict[str, object] = dict(
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=tempfile.gettempdir(),
        timeout=timeout,
        check=False,
    )

    is_shim = os.name == "nt" and exe.lower().endswith((".cmd", ".bat"))
    if is_shim:
        # Shims .cmd/.bat (instalação via npm no Windows) não são executáveis
        # diretos: passamos pelo interpretador de comandos e enviamos o prompt
        # via STDIN para evitar escape de quebras de linha/aspas na linha de comando.
        comspec = os.environ.get("COMSPEC", "cmd.exe")
        cmd = [comspec, "/c", *base]
        run_kwargs["input"] = prompt
    elif len(prompt) > AI_PROMPT_ARG_MAX_CHARS:
        # Prompts grandes (diff completo) estouram o limite da linha de comando
        # (~32k chars no Windows); `claude -p` lê o prompt do STDIN quando não
        # recebe argumento posicional.
        cmd = base
        run_kwargs["input"] = prompt
    else:
        # Executável nativo (.exe/unix): prompt como argumento é o mais confiável.
        cmd = [exe, "-p", prompt, *base[2:]]

    try:
        result = subprocess.run(cmd, **run_kwargs)
    except subprocess.TimeoutExpired:
        print_warning(f"Claude CLI excedeu {timeout}s; seguindo no fluxo manual.")
        return None
    except OSError as exc:
        print_warning(f"Não foi possível executar o Claude CLI ({exc}); fluxo manual.")
        return None

    if result.returncode != 0:
        # O CLI imprime alguns erros (ex.: "API Error: ...") no STDOUT.
        detail = (result.stderr or "").strip().splitlines() or (
            result.stdout or ""
        ).strip().splitlines()
        print_warning(
            "Claude CLI retornou erro"
            + (f": {detail[-1]}" if detail else "")
            + "; seguindo no fluxo manual."
        )
        return None

    return _strip_code_fences((result.stdout or "").strip()) or None


def _edit_text_in_editor(
    initial: str,
    hints: list[str],
    *,
    suffix: str = ".md",
    keep_hash_prefixes: tuple[str, ...] = (),
) -> str | None:
    """Abre o editor externo ($EDITOR/$VISUAL; notepad/nano) com `initial` e
    devolve o texto salvo, sem as linhas de comentário (iniciadas com '#').

    `keep_hash_prefixes` preserva linhas que começam com '#' mas são conteúdo
    (ex.: headings '###' do CHANGELOG). Retorna None se o editor não abrir ou
    se o resultado ficar vazio."""
    editor = os.environ.get("EDITOR") or os.environ.get("VISUAL")
    if not editor:
        editor = "notepad" if sys.platform == "win32" else "nano"

    template = initial.rstrip() + "\n\n" + "".join(f"# {h}\n" for h in hints)

    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=suffix, delete=False, encoding="utf-8"
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

    cleaned_lines: list[str] = []
    for line in content.splitlines():
        stripped = line.lstrip()
        is_comment = stripped.startswith("#") and not (
            keep_hash_prefixes and stripped.startswith(keep_hash_prefixes)
        )
        if is_comment:
            continue
        cleaned_lines.append(line.rstrip())
    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or None


# --- Commit (Step 2-3) -------------------------------------------------------


def _is_ai_diff_excluded(path: str) -> bool:
    """Arquivos gerados/binários cujo conteúdo não ajuda a IA (só o nome é enviado)."""
    name = os.path.basename(path)
    return any(fnmatch.fnmatch(name, pat) for pat in AI_DIFF_EXCLUDED_PATTERNS)


def _collect_staged_diff_for_ai() -> str:
    """Monta o contexto das mudanças staged para a IA: stat, status por arquivo e
    o diff textual (com orçamento de tamanho por arquivo e total)."""
    stat = run_cmd(["git", "diff", "--cached", "--stat=120"], check=False).stdout.strip()
    name_status = run_cmd(
        ["git", "diff", "--cached", "--name-status"], check=False
    ).stdout.strip()

    files = [
        line.split("\t")[-1].strip()
        for line in name_status.splitlines()
        if line.strip()
    ]

    chunks: list[str] = []
    omitted: list[str] = []
    used = 0
    for path in files:
        if _is_ai_diff_excluded(path):
            omitted.append(f"{path} (gerado/binário)")
            continue
        diff = run_cmd(
            ["git", "diff", "--cached", "--no-color", "--unified=2", "--", path],
            check=False,
        ).stdout
        if not diff.strip():
            omitted.append(f"{path} (binário ou sem diff textual)")
            continue
        if len(diff) > AI_DIFF_PER_FILE_BUDGET:
            diff = (
                diff[:AI_DIFF_PER_FILE_BUDGET]
                + f"\n... [diff truncado; arquivo tem {len(diff)} chars de diff]\n"
            )
        if used + len(diff) > AI_DIFF_CHAR_BUDGET:
            omitted.append(f"{path} (fora do orçamento de tamanho)")
            continue
        chunks.append(diff)
        used += len(diff)

    parts = [
        f"Resumo (git diff --cached --stat):\n{stat}",
        f"Arquivos (status\tcaminho):\n{name_status}",
    ]
    if omitted:
        parts.append(
            "Arquivos cujo diff NÃO foi incluído (considere-os apenas pelo nome):\n"
            + "\n".join(f"- {o}" for o in omitted)
        )
    parts.append("Diff das mudanças staged:\n" + "".join(chunks))
    return "\n\n".join(parts)


def _recent_commit_subjects(limit: int = 12) -> str:
    """Assuntos dos últimos commits, como referência de estilo para a IA."""
    result = run_cmd(
        ["git", "log", f"-n{limit}", "--no-merges", "--format=%s"], check=False
    )
    subjects = [
        s for s in result.stdout.splitlines()
        if s.strip() and not RELEASE_NOISE_COMMIT_RE.match(s)
    ]
    return "\n".join(f"- {s}" for s in subjects) or "(sem histórico)"


def _normalize_ai_commit_message(text: str) -> str:
    """Limpa artefatos comuns da resposta da IA: CRLF, aspas envolventes, rótulos
    como 'Mensagem:' e espaços à direita."""
    text = _strip_code_fences(text.replace("\r\n", "\n")).strip()
    for label in ("Mensagem de commit:", "Mensagem:", "Commit message:", "Assunto:"):
        if text.lower().startswith(label.lower()):
            text = text[len(label):].strip()
    quotes = "\"'`"
    # Aspas envolvendo a mensagem inteira...
    if len(text) >= 2 and text[0] == text[-1] and text[0] in quotes:
        text = text[1:-1].strip()
    lines = [line.rstrip() for line in text.splitlines()]
    # ...ou apenas o cabeçalho (primeira linha).
    if lines:
        header = lines[0].strip()
        if len(header) >= 2 and header[0] == header[-1] and header[0] in quotes:
            lines[0] = header[1:-1].strip()
    return "\n".join(lines).strip()


def _conventional_commit_problems(message: str) -> list[str]:
    """Valida a mensagem contra o Conventional Commits. Lista vazia = OK."""
    lines = message.splitlines()
    if not lines or not lines[0].strip():
        return ["mensagem vazia"]
    header = lines[0].strip()
    problems: list[str] = []
    match = CONVENTIONAL_COMMIT_HEADER_RE.match(header)
    if not match:
        problems.append(
            "cabeçalho fora do padrão '<tipo>(<escopo>): <assunto>' "
            f"(tipos: {', '.join(CONVENTIONAL_COMMIT_TYPES)})"
        )
    else:
        subject = match.group("subject")
        if subject.endswith("."):
            problems.append("assunto não deve terminar com ponto final")
        if subject[:1].isupper() and not subject.isupper():
            problems.append("assunto deve começar em minúscula após os dois-pontos")
    if len(header) > COMMIT_SUBJECT_MAX_LEN:
        problems.append(
            f"cabeçalho com {len(header)} caracteres (máximo {COMMIT_SUBJECT_MAX_LEN})"
        )
    if len(lines) > 1 and lines[1].strip():
        problems.append("o corpo deve ser separado do assunto por uma linha em branco")
    return problems


def _generate_commit_message_with_claude(
    staged_context: str, recent_commits: str
) -> str | None:
    """Gera a mensagem COMPLETA de commit (Conventional Commits, pt-BR) a partir
    do diff das mudanças staged: cabeçalho tipo(escopo): assunto, corpo em
    bullets explicando o quê/por quê e rodapé BREAKING CHANGE quando aplicável."""
    prompt = (
        "Você é um engenheiro de software experiente escrevendo a mensagem de commit "
        "das mudanças staged abaixo, no repositório do app desktop ShipIt!.\n\n"
        f"{PROJECT_CONTEXT_FOR_AI}\n\n"
        "FORMATO OBRIGATÓRIO (Conventional Commits):\n"
        "<tipo>(<escopo>): <assunto>\n"
        "\n"
        "<corpo>\n"
        "\n"
        "<rodapé opcional>\n\n"
        "REGRAS:\n"
        f"- tipo: um de {', '.join(CONVENTIONAL_COMMIT_TYPES)}. Escolha pelo efeito "
        "PRINCIPAL da mudança: feat só se há comportamento novo para o usuário; fix só "
        "se corrige um defeito; refactor se não muda comportamento; docs se só toca "
        "documentação; chore para tooling/manutenção; build/ci para empacotamento e "
        "pipeline; test para testes.\n"
        f"- escopo: curto, em minúsculas, nomeando a área afetada (ex.: {COMMIT_SCOPE_HINTS}). "
        "Omita os parênteses se a mudança for transversal.\n"
        "- assunto: em português do Brasil, modo imperativo na 3ª pessoa "
        "(\"adiciona\", \"corrige\", \"remove\", \"permite\"), minúsculo após os "
        f"dois-pontos, sem ponto final, com no máximo {COMMIT_SUBJECT_MAX_LEN} caracteres "
        "contando o prefixo. Deve ser ESPECÍFICO: diga o que mudou e onde; nunca "
        "\"ajustes\", \"atualizações\", \"melhorias\", \"correções diversas\".\n"
        "- corpo: separado do assunto por uma linha em branco; de 2 a 6 bullets \"- \" "
        "com linhas de até 72 caracteres. Cada bullet explica O QUE mudou e POR QUÊ "
        "(motivação, problema resolvido ou impacto). Agrupe por tema. Cite arquivos ou "
        "funções só quando ajudar a localizar a mudança. Se a mudança for trivial "
        "(um arquivo, intenção óbvia), omita o corpo.\n"
        "- mudança incompatível (remove ou renomeia recurso/campo, altera formato de "
        "dados ou schema, exige ação do usuário): acrescente \"!\" logo após o escopo "
        "e um rodapé \"BREAKING CHANGE: <explicação e o que fazer>\".\n"
        "- Um único commit cobre tudo o que está staged; não sugira dividir.\n"
        "- Responda APENAS com a mensagem de commit: sem cercas de código, sem aspas, "
        "sem comentários e sem rótulos como \"Mensagem:\".\n\n"
        "Commits recentes deste repositório (referência de estilo, não copie):\n"
        f"{recent_commits}\n\n"
        "MUDANÇAS STAGED:\n"
        f"{staged_context}"
    )
    raw = _run_claude(prompt)
    return _normalize_ai_commit_message(raw) if raw else None


# --- CHANGELOG (Step 5) ------------------------------------------------------


@dataclass
class ReleaseContext:
    """Fontes usadas para redigir a entrada do CHANGELOG de uma versão."""

    commits_text: str  # lista formatada (assunto + corpo) já sem ruído de release
    commit_count: int
    commit_range: str  # ex.: "v1.14.0..HEAD" ou "últimos 40 commits"
    unreleased: str | None  # corpo da seção [Unreleased], se houver


def _extract_unreleased_block() -> str | None:
    """Corpo da seção '## [Unreleased]' do CHANGELOG (None se ausente/vazia)."""
    content = CHANGELOG_FILE.read_text(encoding="utf-8")
    match = re.search(r"^## \[Unreleased\][^\n]*\n", content, flags=re.MULTILINE)
    if not match:
        return None
    rest = content[match.end():]
    next_section = re.search(r"^## \[", rest, flags=re.MULTILINE)
    body = rest[: next_section.start()] if next_section else rest
    body = body.strip()
    return body or None


def _collect_release_context() -> ReleaseContext:
    """Reúne os commits desde a última tag (assunto + corpo, sem merges nem
    commits de mecânica de release) e a seção [Unreleased] do CHANGELOG."""
    tag_result = run_cmd(["git", "describe", "--tags", "--abbrev=0"], check=False)
    last_tag = tag_result.stdout.strip() if tag_result.returncode == 0 else ""

    # O PR dev → main é mergeado com squash, então os commits do dev nunca são
    # ancestrais da tag e `tag..HEAD` devolveria o histórico inteiro do branch.
    # Selecionamos pela DATA da tag: tudo que foi commitado depois da release.
    tag_date = ""
    if last_tag:
        date_result = run_cmd(
            ["git", "log", "-1", "--format=%cI", last_tag], check=False
        )
        tag_date = date_result.stdout.strip() if date_result.returncode == 0 else ""

    if tag_date:
        selector = f"--since={tag_date}"
        commit_range = f"após {last_tag} ({tag_date[:10]})"
    else:
        selector = f"-n{CHANGELOG_COMMIT_LIMIT}"
        commit_range = f"últimos {CHANGELOG_COMMIT_LIMIT} commits"

    log_result = run_cmd(
        [
            "git", "log", selector, f"-n{CHANGELOG_COMMIT_LIMIT}", "--no-merges",
            "--format=%h%x00%s%x00%b%x1e",
        ],
        check=False,
    )
    entries: list[str] = []
    if log_result.returncode == 0:
        for record in log_result.stdout.split("\x1e"):
            record = record.strip("\n")
            if not record.strip():
                continue
            parts = record.split("\x00", 2)
            if len(parts) < 2:
                continue
            sha, subject = parts[0].strip(), parts[1].strip()
            body = parts[2].strip() if len(parts) > 2 else ""
            if not subject or RELEASE_NOISE_COMMIT_RE.match(subject):
                continue
            entry = f"- {sha} {subject}"
            if body:
                body_lines = [ln.rstrip() for ln in body.splitlines() if ln.strip()][:12]
                entry += "\n" + "\n".join(f"    {ln}" for ln in body_lines)
            entries.append(entry)
            if len(entries) >= CHANGELOG_COMMIT_LIMIT:
                break

    commits_text = "\n".join(entries) if entries else "(nenhum commit relevante encontrado)"
    return ReleaseContext(
        commits_text=commits_text,
        commit_count=len(entries),
        commit_range=commit_range,
        unreleased=_extract_unreleased_block(),
    )


def _generate_changelog_with_claude(version: str, context: ReleaseContext) -> str | None:
    """Gera a entrada do CHANGELOG (Keep a Changelog, pt-BR) voltada ao usuário
    final, a partir da seção [Unreleased] e dos commits desde a última tag."""
    unreleased = context.unreleased or "(vazia — use apenas os commits)"
    prompt = (
        f"Escreva a entrada do CHANGELOG da versão {version} do ShipIt!, em português "
        "do Brasil, para o USUÁRIO FINAL do aplicativo.\n\n"
        f"{PROJECT_CONTEXT_FOR_AI}\n\n"
        "PÚBLICO E TOM: quem lê usa o app no dia a dia e não é desenvolvedor. Explique "
        "o que muda na prática e por que isso é bom, de forma direta, assertiva e "
        "curta. Sem jargão técnico, sem marketing (\"incrível\", \"poderoso\"), sem "
        "\"nós\" e sem tempo futuro.\n\n"
        "ESTRUTURA (Keep a Changelog; seções '### ' nesta ordem, SOMENTE as aplicáveis):\n"
        "- Frase de abertura opcional (texto simples, antes das seções, no máximo 2 "
        "linhas) resumindo o destaque da versão. Inclua apenas se houver um destaque "
        "claro; caso contrário, omita.\n"
        "### Adicionado — novidades que o usuário passa a poder fazer.\n"
        "### Alterado — mudanças de comportamento em recursos já existentes.\n"
        "### Corrigido — defeitos resolvidos; descreva o sintoma que o usuário via.\n"
        "### Removido — o que deixou de existir e, se for o caso, o que fazer.\n"
        "### Descontinuado — recursos que ainda existem mas serão removidos.\n"
        "### Segurança — correções de segurança.\n"
        "### Atenção — APENAS se houver ação obrigatória do usuário ou aviso importante "
        "(ex.: precisa instalar a versão X antes desta; dados são convertidos; novo "
        "requisito de sistema). No máximo 2 bullets, claros sobre o que fazer.\n\n"
        "REGRAS DOS BULLETS:\n"
        "- Cada bullet começa com um título curto em negrito seguido de ponto "
        "(\"**Título.**\") e 1 a 2 frases explicando o que muda para o usuário e o "
        "benefício. Exemplo: \"- **Filtro por ambiente na lista de atividades.** "
        "Mostra só o que foi publicado em Homologação ou Produção, sem percorrer a "
        "lista inteira.\"\n"
        "- Agrupe mudanças relacionadas em um único bullet; prefira poucos bullets "
        "completos a muitos fragmentados (de 1 a 6 por seção).\n"
        "- Nomeie telas, campos e botões como aparecem na interface (ex.: "
        "\"Configurações\", \"Atividades\", \"Relatório DOCX\").\n"
        "- PROIBIDO citar detalhes exclusivos de desenvolvimento: nomes de arquivos, "
        "funções, componentes, entidades, colunas, handlers IPC, migrações, testes, "
        "CI/CD, refactors, dependências, planos numerados ou hashes de commit.\n"
        "- Commits puramente internos (refactor, testes, docs de desenvolvimento, "
        "tooling, release) NÃO geram bullet — salvo quando têm efeito perceptível "
        "para o usuário (ex.: o app abre mais rápido).\n"
        "- Não invente funcionalidades: use apenas o que está nas fontes. Em caso de "
        "ambiguidade, descreva o efeito mais provável de forma conservadora.\n\n"
        "SAÍDA: apenas as seções markdown (e a frase de abertura, se houver). Sem o "
        f"cabeçalho de versão '## [{version}]', sem texto antes/depois e sem cercas "
        "de código.\n\n"
        "FONTES:\n"
        "[1] Seção [Unreleased] do CHANGELOG — já curada; é a FONTE PRINCIPAL. "
        "Preserve o sentido, melhore a redação para o usuário final e remova os "
        "detalhes técnicos:\n"
        f"{unreleased}\n\n"
        f"[2] Commits desde a última versão publicada ({context.commit_range}):\n"
        f"{context.commits_text}"
    )
    return _run_claude(prompt)


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


COMMIT_EDITOR_HINTS = [
    "Formato: <tipo>(<escopo>): <assunto>   (Conventional Commits, pt-BR, imperativo)",
    f"Tipos: {', '.join(CONVENTIONAL_COMMIT_TYPES)}",
    f"Assunto com até {COMMIT_SUBJECT_MAX_LEN} caracteres, sem ponto final; corpo após uma linha em branco.",
    "Linhas iniciadas com '#' são ignoradas. Salve e feche o editor para confirmar.",
]


def _prompt_commit_message(default_msg: str) -> str | None:
    """Fluxo manual da mensagem de commit: editor externo com template; se o
    editor não abrir, uma linha no terminal. Retorna None se cancelado."""
    edited = _edit_text_in_editor(default_msg, COMMIT_EDITOR_HINTS, suffix=".txt")
    if edited:
        return edited
    print_warning("Editor não retornou conteúdo. Informe a mensagem no terminal.")
    try:
        entered = input(
            f"{_c(Colors.YELLOW, '❯')} Mensagem do commit [{default_msg}]: "
        ).strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return None
    return entered or default_msg


def _review_commit_message(message: str) -> bool:
    """Mostra a mensagem e os problemas de formato; True se pode commitar."""
    print()
    print_info("Mensagem de commit:")
    _print_block(message)
    print()
    problems = _conventional_commit_problems(message)
    if not problems:
        return True
    print_warning("Mensagem fora do padrão Conventional Commits:")
    for p in problems:
        print(f"  - {p}")
    return False


def do_commit(dry_run: bool) -> None:
    """Commita as mudanças pendentes com mensagem no padrão Conventional Commits.

    Com o Claude CLI disponível, a mensagem completa (assunto + corpo) é gerada a
    partir do diff real das mudanças e pode ser aceita, editada ou regerada.
    Sem IA, abre o editor com um template; a mensagem é sempre validada."""
    print_header("Step 2-3/13 — Commit de Mudanças Pendentes")

    if not has_uncommitted_changes():
        print_success("Nenhuma mudança pendente. Pulando commit.")
        return

    print_step("Mudanças detectadas:")
    result = run_cmd(["git", "status", "--short"])
    for line in result.stdout.strip().splitlines():
        print(f"  {line}")

    if dry_run:
        print_dry_run("Faria git add -A && git commit (mensagem Conventional Commits)")
        return

    # Stage tudo
    run_cmd(["git", "add", "-A"])

    default_msg = "chore(release): prepara publicação da versão"
    message: str | None = None

    if _ai_available():
        staged_context = _collect_staged_diff_for_ai()
        recent = _recent_commit_subjects()
        while message is None:
            print_step("Gerando mensagem de commit com o Claude CLI (a partir do diff)...")
            suggestion = _generate_commit_message_with_claude(staged_context, recent)
            if not suggestion:
                print_warning("A IA não retornou conteúdo. Caindo para o fluxo manual.")
                break
            _review_commit_message(suggestion)
            try:
                choice = (
                    input(
                        f"{_c(Colors.YELLOW, '❯')} Usar esta mensagem? "
                        f"[s=sim / e=editar / r=regerar / m=manual / a=abortar] (padrão: s): "
                    )
                    .strip()
                    .lower()
                    or "s"
                )
            except (EOFError, KeyboardInterrupt):
                print()
                print_error("Commit cancelado.")
                sys.exit(1)
            if choice == "s":
                message = suggestion
            elif choice == "e":
                message = _edit_text_in_editor(
                    suggestion, COMMIT_EDITOR_HINTS, suffix=".txt"
                )
                if not message:
                    print_warning("Editor não retornou conteúdo.")
            elif choice == "r":
                continue
            elif choice == "m":
                default_msg = suggestion.splitlines()[0]
                break
            elif choice == "a":
                print_error("Commit cancelado pelo usuário.")
                sys.exit(1)
            else:
                print_warning("Opção inválida.")

    if message is None:
        message = _prompt_commit_message(default_msg)
        if message is None:
            print_error("Commit cancelado.")
            sys.exit(1)

    # Validação final: fora do padrão só commita com confirmação explícita.
    while not _review_commit_message(message):
        if confirm("Commitar mesmo assim?", default="n"):
            break
        message = _edit_text_in_editor(message, COMMIT_EDITOR_HINTS, suffix=".txt")
        if not message:
            print_error("Commit cancelado.")
            sys.exit(1)

    # `-F` preserva assunto + corpo + rodapé exatamente como revisados.
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    )
    try:
        tmp.write(message.rstrip() + "\n")
        tmp.close()
        run_cmd(["git", "commit", "-F", tmp.name])
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
    print_success(f"Commit realizado: {message.splitlines()[0]}")


# ================================================================================================
# Step 4: Atualizar CHANGELOG.md com IA
# ================================================================================================


CHANGELOG_EDITOR_TEMPLATE = (
    "### Adicionado\n"
    "- **Título curto.** O que muda para o usuário e o benefício.\n"
    "\n"
    "### Alterado\n"
    "- \n"
    "\n"
    "### Corrigido\n"
    "- \n"
    "\n"
    "### Removido\n"
    "- \n"
    "\n"
    "### Atenção\n"
    "- \n"
)
CHANGELOG_EDITOR_HINTS = [
    "Escreva para o USUÁRIO FINAL: o que muda na prática, sem detalhes de desenvolvimento.",
    "Remova as seções não aplicáveis. 'Atenção' só quando o usuário precisa fazer algo.",
    "Linhas iniciadas com '#' (exceto headings '###') são ignoradas. Salve e feche para confirmar.",
]


def _collect_changelog_via_editor(initial: str | None = None) -> str | None:
    """Abre o editor externo com o texto gerado pela IA (para revisão) ou com o
    template de seções. Retorna None se o editor não abrir ou ficar vazio."""
    return _edit_text_in_editor(
        initial or CHANGELOG_EDITOR_TEMPLATE,
        CHANGELOG_EDITOR_HINTS,
        suffix=".md",
        keep_hash_prefixes=("###",),
    )


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


def _prompt_changelog_fallback(version: str, context: ReleaseContext) -> str:
    """UX de criação da entrada do CHANGELOG: IA (Claude CLI), editor, inline ou abortar."""
    print()
    if context.unreleased:
        print_info("Seção [Unreleased] do CHANGELOG (fonte principal):")
        _print_block(context.unreleased)
        print()
    else:
        print_warning("Seção [Unreleased] vazia — a entrada será baseada só nos commits.")
    print_info(
        f"Commits considerados ({context.commit_range}, {context.commit_count} relevantes):"
    )
    subject_lines = [ln for ln in context.commits_text.splitlines() if ln.startswith("- ")]
    for line in subject_lines[:20]:
        print(f"  {line}")
    if len(subject_lines) > 20:
        print(f"  ... (+{len(subject_lines) - 20} commits)")
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
            generated = _generate_changelog_with_claude(version, context)
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

    # Fontes: seção [Unreleased] (curada no Doc Sync) + commits desde a última tag,
    # com assunto e corpo, já sem os commits de mecânica de release.
    # Em geral, o changelog já foi preparado antes e o script roda com --skip-changelog.
    context = _collect_release_context()
    changelog_entry = _prompt_changelog_fallback(version, context)

    # Montar nova seção
    new_section = f"\n{section_header}\n\n{changelog_entry}\n"

    # Ao publicar, o conteúdo de [Unreleased] passa a pertencer à versão
    # (Keep a Changelog); a seção é esvaziada para não duplicar o texto.
    move_unreleased = bool(context.unreleased) and confirm(
        "Esvaziar a seção [Unreleased] (conteúdo incorporado à versão)?", default="s"
    )

    if dry_run:
        print_dry_run(f"Inseriria no CHANGELOG:\n{new_section}")
        if move_unreleased:
            print_dry_run("Esvaziaria a seção [Unreleased].")
        return

    # Inserir após a seção "## [Unreleased]" ou após o cabeçalho
    marker_match = re.search(
        r"^## \[Unreleased\][^\n]*\n", changelog_content, flags=re.MULTILINE
    )
    if marker_match:
        head = changelog_content[: marker_match.end()].rstrip("\n")
        rest = changelog_content[marker_match.end() :]
        next_section_match = re.search(r"^## \[", rest, flags=re.MULTILINE)
        if next_section_match:
            unreleased_body = rest[: next_section_match.start()]
            tail = rest[next_section_match.start() :]
        else:
            unreleased_body = rest
            tail = ""
        if not move_unreleased and unreleased_body.strip():
            head = head + "\n\n" + unreleased_body.strip()
        updated = head + "\n" + new_section + ("\n" + tail if tail else "")
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
            - Atualização geral do aplicativo para esta versão.
            - Consulte o CHANGELOG para a lista completa de mudanças.
            """
        ).strip()

    # O bloco do CHANGELOG já é escrito para o usuário final (Step 5); nenhum
    # parágrafo genérico é acrescentado para não diluir o conteúdo.
    return "\n\n".join(
        [
            release_title,
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
