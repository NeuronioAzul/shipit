# 🚀 ShipIt! — Plano de Continuidade (v5)

> Criado em: 10/04/2026
>
> Este documento é a continuação do [plan-shipit04.prompt.md](plan-shipit04.prompt.md).
> Consolida o que foi implementado desde a v4 e detalha tudo que ainda falta para finalizar o projeto.

---

## 1. Resumo do Estado Atual

O ShipIt! está funcional com **54 testes passando**, revisão de acessibilidade WCAG AA completa, e build Windows (.exe) funcional. As fases 10 (Testes) e 11 (Revisão UI/UX) do plan-shipit04 foram concluídas com sucesso.

### O que foi feito no plan-shipit04

| Fase | Descrição | Status |
|------|-----------|--------|
| 10.1 | Testes unitários `getLastBusinessDay()` (9 testes) | ✅ |
| 10.2 | Testes de integração `generateDocxReport()` (9 testes) | ✅ |
| 10.3 | Testes de integração database CRUD com sql.js (20 testes) | ✅ |
| 11.1 | Análise WCAG AA — `palette-test.html` criado | ✅ |
| 11.2 | Acessibilidade: `aria-label`, `role="dialog"`, `aria-modal`, Escape, `focus-visible:ring` | ✅ |
| 11.3 | Responsividade: `minWidth: 800, minHeight: 600` | ✅ |
| 11.4 | Consistência visual: sem cores hardcoded, tokens padronizados | ✅ |
| 11.5 | Animações: CSS keyframes (`fade-in`, `modal-fade-in`, `shake`) | ✅ (parcial) |
| 12.3 | Atualização TODO.md e CHANGELOG.md | ✅ |

### O que ainda falta

O inventário abaixo lista **todos** os itens pendentes identificados, organizados por prioridade.

---

## 2. Bugs Conhecidos

### 2.1 BUG: Caminho de ícone do tray em `setTrayIcon()` — CRÍTICO

**Arquivo:** `electron/main.ts` — função `setTrayIcon()`

A função `createTray()` usa o caminho correto:
```ts
path.join(__dirname, '..', 'assets', 'images', 'tray', ...)
```

Mas `setTrayIcon()` usa caminho incorreto (falta `'assets'`):
```ts
path.join(__dirname, '..', 'images', 'tray', ...)
```

**Impacto:** Todas as mudanças dinâmicas de ícone do tray (verde/amarelo/vermelho) falham silenciosamente. O `nativeImage.createFromPath()` retorna imagem vazia e o guard `if (!icon.isEmpty())` impede a atualização. O tray fica travado no ícone padrão.

**Correção:** Adicionar `'assets'` ao caminho em `setTrayIcon()`.

### 2.2 BUG: CHANGELOG com data futura e ordem errada

**Arquivo:** `CHANGELOG.md`

1. `[1.2.0] — 2026-07-10` está com data de julho, mas deveria ser `2026-04-10`
2. Ordem incorreta: `[Unreleased]` e `[1.2.0]` estão no final do arquivo em vez de no topo
3. O formato correto é: `[Unreleased]` → `[1.2.0]` → `[1.1.0]` → `[1.0.0]`

### 2.3 BUG: Versão em `package.json` desatualizada

**Arquivo:** `package.json`

`"version": "1.0.0"` mas o CHANGELOG já está em `1.2.0`. Atualizar para `"1.2.0"`.

### 2.4 BUG: Build falha (`npm run build` exit code 1)

O script `build` executa `tsc && vite build && tsc -p tsconfig.electron.json`. O primeiro `tsc` com `"noUnusedLocals": true` e `"noUnusedParameters": true` pode estar falhando por imports/variáveis não utilizados introduzidos durante as mudanças de UI/UX.

**Diagnóstico:** Executar `npx tsc --noEmit` e corrigir os erros reportados.

### 2.5 BUG: Imagens não inseridas no DOCX gerado — CRÍTICO

**Arquivo:** `electron/report-generator.ts`

