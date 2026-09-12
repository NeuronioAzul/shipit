## Plan: Relatório em PDF sem depender do Word (ou similar)

Permitir gerar o **Relatório de Serviço em PDF** diretamente do ShipIt, em qualquer máquina, **sem Word, LibreOffice ou qualquer software externo**. O Electron já embute o Chromium, cujo motor de impressão (`webContents.printToPDF`) produz PDF nativamente: o app monta um **HTML fiel ao template institucional do MEC** com os mesmos dados do DOCX, renderiza em uma `BrowserWindow` oculta e imprime para PDF. As **referências de página** das evidências (que no DOCX são campos `PAGEREF` calculados pelo Word ao abrir) passam a ser **calculadas pelo próprio app** por medição, garantindo "Páginas 12, 13" corretas no PDF.

A abordagem recomendada mantém a geração DOCX intacta, adiciona um gerador paralelo (`report-html.ts` puro e testável + `report-pdf-generator.ts` orquestrando o Chromium), oferece a escolha de formato no Dashboard e registra o formato no histórico de relatórios. Única dependência nova: `pdf-lib` (JS puro, sem binário nativo) para contar páginas dos PDFs de medição — e como plano B para mesclar PDFs se orientação mista em um único `printToPDF` falhar.

### Contexto

- Geração atual: [electron/report-generator.ts](../../electron/report-generator.ts) (`generateDocxReport`) preenche `public/RELATÓRIO DE SERVIÇO - TEMPLATE.docx` via JSZip/xmldom: placeholders `{{…}}`, célula de atendimento com checkboxes ☒/☐, **Encarte A** (3ª tabela: linha de projeto + linhas de atividade clonadas, `cantSplit`), **Encarte B** (uma página por evidência: imagem ajustada a 27×15 cm com legenda de até 2 linhas, ou texto), hyperlinks `link 01…` e campos `PAGEREF` para as páginas das evidências, com `updateFields=true` para o Word recalcular ao abrir.
- O template tem **4 seções**: 3 em retrato (capa/índice; Objetivo + Quadro 1 + Informações básicas/Quadro 2 + Atividades executadas; Encarte A) e a 4ª em **paisagem** (Encarte B). Margens ≈ 2 cm (1134 twips), cabeçalho 1,25 cm. Fontes: Arial Nova / Arial Nova Cond / Arial / Calibri. Cabeçalhos com logos (`word/media/image1..3.png`), rodapé com "Página N". Índice na capa com números de página (campo TOC, também recalculado pelo Word).
- Quem abre o DOCX sem Word vê `PAGEREF`/TOC desatualizados; quem não tem nenhum editor não abre nada. Daí a necessidade de um PDF final e autossuficiente.
- Fluxo de UI: [DashboardPage.tsx](../../src/pages/DashboardPage.tsx) → botão "Gerar Relatório — {mês}" → diálogo de confirmação → `window.electronAPI.generateReport(monthRef)` → handler `app:generateReport` em [main.ts](../../electron/main.ts) (`getReportPayload` + `generateDocxReport` + `saveReport`) → feedback + "Abrir pasta" (`app:openFileInFolder`) + histórico (`getReports`). Entidade [Report.ts](../../electron/entities/Report.ts) guarda `file_path`, `report_name`, `status`; `saveReport` marca os relatórios anteriores do mês como `Excluído`.
- Pasta de relatórios configurável em Settings (`reportsDirectory`), padrão `userData/reports`.
- Regras do projeto: `contextIsolation: true`/`nodeIntegration: false` sempre; arquivos locais só via protocolos (`shipit-evidence://` já serve imagens da pasta `evidences/` com validação de caminho) — `file://` bloqueado.
- Limitações do Chromium relevantes: **não** suporta `target-counter()` (referência cruzada a número de página em CSS) nem margin boxes de `@page` (`@top-center`) — número de página só via `footerTemplate` do `printToPDF`; suporta `@page { size }` com páginas nomeadas (`page:` + `preferCSSPageSize: true`) para misturar retrato/paisagem; `thead` repete em cada página; `break-inside: avoid` funciona em linhas de tabela. Navegação por `data:` URL tem limite de ~2 MB — inviável com imagens embutidas.

