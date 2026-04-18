# 📦 Dependências do Projeto ShipIt!

> Última atualização: 18/04/2026

## Requisitos do Sistema

| Requisito  | Versão Mínima | Recomendada       |
| ---------- | ------------- | ----------------- |
| Node.js    | >= 24.0.0     | 24.14.1 LTS      |
| npm        | >= 11.0.0     | (incluso no Node) |

---

## Dependências de Produção

| Pacote                          | Versão   | Finalidade                                                              |
| ------------------------------- | -------- | ----------------------------------------------------------------------- |
| `@dnd-kit/core`                 | 6.3.1    | Core do sistema de drag & drop para reordenação de atividades e evidências. |
| `@dnd-kit/sortable`             | 10.0.0   | Preset sortable do dnd-kit para listas reordenáveis.                    |
| `@dnd-kit/utilities`            | 3.2.2    | Utilitários CSS para transforms de drag & drop.                         |
| `@fortawesome/fontawesome-free` | 7.2.0    | Ícones vetoriais para toda a interface, instalados localmente via npm.  |
| `@tiptap/extension-character-count` | 3.22.3 | Extensão TipTap para contagem de caracteres em evidências de texto.   |
| `@tiptap/extension-placeholder` | 3.22.3   | Extensão TipTap para placeholder no editor de texto.                    |
| `@tiptap/react`                 | 3.22.3   | Integração React do editor rich-text TipTap (evidências de texto).      |
| `@tiptap/starter-kit`           | 3.22.3   | Kit inicial TipTap com extensões essenciais (bold, italic, lists, etc.).|
| `@xmldom/xmldom`                | 0.9.9    | Parser DOM XML para manipulação do template OpenXML (DOCX).             |
| `better-sqlite3`               | 12.8.0   | Driver SQLite nativo de alta performance para Node.js.                  |
| `electron-updater`              | 6.8.3    | Auto-update via GitHub Releases com suporte a delta updates.            |
| `jszip`                         | 3.10.1   | Leitura e escrita de arquivos ZIP (DOCX = ZIP com XMLs).                |
| `react`                         | 19.2.4   | Biblioteca de UI para construção da interface.                          |
| `react-dom`                     | 19.2.4   | Renderização React no DOM.                                              |
| `react-router-dom`              | 7.14.0   | Roteamento SPA entre as telas do aplicativo.                            |
| `reflect-metadata`              | 0.2.2    | Polyfill de metadata reflection requerido pelo TypeORM.                 |
| `sonner`                        | 2.0.7    | Toasts não-bloqueantes para notificações na interface.                  |
| `typeorm`                       | 0.3.28   | ORM para modelagem e acesso ao banco de dados SQLite.                   |
| `uuid`                          | 13.0.0   | Geração de identificadores únicos (UUID v7) para entidades.             |
| `xpath`                         | 0.0.34   | Queries XPath para navegação no DOM XML do template DOCX.               |
| `yet-another-react-lightbox`    | 3.31.0   | Lightbox React para visualização de imagens em tela cheia.              |

## Dependências de Desenvolvimento

| Pacote                   | Versão   | Finalidade                                                        |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `@playwright/test`       | 1.59.1   | Framework de testes E2E para Electron (4 cenários).               |
| `@tailwindcss/vite`      | 4.2.2    | Plugin Vite oficial do Tailwind CSS v4.                           |
| `@types/better-sqlite3`  | 7.6.13   | Tipagens TypeScript para better-sqlite3.                          |
| `@types/react`           | 19.2.14  | Tipagens TypeScript para React.                                   |
| `@types/react-dom`       | 19.2.3   | Tipagens TypeScript para React DOM.                               |
| `@types/uuid`            | 10.0.0   | Tipagens TypeScript para uuid.                                    |
| `@vitejs/plugin-react`   | 6.0.1    | Plugin Vite para suporte a JSX/TSX e Fast Refresh.                |
| `concurrently`           | 9.2.1    | Executa Vite e Electron em paralelo durante o desenvolvimento.    |
| `electron`               | 41.1.1   | Framework desktop multiplataforma (Windows, macOS, Linux).        |
| `electron-builder`       | 26.8.1   | Empacotamento e distribuição do app (.exe, .dmg, .AppImage).      |
| `electron-playwright-helpers` | 2.1.0 | Helpers para testes Playwright com Electron.                    |
| `sql.js`                 | 1.14.1   | SQLite puro em JavaScript para testes sem native modules.         |
| `tailwindcss`            | 4.2.2    | Framework CSS utility-first v4 com suporte a temas via variáveis. |
| `typescript`             | 6.0.2    | Superset tipado de JavaScript para todo o código do projeto.      |
| `vite`                   | 8.0.5    | Bundler e dev server ultrarrápido para o frontend React.          |
| `vitest`                 | 4.1.3    | Test runner rápido compatível com Vite (70 testes).               |
| `wait-on`                | 9.0.4    | Aguarda o Vite iniciar antes de lançar o Electron no modo dev.    |

---

## Stack Resumida

```
Electron 41  →  Janela desktop + System Tray + IPC
React 19     →  Interface do usuário (SPA)
Vite 8       →  Build & dev server
Tailwind 4   →  Estilização (CSS variables + 11 temas)
TypeORM      →  ORM para banco de dados
SQLite       →  Banco de dados local (via better-sqlite3)
TypeScript 6 →  Tipagem estática
Font Awesome →  Ícones (offline, via npm)
TipTap       →  Editor rich-text (evidências de texto)
dnd-kit      →  Drag & drop (reordenação)
JSZip        →  Geração de relatórios DOCX
sonner       →  Toasts/notificações na UI
Vitest       →  Testes unitários e integração (70 testes)
Playwright   →  Testes E2E (4 cenários)
```

## Notas Importantes

- **Todas as dependências são instaladas localmente via npm** e incluídas no bundle final, garantindo funcionamento 100% offline.
- **Nenhum CDN ou link externo** é utilizado para carregar fontes, ícones ou estilos.
- **Tailwind CSS v4** usa o padrão `@theme inline` com variáveis CSS — não existe arquivo `tailwind.config.ts`.
- **TypeScript 6.x** requer `"ignoreDeprecations": "6.0"` no `tsconfig.electron.json` para usar `moduleResolution: "node10"` (necessário para TypeORM com CommonJS).
- **Electron** está em `devDependencies` — o `electron-builder` empacota o runtime automaticamente independente da seção.
