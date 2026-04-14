# Ícones em apps Electron: guia técnico completo para Windows, macOS e Linux

## Resumo executivo

Para um app Electron “com cara de produto” (e não com ícone padrão), você precisa tratar ícones como **artefatos por plataforma e por uso**, não como “um PNG só”. No mínimo: **ícone do app/executável**, **ícone de janela/dock/taskbar**, **ícone de tray/menu bar**, **ícones do instalador** e, se publicar em loja: **assets específicos de store**. citeturn23view2turn13view0turn29view2turn23view1

A estratégia mais robusta é manter **uma fonte mestre** (SVG + PNG 1024×1024) e gerar automaticamente:
- **Windows**: um `.ico` **multi-resolução** (incluindo 16/24/32/48/256 e, idealmente, tamanhos para escalas 125%/150%/200%). citeturn32view1turn29view2turn47view1  
- **macOS**: um `.icns` a partir de um `.iconset` com nomes e tamanhos padronizados (inclui `512x512@2x` = **1024×1024**). citeturn11view0turn12search1  
- **Linux**: um conjunto PNG/SVG instalado conforme **freedesktop** (hicolor + `.desktop`) e/ou exigências do empacotador (Flatpak, AppImage, Snap). citeturn37view1turn28view2turn43view0turn40view0turn42view0  

Para tray/menu bar: **não reutilize o ícone do app**. No macOS use **template image** (monocromático + alpha) e tamanhos típicos **16×16 (1x)** e **32×32@2x (2x)**; no Windows prefira `.ico` também para tray; no Linux varie por ambiente (forneça um set pequeno e um maior). citeturn13view0turn31view0turn32view1

## Matriz de ícones por plataforma e uso

### Tamanhos, formatos e escalas para uso “em runtime” (janela/dock/taskbar/tray)

A tabela abaixo foca no que o Electron consome durante a execução e no que o sistema operacional costuma renderizar.

| Plataforma | Uso | Formato recomendado | Tamanhos / escalas que vale cobrir | Nomes de arquivo recomendados (sugestão prática) |
|---|---|---|---|---|
| Windows | Ícone do app (EXE) + atalhos + taskbar | **`.ico` multi-resolução** | **Mínimo**: 16, 24, 32, 48, 256. **Ideal (DPI)**: 16/20/24/32 (small) + 32/40/48/64/256 (large). | `build/icon.ico` |
| Windows | Ícone da janela (title bar/Alt+Tab) | `.ico` (ou PNG quando for só `BrowserWindow`) | Reaproveita o set do `.ico`; se for PNG, manter pelo menos 256 e deixar o SO reduzir. | `assets/win/window.ico` (ou `assets/win/window.png`) |
| Windows | Tray (notification area) | **`.ico`** | Escalas comuns p/ “system tray”: 16, 20, 24, 32, 40, 48, 64 (dependendo do scale do Windows). | `assets/win/tray.ico` |
| macOS | Ícone do app + Dock | **`.icns`** (ou `.icon` em cenários novos) | `.iconset` completo inclui 16/32/128/256/512 + variantes `@2x` (até 1024). | `build/icon.icns` (opcional: `build/icon.icon`) |
| macOS | Menu bar (Tray) | **PNG template** | **Recomendado**: 16×16 (1x) + 32×32@2x (2x). (O Electron também entende `@3x`, mas 2x é o padrão útil). | `assets/mac/trayTemplate.png` + `assets/mac/trayTemplate@2x.png` |
| Linux | Launcher/overview + janela/task switcher | **PNG** (ou SVG em ecossistemas que suportem) | Forneça 16/32/48/64/128/256/512 (quanto mais, menos blur). | `build/icons/16x16.png`…`512x512.png` (ou tema hicolor) |
| Linux | Tray/painel | PNG (pequeno e legível) | Não há tamanho único; pratique com 16/22/24 e um “retina” 32/44/48 para HiDPI. | `assets/linux/tray-22.png`, `tray-44.png` etc |

