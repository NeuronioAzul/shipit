# Arquitetura do ShipIt

> Documento técnico detalhando a arquitetura, decisões de design e fluxos internos do aplicativo.

---

## Visão Geral

O ShipIt! segue a arquitetura padrão do Electron com separação estrita entre **processo principal** (main) e **processo de renderização** (renderer), comunicando-se exclusivamente via IPC.

```text
┌──────────────────────────────────────────────────────────────┐
│                      Electron Shell                          │
│                                                              │
│  ┌──────────────────┐  contextBridge  ┌───────────────────┐  │
│  │   Main Process   │◄───────────────►│    Renderer       │  │
│  │   (Node.js)      │   IPC invoke/   │    (React SPA)    │  │
│  │                  │   handle        │                   │  │
│  │  ├─ main.ts      │                 │  ├─ App.tsx       │  │
│  │  ├─ database.ts  │                 │  ├─ pages/        │  │
│  │  ├─ report-gen.  │                 │  ├─ components/   │  │
│  │  └─ entities/    │                 │  ├─ contexts/     │  │
│  │                  │                 │  └─ services/     │  │
│  └──────────────────┘                 └───────────────────┘  │
│           │                                     │            │
│           ▼                                     ▼            │
│     ┌──────────┐                        ┌───────────────┐    │
│     │  SQLite  │                        │  localStorage │    │
│     │ shipit.db│                        │  (theme, etc) │    │
│     └──────────┘                        └───────────────┘    │
│           │                                                  │
│           ▼                                                  │
│    ┌──────────────┐                                          │
│    │ settings.json│                                          │
│    │ (userData)   │                                          │
│    └──────────────┘                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Processo Principal (`electron/`)

### `main.ts` — Lifecycle e IPC

Responsável por:

- **Janela principal**: `BrowserWindow` com `contextIsolation: true` e `nodeIntegration: false`
- **System Tray**: ícone com menu de contexto e ícones de status (padrão/verde/amarelo/vermelho)
- **Protocolos customizados**: `shipit-evidence://` e `shipit-sfx://` para servir arquivos com segurança
- **IPC Handlers**: ~25 handlers organizados por prefixo

#### Prefixos IPC

| Prefixo | Escopo                 | Exemplos                                                   |
|---------|------------------------|------------------------------------------------------------|
| `db:`   | Banco de dados (CRUD)  | `db:getUserProfile`, `db:saveActivity`, `db:getReports`    |
| `app:`  | Funcionalidades do app | `app:getVersion`, `app:generateReport`, `app:selectImages` |

#### Handlers registrados

```text
db:getUserProfile          db:saveUserProfile
db:getActivities           db:getActivity
db:saveActivity            db:deleteActivity
db:reorderActivities       db:saveEvidence
db:saveEvidenceFromBuffer  db:updateEvidenceCaption
db:deleteEvidence          db:getEvidenceFilePath
db:getReports

app:getVersion             app:selectImages
app:setTrayStatus          app:generateReport
app:openFileInFolder       app:getSettings
app:saveSettings           app:selectDirectory
app:getDefaultReportsDir   app:listSounds
app:getSoundPath           app:playSound
app:getAutoLaunch          app:setAutoLaunch
```

### `database.ts` — Acesso a Dados

- **DataSource singleton** inicializado lazily via `getDb()`
- Banco SQLite em `{userData}/shipit.db`
- `synchronize: true` — schema auto-atualiza a partir das entidades (modo dev)
- Funções exportadas: CRUD para todas as entidades, `getReportPayload()` para o gerador

### `report-generator.ts` — Motor DOCX

Gera relatórios DOCX manipulando diretamente o XML do template OpenXML:

1. Carrega o template `.docx` (é um ZIP com XMLs internos)
2. Substitui placeholders no `document.xml` (nome, cargo, contrato, mês, etc.)
3. Monta **Encarte A**: tabela de atividades agrupada por `project_scope`
4. Monta **Encarte B**: uma página por evidência com imagem + legenda + bookmark
5. Insere campos PAGEREF para referência cruzada de páginas
6. Atualiza `[Content_Types].xml` com os tipos MIME das imagens
7. Salva o DOCX na pasta configurada ou padrão (`userData/reports/`)