Ao gerar o relatório DOCX, algumas imagens de evidência não estão sendo inseridas no arquivo final. O Encarte B deveria conter todas as evidências com imagem + legenda + bookmark, mas certas imagens ficam ausentes no documento gerado.

**Diagnóstico:**
1. Investigar `generateDocxReport()` em `electron/report-generator.ts` — verificar a lógica de leitura e inserção de imagens no ZIP/OpenXML
2. Verificar se o problema ocorre com formatos específicos (png, jpg, gif, bmp, webp) ou com caminhos de arquivo com caracteres especiais
3. Validar se o `fs.readFileSync()` (ou equivalente) está lendo os arquivos corretamente e se o buffer está sendo adicionado ao ZIP
4. Verificar se a referência da imagem no XML do DOCX (`word/media/`, relationships) está sendo criada para todas as imagens
5. Gerar um relatório de teste e abrir o .docx para confirmar quais imagens estão presentes e quais estão faltando

**Correção:** Depende da investigação. Possíveis causas:
- Caminho de evidência inválido ou inexistente no disco
- Falha silenciosa ao ler o arquivo de imagem (try/catch engolindo erro)
- Limite de tamanho ou formato não suportado pelo parser
- Erro na construção dos relationships do OpenXML (rId duplicado ou faltante)

### 2.6 MINOR: `cleanupTrash()` chamada duas vezes no startup

Em `main.ts`, `cleanupTrash()` é chamada tanto em `app.whenReady()` quanto em `startSchedulers()` via `setTimeout`. A chamada duplicada é inofensiva mas desnecessária.

**Correção:** Remover a chamada duplicada em `startSchedulers()`.

---

## 3. Fases Pendentes

### Fase 12: Correção de Bugs e Estabilização

> **Prioridade: ALTA** — Resolver antes de qualquer nova feature.

#### 12.1 — Corrigir build (`npm run build`)

1. Executar `npx tsc --noEmit` para identificar erros de tipo
2. Corrigir todos os erros (imports não utilizados, variáveis não utilizadas, etc.)
3. Executar `npm run build` com sucesso
4. Executar `npm run dev` para validar que o app inicia normalmente

#### 12.2 — Corrigir caminho do tray icon

1. Corrigir `setTrayIcon()` em `electron/main.ts` — adicionar `'assets'` ao path
2. Testar manualmente que os ícones de status (verde/amarelo/vermelho) mudam corretamente

#### 12.3 — Corrigir CHANGELOG e versionamento

1. Mover `[Unreleased]` e `[1.2.0]` para o topo do CHANGELOG.md (ordem descendente)
2. Corrigir data de `[1.2.0]` para `2026-04-10`
3. Atualizar `package.json` `"version"` para `"1.2.0"`

#### 12.4 — Remover `cleanupTrash()` duplicada

1. Remover a chamada de `cleanupTrash()` dentro de `startSchedulers()` (manter apenas a de `app.whenReady()`)

#### 12.5 — Investigar e corrigir imagens ausentes no DOCX

1. Revisar `generateDocxReport()` em `electron/report-generator.ts` — fluxo de inserção de imagens
2. Verificar leitura dos arquivos de evidência (`fs.readFileSync` ou similar) e adição ao ZIP
3. Verificar construção dos relationships do OpenXML (cada imagem precisa de um `rId` único em `word/_rels/document.xml.rels`)
4. Gerar um relatório de teste com múltiplas evidências de formatos variados (png, jpg, gif, webp, bmp)
5. Abrir o .docx gerado manualmente e confirmar que todas as imagens estão presentes no Encarte B
6. Corrigir o bug com base na investigação

---

### Fase 13: Completar Animações e Feedback Visual

> **Prioridade: MÉDIA** — Itens do plan-shipit04 seção 3.2.5 que ficaram incompletos.

#### 13.1 — Shake animation no drag de evidência

O CSS keyframe `shake` e a classe `animate-shake` existem em `src/index.css`, mas não são usados em nenhum componente.

**Implementação:**
1. Em `ActivityDetailPage.tsx` ou `EvidenceUpload.tsx`: quando o usuário tenta arrastar uma imagem de evidência pelo corpo (não pelo drag handle), aplicar `animate-shake` ao drag handle para indicar a forma correta de arrastar
2. Usar `onDragStart` na imagem para detectar o drag incorreto e ativar a animação