### Decisões de design

**Arquitetura (main process)**

```
getReportPayload(month)
   └─▶ report-html.ts        buildReportHtml(payload, ctx) → string     (puro, testável no Vitest)
          │                   sanitizeRichTextHtml(html) → string
          ▼
   report-pdf-generator.ts   generatePdfReport(payload) → { filePath, reportName }
          ├─ logos: extraídos do próprio template DOCX (JSZip, word/media/*.png) → data URI  (uma fonte de verdade para a identidade visual)
          ├─ HTML servido em memória por shipit-report://render/<token>   (sem file://, sem limite de data: URL)
          ├─ imagens de evidência via shipit-evidence://local?path=…       (protocolo já existente e validado)
          ├─ BrowserWindow oculta: show:false, sandbox:true, contextIsolation:true, nodeIntegration:false, javascript:false
          ├─ medição de páginas: insertCSS/removeInsertedCSS esconde partes + printToPDF + pdf-lib.getPageCount()
          └─ passe final: printToPDF({ preferCSSPageSize, printBackground, displayHeaderFooter, headerTemplate, footerTemplate }) → fs.writeFileSync
```

- **JavaScript desabilitado na janela oculta**: o conteúdo inclui HTML de descrições (TipTap) — mesmo sanitizado, a página não precisa de JS. O controle de "qual parte está visível" em cada passe de medição é feito por `webContents.insertCSS` (ex.: `[data-part]:not([data-part="cover"]){display:none}`) e `removeInsertedCSS`, sem executar nada dentro da página. CSP via `<meta http-equiv="Content-Security-Policy">`: `default-src 'none'; img-src shipit-evidence: data:; style-src 'unsafe-inline'`.
- **Sanitização** (`sanitizeRichTextHtml`): allowlist `p, br, strong, b, em, i, u, s, ul, ol, li`; remove atributos e qualquer outra tag/conteúdo (`script`, `style`, `img`, `a`…), escapando texto. Descrições legadas em texto plano: `escapeHtml` + `\n` → `<br>` (mesmo critério de `isLikelyHtmlDescription`).
- **Nada de dependência externa de sistema**: sem LibreOffice, sem Word, sem Ghostscript. Funciona em Windows/macOS/Linux igual.

**Fidelidade ao template (HTML/CSS)**

- Uma folha CSS de impressão dedicada, com as medidas do template: `@page portrait { size: A4 portrait; margin: 2cm 2cm 2cm 2cm }`, `@page landscape { size: A4 landscape; margin: … }`; partes `[data-part="cover"|"body"|"encarte-a"]` com `page: portrait` e `[data-part="encarte-b"]` com `page: landscape`; `break-before: page` no início de cada parte e de cada página de evidência.
- Fontes: `font-family: "Arial Nova", "Arial Nova Cond", Arial, "Liberation Sans", Helvetica, sans-serif` (fallbacks para máquinas sem Arial Nova). Tamanhos em `pt` iguais aos `w:sz` do template (ex.: células do Encarte A em 9 pt).
- Estrutura espelhada 1:1 com o DOCX: capa (logos, "RELATÓRIO DE SERVIÇO", contrato, nome, perfil/senioridade, data por extenso do último dia útil — reuso de `getLastBusinessDay`) + Índice; seções 1–3 com **Quadro 1** (4 critérios) e **Quadro 2** (mês, atendimento com ☒/☐, disponibilidades, perfil, atividades correlacionadas); **Encarte A** (cabeçalho com PROFISSIONAL/ESFORÇO MÍNIMO/PERFIL/NÍVEL + tabela com `thead` repetido, linhas de projeto sombreadas, `tr { break-inside: avoid }`); **Encarte B** (uma página por evidência: `<img>` com `max-width: 27cm; max-height: 15cm; object-fit: contain`, legenda centralizada limitada a 2 linhas via `-webkit-line-clamp: 2`; evidência de texto em `white-space: pre-wrap`, podendo ocupar mais de uma página).
- Textos fixos do template (Objetivo, critérios, frases institucionais) vivem em `report-html-content.ts` como constantes pt-BR. **Teste-guarda**: compara essas constantes com o texto extraído do `document.xml` do template via JSZip — se alguém alterar o DOCX e esquecer o HTML, o teste acusa.
- Cabeçalho e rodapé: `displayHeaderFooter: true` com `headerTemplate` (logos como data URI, "Ministério da Educação / Subsecretaria…") e `footerTemplate` ("Página `<span class="pageNumber">`"), CSS inline (exigência do Chromium). Aproximação assumida: cabeçalho **igual em todas as páginas** (o DOCX tem variantes por seção) — ver Decisão pendente 2.
- Referências no Encarte A: `link 01`, `link 02`… como `<a href>` (clicáveis no PDF) + "Página N" / "Páginas N, M" com os números medidos.

