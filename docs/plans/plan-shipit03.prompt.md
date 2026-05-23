# 🚀 ShipIt! — Plano de Continuidade (v3)

> Criado em: 08/04/2026
>
> Este documento é a continuação do [plan-shipit02.prompt.md](plan-shipit02.prompt.md).
> Consolida o que foi implementado nas fases 5–8 e detalha o que falta para finalizar o projeto.

---

## 1. Resumo do Estado Atual

O ShipIt! está funcional e quase completo. Todas as funcionalidades core estão implementadas. O app agora possui, além do que já existia na v1.0.0:

- **Sistema de alertas** com scheduler, Notification API, configuração completa na SettingsPage
- **Tray inteligente** que atualiza automaticamente (verde/amarelo/vermelho com blinking)
- **Drag & drop** para reordenar atividades e evidências (`@dnd-kit`)
- **Drop zone** na tela de detalhes para adicionar novas evidências
- **Navegação completa** no Header (Dashboard, Atividades, Perfil, Configurações, Sobre)
- **Modal "Sobre"** com versão, stack e licença
- **Lixeira de evidências** com soft delete e auto-limpeza (>3 meses)
- **DOCX melhorado**: data de capa com último dia útil, `cantSplit` em tabelas, suporte a gif/bmp/webp
- **Testes unitários** com Vitest (15 testes para `validation.ts`)
- **Build passando** sem erros TypeScript

---

## 2. Inventário: O Que Foi Implementado (Sessão v2)

### 3.0 — Correção DOCX ✅

| Item | Status |
|------|--------|
| Data da capa = último dia útil do mês de referência | ✅ |
| Função `getLastBusinessDay()` | ✅ |

### Fase 5 — Alertas e Notificações ✅

| Item | Status |
|------|--------|
| Scheduler no main process (60s interval) | ✅ |
| Notification API nativa do Electron | ✅ |
| Tray auto-status (verde/amarelo/vermelho + blinking) | ✅ |
| Seção "Notificações" na SettingsPage | ✅ |
| IPC handlers `db:getAlert`, `db:saveAlert` | ✅ |

### Fase 6 — Drag & Drop ✅

| Item | Status |
|------|--------|
| Reordenar atividades (`@dnd-kit/sortable`) | ✅ |
| Reordenar evidências na tela de detalhes | ✅ |
| Zona de drop para novas evidências | ✅ |
| IPC handler `db:reorderEvidences` | ✅ |

### Fase 7 — Menus e Navegação ✅

| Item | Status |
|------|--------|
| Modal "Sobre o ShipIt!" no Header | ✅ |
| Nav links: Dashboard, Atividades, Perfil, Configurações, Sobre | ✅ |
| Tray com Perfil e Configurações | ✅ |

### Fase 8 — Polimento (Parcial)

| Item | Status |
|------|--------|
| `ensureCantSplit()` em linhas de tabela DOCX | ✅ |
| Suporte gif/bmp/webp no DOCX | ✅ |
| Lixeira de evidências (soft delete + auto-limpeza) | ✅ |
| Vitest setup + 15 testes unitários | ✅ |
| UI de gerenciamento da lixeira | ❌ Pendente |
| Testes do report-generator | ❌ Pendente |
| Testes de integração IPC | ❌ Pendente |
| Testes E2E | ❌ Pendente |
| Revisão geral de UI | ❌ Pendente |

---

## 3. O Que Falta Implementar

### 3.1 UI da Lixeira de Evidências

**Prioridade:** Alta
**Complexidade:** Média

O backend da lixeira está completo (soft delete, restauração, exclusão permanente, auto-limpeza no startup). Falta a interface para o usuário visualizar e gerenciar itens deletados.

**O que já existe:**
- `db:getDeletedEvidences` — retorna todas as evidências com `deleted_at` preenchido
- `db:restoreEvidence(id)` — restaura evidência (move de volta para `evidences/`, limpa `deleted_at`)
- `db:permanentlyDeleteEvidence(id)` — exclui permanentemente (arquivo + registro)
- Backend filtra evidências deletadas de queries e gerador de relatórios

