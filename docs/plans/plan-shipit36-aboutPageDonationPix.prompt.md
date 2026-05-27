## Plan: Página Sobre com Doação Pix

Substituir a modal de “Sobre” por uma página dedicada em /about, acessível pelo menu Help e pelo botão Sobre da barra lateral. A nova página centraliza dados do app (nome, versão, links do projeto/comunidade) e adiciona uma seção de apoio com botão Doar, URL Pix, QR code, código copia/cola e chave Pix aleatória. A abordagem reutiliza padrões já existentes de páginas estáticas e links externos, evitando mudanças em IPC e mantendo compatibilidade com tema, acessibilidade e E2E.

**Steps**
1. [Fase 1 - Migração de navegação] Adicionar a rota /about no roteador principal em d:\Programacao\Electron\ship-it\src\App.tsx e criar a entrada para o novo componente AboutPage. Esta etapa desbloqueia toda a navegação por URL e depende da criação/import do componente da página.
2. [Fase 1 - Migração de navegação] Alterar o comando help.about em d:\Programacao\Electron\ship-it\src\components\TitleBar.tsx para navegar para /about (navigate('/about')) em vez de disparar o evento global shipit:open-about.
3. [Fase 1 - Migração de navegação] Alterar o botão Sobre da barra lateral em d:\Programacao\Electron\ship-it\src\components\ActivityBar.tsx para navegar para /about, removendo estado local showAbout, listener shipit:open-about e renderização da AboutModal embutida.
4. [Fase 2 - Nova página de conteúdo] Criar d:\Programacao\Electron\ship-it\src\pages\AboutPage.tsx usando o padrão visual de páginas estáticas existente (cards bg-card/border, heading com ícone, botão voltar via navigate(-1), ids estáveis para E2E).
5. [Fase 2 - Nova página de conteúdo] Implementar seção “Sobre o aplicativo” com: nome ShipIt!, versão dinâmica via window.electronAPI?.getVersion(), descrição curta, site do projeto (GitHub repo/homepage) e links da comunidade (GitHub + Issues, conforme decisão).
6. [Fase 2 - Nova página de conteúdo] Implementar seção “Apoie o projeto” com: botão principal “Doar” (opcional subtítulo Support Us), link da cobrança Pix, exibição da URL, QR code carregado de ./assets/images/qrpixnu.png, chave Pix aleatória e código Pix completo (copia/cola) em bloco legível.
7. [Fase 2 - Nova página de conteúdo] Adicionar ações de cópia para chave Pix e código Pix (navigator.clipboard.writeText) com feedback visual (toast) e fallback seguro em ambiente sem permissão de clipboard.
8. [Fase 3 - Testes e compatibilidade] Atualizar o cenário E2E em d:\Programacao\Electron\ship-it\e2e\app.spec.ts que hoje valida #sidebar-about-modal para validar navegação para /about e presença dos elementos principais da nova página (título, seção de doação, QR code).
9. [Fase 3 - Testes e compatibilidade] Ajustar (ou adicionar) verificação de link externo da ação Doar para garantir que a URL Pix abre externamente e que a rota atual não é indevidamente substituída.
10. [Fase 3 - Verificação final] Executar validação direcionada (Playwright do fluxo de Help/About) e validação manual de UX (menu, sidebar, botão voltar, links externos, cópia de chave/código, renderização em temas claro/escuro).
11. [Paralelismo] Após concluir as etapas 1-3, as etapas 5 e 6 podem ser construídas em paralelo. As etapas 8 e 9 dependem das etapas 2-7 concluídas.

**Relevant files**
- d:\Programacao\Electron\ship-it\src\App.tsx — adicionar rota /about e import da nova página.
- d:\Programacao\Electron\ship-it\src\components\TitleBar.tsx — trocar help.about de evento global para navegação por rota.
- d:\Programacao\Electron\ship-it\src\components\ActivityBar.tsx — remover modal inline e redirecionar botão Sobre para /about.
- d:\Programacao\Electron\ship-it\src\pages\AboutPage.tsx — nova tela com conteúdo institucional + apoio Pix.
- d:\Programacao\Electron\ship-it\e2e\app.spec.ts — atualizar cenário do menu Help/About e asserts da nova experiência.
- d:\Programacao\Electron\ship-it\public\assets\images\qrpixnu.png — asset existente de QR code (reuso, sem alteração).
- d:\Programacao\Electron\ship-it\package.json — fonte de links oficiais já publicados (repository/bugs/homepage) para conteúdo da página.

**Verification**
1. Executar Playwright focado no teste de Help/About em d:\Programacao\Electron\ship-it\e2e\app.spec.ts e confirmar navegação para #/about sem abertura de modal.
2. Validar manualmente que menu Help > Sobre o ShipIt! e botão Sobre da sidebar levam para a mesma página.
3. Validar manualmente o botão Doar abrindo a URL https://nubank.com.br/cobrar/2w3xk/6a164c4f-fd89-47de-92bf-4bae2c2d90b8 fora da janela do app.
4. Validar renderização do QR em ./assets/images/qrpixnu.png e legibilidade do código/chave Pix em viewport desktop e mobile-size.
5. Validar cópia da chave Pix e do código Pix com feedback de sucesso/erro.
6. Validar ausência de regressão nas ações Help (check updates, manual, report issue) no mesmo teste E2E.

**Decisions**
- Rota escolhida: /about.
- Botão Sobre da sidebar também deve abrir a nova página (mesmo comportamento do menu superior).
- Links oficiais iniciais: usar GitHub do projeto como site e Issues como canal de contato/comunidade.
- Escopo incluído: substituição da modal ativa (TitleBar + ActivityBar) por página dedicada.
- Escopo excluído: refatoração do componente legado d:\Programacao\Electron\ship-it\src\components\Header.tsx (não utilizado no layout atual), mudanças de backend/IPC e alterações no fluxo de Configurações além do necessário.

**Further Considerations**
1. Conteúdo visual: manter rótulo primário “Doar” (pt-BR) com apoio textual “Support Us” para público internacional.
2. Manutenibilidade: concentrar constantes de doação (URL, chave, código) no topo de AboutPage.tsx para facilitar atualização futura.
3. Testabilidade: definir ids explícidos para elementos críticos (ex.: about-page, about-btn-donate, about-pix-qr, about-copy-key, about-copy-code) e reduzir fragilidade dos testes E2E.