**Medição de páginas (o que substitui PAGEREF/TOC)**

Propriedade usada: *se o documento for truncado logo após um elemento, esse elemento está na última página do PDF resultante*. Logo `pageOf(el) = countPages(print(prefixo até el))`. Implementação:

1. `countPages(prefixoAté(id))` para: fim da capa, títulos 1/2/3 (Índice), início do Encarte A, início do Encarte B.
2. Evidências de imagem ocupam exatamente 1 página; evidências de texto são medidas isoladamente (`countPages(somente a evidência k)`), pois começam sempre em página nova. Assim `pageOf(ev_k) = pageOf(EncarteB) + Σ páginas(ev_<k)` — só **um** `printToPDF` por evidência de texto, nenhum por imagem.
3. Preencher Índice + referências no HTML (`buildReportHtml(payload, { pages })`), recarregar e **re-medir o início do Encarte B**: se o preenchimento das células "Páginas…" mudou a paginação do Encarte A, repetir (máx. 3 iterações; converge em 1–2).
4. Passe final: documento completo → PDF gravado em `reportsDir` com `RELATÓRIO DE SERVIÇO - <PERFIL>_<NOME>_<MÊS>.pdf` (extrair `buildReportFileName(profile, month, ext)` do gerador DOCX para reuso).

Custo: ~5 impressões fixas + 1 por evidência de texto + 1–2 finais; janela oculta reaproveitada entre passes (só `insertCSS`), ordem de poucos segundos.

**Produto / UX**

```
Diálogo de confirmação (Dashboard):
┌ Gerar relatório — setembro de 2026 ──────────────────────────┐
│  O arquivo será salvo na pasta de relatórios do app.          │
│                                                               │
│   [ 📄 Gerar PDF ]   [ 📝 Gerar DOCX ]            [ Cancelar ] │
│   Recomendado — abre em qualquer computador  · Editável no Word│
└───────────────────────────────────────────────────────────────┘

Histórico:
  ✔ 📄 RELATÓRIO DE SERVIÇO - …_SETEMBRO.pdf    11/09/2026 14:02 — Gerado   [Abrir] [Pasta]
  ✔ 📝 RELATÓRIO DE SERVIÇO - …_SETEMBRO.docx   11/09/2026 13:58 — Gerado   [Pasta]
```

