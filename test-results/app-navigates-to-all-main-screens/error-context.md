# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> navigates to all main screens
- Location: e2e\app.spec.ts:29:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Dashboard')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Dashboard')

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
          - link "Atividades" [active] [ref=e22] [cursor=pointer]:
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
          - img "ShipIt! Foguete" [ref=e35]
          - generic [ref=e36]:
            - heading "Bem-vindo ao ShipIt!" [level=1] [ref=e37]
            - paragraph [ref=e38]: Automatize a criação do seu Relatório Mensal de Atividades. Comece configurando seu perfil.
          - button "Criar Perfil" [ref=e39] [cursor=pointer]: Criar Perfil
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