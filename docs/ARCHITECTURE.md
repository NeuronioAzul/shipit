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
- **IPC Handlers**: 57 handlers `ipcMain.handle` + 4 listeners renderer organizados por prefixo
- **Identidade runtime e `userData`**: `runtime-paths.ts` centraliza `appId`, nome visual, diretórios de dados por modo, assets públicos, ícones e perfil temporário de testes
- **Auto-update controlado**: `update-notifications.ts` usa `checkForUpdates()` com notificações próprias do ShipIt, dedupe e foco da janela existente

#### Prefixos IPC

| Prefixo   | Escopo                 | Exemplos                                                                            |
| --------- | ---------------------- | ----------------------------------------------------------------------------------- |
| `db:`     | Banco de dados (CRUD)  | `db:getUserProfile`, `db:saveActivity`, `db:getReports`                             |
| `app:`    | Funcionalidades do app | `app:getVersion`, `app:generateReport`, `app:openReportsDirectory`, `app:zoomIn`    |
| `window:` | Controles da janela    | `window:minimize`, `window:maximize`, `window:close`                                |

#### Handlers registrados

```text
db:getUserProfile          db:saveUserProfile
db:getActivities           db:searchActivities
db:getActivity             db:saveActivity
db:deleteActivity          db:reorderActivities
db:saveEvidence            db:saveEvidenceFromBuffer
db:updateEvidenceCaption   db:deleteEvidence
db:getEvidenceFilePath     db:reorderEvidences
db:getDeletedEvidences     db:restoreEvidence
db:permanentlyDeleteEvidence  db:saveTextEvidence
db:updateTextEvidence      db:getReports
db:getAlert                db:saveAlert

app:getVersion             app:selectImages
app:setTrayStatus          app:getSettings
app:saveSettings           app:selectDirectory
app:getDefaultReportsDir   app:openReportsDirectory
app:openEvidencesDirectory app:quit
app:editUndo               app:editRedo
app:editCut                app:editCopy
app:editPaste              app:editSelectAll
app:zoomIn                 app:zoomOut
app:zoomReset              app:listSounds
app:getSoundPath           app:playSound
app:getAutoLaunch          app:setAutoLaunch
app:generateReport         app:openFileInFolder
app:getUpdateState         app:checkForUpdate
app:downloadUpdate         app:installUpdate
app:acknowledgeUpdateAttention

window:minimize            window:maximize
window:close               window:isMaximized
```

#### Eventos renderer (`ipcRenderer.on`)

```text
app:playSoundData          app:updateStatus
app:navigate               window:maximized-change
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
4. Monta **Encarte B**: uma página por evidência com imagem ou texto formatado + legenda + bookmark
5. Insere campos PAGEREF para referência cruzada de páginas
6. Atualiza `[Content_Types].xml` com os tipos MIME das imagens
7. Salva o DOCX na pasta configurada ou padrão (`userData/reports/`)

**Bibliotecas usadas**: `jszip` (ZIP), `@xmldom/xmldom` (DOM XML), `xpath` (queries XPath)

### `runtime-paths.ts` — Identidade, `userData` e Assets

Centraliza constantes de identidade (`br.com.neuronioazul.shipit`, `ShipIt!`), variante isolada de teste (`ShipIt! Test`), resolução de assets públicos em dev/asar, ícones de janela/notificação/tray e diretório de sons.

O nome visual (`productName`/`app.setName()`) permanece `ShipIt!`, mas o diretório `userData` é configurado explicitamente antes de qualquer `app.getPath('userData')`: builds empacotados usam a pasta legada `shipit` dentro de `appData`, desenvolvimento usa `ShipIt!`, e E2E usa o diretório temporário informado por `SHIPIT_TEST_USER_DATA_DIR`.

Também expõe helpers de perfil temporário E2E com marcador `.shipit-test-profile`; a limpeza automatizada só aceita diretórios com esse marcador e prefixo `shipit-e2e-`.

### `update-notifications.ts` — Auto-Update Testável

Isola a lógica do `electron-updater` para permitir testes unitários sem carregar o `main.ts` inteiro. O serviço registra os eventos `checking-for-update`, `update-available`, `update-not-available`, `update-downloaded` e `error`, envia `app:updateStatus` ao renderer e exibe notificação nativa apenas para estados que exigem ação do usuário.

As notificações usam cópia pt-BR, ícone ShipIt resolvido pelo runtime e clique centralizado para restaurar/focar a janela existente em `/settings`.

### `preload.ts` — Context Bridge

Expõe `window.electronAPI` com 57 métodos tipados que chamam `ipcRenderer.invoke()` e 4 assinaturas de eventos (`onPlaySoundData`, `onUpdateStatus`, `onNavigate`, `onWindowMaximized`). Nenhuma API do Node.js é exposta diretamente ao renderer.

### `entities/` — Modelo de Dados

| Entidade | Tabela | PK | Descrição |
| ---------- | -------- | ----- | ----------- |
| `UserProfile` | `user_profile` | Auto-increment | Perfil do usuário (cargo, contrato, etc.) |
| `Alert` | `alerts` | Auto-increment | Configuração de alertas (1:1 com UserProfile) |
| `Activity` | `activities` | UUID v7 | Atividade registrada com período e status |
| `Evidence` | `evidences` | UUID v7 | Evidência (imagem ou texto) vinculada a uma atividade |
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
/trash                     → TrashPage (lixeira de evidências)
/manual                    → UserManualPage (manual e ajuda)
/activities                → ActivitiesPage (listagem)
/activities/new            → ActivityFormPage (criar)
/activities/:id            → ActivityDetailPage (visualizar)
/activities/:id/edit       → ActivityFormPage (editar)
```

