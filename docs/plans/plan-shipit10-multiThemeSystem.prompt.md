## Plan: Multi-Theme System para o ShipIt!

Expandir o ShipIt! de 2 temas (dark/light) para **10 temas**, incluindo opções de acessibilidade. A arquitetura CSS já suporta isso — cada tema é um seletor de classe CSS sobrescrevendo as mesmas ~60 variáveis. O bloco `@theme inline` do Tailwind v4 não precisa mudar.

---

### Temas Propostos (10 total)

| Categoria | Tema | ID | Descrição |
|-----------|------|----|-----------|
| **Principal** | Light | `light` | Modernizado: azuis suaves, brancos quentes |
| **Principal** | Dark | `dark` | Modernizado: pretos profundos, acentos vibrantes |
| **Personalidade** | Colorido | `colorful` | Paleta vibrante multi-cor, lúdico |
| **Personalidade** | Rose & Violet | `rose-violet` | Tons rosa/roxo femininos |
| **Personalidade** | Minimalista | `minimalist` | Escala de cinza com acento sutil |
| **Personalidade** | Futurista | `futuristic` | Neon ciano/roxo sobre fundo escuro, sci-fi |
| **Personalidade** | Ocean | `ocean` | Azuis e teais, vibe marítima |
| **Personalidade** | Sunset | `sunset` | Laranjas quentes, corais, hora dourada |
| **Acessibilidade** | Alto Contraste | `high-contrast` | Contraste máximo 7:1+ WCAG AAA, fundo claro |
| **Acessibilidade** | Alto Contraste Dark | `high-contrast-dark` | Fundo preto puro, texto branco/amarelo, AAA |

---

### Phase 1: Refatoração da Arquitetura (bloqueia as demais fases)

1. **Criar registro de temas** em `src/themes/themes.ts`
   - Tipo `ThemeId` (union de todos os IDs de tema)
   - Interface `ThemeMetadata`: `{ id, label, description, icon, category, base, preview }` onde `base: 'dark' | 'light'` e `preview` contém cores de swatch
   - Array `THEMES` agrupado por categoria, helpers `getThemeById()`, `getThemesByCategory()`

2. **Refatorar ThemeContext** em `src/contexts/ThemeContext.tsx`
   - Expandir `Theme` de `'dark' | 'light'` para `ThemeId`
   - `useEffect` remove TODAS as classes de tema e adiciona a atual
   - Adicionar `isDark` computado (via `base` do tema) para componentes que precisam saber se é dark/light (ex: sonner Toaster)
   - Manter `toggleTheme()` como atalho dark↔light
   - Migração: `'dark'` e `'light'` continuam IDs válidos

3. **Extrair CSS de temas** para `src/themes/themes.css`
   - Mover `:root` (light) e `.dark` do `src/index.css` para o novo arquivo
   - Cada tema = um seletor CSS (`.colorful { ... }`, `.futuristic { ... }`, etc.)
   - Importar `themes.css` no `index.css`
   - O bloco `@theme inline` e `@layer base` ficam inalterados no `index.css`

### Phase 2: Design das Paletas (paralelo com Phase 1, step 3)

4. **Desenhar as 10 paletas** — todas as ~60 variáveis CSS para cada tema
   - Validar WCAG AA (4.5:1) para todos; AAA (7:1) para temas de acessibilidade
   - Usar skills: Theme Factory, Visual Design Foundations, UI/UX Pro Max

5. **Modernizar tema Light** — Refinar cores `:root` atuais (manter identidade azul/laranja da marca)

6. **Modernizar tema Dark** — Superfícies mais ricas, melhor hierarquia de contraste

### Phase 3: UI do Seletor (depende da Phase 1, steps 1-2)

7. **Criar componente ThemeSelector** em `src/components/ThemeSelector.tsx`
   - Grid de cards de tema (2-3 colunas)
   - Cada card: nome, descrição curta, 3-4 círculos de swatch (background, primary, accent, foreground)
   - Tema ativo com borda/ring de destaque
   - Agrupado por categoria: "Temas Principais", "Personalidade", "Acessibilidade"
   - Troca instantânea ao clicar (live preview)

8. **Atualizar SettingsPage** em `src/pages/SettingsPage.tsx`
   - Substituir radio buttons por `<ThemeSelector />`

### Phase 4: Integração & Polimento (depende das fases 1-3)

9. **Atualizar App.tsx** — Mapear `theme` para `'dark' | 'light'` base no Toaster do sonner
10. **Adicionar transição suave** — `transition` de 200ms em `background-color` e `color` durante troca de tema
11. **Edge cases** — Migração de usuários existentes, fallback para `'dark'` em valor inválido, scrollbar styling por tema

### Phase 5: Verificação

12. Rodar `npm run test` — 54+ testes devem passar sem alteração
13. Rodar `npm run test:e2e` — 4 cenários E2E devem passar
14. Manual: alternar entre todos os 10 temas, verificar todas as 7 rotas
15. WCAG: validar contraste via DevTools em cada tema (AA para normais, AAA para acessibilidade)

---

### Arquivos Relevantes

| Ação | Arquivo | O quê |
|------|---------|-------|
| **Criar** | `src/themes/themes.ts` | Registro de temas (IDs, metadata, categorias) |
| **Criar** | `src/themes/themes.css` | Todas as definições CSS das 10 paletas |
| **Criar** | `src/components/ThemeSelector.tsx` | Componente visual de seleção de tema |
| **Modificar** | `src/index.css` | Extrair variáveis de tema → themes.css, manter `@theme inline` e `@layer base` |
| **Modificar** | `src/contexts/ThemeContext.tsx` | Expandir tipo Theme, atualizar lógica de classes |
| **Modificar** | `src/pages/SettingsPage.tsx` | Trocar radio buttons por ThemeSelector |
| **Modificar** | `src/App.tsx` | Garantir Toaster do sonner mapeia base corretamente |
| **Referência** | `docs/new-ui-ux-visual/` | Tokens experimentais e validação WCAG existentes |

---

### Decisões

- **Storage**: Continuar com `localStorage` (tema é renderer-only, sem IPC/database)
- **Arquitetura CSS**: Uma classe por tema no `<html>`, mesmas variáveis CSS — `@theme inline` intocado
- **Base do tema**: Cada tema declara `base: 'dark' | 'light'` para sonner e componentes binários
- **Migração**: `'dark'` e `'light'` permanecem IDs válidos — zero impacto para usuários existentes
- **Escopo incluído**: 10 temas, light/dark modernizados, picker visual, validação WCAG
- **Escopo excluído**: Temas customizados pelo usuário, import/export de temas, tema por projeto, tema automático por horário

### Considerações

1. **Preview: swatches vs. thumbnails** — Círculos de cor são simples e suficientes. Mini-screenshots do app por tema seriam mais impressionantes mas muito mais trabalho. Recomendação: começar com swatches.
2. **Transição animada** — Um `transition: 0.2s` no switch dá um toque polido. Adicionar temporariamente no `<html>` e remover após 300ms para não impactar performance.
3. **`toggleTheme()`** — Com 10 temas, toggle simples perde sentido. Manter como atalho dark↔light (caso exista shortcut de teclado ou botão no header).