**Escopo:**
- Criar página `TrashPage.tsx`
- Listar evidências deletadas com: thumbnail, legenda, nome da atividade, data de exclusão
- Botão "Restaurar" por item → chama `db:restoreEvidence`
- Botão "Excluir permanentemente" por item → confirmação + chama `db:permanentlyDeleteEvidence`
- Botão "Esvaziar lixeira" → confirmação + exclui todos permanentemente
- Indicador de dias restantes até limpeza automática (3 meses)
- Badge no ícone de navegação da lixeira mostrando quantidade de itens
- Informação do porquê a lixeira existe e como funciona (exclusão suave, restauração, limpeza automática)

**Sugestão de localização:** Rota `/trash` com link no menu de Configurações.

---

### 3.2 Testes Automatizados

**Prioridade:** Alta
**Complexidade:** Média-Alta

#### 3.2.1 Testes do Report Generator

**O que testar:**
- `getLastBusinessDay()` com diferentes meses (mês terminando em sábado, domingo, feriado)
- Geração de DOCX com um payload mock mínimo (1 atividade, 1 evidência)
- Validação da estrutura XML do DOCX gerado (document.xml contém os placeholders substituídos)
- Teste de imagens em diferentes formatos (png, jpg, gif, bmp, webp)
- Nomenclatura do arquivo gerado segue o padrão MEC

**Complexidade:** Precisa de um template DOCX válido para os testes. Considerar extrair um `mini-template.docx` de teste ou usar fixtures.

#### 3.2.2 Testes de Integração IPC

**O que testar:**
- Handlers `db:getActivities`, `db:saveActivity`, `db:deleteActivity`
- Handlers `db:saveEvidence`, `db:deleteEvidence` (soft delete)
- Handlers `db:getAlert`, `db:saveAlert`
- Handlers de lixeira: `db:getDeletedEvidences`, `db:restoreEvidence`, `db:permanentlyDeleteEvidence`

**Complexidade:** Requer mock do Electron `ipcMain` e inicialização de DataSource com SQLite in-memory. Considerar usar `better-sqlite3` diretamente nos testes sem TypeORM para isolar lógica.

#### 3.2.3 Testes E2E

**O que testar:**
- Fluxo completo: criar perfil → criar atividade → adicionar evidência → gerar relatório
- Drag & drop de atividades e evidências
- Navegação entre páginas
- Tema dark/light
- Configuração de alertas

**Ferramenta sugerida:** Playwright com `electron` support ou `@playwright/test` com `_electron.launch()`.

---

### 3.3 Revisão Geral de UI/UX

**Prioridade:** Média
**Complexidade:** Média

#### 3.3.1 Responsividade

**Escopo:**
- Testar e ajustar layout em janelas menores (800×600 mínimo)
- Verificar overflow de tabelas e cards no Dashboard
- Ajustar grid do formulário de atividade em telas estreitas
- Verificar Header em janelas pequenas (considerar menu hamburger)

#### 3.3.2 Feedback Visual

**Escopo:**
- Animações de transição entre páginas (fade ou slide)
- Skeleton loaders durante carregamento de dados
- Toast notifications para ações (salvo, excluído, restaurado, erro)
- Animação no drag & drop (hover, drop, reorder)
- Loading state nos botões de ação (Gerar Relatório, Salvar)

#### 3.3.3 Acessibilidade

cores do logo 
#1A427F = Azul escuro
#F27A21 = Laranja vibrante detalhes e destaques
#FFFFFF = Branco fundo logo

**Escopo:**
- sugerir nova cores (dark e light) dentro de uma paleta de cores mais usadas que atendam contraste mínimo WCAG AA (partindo das cores do logo)
- sugerir melhorias de contraste de cores para melhor legibilidade
- Verificar contraste de cores (WCAG AA mínimo) em ambos os temas
- Labels em todos os inputs de formulário
- Navegação por teclado (Tab, Enter, Escape)
- `aria-label` em ícones e botões sem texto
- Focus ring visível em todos os elementos interativos

#### 3.3.4 Consistência Visual

**Escopo:**
- Verificar uso consistente dos tokens de cor (`bg-primary`, `text-foreground`, etc.)
- Padronizar espaçamentos (margins, paddings) entre seções e cards
- Padronizar tamanhos de fonte e hierarquia tipográfica
- Verificar ícones ausentes ou inconsistentes

#### 3.3.5 Nova interface 

