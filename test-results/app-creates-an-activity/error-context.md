# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> creates an activity
- Location: e2e\app.spec.ts:70:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Salvar")')

```

```
"afterAll" hook timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img "ShipIt!" [ref=e6]
      - generic [ref=e7]:
        - button "Minimizar janela" [ref=e8]:
          - img [ref=e9]
        - button "Maximizar janela" [ref=e11]:
          - img [ref=e12]
        - button "Fechar janela" [ref=e14]:
          - img [ref=e15]
    - generic [ref=e17]:
      - complementary [ref=e18]:
        - navigation [ref=e19]:
          - link "Dashboard" [ref=e20] [cursor=pointer]:
            - /url: "#/"
          - link "Atividades" [ref=e22] [cursor=pointer]:
            - /url: "#/activities"
          - link "Perfil" [ref=e24] [cursor=pointer]:
            - /url: "#/profile"
        - navigation [ref=e26]:
          - link "Lixeira" [ref=e27] [cursor=pointer]:
            - /url: "#/trash"
          - link "Configurações" [ref=e29] [cursor=pointer]:
            - /url: "#/settings"
          - button "Sobre o ShipIt!" [ref=e31] [cursor=pointer]
      - main [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]:
              - button "Voltar para lista de atividades" [ref=e37] [cursor=pointer]
              - heading "Nova Atividade" [level=1] [ref=e39]
            - generic [ref=e40]: Salvo automaticamente
          - generic [ref=e42]:
            - generic [ref=e43]:
              - generic [ref=e44]: Descrição *
              - textbox "Descrição *" [active] [ref=e45]:
                - /placeholder: Descreva a atividade realizada...
                - text: Atividade E2E teste Playwright
            - generic [ref=e46]:
              - generic [ref=e47]:
                - generic [ref=e48]: Data de Início *
                - textbox "Data de Início *" [ref=e49]
              - generic [ref=e50]:
                - generic [ref=e51]: Data de Término *
                - textbox "Data de Término *" [ref=e52]
            - generic [ref=e53]:
              - generic [ref=e54]:
                - generic [ref=e55]: Status
                - combobox "Status" [ref=e56]:
                  - option "Em andamento"
                  - option "Concluído"
                  - option "Cancelado"
                  - option "Pendente" [selected]
              - generic [ref=e57]:
                - generic [ref=e58]: Tipo de Atendimento
                - combobox "Tipo de Atendimento" [ref=e59]:
                  - option "Selecione" [selected]
                  - option "Presencial"
                  - option "Remoto"
                  - option "Híbrido"
              - generic [ref=e60]:
                - generic [ref=e61]: Mês de Referência *
                - textbox "Mês de Referência *" [ref=e62]:
                  - /placeholder: MM/YYYY
                  - text: 04/2026
            - generic [ref=e63]:
              - generic [ref=e64]: Squad / Projeto / Aplicação
              - textbox "Squad / Projeto / Aplicação" [ref=e65]:
                - /placeholder: "Ex: Squad SESU / Projeto PNAES"
              - paragraph [ref=e66]: Agrupa atividades por projeto no relatório. Herdado do perfil, editável por atividade.
            - generic [ref=e67]:
              - generic [ref=e68]: Links de Referência
              - textbox "Links de Referência" [ref=e69]:
                - /placeholder: "Cole os links aqui, um por linha (ex: https://gitlab.example.com/merge_request/123)"
              - paragraph [ref=e70]: Insira um link por linha. GitLab, Jira, etc.
            - generic [ref=e71]:
              - generic [ref=e72]: Evidências (Prints)
              - generic [ref=e74] [cursor=pointer]:
                - paragraph [ref=e76]: Arraste imagens aqui ou clique para selecionar
                - paragraph [ref=e77]: PNG, JPG, GIF, BMP, WebP
                - button "Colar da Área de Transferência" [ref=e79]: Colar da Área de Transferência
            - generic [ref=e81]:
              - button "Criar Atividade" [ref=e82] [cursor=pointer]: Criar Atividade
              - button "Cancelar" [ref=e84] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
  2   | import { _electron as electron } from 'playwright'
  3   | import path from 'path'
  4   | 
  5   | let app: ElectronApplication
  6   | let page: Page
  7   | 
  8   | test.beforeAll(async () => {
  9   |   app = await electron.launch({
  10  |     args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
  11  |     env: { ...process.env, NODE_ENV: 'test', PLAYWRIGHT: '1' },
  12  |   })
  13  | 
  14  |   page = await app.firstWindow()
  15  |   page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message))
  16  | 
  17  |   // Wait for the page to finish loading (HTML/CSS/JS)
  18  |   await page.waitForLoadState('load')
  19  |   // Give React some extra time to mount + run effects
  20  |   await page.waitForTimeout(5_000)
  21  | })
  22  | 