Todas as rotas ficam dentro de `<AppLayout>` que renderiza `<TitleBar>` + `<ActivityBar>` + `<Outlet>`.

Layout: `ThemeProvider` → `HashRouter` → `ElectronNavigator` → `AppLayout` → Route outlet

### Componentes Principais

| Componente | Responsabilidade |
| ------------ | ----------------- |
| `AppLayout` | Layout wrapper com TitleBar + ActivityBar + Outlet |
| `TitleBar` | Barra superior draggable com controles de janela e SearchBar |
| `AppTopMenu` | Menu customizado File/Edit/View/Help ao lado do logo |
| `Header` | Header com logo, barra de busca (interno ao TitleBar) |
| `ActivityBar` | Sidebar lateral com nav links: Dashboard, Atividades, Perfil, Configurações, Lixeira, Sobre |
| `SearchBar` | Barra de busca estilo Command Palette (`Ctrl+K`) com dropdown de resultados |
| `EmptyState` | Tela inicial quando não há perfil cadastrado |
| `DatePicker` | Campo de data reutilizável para formulários |
| `TimePicker` | Campo de horário reutilizável para alertas/configurações |
| `Select` | Select estilizado reutilizável |
| `EvidenceUpload` | Componente de upload com drag & drop, clipboard paste e seleção de arquivo |
| `EvidenceLightbox` | Visualização em tela cheia de imagens de evidência com navegação |
| `TextEvidenceEditor` | Editor rich-text (TipTap) para evidências de texto |
| `TextEvidenceModal` | Modal para visualização/edição de evidências de texto |
| `ActivityNav` | Navegação prev/next entre atividades na tela de detalhes |
| `ThemeSelector` | Seletor visual de temas em grid com cards por categoria e preview de cores |
| `UpdateModal` | Modal de atualização disparado na TitleBar (verifica/baixa/instala via `UpdateStateContext`) |
| `UpdateStatusPanel` | Painel de status de atualização exibido em Configurações → Atualizações |
| `Skeleton` | Componentes de loading placeholder |

### Contextos

| Contexto | Função |
| ---------- | -------- |
| `ThemeContext` | Gerencia 11 temas, computa `isDark` a partir da base, persiste em `localStorage.shipit-theme` |
| `NavigationHistoryContext` | Histórico global do HashRouter com botões/atalhos Voltar e Avançar |
| `UpdateStateContext` | Estado compartilhado do fluxo manual de atualização (verificar, baixar, instalar, badges de atenção) |

### Menu e Atalhos (`src/menu/`)

| Módulo | Função |
| ------ | ------ |
| `appMenuCatalog.ts` | Catálogo central de comandos do menu do app, atalhos e agrupamentos |
| `saveContextRegistry.ts` | Registro de handlers de salvamento contextual para `Ctrl+S`/menu |

### Serviços

| Serviço | Função |
| --------- | ------- |
| `localDb.ts` | Fallback com `localStorage` quando `window.electronAPI` não está disponível (dev no browser) |

### Validação

| Módulo | Função |
| -------- | -------- |
| `validation.ts` | Valida campos obrigatórios do perfil e das atividades antes da geração do relatório |
| `monthReference.ts` | Normalização e formatação de mês de referência (`YYYY-MM`) |
| `activityMonthNavigation.ts` | Cálculo de navegação mensal para a tela de detalhes |
| `keyboardGuards.ts` | Guardas para atalhos não dispararem durante digitação |
| `statusColors.ts` | Mapeamento compartilhado de status para ícones/cores |

### Temas (`src/themes/`)

| Arquivo | Função |
| -------- | -------- |
| `themes.ts` | Registro de 11 temas com `ThemeMetadata` (id, label, description, icon, category, base, preview) |
| `themes.css` | 60+ variáveis CSS por tema via seletores `[data-theme="id"]` |
| `cyberpunk-effects.css` | Efeitos especiais do tema Cyberpunk (scanlines CRT, neon glow, glitch, clip-path angular) |