**Escopo:**
- Criar nova interface com design mais moderno e clean, inspirada no VSCode, usando a paleta de cores do logo e mantendo a identidade visual. A nova interface deve ser mais intuitiva, com melhor organização das informações e fácil navegação entre as seções. A janela do Electron deve ser sem bordas, com um ícone customizado igual ao do VSCode, para proporcionar uma experiência mais imersiva e profissional.
- Usar o logo do foguete como ícone do aplicativo

---

## 4. Plano de Fases de Continuidade

### Fase 8.5: Lixeira UI 🗑️

**Objetivo:** Dar ao usuário uma interface para gerenciar evidências deletadas.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 8.5.1 | Criar `TrashPage.tsx` com listagem de evidências deletadas | Média |
| 8.5.2 | Botões restaurar / excluir permanentemente por item | Baixa |
| 8.5.3 | Botão "Esvaziar lixeira" com confirmação | Baixa |
| 8.5.4 | Link de navegação no Header ou Configurações | Baixa |

---

### Fase 10: Testes 🧪

**Objetivo:** Aumentar cobertura de testes para garantir estabilidade antes de distribuir.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 10.1 | Testes unitários do `getLastBusinessDay()` | Baixa |
| 10.2 | Testes do report-generator com payload mock | Alta |
| 10.3 | Testes de integração dos IPC handlers (SQLite in-memory) | Alta |
| 10.4 | Setup Playwright para testes E2E | Média |
| 10.5 | Fluxo E2E: perfil → atividade → evidência → relatório | Alta |

### Fase 11: Revisão de UI/UX 🎨

**Objetivo:** Polir a interface antes da versão de release.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 11.1 | Ajustes de responsividade (janela mínima 800×600) | Média |
| 11.2 | Toast notifications para feedback de ações | Média |
| 11.3 | Skeleton loaders durante carregamento | Baixa |
| 11.4 | Acessibilidade: contraste, labels, focus, keyboard nav | Média |
| 11.5 | Consistência de tokens de cor e espaçamentos | Baixa |

---

## 5. Priorização Sugerida

Ordem recomendada de execução, considerando valor e risco:

```
1. Fase 8.5  — Lixeira UI (completar funcionalidade já no backend)
2. Fase 10   — Testes (estabilidade antes de distribuir)
3. Fase 11   — Revisão UI/UX (polimento visual)
```

A Fase 10 (testes) pode rodar em paralelo com a 11 (UI) já que afetam camadas diferentes.

---

## 6. Decisões tomadas

| Questão | Opções | Recomendação |
|---------|--------|-------------|
| Lixeira: onde colocar na UI | Página dedicada `/trash`  | Página dedicada — mais espaço para thumbnails |
| Testes E2E: framework | Playwright | Playwright — suporte nativo a Electron, mantido ativamente |
| Toast notifications | `sonner` | `sonner` — leve, bonito, compatível com React 19 |
| CI/CD | GitHub Actions | GitHub Actions — automação essencial para multiplataforma |
| Diretório de dados customizável | Cancelado | Cancelado — complexidade alta, valor baixo |

---

## 7. Métricas Atuais

| Métrica | Valor |
|---------|-------|
| Módulos Vite | 42 |
| CSS bundle | ~104 KB |
| JS bundle | ~350 KB |
| Testes unitários | 15 (todos passando) |
| Entidades TypeORM | 6 |
| IPC handlers | ~20 |
| Dependências runtime | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, jszip, @xmldom/xmldom, xpath, better-sqlite3, typeorm, electron-store |
| Dependências dev | vitest, vite, typescript, electron, electron-builder, tailwindcss |

---

## 8. Referências

- [plan-shipit01.prompt.md](plan-shipit01.prompt.md) — Plano original (Fases 1–3)
- [plan-shipit02.prompt.md](plan-shipit02.prompt.md) — Plano v2 (Fases 5–8)
- [TODO.md](TODO.md) — Roadmap com checklist de tarefas
- [ARCHITECTURE.md](ARCHITECTURE.md) — Arquitetura do projeto
- [DEPENDENCIES.md](DEPENDENCIES.md) — Auditoria de dependências
- [CHANGELOG.md](../CHANGELOG.md) — Histórico de versões
- [plan-docx-generator/](plan-docx-generator/) — Plano de geração DOCX (concluído)