Fontes-chave por linha:
- Tray/macOS: “template images” e tamanho “16x16 e 32x32@2x funcionam bem” + recomendação de ICO no Windows. citeturn13view0  
- `.ico` com tamanhos para escalas 100/125/150/200% (small/large) + suporte a sufixos `@2x/@3x` e `Template`. citeturn29view2turn31view0  
- Mínimo recomendado no Windows (16/24/32/48/256) e tabela de escalas do Windows 11 incluindo system tray. citeturn32view1  
- `.iconset` e nomes `icon_<WxH>[@2x].png`. citeturn11view0  
- Linux: formatos no tema (PNG recomendado; SVG opcional) e instalação mínima no hicolor. citeturn37view1  
- `.desktop`/Linux: `Icon=` pode ser caminho absoluto ou nome resolvido via Icon Theme Spec. citeturn28view2  

### Ícones de instalador e “store assets” (publicação/distribuição)

| Plataforma | Uso | Formato | Tamanhos exatos | Nomes/Convenções (onde costuma ficar) |
|---|---|---|---|---|
| Windows (NSIS via electron-builder) | Ícone do instalador | `.ico` | Use o mesmo padrão de `.ico` multi-res (inclua 256). | `build/installerIcon.ico` / `build/uninstallerIcon.ico` (paths configuráveis) citeturn24view0 |
| Windows (NSIS “one-click”) | Header icon | `.ico` | Pequeno (usa no topo do wizard; reaproveite multi-res). | `build/installerHeaderIcon.ico` (ou cai no ícone do app) citeturn24view0 |
| Windows (NSIS “assisted”) | Sidebar do instalador | `.bmp` | **164×314 px** (tamanho explicitado pelo electron-builder). | `build/installerSidebar.bmp` citeturn24view0 |
| Windows Store (AppX/MSIX via electron-builder) | Tiles/logos básicos | `.png` | Base 1x recomendado: 44×44, 71×71, 150×150, 310×150, 310×310, 50×50; splash 620×300. | `build/appx/StoreLogo.png`, `Square44x44Logo.png`, `Square150x150Logo.png`, `Wide310x150Logo.png` etc. citeturn23view1turn33view1 |
| Windows Store (scales) | Variações p/ scale factors | `.png` | Ex.: 44→55 (1.25x), 66 (1.5x), 88 (2x), 176 (4x). 71→89/107/142/284 etc. | Convenção Windows: sufixos `.scale-XXX` e/ou `targetsize-YY` (ver exemplos de `.scale-100` e `targetsize-16`). citeturn32view1turn23view1 |
| macOS (DMG via electron-builder) | Ícone do app + volume | `.icns` (volume) | Volume DMG ainda usa `.icns` em fluxos modernos de `.icon`. | Configurar `dmg.icon` explicitamente se necessário. citeturn23view0turn23view2 |
| macOS (DMG) | Background | `.png` | `background.png` e `background@2x.png` (retina) | `build/background.png`, `build/background@2x.png` citeturn23view2 |
| Linux (Flatpak/Flathub) | Ícone do app (launcher/app center) | PNG ou SVG | Ícones devem ser quadrados; máximo citado: **512×512**; path padrão hicolor. | `/app/share/icons/hicolor/$size/apps/<APP_ID>.png` (ou `scalable/.../<APP_ID>.svg`) citeturn43view0 |
| Linux (Snap Store) | Ícone da loja | PNG/SVG | Aceito **40×40 até 512×512**, recomendado **256×256**; e a `.desktop` manda no ícone do menu. | `snapcraft.yaml: icon: snap/gui/icon.svg` (ou PNG) citeturn42view0 |
| Linux (AppImage) | `.DirIcon` + ícone do `.desktop` | PNG (DirIcon) + PNG/SVG (app) | `.DirIcon` recomendado em tamanhos padrão como **128×128 ou 256×256**; nome do ícone deve casar com `Icon=`. | `<root>/.DirIcon`, `<root>/<myapp>.png`, `Icon=myapp` (sem extensão) citeturn40view0 |