#### 13.2 — Loading spinner em botões de ação

Adicionar indicador visual de loading nos botões:
- "Gerar Relatório" (DashboardPage)
- "Salvar" (ActivityFormPage, ProfilePage)

**Implementação:**
1. Estado `isLoading` no componente
2. Desabilitar botão + mostrar spinner (FontAwesome `fa-spinner fa-spin`) durante a operação async
3. Restaurar ao completar (sucesso ou erro)

#### 13.3 — Transições de página com React Router

Atualmente existe apenas `animate-page-in` no `<main>` wrapper (AppLayout), que anima uma vez no load.

**Implementação:**
1. Usar `useLocation()` do React Router para detectar mudanças de rota
2. Aplicar fade-in a cada navegação (re-trigger da animação via `key={location.pathname}`)

#### 13.4 — Indicadores visuais de drag & drop

Melhorar o feedback visual durante drag & drop de evidências e atividades:
1. Highlight mais visível na zona de drop ativa
2. Preview visual do item sendo arrastado (overlay)

---

### Fase 14: Aplicar Nova Paleta de Cores

> **Prioridade: MÉDIA** — Aguarda validação do usuário.
>
> A análise WCAG AA em `docs/new-ui-ux-visual/palette-test.html` comparou a paleta atual com a proposta em `docs/new-ui-ux-visual/tokens.css`. A nova paleta resolve vários problemas de contraste (ex: `--warning` atual é amarelo puro que falha WCAG AA).

#### 14.1 — Validação da paleta

1. Abrir `palette-test.html` no navegador
2. Revisar as comparações de contraste lado a lado
3. Aprovar ou solicitar ajustes na paleta proposta

#### 14.2 — Aplicar tokens ao `src/index.css`

Após aprovação:
1. Substituir as variáveis CSS em `src/index.css` pelos valores de `tokens.css`
2. Converter formato se necessário (a paleta atual usa `hsl()`, a proposta usa RGB triplets)
3. Adicionar novos tokens que não existem hoje: `--secondary`, `--popover`, `--surface-*`, `--disabled-*`, `--selection-*`, `--chart-*`, `--radius-*`, `--shadow-*`
4. Testar todas as telas em modo claro e escuro
5. Verificar que nenhum texto/ícone ficou ilegível

#### 14.3 — Atualizar `palette-test.html`

1. Atualizar a análise pós-aplicação para refletir o estado real
2. Ou remover o arquivo se não for mais necessário

---

### Fase 15: Melhorar Cobertura de Testes

> **Prioridade: MÉDIA**

#### 15.1 — Teste completo para `deleteActivity` com FK cascade

O teste atual em `electron/database.test.ts` cria apenas um `Activity` vazio antes de deletar. Não exercita o caminho de cascade FK.

**Implementação:**
1. Criar um teste que:
   - Cria um `Activity`
   - Cria um ou mais `Evidence` vinculados
   - Cria um `ActivityReport` vinculado
   - Deleta o `Activity`
   - Verifica que `Evidence` e `ActivityReport` foram removidos

#### 15.2 — Testes E2E com Playwright

> Adiado até que a UI esteja estável (pós Fases 12-14).

1. Instalar `@playwright/test` como devDependency
2. Criar `playwright.config.ts` configurado para Electron
3. Testes mínimos propostos:
   - Navegação entre todas as telas (Dashboard, Atividades, Perfil, Configurações)
   - Criar uma atividade com evidência
   - Gerar um relatório DOCX
   - Alternar tema (dark/light)
   - Abrir e fechar modais (About, confirmação de exclusão)
4. Adicionar script `npm run test:e2e` ao `package.json`

---

### Fase 16: Distribuição Multiplataforma

> **Prioridade: BAIXA** — Requer acesso a máquinas macOS e Linux para testes.

#### 16.1 — Build macOS (.dmg)