- Dois botões no diálogo (PDF primeiro, como recomendado, com microcopy explicando a diferença). Sem preferência global nova em Settings nesta entrega.
- Histórico mostra ícone por formato (`fa-file-pdf` / `fa-file-word`), botão **Abrir** (abre o arquivo no visualizador padrão — novo handler `app:openReportFile`, restrito à pasta de relatórios configurada/padrão) e **Pasta** (já existe).
- `Report.format: 'docx' | 'pdf'` (default `'docx'`); `saveReport` passa a marcar como `Excluído` só os relatórios anteriores **do mesmo mês e formato** (hoje gerar um PDF marcaria o DOCX como excluído).
- Feedback de sucesso ganha "Abrir PDF" além de "Abrir pasta". Mensagens de erro específicas: perfil ausente, mês sem atividades, falha na renderização.

### Decisões pendentes (para aprovação)

1. **Dependência `pdf-lib`** (JS puro, MIT, sem binário; ~ leve): usada para contar páginas nos passes de medição e como plano B de mesclagem. Alternativa sem dependência: contar `/Type /Page` no PDF por regex — funciona com a saída do Chromium (Skia) hoje, mas é frágil. **Recomendação: `pdf-lib`.**
2. **Cabeçalho uniforme** em todas as páginas do PDF (limitação de `headerTemplate`), enquanto o DOCX varia por seção. Alternativa: cabeçalho **no fluxo** apenas na capa + `position: fixed` (o Chromium repete elementos fixos em toda página impressa) — dá mais controle visual, mas exige reservar espaço manualmente. **Recomendação: `headerTemplate` na primeira entrega; refinar depois se a diferença incomodar.**
3. **Botão "Gerar ambos"** (DOCX + PDF na mesma ação)? **Recomendação: não** agora — dois botões bastam e evitam duplicar entradas no histórico sem querer.

### Steps

**Fase 0 — Spike técnico (antes de codar o produto; ~1h, descartável, no scratchpad)**
1. PoC com uma `BrowserWindow` oculta em `npm run dev`: HTML com duas páginas nomeadas (retrato + paisagem) e `printToPDF({ preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate, footerTemplate })`; validar (a) orientação mista em um único PDF, (b) `pageNumber` no rodapé, (c) `insertCSS` escondendo partes com `javascript: false`, (d) `pdf-lib` contando páginas, (e) `<img src="shipit-evidence://…">` carregando na janela oculta. Registrar resultado no plano (seção Gotchas). Se (a) falhar: plano B = imprimir partes retrato e paisagem separadamente e mesclar com `pdf-lib` (`copyPages`).

**Fase 1 — HTML do relatório (puro, testável)**
2. Extrair de [report-generator.ts](../../electron/report-generator.ts) para [electron/report-shared.ts](../../electron/report-shared.ts) o que os dois formatos compartilham: `MONTH_NAMES`, `getLastBusinessDay`, `formatDateBR`, `formatAvailabilityValue`, `formatMinimumEffortHours`, `groupByProject`, `parseReferenceLinks`, `buildReportFileName(profile, month, ext)`, `getTemplatePath`, `getReportsDir`, `isLikelyHtmlDescription`, `getImageDimensions`. Manter re-exports para não quebrar os testes existentes.
3. Criar [electron/report-html-content.ts](../../electron/report-html-content.ts) com os textos fixos do template (pt-BR) e [electron/report-html.ts](../../electron/report-html.ts) com `sanitizeRichTextHtml`, `escapeHtml`, `buildReportHtml(payload, { logos, pages?: ReportPageMap })` e o CSS de impressão. Toda parte/âncora recebe `id`/`data-part` estáveis (`cover`, `body`, `heading-1..3`, `encarte-a`, `encarte-b`, `ev-<idx>`) para as medições por `insertCSS`. *depends on 2*
4. Testes [electron/report-html.test.ts](../../electron/report-html.test.ts): placeholders (nome, contrato, mês por extenso, data do último dia útil, checkboxes de atendimento, disponibilidades); agrupamento por projeto e numeração global das atividades; uma página por evidência com âncoras; referências "Página/Páginas" e `link NN` quando `pages` é fornecido, placeholders neutros quando não; sanitização (remove `script`/`img`/atributos, preserva `strong`/`ul`); descrição legada com quebras; **teste-guarda** dos textos fixos contra o `document.xml` do template (JSZip, como em `report-generator.integration.test.ts`). *depends on 3*