Observações importantes amarradas a docs:
- O electron-builder enfatiza que, se você não colocar os arquivos de ícone esperados em `buildResources` (por padrão `build`), o **ícone padrão do Electron** pode aparecer. citeturn23view2turn23view0  
- Para AppX, o electron-builder define **nomes exatos** (`StoreLogo.png`, `Square150x150Logo.png`, etc.) e diz que você pode adicionar variações por **`scale`/`target size`** no nome. citeturn23view1  
- A documentação Microsoft lista tamanhos exatos (incluindo arredondamentos como 71→89 no 1.25x) e ranges de scales. citeturn33view1turn32view1  

### Exemplos concretos de “conteúdo” de arquivos de ícone

**Exemplo de `.ico` (o que deve existir “dentro”)**
- **Mínimo seguro (Windows)**: 16×16, 24×24, 32×32, 48×48, 256×256. citeturn32view1  
- **Set recomendado para DPI** (cobrindo 125%/150%/200%):  
  - small: 16, 20, 24, 32  
  - large: 32, 40, 48, 64, 256 citeturn29view2turn32view1  
- Se usar ferramenta tipo `png2icons`, ela pode gerar ICO com 16/24/32/48/64/72/96/128/256 e ainda um modo “para executável” misturando BMP (pequenos) + PNG (maiores) para compatibilidade. citeturn47view1turn47view2  

**Exemplo de estrutura `.icns` via `.iconset`**
Um conjunto “completo” de `.iconset` (que vira `.icns`) contém estes arquivos PNG:  
- `icon_16x16.png`  
- `icon_16x16@2x.png` (32×32)  
- `icon_32x32.png`  
- `icon_32x32@2x.png` (64×64)  
- `icon_128x128.png`  
- `icon_128x128@2x.png` (256×256)  
- `icon_256x256.png`  
- `icon_256x256@2x.png` (512×512)  
- `icon_512x512.png`  
- `icon_512x512@2x.png` (1024×1024) citeturn11view0  

**Exemplo de set PNG para Linux (hicolor/empacotadores)**
- Um set prático (e aceito por tooling como electron-builder) é: 16, 32, 48, 64, 128, 256 (ou simplesmente 512, se o empacotador gerar o resto). citeturn23view2turn37view1  

## Configuração no Electron

### Ícone de janela e ícone do app (taskbar/dock/window list)

**Windows/Linux: `BrowserWindow` (via BaseWindow)**
- Você pode passar `icon` nas opções da janela. Em Windows, é recomendado usar `.ico` para “best visual effects”; se você não definir, o SO pode usar o ícone embutido no executável. citeturn22search0turn29view2  
- Também existe `win.setIcon(icon)` (Windows/Linux) para trocar o ícone em runtime. citeturn17view1  

Exemplo (main process):

```js
const path = require('path');
const { app, BrowserWindow } = require('electron');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // Para Linux/Windows: PNG (Linux) ou ICO (Windows) funciona bem.
    // Dica prática: escolha por plataforma.
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'assets', 'win', 'window.ico')
      : path.join(__dirname, 'assets', 'linux', 'window.png'),
  });

  return win;
}

app.whenReady().then(() => {
  const win = createMainWindow();
  win.loadURL('https://example.com');
});
```

**macOS: Dock**
- Você pode trocar o ícone do Dock com `app.dock.setIcon(image)` (só macOS). citeturn15search3turn29view2  

```js
const path = require('path');
const { app, nativeImage } = require('electron');

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    const img = nativeImage.createFromPath(path.join(__dirname, 'assets/mac/dock.png'));
    app.dock.setIcon(img);
  }
});
```

### AppUserModelID no Windows (ícone/agrupamento/notificações)

- `app.setAppUserModelId(id)` (Windows) define/alterar o **Application User Model ID**. citeturn16view1  
- Para notificações (toast) no Windows, o Electron documenta que seu app precisa de atalho no Start Menu com AppUserModelID e ToastActivatorCLSID; em produção, com certos instaladores, o Electron tenta automatizar, mas em desenvolvimento pode precisar chamar `app.setAppUserModelId()` manualmente. citeturn30view1turn16view1  

