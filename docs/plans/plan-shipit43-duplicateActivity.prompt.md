## Plan: Duplicar atividade

Adicionar a ação **"Duplicar"** à atividade (no detalhe e no card da lista), abrindo um pequeno modal de opções — mês de referência de destino, manter ou limpar o período, copiar publicações por ambiente, copiar evidências — que cria uma **nova atividade** a partir da original e leva o usuário direto para a **edição** da cópia. O caso de uso principal é o fluxo do plano 42: a mesma entrega já publicada em dsv/hmg vira, em outra data, uma nova atividade só para Produção, sem redigitar descrição, escopo e links.

A abordagem recomendada é um handler IPC `db:duplicateActivity(id, options)` no main process (a cópia de evidências de imagem exige duplicar arquivos em `userData/evidences/`, o que só o main pode fazer), com o mesmo fallback em `localDb.ts` para o browser, um componente de modal reutilizável e testes nas três camadas.

### Contexto

- Não existe nenhuma forma de duplicar hoje (nem no menu, nem na lista, nem no detalhe). Para "criar outra atividade só para Produção", o usuário recria tudo à mão.
- Criação de atividade: `saveActivity` em [electron/database.ts](../../electron/database.ts) gera UUID v7 e calcula `order = max(order do mês) + 1` (`getMaxActivityOrder`/`normalizeActivityOrdersForMonth`). Reaproveitar essa função para a cópia garante ordem correta no mês de destino.
- Evidências: imagens são arquivos em `userData/evidences/<uuid>.<ext>` (`saveEvidence`/`saveEvidenceFromBuffer` copiam com `fs.copyFileSync`/`writeFileSync`); textos ficam só no banco (`saveTextEvidence`). Soft-delete via `deleted_at` — a cópia deve ignorar evidências na lixeira. `sort_index` define a ordem.
- Padrão de modal já existente: `#activity-detail-delete-modal` em [ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx) (`fixed inset-0 … bg-black/50`, card `bg-card border rounded-lg p-6 animate-modal-in`, `role="alertdialog"`, fecha no backdrop). Reusar exatamente essa linguagem.
- Padrão IPC: registrar em [electron/main.ts](../../electron/main.ts) (`ipcMain.handle('db:…')` com `import('./database')` dinâmico), expor em [electron/preload.ts](../../electron/preload.ts) e tipar em [src/vite-env.d.ts](../../src/vite-env.d.ts). Fallback browser em [localDb.ts](../../src/services/localDb.ts) (evidências de imagem lá são data URLs — duplicar é copiar o registro).
- Ações do card da lista ([ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx) ~L176–193): dois `btn btn-ghost btn-icon` (editar/excluir) visíveis em `opacity-70` com destaque no hover/focus. Cabeçalho do detalhe: `Editar` (`btn btn-primary`) + `Excluir` (`btn btn-outline-destructive`).
- Depende do plano 42 (campo `deployments`) para a opção "copiar publicações". Se implementado antes do 42, a opção copia `environment`/`svn_releases`; a ordem recomendada é **42 → 43**.

### Decisões de design

**O que a cópia leva (sempre)**: `description` (verbatim — é o texto que vai para o DOCX), `project_scope`, `link_ref`, `attendance_type`, `status`. Nunca leva: `id`, `order` (recalculado no mês de destino), `last_updated`, vínculos com relatórios (`ActivityReport`).

**Opções do modal** (todas persistidas só naquela duplicação; sem preferências globais):

```
┌ Duplicar atividade ───────────────────────────────────────┐
│  ⧉  Duplicar atividade                                    │
│  Cria uma nova atividade a partir de "Implementação do…"  │
│                                                           │
│  Mês de referência        [ 09/2026 ]                     │
│  [ ] Manter período (início/fim)      ← padrão: limpar    │
│  [ ] Copiar publicações por ambiente  ← padrão: não       │
│  [ ] Copiar evidências (N imagens, M textos)  ← padrão: não│
│                                                           │
│                              [ Cancelar ]  [ Duplicar ]   │
└───────────────────────────────────────────────────────────┘
```