**Fase 2 — Gerador PDF (Electron)**
5. Adicionar `pdf-lib` em `dependencies` (`npm i pdf-lib`) e registrar em [docs/DEPENDENCIES.md](../../docs/DEPENDENCIES.md). *parallel with 3*
6. Em [electron/main.ts](../../electron/main.ts): registrar `shipit-report` em `protocol.registerSchemesAsPrivileged` (`standard: true, secure: true, supportFetchAPI: true`) e `protocol.handle('shipit-report', …)` servindo HTML de um `Map<token, string>` em memória (404 para token desconhecido; token removido ao fim da geração). *depends on 1*
7. Criar [electron/report-pdf-generator.ts](../../electron/report-pdf-generator.ts): `extractTemplateLogos()` (JSZip → data URIs, cache em memória), `createHiddenReportWindow()`, `countPdfPages(buffer)` (pdf-lib), `measurePages(win, anchors)` (insertCSS/removeInsertedCSS + printToPDF), `resolveReportPages(payload, …)` (algoritmo da seção "Medição", com laço de estabilização ≤ 3), `generatePdfReport(payload): Promise<{ filePath; reportName }>` (passe final, grava em `reportsDir`, fecha a janela em `finally`, timeout de segurança de 60 s). Opções de impressão centralizadas em uma constante (`preferCSSPageSize`, `printBackground`, `displayHeaderFooter`, `headerTemplate`, `footerTemplate`, `margins: { marginType: 'none' }` — margens vêm do `@page`). *depends on 3, 5, 6*
8. Testes [electron/report-pdf-generator.test.ts](../../electron/report-pdf-generator.test.ts) para as partes puras: `countPdfPages` com PDFs criados via `pdf-lib` no próprio teste (1, 3, 10 páginas); `resolveReportPages` com um `measure` falso (imagens = 1 página, texto de 2 páginas, estabilização em 2 iterações, limite de 3); `extractTemplateLogos` lê 3 PNGs do template real. A renderização real fica para o E2E. *depends on 7*

**Fase 3 — Persistência, IPC e UI**
9. Em [electron/entities/Report.ts](../../electron/entities/Report.ts): `@Column({ type: 'text', default: 'docx' }) format!: ReportFormat` (`'docx' | 'pdf'`). Em [electron/database.ts](../../electron/database.ts) `saveReport`: aceitar `format` e marcar `Excluído` só os anteriores com mesmo `month_reference` **e** `format`. Em [src/vite-env.d.ts](../../src/vite-env.d.ts): `ReportData.format` e `ReportFormat`. Teste em [electron/database.test.ts](../../electron/database.test.ts) (PDF novo não exclui DOCX do mesmo mês; DOCX novo exclui DOCX anterior). *parallel with 7*
10. Em [electron/main.ts](../../electron/main.ts): `app:generateReport(monthReference, format = 'docx')` — despacha para `generateDocxReport` ou `generatePdfReport`, grava `format` no `saveReport`; novo `app:openReportFile(filePath)` com validação de que o caminho está dentro da pasta de relatórios (configurada ou padrão) antes de `shell.openPath`. [electron/preload.ts](../../electron/preload.ts) e [src/vite-env.d.ts](../../src/vite-env.d.ts): novas assinaturas. *depends on 7, 9*
11. Em [src/pages/DashboardPage.tsx](../../src/pages/DashboardPage.tsx): diálogo com "Gerar PDF" (`btn btn-accent`, `fa-file-pdf`, microcopy "Recomendado — abre em qualquer computador") e "Gerar DOCX" (`btn btn-outline`, `fa-file-word`, "Editável no Word"); estado `generating` com o formato em andamento ("Gerando PDF…"); feedback de sucesso com "Abrir" (`openReportFile`, só para PDF) + "Abrir pasta"; histórico com ícone por `format` e botão "Abrir" para PDF. Ids: `#dashboard-report-btn-pdf`, `#dashboard-report-btn-docx`, `#dashboard-report-open-file`. *depends on 10*
12. Atualizar [electron/report-generator.ts](../../electron/report-generator.ts) para importar os helpers de `report-shared.ts` (sem mudança de comportamento; `report-generator.test.ts` e `report-generator.integration.test.ts` continuam verdes). *depends on 2*