> 23  | test.afterAll(async () => {
      |      ^ "afterAll" hook timeout of 30000ms exceeded.
  24  |   await app.close()
  25  | })
  26  | 
  27  | // ──── Navigation ────
  28  | 
  29  | test('navigates to all main screens', async () => {
  30  |   // Dashboard is the default route
  31  |   await expect(page.locator('text=Dashboard')).toBeVisible()
  32  | 
  33  |   // Navigate to Atividades
  34  |   await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  35  |   await expect(page.locator('h1:text("Atividades")')).toBeVisible({ timeout: 5_000 })
  36  | 
  37  |   // Navigate to Perfil
  38  |   await page.click('[title="Perfil"], [aria-label*="Perfil"]')
  39  |   await expect(page.locator('h1:text("Perfil")')).toBeVisible({ timeout: 5_000 })
  40  | 
  41  |   // Navigate to Configurações
  42  |   await page.click('[title="Configurações"], [aria-label*="Configurações"]')
  43  |   await expect(page.locator('h1:text("Configurações")')).toBeVisible({ timeout: 5_000 })
  44  | 
  45  |   // Back to Dashboard
  46  |   await page.click('[title="Dashboard"], [aria-label*="Dashboard"]')
  47  |   await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5_000 })
  48  | })
  49  | 
  50  | // ──── Theme Toggle ────
  51  | 
  52  | test('toggles dark/light theme', async () => {
  53  |   // Navigate to settings
  54  |   await page.click('[title="Configurações"], [aria-label*="Configurações"]')
  55  |   await page.waitForSelector('h1:text("Configurações")', { timeout: 5_000 })
  56  | 
  57  |   const html = page.locator('html')
  58  | 
  59  |   // Click light mode radio
  60  |   await page.click('input[value="light"]')
  61  |   await expect(html).not.toHaveClass(/dark/)
  62  | 
  63  |   // Click dark mode radio
  64  |   await page.click('input[value="dark"]')
  65  |   await expect(html).toHaveClass(/dark/)
  66  | })
  67  | 
  68  | // ──── Activity Creation ────
  69  | 
  70  | test('creates an activity', async () => {
  71  |   // Navigate to Atividades
  72  |   await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  73  |   await page.waitForSelector('h1:text("Atividades")', { timeout: 5_000 })
  74  | 
  75  |   // Click "Nova Atividade" button
  76  |   const newBtn = page.locator('button:has-text("Nova Atividade"), a:has-text("Nova Atividade")')
  77  |   if (await newBtn.isVisible()) {
  78  |     await newBtn.click()
  79  |   } else {
  80  |     // Empty state: click the primary action button
  81  |     const emptyAction = page.locator('button:has-text("Criar"), a:has-text("Nova Atividade")')
  82  |     await emptyAction.first().click()
  83  |   }
  84  | 
  85  |   // Fill description
  86  |   await page.waitForSelector('textarea, input[name="description"]', { timeout: 5_000 })
  87  |   const descInput = page.locator('textarea').first()
  88  |   await descInput.fill('Atividade E2E teste Playwright')
  89  | 
  90  |   // Submit
  91  |   const saveBtn = page.locator('button:has-text("Salvar")')
  92  |   await saveBtn.click()
  93  | 
  94  |   // Should redirect back to activity list or detail
  95  |   await page.waitForTimeout(1_000)
  96  | 
  97  |   // Navigate to Atividades to verify
  98  |   await page.click('[title="Atividades"], [aria-label*="Atividades"]')
  99  |   await expect(page.locator('text=Atividade E2E teste Playwright')).toBeVisible({ timeout: 5_000 })
  100 | })
  101 | 
  102 | // ──── Window Controls ────
  103 | 
  104 | test('window starts visible and can be minimized', async () => {
  105 |   const isVisible = await app.evaluate(({ BrowserWindow }) => {
  106 |     const win = BrowserWindow.getAllWindows()[0]
  107 |     return win?.isVisible() ?? false
  108 |   })
  109 |   expect(isVisible).toBe(true)
  110 | })
  111 | 
```