Recomendação prática: defina um AppUserModelID **estável** (idealmente alinhado ao seu `appId` do empacotador) **antes de criar janelas/notificações**.

```js
const { app } = require('electron');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.suaempresa.seuapp'); // estável
}

app.whenReady().then(() => {
  // crie janelas/tray/etc
});
```

### Tray / menu bar (system tray, notification area, menu bar extras)

**API e regras gerais**
- Tray é criado com `new Tray(imageOrPath[, guid])` e o `image` pode ser `NativeImage` ou path. citeturn13view0turn29view2  
- Em Windows, a doc do Electron recomenda **usar ICO** para melhor resultado visual. citeturn13view0  
- Em macOS, ícones de tray devem ser **Template Images**; e o Electron dá o “tamanho que funciona bem”: **16×16 (72dpi)** e **32×32@2x (144dpi)**. citeturn13view0turn31view0  
- Em builds que usam bundlers, a doc alerta que o macOS depende do sufixo `Template` e do par `@2x` com mesmo basename; se seu bundler renomear/hash, o macOS pode **não inverter cores** nem pegar o `@2x`. citeturn13view0turn31view0  

Exemplo cross-platform (com template no macOS):

```js
const path = require('path');
const { app, Tray, Menu, nativeImage } = require('electron');

let tray;

function createTray() {
  let iconPath;

  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets/mac/trayTemplate.png'); // com @2x ao lado
  } else if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'assets/win/tray.ico');
  } else {
    iconPath = path.join(__dirname, 'assets/linux/tray-22.png');
  }

  const image = nativeImage.createFromPath(iconPath);

  // Opcional: marque explicitamente template no macOS (além do sufixo Template).
  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
  }

  tray = new Tray(image);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir', click: () => {/* mostrar janela */} },
    { type: 'separator' },
    { label: 'Sair', role: 'quit' },
  ]);

  tray.setToolTip('SeuApp');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(createTray);
```

Notas importantes:
- `nativeImage` suporta PNG/JPEG em todas as plataformas e ICO por path no Windows, e recomenda tamanhos específicos para ICO. citeturn29view2turn31view0  
- “Template Image” no Electron é representada por nome base terminando em `Template` e pode ter variações `@2x`. citeturn31view0  

### Extra útil: overlay no ícone da taskbar (Windows)

Se você precisa indicar estado (ex.: sync, alerta), `win.setOverlayIcon(overlay, description)` define explicitamente um overlay **16×16** no ícone da taskbar. citeturn17view1  

## Empacotamento com electron-builder, electron-forge e electron-packager

### electron-builder

**Ícones básicos**
- macOS: aceita `icon.icns` (legado), `icon.icon` (fluxo mais novo) ou `icon.png`; tamanho mínimo recomendado: pelo menos 512×512. citeturn23view2turn23view0  
- Windows (NSIS): `icon.ico` (ou `icon.png`), com recomendação de pelo menos 256×256 e colocado em `buildResources` (default `build`). citeturn23view2turn23view0  
- Linux: pode gerar set automaticamente a partir de `.icns`/`icon.png`, ou você fornece `build/icons/<size>x<size>.png` (sugestão: 16/32/48/64/128/256 ou 512). citeturn23view2  

Exemplo `package.json` (recorte):

```json
{
  "build": {
    "directories": { "buildResources": "build" },
    "mac": { "icon": "build/icon.icns" },
    "win": { "icon": "build/icon.ico", "target": ["nsis"] },
    "linux": { "icon": "build/icon.png", "target": ["AppImage", "deb", "snap"] }
  }
}
```

**Ícones do instalador (NSIS)**
- `installerIcon`, `installerHeaderIcon`, `uninstallerIcon` são configuráveis e têm defaults no `build/…` (ou herdam o ícone do app). citeturn24view0  
- Para instalador assistido, `installerSidebar.bmp` tem tamanho explicitado: **164×314**. citeturn24view0  