**Fase 4 — E2E, validação e docs**
13. Em [e2e/app.spec.ts](../../e2e/app.spec.ts): cenário "generates a PDF report": semear perfil + mês com 2 atividades (uma com 1 imagem e 1 evidência de texto, links de referência), clicar "Gerar PDF", esperar sucesso; ler o arquivo do disco e, com `pdf-lib`, afirmar `getPageCount() === páginasPré + 2`; extrair texto? (não — pdf-lib não extrai texto; validar nome do arquivo, tamanho > 0 e contagem); histórico lista PDF e DOCX lado a lado após gerar os dois; "Abrir" chama `shell.openPath` (stub via `app.evaluate`). **Escrito pelo Claude; execução do Playwright é do usuário** (`e2e-test-ownership`). *depends on 11*
14. Validação manual de fidelidade: gerar DOCX e PDF do mesmo mês; abrir o DOCX no Word (F9 para atualizar campos) e o PDF no navegador; comparar capa, Quadros 1 e 2, Encarte A (quebras de linha, sombreamento, `link NN`, "Páginas…" batendo com as páginas reais do Encarte B), Encarte B (imagem dentro de 27×15 cm, legenda ≤ 2 linhas, texto multi-página). Testar em máquina **sem Office**. *depends on 11*
15. `npm run test` + `npm run build` + `npm run dist` (conferir que `pdf-lib` entra no asar e que o template continua em `extraResources`). *depends on all*
16. Invocar a skill `shipit-release-and-doc-sync` (Doc Sync): CHANGELOG `[Unreleased]`, TODO/DONE, [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (novo módulo de PDF, protocolo `shipit-report://`, handlers `app:generateReport(format)`/`app:openReportFile`, coluna `Report.format`), [DEPENDENCIES.md](../../docs/DEPENDENCIES.md) (`pdf-lib`), manual do usuário se houver seção de relatórios. *depends on 15*

### Relevant files
- [electron/report-generator.ts](../../electron/report-generator.ts) — DOCX (inalterado em comportamento; helpers extraídos).
- [electron/report-shared.ts](../../electron/report-shared.ts) — helpers comuns DOCX/PDF (novo).
- [electron/report-html-content.ts](../../electron/report-html-content.ts), [electron/report-html.ts](../../electron/report-html.ts) (+ `.test.ts`) — HTML/CSS do relatório e sanitização (novos).
- [electron/report-pdf-generator.ts](../../electron/report-pdf-generator.ts) (+ `.test.ts`) — janela oculta, medição, `printToPDF` (novo).
- [electron/main.ts](../../electron/main.ts) — protocolo `shipit-report`, `app:generateReport(format)`, `app:openReportFile`.
- [electron/preload.ts](../../electron/preload.ts), [src/vite-env.d.ts](../../src/vite-env.d.ts) — exposição e tipos.
- [electron/entities/Report.ts](../../electron/entities/Report.ts), [electron/database.ts](../../electron/database.ts) (+ `.test.ts`) — `format` e regra de exclusão por formato.
- [src/pages/DashboardPage.tsx](../../src/pages/DashboardPage.tsx) — escolha de formato, feedback, histórico.
- [package.json](../../package.json), [docs/DEPENDENCIES.md](../../docs/DEPENDENCIES.md) — `pdf-lib`.
- [e2e/app.spec.ts](../../e2e/app.spec.ts) — cenário PDF.
- `public/RELATÓRIO DE SERVIÇO - TEMPLATE.docx` — fonte dos logos e do teste-guarda (sem alteração).

### Gotchas
- **`data:` URL não serve para o HTML** (limite ~2 MB do Chromium; imagens estourariam). Por isso o protocolo `shipit-report://` em memória.
- **`file://` é bloqueado** por regra do projeto — imagens sempre via `shipit-evidence://` (já valida que o arquivo está em `evidences/` ou `trash/`).
- **`preferCSSPageSize: true`** é obrigatório para orientação mista; sem ele o `printToPDF` força um único tamanho. Confirmar no spike (Fase 0) — plano B: dois PDFs + `pdf-lib`.
- **Sem `target-counter()`/margin boxes no Chromium**: números de página só via `footerTemplate`; referências cruzadas só por medição (algoritmo da seção "Medição").
- **`headerTemplate`/`footerTemplate`**: CSS inline apenas, sem recursos externos (logos como data URI), fonte padrão pequena — definir `font-size` explícito; ocupam a margem, então `@page` precisa de margem superior/inferior suficiente.
- **Célula "Páginas…" pode mudar a paginação** do Encarte A após o preenchimento → laço de estabilização (re-medir o início do Encarte B; máx. 3 iterações).
- **Evidência de texto pode ocupar várias páginas**: medir isoladamente; a referência aponta para a página inicial.
- **`javascript: false` + `insertCSS`**: não usar `executeJavaScript` na janela oculta; toda alternância de partes é por CSS.
- **Sanitização é obrigatória**: a descrição vem do TipTap (HTML). Allowlist estrita; sem atributos.
- **Fonte Arial Nova** pode não existir na máquina (Linux/macOS): o fallback muda ligeiramente a largura do texto — aceito. Futuro: desofuscar as fontes embutidas em `word/fonts/*.odttf` e usar `@font-face`.
- **Timeout**: janela oculta sempre fechada em `finally`; `printToPDF` com guarda de 60 s para não deixar processo pendurado.
- **Dois processos TS**: tudo isto vive em `electron/` (CommonJS); nada é importado de `src/`.
- **Histórico**: sem a regra "mesmo formato", gerar PDF marcaria o DOCX do mês como `Excluído`.
- **E2E**: o Electron não sobe no sandbox; Claude escreve, o usuário executa.

### Verificação
1. Spike (Fase 0) confirma orientação mista, rodapé com número de página, `insertCSS` com JS desligado e imagens via `shipit-evidence://`.
2. `npm run dev`: gerar PDF de um mês com ≥ 3 atividades em 2 projetos, links, 3 imagens (retrato, paisagem, muito larga) e 1 evidência de texto longa (> 1 página). Conferir: Índice, "Páginas N, M" batendo com as páginas reais, `link NN` clicáveis, imagens dentro da área, legendas ≤ 2 linhas, rodapé "Página N" em todas as páginas, Encarte B em paisagem.
3. Máquina sem Office: gerar PDF e abrir com o visualizador do sistema/navegador.
4. Gerar DOCX depois do PDF do mesmo mês: histórico mostra os dois como `Gerado`; gerar outro PDF marca só o PDF anterior como `Excluído`.
5. "Abrir" abre o PDF; "Abrir pasta" revela o arquivo; `app:openReportFile` recusa caminho fora da pasta de relatórios.
6. `npm run test` + `npm run build` + `npm run dist` verdes; E2E pelo usuário.

### Fora de escopo (considerações futuras)
- Preferência global de formato padrão em Settings e "Gerar ambos".
- Cabeçalhos diferentes por seção (fidelidade total ao DOCX) via `position: fixed` por parte.
- `@font-face` com as fontes embutidas do template (desofuscação ODTTF).
- Assinatura digital / PDF-A; anexar o PDF por e-mail; pré-visualização do PDF dentro do app.