**Bibliotecas usadas**: `jszip` (ZIP), `@xmldom/xmldom` (DOM XML), `xpath` (queries XPath)

### `preload.ts` — Context Bridge

Expõe `window.electronAPI` com métodos tipados que chamam `ipcRenderer.invoke()`. Nenhuma API do Node.js é exposta diretamente ao renderer.

### `entities/` — Modelo de Dados

| Entidade | Tabela | PK | Descrição |
| ---------- | -------- | ----- | ----------- |
| `UserProfile` | `user_profile` | Auto-increment | Perfil do usuário (cargo, contrato, etc.) |
| `Alert` | `alerts` | Auto-increment | Configuração de alertas (1:1 com UserProfile) |
| `Activity` | `activities` | UUID v7 | Atividade registrada com período e status |
| `Evidence` | `evidences` | UUID v7 | Evidência (print) vinculada a uma atividade |
| `Report` | `reports` | UUID v7 | Relatório DOCX gerado |
| `ActivityReport` | `activities_report` | UUID v7 | Junction table: atividade ↔ relatório |

**Relacionamentos**:

- `UserProfile` 1:1 `Alert` (cascade, eager)
- `Activity` 1:N `Evidence` (cascade)
- `Report` 1:N `ActivityReport` (cascade)
- `ActivityReport` N:1 `Activity`

---

## Processo de Renderização (`src/`)

### Roteamento

```text
/                          → HomePage (Dashboard ou EmptyState)
/profile                   → ProfilePage
/settings                  → SettingsPage
/activities                → ActivitiesPage (listagem)
/activities/new            → ActivityFormPage (criar)
/activities/:id            → ActivityDetailPage (visualizar)
/activities/:id/edit       → ActivityFormPage (editar)
```

Todas as rotas ficam dentro de `<AppLayout>` que renderiza o `<Header>` + `<Outlet>`.

### Componentes Principais

| Componente | Responsabilidade |
| ------------ | ----------------- |
| `AppLayout` | Layout wrapper com Header |
| `Header` | Barra superior draggable, ícone do usuário (→ perfil), engrenagem (→ configurações) |
| `EmptyState` | Tela inicial quando não há perfil cadastrado |
| `EvidenceUpload` | Componente de upload com drag & drop, clipboard paste e seleção de arquivo |

### Contextos

| Contexto | Função |
| ---------- | -------- |
| `ThemeContext` | Gerencia dark/light mode, persiste em `localStorage` |

### Serviços

| Serviço | Função |
| --------- | ------- |
| `localDb.ts` | Fallback com `localStorage` quando `window.electronAPI` não está disponível (dev no browser) |

### Validação

| Módulo | Função |
| -------- | -------- |
| `validation.ts` | Valida campos obrigatórios do perfil e das atividades antes da geração do relatório |

---

## Protocolos Customizados

### `shipit-evidence://`

Serve imagens de evidência armazenadas em `{userData}/evidences/`.

```text
shipit-evidence://host?path=C:\Users\...\evidences\abc.png
```

**Segurança**: Valida que o path resolve para dentro do diretório `evidences/`.

### `shipit-sfx://`

Serve arquivos de som da pasta `assets/sounds/`.

```text
shipit-sfx://host?file=alert-sound-01.mp3
```

**Segurança**: Usa `path.basename()` para prevenir path traversal; valida que o arquivo está dentro de `assets/sounds/`.

Ambos registrados como privilegiados com `supportFetchAPI` e `stream` antes de `app.ready()`.

---

## Persistência

### SQLite (`shipit.db`)

Banco principal para todos os dados estruturados. Caminho: `{userData}/shipit.db`.

- Gerenciado pelo TypeORM com `synchronize: true`
- Entidades com decorators (`@Entity`, `@Column`, `@OneToMany`, etc.)
- UUID v7 como primary key (exceto UserProfile que usa auto-increment)

### Auto-Update

