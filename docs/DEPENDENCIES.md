# 📦 Dependências do Projeto ShipIt!

> Última atualização: 07/04/2026

## Requisitos do Sistema

| Requisito  | Versão Mínima | Recomendada       |
| ---------- | ------------- | ----------------- |
| Node.js    | >= 24.0.0     | 24.14.1 LTS      |
| npm        | >= 11.0.0     | (incluso no Node) |

---

## Dependências de Produção

| Pacote                          | Versão   | Finalidade                                                              |
| ------------------------------- | -------- | ----------------------------------------------------------------------- |
| `electron`                      | 41.1.1   | Framework desktop multiplataforma (Windows, macOS, Linux).              |
| `react`                         | 19.2.4   | Biblioteca de UI para construção da interface.                          |
| `react-dom`                     | 19.2.4   | Renderização React no DOM.                                              |
| `react-router-dom`              | 7.14.0   | Roteamento SPA entre as telas do aplicativo.                            |
| `typeorm`                       | 0.3.28   | ORM para modelagem e acesso ao banco de dados SQLite.                   |
| `better-sqlite3`                | 12.8.0   | Driver SQLite nativo de alta performance para Node.js.                  |
| `uuid`                          | 13.0.0   | Geração de identificadores únicos (UUID v7) para entidades.             |
| `@fortawesome/fontawesome-free` | 7.2.0    | Ícones vetoriais para toda a interface, instalados localmente via npm.  |

## Dependências de Desenvolvimento

| Pacote                   | Versão   | Finalidade                                                        |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `typescript`             | 6.0.2    | Superset tipado de JavaScript para todo o código do projeto.      |
| `vite`                   | 8.0.5    | Bundler e dev server ultrarrápido para o frontend React.          |
| `@vitejs/plugin-react`   | 6.0.1    | Plugin Vite para suporte a JSX/TSX e Fast Refresh.                |
| `tailwindcss`            | 4.2.2    | Framework CSS utility-first v4 com suporte a temas via variáveis. |
| `@tailwindcss/vite`      | 4.2.2    | Plugin Vite oficial do Tailwind CSS v4.                           |
| `electron-builder`       | 26.8.1   | Empacotamento e distribuição do app (.exe, .dmg, .AppImage).      |
| `concurrently`           | 9.2.1    | Executa Vite e Electron em paralelo durante o desenvolvimento.    |
| `wait-on`                | 9.0.4    | Aguarda o Vite iniciar antes de lançar o Electron no modo dev.    |
| `@types/react`           | 19.2.14  | Tipagens TypeScript para React.                                   |
| `@types/react-dom`       | 19.2.3   | Tipagens TypeScript para React DOM.                               |
| `@types/better-sqlite3`  | 7.6.13   | Tipagens TypeScript para better-sqlite3.                          |
| `@types/uuid`            | 10.0.0   | Tipagens TypeScript para uuid.                                    |

---

## Stack Resumida

```
Electron 41  →  Janela desktop + System Tray + IPC
React 19     →  Interface do usuário (SPA)
Vite 8       →  Build & dev server
Tailwind 4   →  Estilização (CSS variables + dark/light mode)
TypeORM      →  ORM para banco de dados
SQLite       →  Banco de dados local (via better-sqlite3)
TypeScript 6 →  Tipagem estática
Font Awesome →  Ícones (offline, via npm)
```

## Notas Importantes

- **Todas as dependências são instaladas localmente via npm** e incluídas no bundle final, garantindo funcionamento 100% offline.
- **Nenhum CDN ou link externo** é utilizado para carregar fontes, ícones ou estilos.
- **Tailwind CSS v4** usa o padrão `@theme inline` com variáveis CSS — não existe arquivo `tailwind.config.ts`.
- **TypeScript 6.x** requer `"ignoreDeprecations": "6.0"` no `tsconfig.electron.json` para usar `moduleResolution: "node10"` (necessário para TypeORM com CommonJS).
- **Electron** deve ser listado em `dependencies` (não `devDependencies`) para que o `electron-builder` o empacote corretamente.