**Windows Store (AppX)**
- Assets em `build/appx/` e nomes canônicos como: `StoreLogo.png`, `Square150x150Logo.png`, `Square44x44Logo.png`, `Wide310x150Logo.png`. citeturn23view1  
- Tamanhos base e escalas (1x/1.25x/1.5x/2x/4x) podem seguir as listas de dimensões recomendadas pela documentação Microsoft (por exemplo 44→55→66→88→176). citeturn33view1turn23view1  

### electron-forge

O guia oficial do Forge recomenda começar de um **1024×1024** e resume formatos por OS: `.icns` no macOS, `.ico` no Windows, `.png` no Linux. citeturn25view0  

- `packagerConfig.icon`: ao passar um caminho **sem extensão**, o `@electron/packager` infere a extensão correta. citeturn25view0  
- Linux no Forge: o guia ressalta que precisa configurar o ícone no `package.json` **e** passar `icon` no `BrowserWindow`. citeturn25view0  
- Ícones de instalador: configure por “maker” (Squirrel, DMG, WiX etc.). citeturn25view0  

Exemplo `forge.config.js` (recorte):

```js
module.exports = {
  packagerConfig: {
    icon: '/abs/path/to/assets/icon' // sem extensão
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: '/abs/path/to/assets/win/setupIcon.ico'
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: '/abs/path/to/assets/mac/icon.icns'
      }
    }
  ]
};
```

**Cache de ícones (Windows)**
O Forge chama atenção para cache de ícones do Windows e sugere invalidar usando `ie4uinit.exe`. citeturn25view0  

### electron-packager

- `--icon` / `options.icon`: macOS exige `.icns`, Windows exige `.ico`. citeturn13view3  
- Linux: o packager não “embute” ícone; o doc diz que o ícone de dock/window list é definido pelo `icon` do `BrowserWindow` e deve ser **PNG** (não `.icns`/`.ico`). citeturn13view3turn22search0  

## Ferramentas e scripts para gerar ícones

### macOS: `.iconset` → `.icns` com `iconutil`

Processo “canônico” do ecossistema Apple:
1) criar uma pasta `icon.iconset` com PNGs nomeados `icon_<WxH>[@2x].png`. citeturn11view0  
2) converter para `.icns` com `iconutil`. A documentação Apple descreve o uso do `iconutil` para converter `.iconset` em `.icns`. citeturn12search1turn12search0  

Comandos (macOS):

```bash
# 1) Estrutura: icon.iconset/ com os PNGs do .iconset
# 2) Gerar icns:
iconutil -c icns icon.iconset

# (Opcional) Extrair um .icns para .iconset:
# O manual do iconutil explica conversões entre .icns e .iconset.
iconutil -c iconset -o extracted.iconset icon.icns
```

citeturn12search1turn12search10turn11view0  

### Windows: gerar `.ico` multi-resolução

**ImageMagick**
O ImageMagick tem o define `icon:auto-resize` para armazenar múltiplos tamanhos ao escrever um `.ico` (requer input 256×256). citeturn27search17  

Exemplo (ImageMagick 7):

```bash
# Partindo de um PNG grande (idealmente >= 256x256 com alpha):
magick icon-1024.png -resize 256x256 icon-256.png

# Gera ICO com múltiplos tamanhos (ajuste a lista conforme sua política):
magick icon-256.png -define icon:auto-resize=256,128,64,48,32,24,16 build/icon.ico
```

**png2icons (Node, multiplataforma)**
O `png2icons` (repo oficial) gera ICNS e ICO a partir de PNG; recomenda input ideal 1024×1024 RGBA e diz que para ICO sozinho **256×256 é suficiente**. citeturn47view0turn47view1  
Ele descreve que cria ICO com 16/24/32/48/64/72/96/128/256 e tem modo `-icowe`/`-allwe` (mix BMP+PNG) focado em **ICO para embutir em executáveis** (caso típico em Electron). citeturn47view1turn47view2  

Exemplo CLI:

```bash
# Gera icon.icns e icon.ico (com PNG dentro do ICO):
png2icons sample.png icon -allp -bc -i

# Gera ICO "para executável Windows" (mix BMP+PNG):
png2icons sample.png icon -icowe -bc -i
```

citeturn47view1turn47view2  