O `electron-updater` é integrado ao `main.ts` e executa apenas em builds empacotados:

```text
app.whenReady()
  └── app.isPackaged?
        ├── Sim → autoUpdater.checkForUpdatesAndNotify()
        │         ├── GET latest*.yml do GitHub Releases
        │         ├── Compara versão remota vs local
        │         ├── Download automático em background
        │         └── Notification nativa ao usuário
        └── Não → skip (modo dev)
```

Config de publish no `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "NeuronioAzul",
      "repo": "shipit"
    }
  }
}
```

### `settings.json`

Configurações do app (não do perfil). Caminho: `{userData}/settings.json`.

```json
{
  "reportsDirectory": "C:\\Users\\...\\reports",
  "alertSound": "alert-sound-05.mp3"
}
```

Merge parcial: `saveSettings({ key: value })` faz merge com as configurações existentes.

### `localStorage`

Usado apenas no renderer para:

- `shipit-theme`: preferência de tema (`dark` | `light`)
- Fallback de dados quando `electronAPI` não está disponível (dev no browser)

---

## Fluxo de Geração de Relatório

```text
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Dashboard   │────►│  Validação   │────►│  Confirmação Mês  │
│  Botão Gerar │     │  Perfil +    │     │  Dialog           │
│              │     │  Atividades  │     │                   │
└──────────────┘     └──────────────┘     └─────────┬─────────┘
                                                    │
                                                    ▼
 ┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
 │  Feedback   │◄────│  Salvar no   │◄────│  generateDocx     │
 │  Toast +    │     │  banco       │     │  Report()         │
 │  Histórico  │     │  (Report)    │     │                   │
 └─────────────┘     └──────────────┘     └───────────────────┘
```

1. Usuário clica "Gerar Relatório" no Dashboard
2. Frontend valida perfil + atividades do mês
3. Dialog confirma o mês de referência
4. IPC `app:generateReport` chama o main process
5. Main carrega payload do banco (`getReportPayload`)
6. `report-generator.ts` monta o DOCX via template
7. Salva na pasta configurada (ou `userData/reports/`)
8. Registra no banco como `Report` com status "Gerado"
9. Retorna sucesso ao renderer com path para "Abrir na pasta"

---

## Build e Compilação

### Dois processos TypeScript

| Fonte | tsconfig | Target | Module | Output |
| ------- | ---------- | -------- | -------- | -------- |
| `src/` | `tsconfig.json` | ES2020 | ESNext (bundler) | `dist/` (via Vite) |
| `electron/` | `tsconfig.electron.json` | ES2020 | CommonJS (node10) | `dist-electron/` |

### Pipeline de build

```bash
npm run build
# 1. tsc              → checa tipos do renderer (noEmit)
# 2. vite build       → bundle React → dist/
# 3. tsc -p tsconfig.electron.json  → compila electron → dist-electron/
```

### Pipeline de distribuição

```bash
npm run dist
# 1. npm run build (acima)
# 2. electron-builder → empacota em release/
```

---

## Decisões Técnicas

| Decisão | Motivo |
| --------- | -------- |
| SQLite (não PostgreSQL/MySQL) | 100% offline, sem servidor externo, um único arquivo |
| DOCX via OpenXML (não Puppeteer PDF) | O modelo do MEC é DOCX; manipulação direta garante fidelidade ao template |
| UUID v7 (não auto-increment) | Ordenação cronológica natural + unicidade global |
| Tailwind v4 `@theme inline` | Sem arquivo de config; variáveis CSS permitem dark/light via classe `.dark` |
| `settings.json` separado do SQLite | Configurações do app vs. dados do usuário; evita colisão com `synchronize: true` |
| Font Awesome via npm | 100% offline; sem CDN ou dependências externas |
| `contextIsolation: true` | Segurança: renderer não tem acesso ao Node.js |
| `electron-updater` + GitHub Releases | Auto-update sem servidor próprio; blockmaps para delta updates |
| CI/CD via GitHub Actions | Build multiplataforma paralelo; testes como gate; sem code signing por agora |
