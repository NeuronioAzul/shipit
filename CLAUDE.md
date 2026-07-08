# CLAUDE.md — ShipIt!

Guia para o Claude Code trabalhar neste projeto. Este arquivo é carregado automaticamente em toda sessão — ele resume **o essencial e as regras que não podem ser quebradas**. Para o panorama técnico completo (IPC, entidades, rotas, temas, decisões), veja [docs/ARCHITECTURE.md](<docs/ARCHITECTURE.md>).

## O que é

App **desktop Electron** (não é web) que registra atividades de engenharia e gera **relatórios DOCX** no padrão institucional do MEC. Versão atual: **1.11.0**.

## Stack

Electron 41 (CommonJS) · React 19 + React Router 7 (HashRouter) · Vite 8 · Tailwind v4 (`@theme inline`, **sem arquivo de config**) · TypeORM 0.3 + better-sqlite3 · TypeScript 6 strict · DOCX via JSZip + `@xmldom/xmldom` + xpath.

**Não usa** (não sugira nem instale): Next.js, shadcn/ui, Postgres/MySQL, nenhum backend de API/servidor HTTP.

## Comandos

```bash
npm run dev       # Vite + Electron (concurrently)
npm run build     # tsc → vite build → tsc electron
npm run test      # Vitest (unit/integração)
npm run test:e2e  # Playwright E2E
npm run dist      # build + electron-builder
```

Requer **Node ≥ 24** e **npm ≥ 11**. `postinstall` recompila o `better-sqlite3` nativo.

## Regras invioláveis

- **Segurança Electron**: `contextIsolation: true`, `nodeIntegration: false` — **nunca mudar**. O renderer só fala com o main via IPC com prefixos `db:` / `app:` / `window:`.
- **Arquivos locais**: servir evidências/sons via protocolos `shipit-evidence://` e `shipit-sfx://`. `file://` direto é bloqueado.
- **Idioma**: textos de UI e comentários em **pt-BR**; identificadores de código em **inglês**.
- **Tailwind**: usar tokens de variável CSS (`bg-background`, `text-foreground`, `bg-primary`) — **nunca** cores cruas.
- **Dois processos TypeScript**: `src/` (ESNext, `tsconfig.json`, alias `@/*`) e `electron/` (CommonJS, `tsconfig.electron.json`). Não misturar.
- **Fallback browser**: quando `window.electronAPI` não existe (dev no browser), componentes caem para `localStorage` via `src/services/localDb.ts`. Sempre checar disponibilidade antes de chamar IPC.

## Onde mexer (mapa rápido)

| Tarefa | Arquivos |
|---|---|
| Novo handler IPC | `electron/main.ts` (registra) + `electron/preload.ts` (expõe) + `src/vite-env.d.ts` (tipa) |
| Nova entidade | `electron/entities/` (uma por arquivo, UUID v7) |
| Nova página | `src/pages/` + rota em `src/App.tsx`; componente reusável → `src/components/` |
| Novo tema | `src/themes/themes.ts` (registro) + `src/themes/themes.css` (paleta) |
| Geração DOCX | `electron/report-generator.ts` |
| Teste | `*.test.ts` colocado ao lado do fonte; E2E em `e2e/` (usa `sql.js` in-memory) |

## Gotchas (erros recorrentes)

- **TS 6 + CommonJS**: `tsconfig.electron.json` precisa de `"ignoreDeprecations": "6.0"` para o module resolution `node10`.
- **Asar paths**: caminhos de ícones/assets precisam considerar empacotamento asar (`process.resourcesPath` vs `__dirname`).
- **better-sqlite3**: módulo nativo — recompilado pelo `postinstall` após `npm install`.
- **Tailwind v4**: não existe `tailwind.config.ts`; todo o tema é via `@theme inline` em `src/index.css`.
- **`synchronize: true`** no TypeORM: schema auto-atualiza pelas entidades (modo dev). Cuidado ao alterar entidades.

## Convenções

- Componentes/páginas em PascalCase (`HomePage.tsx`). Páginas em `src/pages/`, reutilizáveis em `src/components/`, contextos em `src/contexts/`.
- Uma entidade por arquivo em `electron/entities/`; exporte os enums relacionados do próprio arquivo da entidade.
- Handlers IPC registrados em `electron/main.ts` no startup, sempre com prefixo (`db:`/`app:`/`window:`).
- Padrão de formulário: interface tipada para o estado, `useEffect` para carregar, handler para salvar via IPC.
- Soft-delete de evidências via `deleted_at`; lixeira limpa automaticamente após 3 meses.

## Documentação e tarefas — três arquivos, papéis distintos

**Respeite a separação:**

| Arquivo | Papel |
|---|---|
| [docs/coisas para fazer e publicar.md](<docs/coisas para fazer e publicar.md>) | **Rascunho** livre — anota tudo aqui primeiro, sem formatação |
| [docs/TODO.md](<docs/TODO.md>) | Só **tarefas reais pendentes** (curadas a partir do rascunho) |
| [docs/DONE.md](<docs/DONE.md>) | **Histórico** do que foi concluído, por fase/versão |
| [CHANGELOG.md](<CHANGELOG.md>) | Mudanças por versão (Keep a Changelog, pt-BR, mais novo no topo) |

Ao concluir uma tarefa: marque/remova do TODO → registre em DONE com a versão. Não copie o rascunho inteiro para o TODO.

## Release e sincronização de docs

**Regra:** sempre que **terminar uma feature/fix/refactor**, **publicar uma versão**, ou o usuário pedir para **atualizar/sincronizar a documentação** (CHANGELOG, TODO, DONE, ARCHITECTURE) — mesmo com frases como "atualiza os docs", "doc sync", "registra a mudança", "terminei, atualiza tudo", "fazer release" — **invoque a skill `shipit-release-and-doc-sync`** (via a ferramenta Skill) **antes** de editar os docs manualmente. Ela tem dois modos (Doc Sync e Release); na dúvida, pergunte qual.

O release é automatizado por [docs/scripts/release_v2.py](<docs/scripts/release_v2.py>) (interativo, faz operações de rede — confirme antes de disparar).

## Detalhes completos

- Arquitetura, IPC, entidades, temas, decisões → [docs/ARCHITECTURE.md](<docs/ARCHITECTURE.md>)
- Setup de desenvolvimento → [docs/DEVELOPMENT.md](<docs/DEVELOPMENT.md>)
- Dependências → [docs/DEPENDENCIES.md](<docs/DEPENDENCIES.md>)
- Playbook de auditoria/sincronização documental → [docs/plans/plan-documentationUpdate.prompt.md](<docs/plans/plan-documentationUpdate.prompt.md>)