### Linux: gerar set PNG + instalar corretamente (desktop files e temas)

**Regras base (freedesktop)**
- Tema de ícones: PNG/XPM/SVG (PNG recomendado; SVG opcional; XPM legado). citeturn37view1  
- Instalação mínima para app icons: pelo menos **48×48** em `hicolor/48x48/apps`. citeturn37view1  
- `.desktop`: a chave `Icon=` pode ser um caminho absoluto ou um nome resolvido via Icon Theme Spec. citeturn28view2  
- Nomes de ícone (guideline): ASCII, minúsculo, sem espaços; caracteres permitidos incluem letras minúsculas, números, `_`, `-`, `.`. citeturn39view0  

**Shell script simples (ImageMagick) para set Linux**
```bash
#!/usr/bin/env bash
set -euo pipefail

IN="icon-1024.png"
OUT_DIR="build/icons"
SIZES=(16 32 48 64 128 256 512)

mkdir -p "$OUT_DIR"
for s in "${SIZES[@]}"; do
  magick "$IN" -resize "${s}x${s}" "$OUT_DIR/${s}x${s}.png"
done
```

**Flatpak**
Flatpak explicita que os ícones devem:
- ser nomeados pelo **Application ID**,  
- estar em PNG ou SVG,  
- ficar em `/app/share/icons/hicolor/$size/apps/`,  
- serem quadrados, e  
- ter tamanho máximo 512×512 (e SVG em `scalable/`). citeturn43view0  

**AppImage**
O spec do AppDir diz que:
- `.DirIcon` é um PNG na raiz e deve estar em tamanhos padrão como 128×128 ou 256×256, citeturn40view0  
- o arquivo `<myapp>.<ext>` deve ter nome consistente com `Icon=` no `.desktop`, e recomenda `Icon=` **sem extensão**. citeturn40view0  

**Snap (Snapcraft)**
O `snapcraft.yaml` define `icon:` e documenta:
- tamanho entre 40×40 e 512×512, recomendado 256×256, e  
- o ícone é usado na store, enquanto o `.desktop` controla o ícone nos menus. citeturn42view0  

### Outras ferramentas úteis

- `png2icns` do pacote `icnsutils` converte PNG(s) em `.icns` (`png2icns file.icns file1.png ...`). citeturn27search3  
- Geradores online citados na documentação do electron-builder (úteis quando você quer rapidez, mas prefira automação em CI para reprodutibilidade). citeturn23view2  

## Checklist de publicação e armadilhas comuns

### Checklist prático (antes de cortar release)

**Artefatos**
- Windows: `icon.ico` multi-res **com 256×256** e pelo menos 16/24/32/48/256. citeturn32view1turn29view2  
- macOS: `icon.icns` gerado a partir de `.iconset` completo (inclui `512@2x` = 1024). citeturn11view0turn12search1  
- Linux: set PNG (16..512) e `.desktop` com `Icon=` compatível com nome/tema. citeturn37view1turn28view2turn39view0  
- Tray macOS: `trayTemplate.png` e `trayTemplate@2x.png`, **basename termina em `Template`**. citeturn13view0turn31view0  

**Configuração no app**
- Definir `app.setAppUserModelId()` (Windows) cedo, principalmente se usar notificações/toasts. citeturn16view1turn30view1  
- Garantir que `new Tray(...)` aponte para assets existentes (sem hash/rename em build do macOS). citeturn13view0  

**Empacotamento**
- electron-builder: ícones no `buildResources` e (se AppX) assets em `build/appx/` com nomes exatos. citeturn23view2turn23view1  
- NSIS: se usar sidebar/header, respeitar caminhos e tamanho 164×314 no sidebar. citeturn24view0  
- Linux: não esquecer que alguns empacotadores dependem muito de ícone+`desktop` (Flatpak/AppImage/Snap). citeturn43view0turn40view0turn42view0  

### Armadilhas clássicas (as que mais fazem “sumir” ícone)