- **Mês de referência**: input `MM/YYYY` (mesmo `pattern`/validação de `validateActivity`), pré-preenchido com o mês da atividade original. Trocar para o mês seguinte é o caso "prd sai no mês que vem".
- **Manter período** desligado por padrão: a razão de duplicar é quase sempre "outra data". Se ligado, copia `date_start`/`date_end`.
- **Copiar publicações** desligado por padrão: a nova atividade normalmente marca só o ambiente que falta (Produção). Se ligado, copia `deployments`.
- **Copiar evidências** desligado por padrão (duplica arquivos em disco; prints de dsv/hmg raramente valem para prd). O rótulo mostra a contagem real (`getEvidenceTypeCounts`) para o usuário saber o que está copiando. Se ligado, copia imagens (arquivo novo com UUID novo, mesma extensão) e textos, preservando `caption` e `sort_index`, ignorando `deleted_at`.
- **Após duplicar**: `toast.success('Atividade duplicada')` e navegação para `/activities/<novoId>/edit` — o usuário já cai no formulário para ajustar datas e publicações (o `EvidenceUpload` aparece porque a atividade já tem id). Botão "Duplicar" do modal mostra spinner "Duplicando…" e desabilita os dois botões durante a operação.
- **Pontos de entrada**: (1) detalhe — botão `Duplicar` (`btn btn-outline`, ícone `fa-clone`) entre `Editar` e `Excluir`; (2) card da lista — `btn btn-ghost btn-icon` com `fa-clone`, `title="Duplicar"`, entre editar e excluir, com `stopPropagation`. Ambos abrem o mesmo modal.
- **Acessibilidade**: `role="dialog"`, `aria-modal`, `aria-labelledby`, foco inicial no input de mês, `Esc` fecha, `Enter` no input confirma; checkboxes nativos estilizados com tokens (`accent-primary`).
- **Sem novo item de menu** nesta entrega (o catálogo de menu/atalhos fica para uma iteração posterior, se fizer falta).

**Contrato IPC**

```ts
interface DuplicateActivityOptions {
  monthReference: string      // MM/YYYY (destino)
  keepDates: boolean
  copyDeployments: boolean
  copyEvidences: boolean
}
duplicateActivity(id: string, options: DuplicateActivityOptions): Promise<ActivityData>  // retorna a cópia (com evidences)
```

- Regras no main: origem inexistente → `throw new Error('Atividade não encontrada')` (o handler propaga; a UI mostra toast de erro). Arquivo de imagem ausente em disco → pula essa evidência (não falha a duplicação inteira), registrando `console.warn`.

### Steps

**Fase 1 — Persistência (Electron) e fallback**
1. Em [electron/database.ts](../../electron/database.ts): criar `duplicateActivity(id, options)` — carrega a origem com `evidences` (filtrando `deleted_at`), monta `Partial<Activity>` com os campos copiáveis + `month_reference` de destino + datas/publicações condicionais, chama `saveActivity` (ordem no mês de destino calculada por ele), depois copia evidências se `copyEvidences`: imagem → `fs.copyFileSync(origem, evidencesDir/<uuidv7><ext>)` + `repo.create({ …, activity_id: novoId, sort_index })`; texto → registro novo; ambos preservando `caption`. Retorna `getActivity(novoId)`.
2. Em [electron/main.ts](../../electron/main.ts): `ipcMain.handle('db:duplicateActivity', …)` seguindo o padrão de `db:deleteActivity`. Em [electron/preload.ts](../../electron/preload.ts): expor `duplicateActivity`. Em [src/vite-env.d.ts](../../src/vite-env.d.ts): adicionar `DuplicateActivityOptions` e a assinatura em `ElectronAPI`. *depends on 1*
3. Em [src/services/localDb.ts](../../src/services/localDb.ts): `duplicateActivity(id, options)` com a mesma semântica (evidências de imagem são data URLs — copiar o registro com id novo). *parallel with 1*
4. Testes em [electron/database.test.ts](../../electron/database.test.ts): cópia básica (campos copiados, id/order novos, `order = max+1` no mês de destino, datas limpas por padrão, mantidas com `keepDates`); `copyDeployments` liga/desliga; `copyEvidences` copia imagem (arquivo novo existe, caminho diferente, mesmo conteúdo) e texto, mantém `sort_index`/`caption`, ignora evidência com `deleted_at`, tolera arquivo ausente; origem inexistente lança. Usar diretório temporário para `evidences` como já fazem os testes de evidência. *depends on 1*

**Fase 2 — Modal reutilizável**
5. Criar [src/components/DuplicateActivityModal.tsx](../../src/components/DuplicateActivityModal.tsx): props `{ activity: ActivityData; open: boolean; onClose: () => void; onDuplicated: (copy: ActivityData) => void }`. Estado local das quatro opções (mês pré-preenchido com `activity.month_reference`); validação do mês (`\d{2}/\d{4}`, mês 01–12) com mensagem inline; contagem de evidências via `getEvidenceTypeCounts`; chama `window.electronAPI.duplicateActivity` ou `localDb.duplicateActivity`; spinner/disabled durante a operação; toast de sucesso/erro; foco inicial e `Esc`. Estilo idêntico ao modal de exclusão (tokens, `animate-modal-in`). Ids: `#duplicate-activity-modal`, `#duplicate-activity-month`, `#duplicate-activity-keep-dates`, `#duplicate-activity-copy-deployments`, `#duplicate-activity-copy-evidences`, `#duplicate-activity-confirm`. *depends on 2, 3*
6. Criar [src/components/DuplicateActivityModal.test.tsx](../../src/components/DuplicateActivityModal.test.tsx) (jsdom): renderiza com mês pré-preenchido e opções desligadas; rótulo de evidências mostra contagens; mês inválido bloqueia e mostra erro; confirmar chama a API com as opções escolhidas e dispara `onDuplicated` com o retorno; erro da API mostra toast e mantém o modal aberto; `Esc`/Cancelar chamam `onClose`. *depends on 5*