---

## Arquitetura Multi-Tema

O sistema de temas usa uma cascata de 3 camadas:

```text
1. Registro (themes.ts)           → ThemeMetadata[] com 11 temas tipados
2. Paletas CSS (themes.css)       → [data-theme="id"] define 60+ variáveis CSS
3. Mapeamento Tailwind (index.css) → @theme inline mapeia variáveis para tokens Tailwind
```

### Fluxo de troca de tema

```text
ThemeSelector (click)  →  ThemeContext.setTheme(id)  →  localStorage.shipit-theme = id
                                                       →  <html data-theme="id" class="dark?"> 
                                                       →  CSS variables recalculadas
                                                       →  Tailwind tokens atualizados
                                                       →  Transição suave (200ms)
```

### Categorias de temas

| Categoria | Temas | Base |
| --------- | ----- | ---- |
| Principais | Claro, Escuro | light, dark |
| Personalidade | Colorido, Rosa & Violeta, Minimalista, Futurista, Oceano, Pôr do Sol | mixed |
| Acessibilidade | Alto Contraste, Alto Contraste Escuro | light, dark |
| Bônus | Cyberpunk | dark |

O `ThemeContext` computa `isDark` automaticamente a partir da propriedade `base` do tema selecionado, aplicando a classe `.dark` quando necessário.

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

## Jobs em Segundo Plano

| Job | Frequência | Responsabilidade |
| --- | ---------- | ---------------- |
| Alert checker | 60 segundos | Dispara notificações nativas conforme configuração de alerta do usuário |
| Tray status updater | 5 minutos | Atualiza o ícone do tray conforme pendências do mês atual |
| Trash cleanup | Inicialização do app | Remove definitivamente evidências em soft-delete há mais de 3 meses |

---

## Persistência

### SQLite (`shipit.db`)

Banco principal para todos os dados estruturados. Caminho: `{userData}/shipit.db`.

- Gerenciado pelo TypeORM com `synchronize: true`
- Entidades com decorators (`@Entity`, `@Column`, `@OneToMany`, etc.)
- UUID v7 como primary key (exceto UserProfile que usa auto-increment)

### Auto-Update

O `electron-updater` é integrado ao `main.ts` (via `electron/update-notifications.ts`) e executa apenas em builds empacotados. Desde a v1.3.6, o fluxo é **manual e consentido**:

```text
app.whenReady()
  └── app.isPackaged?
    ├── Sim → updateService.checkForUpdates()  ← apenas verifica
    │         ├── GET latest*.yml do GitHub Releases
    │         ├── Compara versão remota vs local
    │         ├── Emite `app:updateStatus` para o renderer
    │         └── Notificação ShipIt customizada apenas em estados que exigem ação
    └── Não → skip (modo dev)

Usuário em Configurações → Atualizações
  ├── `app:checkForUpdate`           — re-checa sob demanda
  ├── `app:downloadUpdate`           — inicia download (com progresso)
  ├── `app:installUpdate`            — aplica update já baixado
  ├── `app:getUpdateState`           — recupera estado persistido
  └── `app:acknowledgeUpdateAttention(version?)` — limpa badges/atenção
```

O app não usa `checkForUpdatesAndNotify()`, evitando o toast automático em inglês do `electron-updater`. Chamadas de checagem são protegidas contra concorrência e dedupe por versão/status; o estado de atualização pendente é preservado entre reinicializações até a instalação, e badges na TitleBar/menu lateral sinalizam novas versões.

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

- `shipit-theme`: preferência de tema (ID do tema, ex: `"cyberpunk"`, `"ocean"`, `"dark"`)
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
| Tailwind v4 `@theme inline` | Sem arquivo de config; variáveis CSS permitem multi-tema via `[data-theme]` |
| Multi-tema via CSS variables | Zero custo em runtime; integração total com Tailwind v4; 11 temas sem CSS-in-JS |
| Sistema de categorias de temas | Organização visual no seletor: principais, personalidade, acessibilidade |
| Temas WCAG AAA de alto contraste | Design inclusivo para usuários com baixa visão (contraste 7:1+) |
| `settings.json` separado do SQLite | Configurações do app vs. dados do usuário; evita colisão com `synchronize: true` |
| Font Awesome via npm | 100% offline; sem CDN ou dependências externas |
| `contextIsolation: true` | Segurança: renderer não tem acesso ao Node.js |
| `electron-updater` + GitHub Releases | Auto-update sem servidor próprio; blockmaps para delta updates |
| CI/CD via GitHub Actions | Build multiplataforma paralelo; testes como gate; sem code signing por agora |
