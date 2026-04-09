# Contribuindo com o ShipIt!

Obrigado pelo interesse em contribuir! Este guia descreve como configurar o ambiente, fazer alterações e submeter contribuições.

---

## Pré-requisitos

| Requisito | Versão |
|-----------|--------|
| Node.js   | ≥ 24.0 |
| npm       | ≥ 11.0 |
| Git       | ≥ 2.x  |

---

## Setup do Ambiente

```bash
# 1. Fork e clone
git clone https://github.com/<seu-usuario>/shipit.git
cd shipit

# 2. Instale as dependências
npm install
# O postinstall compila os módulos nativos (better-sqlite3) automaticamente

# 3. Inicie em modo dev
npm run dev
```

O Vite inicia na porta `5173` e o Electron abre automaticamente. Hot Module Replacement (HMR) está habilitado para o frontend React.

---

## Estrutura do Projeto

```
electron/          → Processo principal (CommonJS, tsconfig.electron.json)
  ├── main.ts      → Lifecycle, IPC handlers, System Tray
  ├── database.ts  → DataSource, CRUD
  ├── preload.ts   → contextBridge
  └── entities/    → Entidades TypeORM

src/               → Renderer / Frontend (ESNext, tsconfig.json)
  ├── pages/       → Componentes de página (uma por rota)
  ├── components/  → Componentes reutilizáveis
  ├── contexts/    → React Contexts (ThemeContext)
  ├── services/    → Serviços auxiliares (localDb para fallback)
  └── utils/       → Utilitários (validação)
```

---

## Convenções de Código

### Geral
- **Linguagem do código**: identificadores em inglês
- **Linguagem da UI**: português (pt-BR)
- **TypeScript strict mode** em todo o projeto

### Nomeação
- **Componentes React**: PascalCase (`HomePage.tsx`, `AppLayout.tsx`)
- **Entidades**: um arquivo por entidade em `electron/entities/`
- **IPC handlers**: prefixados com `db:` (banco) ou `app:` (funcionalidades)

### Estilização
- Tailwind CSS v4 com `@theme inline` — **não** existe `tailwind.config.ts`
- Use tokens CSS: `bg-background`, `text-foreground`, `bg-primary` — nunca cores raw
- Variáveis definidas em `src/index.css`

### Electron
- Todos os IPC handlers registrados em `electron/main.ts`
- Sempre usar `ipcRenderer.invoke` / `ipcMain.handle` (padrão async)
- **Nunca** alterar `contextIsolation: true` ou `nodeIntegration: false`

---

## Fluxo de Trabalho

### 1. Crie uma branch

```bash
git checkout -b feat/nome-da-feature
# ou
git checkout -b fix/descricao-do-bug
```

### 2. Faça suas alterações

- Edite os arquivos necessários
- Verifique o build:
  ```bash
  npm run build
  ```
- Teste manualmente no modo dev:
  ```bash
  npm run dev
  ```

### 3. Commit

Use mensagens de commit descritivas em português ou inglês:

```
feat: adiciona seletor de som para notificações
fix: corrige reprodução de áudio no Settings
refactor: separa lógica de validação em módulo
```

### 4. Pull Request

- Abra um PR para a branch `main`
- Descreva o que foi alterado e por quê
- Inclua screenshots se houver mudanças visuais

---

## Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server + Electron |
| `npm run build` | Compila tudo (checa erros TS) |
| `npm run dist` | Build + empacotamento |
| `npx tsc -p tsconfig.electron.json` | Compila só o electron |
| `npx vite build` | Compila só o renderer |

---

## Adicionando uma Nova Entidade

1. Crie o arquivo em `electron/entities/NomeEntidade.ts` com decorators TypeORM
2. Importe e adicione ao array `entities` em `electron/database.ts`
3. Crie as funções CRUD em `database.ts`
4. Registre os IPC handlers em `main.ts`
5. Adicione os métodos ao `preload.ts`
6. Defina o tipo em `src/vite-env.d.ts`

---

## Adicionando uma Nova Página

1. Crie o componente em `src/pages/NomePage.tsx`
2. Adicione a rota em `src/App.tsx` dentro de `<Route element={<AppLayout />}>`
3. Se necessário, adicione navegação no `Header.tsx` ou em outras páginas

---

## Problemas Conhecidos

- **TypeScript 6.x + CommonJS**: `tsconfig.electron.json` precisa de `"ignoreDeprecations": "6.0"` para `node10` module resolution
- **Tailwind v4**: Toda configuração de tema é via `@theme inline` no CSS, não existe config JS
- **Electron rebuild**: O `postinstall` recompila `better-sqlite3` para o Electron
- **Porta 5173 em uso**: Se o dev server não iniciar, verifique se há outra instância rodando

---

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma [licença ISC](../LICENSE) do projeto.