**Fase 3 — Pontos de entrada**
7. Em [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx): estado `showDuplicate`; botão `#activity-detail-btn-duplicate` (`btn btn-outline`, `fa-clone`, "Duplicar") entre Editar e Excluir; renderizar `DuplicateActivityModal` com `onDuplicated={(copy) => navigate(`/activities/${copy.id}/edit`)}`. *depends on 5*
8. Em [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx): prop `onDuplicate(activity)` em `SortableActivityItem`; botão `btn btn-ghost btn-icon` `fa-clone` (`title`/`aria-label` "Duplicar atividade") entre editar e excluir, com `stopPropagation`; estado `duplicating: ActivityData | null` na página e o modal; `onDuplicated` navega para a edição da cópia (se a cópia ficar no mesmo mês, a lista será recarregada ao voltar). *depends on 5*

**Fase 4 — E2E, validação e docs**
9. Em [e2e/app.spec.ts](../../e2e/app.spec.ts): (a) duplicar pelo detalhe com opções padrão → URL de edição da cópia, descrição igual, datas vazias, mês igual; voltar à lista e ver duas atividades; (b) duplicar pelo card da lista para o mês seguinte com "Manter período" e "Copiar evidências" (semear uma imagem e um texto via fixtures/IPC) → cópia no mês de destino com os mesmos contadores de evidência e datas; (c) mês inválido bloqueia. **Escrito pelo Claude; execução do Playwright é do usuário** (`e2e-test-ownership`). *depends on 7, 8*
10. `npm run test` + `npm run build`; E2E pelo usuário. *depends on all*
11. Invocar a skill `shipit-release-and-doc-sync` (Doc Sync): CHANGELOG `[Unreleased]`, TODO/DONE, e [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) (tabela de handlers IPC: `db:duplicateActivity`). *depends on 10*

### Relevant files
- [electron/database.ts](../../electron/database.ts) — `duplicateActivity` (cópia de campos + evidências com arquivos).
- [electron/main.ts](../../electron/main.ts), [electron/preload.ts](../../electron/preload.ts), [src/vite-env.d.ts](../../src/vite-env.d.ts) — handler, exposição e tipos de `db:duplicateActivity`.
- [src/services/localDb.ts](../../src/services/localDb.ts) — fallback browser.
- [src/components/DuplicateActivityModal.tsx](../../src/components/DuplicateActivityModal.tsx) (+ `.test.tsx`) — modal de opções.
- [src/pages/ActivityDetailPage.tsx](../../src/pages/ActivityDetailPage.tsx), [src/pages/ActivitiesPage.tsx](../../src/pages/ActivitiesPage.tsx) — botões e integração.
- [src/utils/evidenceCounts.ts](../../src/utils/evidenceCounts.ts), [src/utils/validation.ts](../../src/utils/validation.ts) — reuso (contagem e validação de mês).
- [electron/database.test.ts](../../electron/database.test.ts), [e2e/app.spec.ts](../../e2e/app.spec.ts) — cobertura.

### Gotchas
- **Evidências na lixeira** (`deleted_at`) não podem ser copiadas; filtrar antes de iterar.
- **Arquivos de imagem**: copiar com nome `<uuid novo><ext>` — nunca reutilizar o mesmo `file_path` em duas evidências (a exclusão permanente de uma apagaria o arquivo da outra).
- **Ordem no mês de destino**: deixar `saveActivity` calcular; não copiar `order`.
- **`ActivityReport`**: a cópia não pertence a nenhum relatório já gerado; não criar vínculo.
- **Descrição idêntica na lista**: esperado — o usuário distingue pelo pipeline de publicações/datas. Não prefixar "Cópia de" (o texto vai para o DOCX).
- **Ordem de execução dos planos**: implementar depois do plano 42 para que a opção "copiar publicações" já use `deployments`.
- **Fallback browser**: `localDb` não tem arquivos; a "cópia" de imagem é o registro com o mesmo data URL.
- **E2E**: o Electron não sobe no sandbox; Claude escreve, o usuário executa.

### Verificação
1. `npm run dev`: abrir uma atividade com dsv/hmg publicados e 2 evidências → Duplicar (padrões) → cai na edição da cópia com descrição/escopo/links iguais, datas vazias, sem publicações, sem evidências.
2. Marcar Produção e uma data na cópia, salvar → lista mostra as duas atividades com pipelines diferentes.
3. Duplicar pelo card da lista com "Copiar evidências" e mês seguinte → cópia no mês seguinte com as mesmas evidências (arquivos distintos em `userData/evidences`); excluir permanentemente uma evidência da cópia não afeta a original.
4. Mês inválido (`13/2026`) bloqueia com mensagem; `Esc` fecha o modal.
5. `npm run test` + `npm run build` verdes; E2E pelo usuário.