1. Configurar electron-builder para target `dmg`
2. Ajustar ícones de tray para macOS (template images — ícones brancos para dark menu bar)
3. Testar `app.setLoginItemSettings()` para auto-launch no macOS
4. Validar caminhos de `userData`, `extraResources`, protocolos customizados
5. Testar a geração de DOCX e armazenamento de evidências

#### 16.2 — Build Linux (.AppImage)

1. Configurar electron-builder para target `AppImage`
2. Ajustar ícones de tray para Linux (AppIndicator)
3. Testar auto-launch via `.desktop` file no Linux
4. Validar caminhos de `userData`, `extraResources`, protocolos customizados
5. Testar a geração de DOCX e armazenamento de evidências

#### 16.3 — Testes finais multiplataforma

1. Testar empacotamento completo em cada plataforma
2. Validar que o instalador funciona corretamente
3. Verificar que todos os assets estão incluídos no pacote
4. Teste de sanidade: criar atividade → adicionar evidência → gerar relatório

---

### Fase 17: Funcionalidades Opcionais

> **Prioridade: BAIXA** — Nice-to-have, implementar se houver tempo.

#### 17.1 — Diretório de armazenamento de dados customizável

Permitir que o usuário escolha onde o `shipit.db` e as evidências são armazenados (em vez de `userData` padrão).

1. Adicionar seletor de diretório na tela de Configurações
2. Implementar migração de dados do diretório antigo para o novo
3. Atualizar `getDb()` para usar o diretório configurado
4. Atualizar protocolos customizados (`shipit-evidence://`) para o novo path

---

## 4. Ordem de Execução Recomendada

```
Fase 12 (Bugs)          ← FAZER PRIMEIRO — build nem funciona
  └─ 12.1 Fix build
  └─ 12.2 Fix tray icon path
  └─ 12.3 Fix CHANGELOG + version
  └─ 12.4 Fix cleanupTrash duplicada
  └─ 12.5 Fix imagens ausentes no DOCX  ← requer teste manual
       │
Fase 13 (Animações)     ← Completar o que faltou do plan-shipit04
  └─ 13.1 Shake animation
  └─ 13.2 Loading spinners
  └─ 13.3 Page transitions
  └─ 13.4 Drag & drop indicators
       │
Fase 14 (Paleta)        ← Depende de validação do usuário
  └─ 14.1 Validação
  └─ 14.2 Aplicar tokens
  └─ 14.3 Atualizar docs
       │
Fase 15 (Testes)        ← Melhorar cobertura antes de distribuir
  └─ 15.1 FK cascade test
  └─ 15.2 Playwright E2E
       │
Fase 16 (Distribuição)  ← Requer máquinas macOS/Linux
  └─ 16.1 macOS
  └─ 16.2 Linux
  └─ 16.3 Testes finais
       │
Fase 17 (Opcional)
  └─ 17.1 Custom data dir
```

---

## 5. Critérios de Conclusão

| Critério | Como validar |
|----------|-------------|
| Build funcional | `npm run build` exit code 0 |
| Todos os testes passam | `npx vitest run` — 54+ testes passando |
| Tray icons funcionam | Mudar status de alerta e verificar que o ícone do tray muda |
| CHANGELOG correto | Seções em ordem descendente, datas corretas |
| Shake animation funcional | Tentar arrastar evidência pela imagem → handle treme |
| Loading spinners | Clicar "Gerar Relatório" → botão mostra spinner |
| Paleta aplicada | Todas as telas legíveis em light/dark, contraste WCAG AA |
| E2E passando | `npm run test:e2e` com cenários mínimos |

---

## 6. Referências

- [plan-shipit04.prompt.md](plan-shipit04.prompt.md) — Plano anterior (Fases 10-12)
- [docs/TODO.md](../docs/TODO.md) — Roadmap completo do projeto
- [docs/new-ui-ux-visual/palette-test.html](new-ui-ux-visual/palette-test.html) — Análise WCAG AA
- [docs/new-ui-ux-visual/tokens.css](new-ui-ux-visual/tokens.css) — Paleta proposta
- [CHANGELOG.md](../CHANGELOG.md) — Histórico de versões