- **Renomear `.png` para `.ico`**: não funciona; você precisa exportar/gerar um ICO real (Forge inclusive alerta para isso e cita erro fatal). citeturn25view0  
- **ICO pobre (um tamanho só)**: o Windows escala e fica borrado; por isso a recomendação de incluir tamanhos mínimos e/ou os tamanhos de DPI (16/20/24/32 e 32/40/48/64/256). citeturn32view1turn29view2  
- **Tray macOS sem `Template` no nome** (ou sem `@2x` correto): o macOS pode não inverter cores no dark mode e/ou ficar serrilhado em retina; a doc do Electron chama isso explicitamente. citeturn13view0turn31view0  
- **Cache de ícones no Windows**: você muda o ícone e “nada acontece”; o Forge recomenda invalidar cache com `ie4uinit.exe`. citeturn25view0  
- **Linux: `Icon=` não casa com arquivo**: em AppImage, o spec pede que o filename do ícone seja igual ao que está em `Icon=` e recomenda `Icon=` sem extensão; em freedesktop, o lookup depende do nome e do tema. citeturn40view0turn28view2turn37view1  

### Fluxo recomendado (geração → empacotamento)

```mermaid
flowchart TD
  A[Design fonte: SVG + PNG 1024x1024] --> B[Gerar Windows icon.ico multi-res]
  A --> C[Gerar macOS icon.iconset]
  C --> D[iconutil -c icns => icon.icns]
  A --> E[Gerar PNG set Linux 16..512]
  A --> F[Gerar tray icons]
  F --> F1[macOS: trayTemplate.png + trayTemplate@2x.png]
  F --> F2[Windows: tray.ico multi-res]
  F --> F3[Linux: tray 16/22/24 + 32/44]
  B --> G[Configurar empacotador]
  D --> G
  E --> G
  G --> H[Build/CI: gerar artefatos (nsis/dmg/appimage/snap/flatpak/appx)]
  H --> I[Validação: instalar e checar ícone em: taskbar/dock/tray/atalhos]
  I --> J[Publicar (lojas/release)]
```

### Referências principais (links)

```txt
Electron
- https://www.electronjs.org/docs/latest/api/tray
- https://www.electronjs.org/docs/latest/api/native-image
- https://www.electronjs.org/docs/latest/api/app
- https://www.electronjs.org/docs/latest/api/dock
- https://www.electronjs.org/docs/latest/api/browser-window
- https://www.electronjs.org/docs/latest/tutorial/notifications

electron-builder / electron-forge / electron-packager
- https://www.electron.build/icons.html
- https://www.electron.build/appx.html
- https://www.electron.build/app-builder-lib.interface.nsisweboptions
- https://www.electronforge.io/guides/create-and-add-icons
- https://electron.github.io/packager/main/interfaces/Options.html

Windows (Microsoft)
- https://learn.microsoft.com/windows/apps/design/iconography/app-icon-construction
- https://learn.microsoft.com/microsoft-edge/progressive-web-apps/how-to/icon-theme-color

macOS (Apple – documentação archive)
- https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/IconSetType.html
- https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html

Linux / freedesktop / empacotadores
- https://specifications.freedesktop.org/desktop-entry/1.0/recognized-keys.html
- https://specifications.freedesktop.org/icon-theme/0.6/
- https://specifications.freedesktop.org/icon-naming/0.8/
- https://docs.flatpak.org/en/latest/conventions.html
- https://docs.appimage.org/reference/appdir.html
- https://documentation.ubuntu.com/snapcraft/stable/reference/project-file/snapcraft-yaml/
```

Menções de base de plataforma:
- Para macOS, o fluxo `.iconset → .icns` e a lista de arquivos esperados vêm da documentação de arquivo de Asset Catalog da entity["company","Apple","tech company"] e de guias do `iconutil`. citeturn11view0turn12search1  
- Para Windows e Store assets, tamanhos e escalas se apoiam em documentação da entity["company","Microsoft","tech company"] (incluindo tabelas de scale e listas de dimensões). citeturn32view1turn33view1  
- Para Linux desktop integration (`.desktop`, temas e nomes), o baseline é do entity["organization","freedesktop.org","desktop standards org"] e specs correlatas. citeturn28view2turn37view1turn39view0