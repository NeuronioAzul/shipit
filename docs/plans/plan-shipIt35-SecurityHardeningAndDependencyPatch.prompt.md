## Plan: Hardening + Patch de Segurança

Aplicar hardenings de path/IPC/CSP com baixo risco de regressão e, em paralelo controlado, preparar patch de dependências de segurança focado em runtime primeiro. A estratégia combina: (a) reforço de fronteiras de confiança no Electron main/database, (b) CSP mínima com política rígida em produção e permissiva em desenvolvimento, (c) atualização de dependências runtime vulneráveis com validação completa de build e testes.

**Steps**
1. Fase 0 — Baseline e critérios de aceite
1.1 Registrar baseline antes das mudanças: npm audit --omit=dev, npm audit, npm run build, npm run test.
1.2 Definir critérios de aceite do patch: sem regressão funcional, build ok, testes ok, redução dos findings de runtime.
1.3 Preparar branch e ordem de commits: hardening em commits separados de dependências para facilitar rollback.

2. Fase 1 — Hardening de path (núcleo)
2.1 Reutilizar padrão de validação já existente em electron/runtime-paths.ts (funções de path seguro para testes) para introduzir helpers reutilizáveis de normalização e verificação de escopo de diretório (comparação por path.resolve + path.relative, com cuidado para case-insensitive no Windows). *bloqueia 2.2 a 2.5*
2.2 Endurecer protocolo shipit-evidence em electron/main.ts (protocol.handle em torno da linha 589): substituir validação por prefixo simples por validação de pertencimento real a diretório permitido (evidences/trash), rejeitar ambiguidades de caminho e manter retorno 403/404 coerente.
2.3 Revisar protocolo shipit-sfx em electron/main.ts (protocol.handle em torno da linha 610) para usar o mesmo helper de escopo e manter whitelist de nome de arquivo já baseada em basename.
2.4 Endurecer IPC de abertura de arquivo/pasta em electron/main.ts (app:openFileInFolder por volta da linha 1031) para aceitar somente caminhos dentro de diretórios controlados da aplicação (ex.: reports/evidences/trash em userData).
2.5 Endurecer persistência de diretório de relatórios em electron/main.ts (getConfiguredReportsDir e app:saveSettings por volta das linhas 828 e 892) com validação de path absoluto válido, fallback seguro para default e rejeição de valor inválido.

3. Fase 2 — Hardening de entrada de arquivos de evidência
3.1 Endurecer saveEvidence em electron/database.ts (por volta da linha 220) com validação de extensão permitida e regras de origem do caminho para evitar cópia de arquivos arbitrários.
3.2 Endurecer saveEvidenceFromBuffer em electron/database.ts (por volta da linha 245) com validação de extensão e limites básicos de payload.
3.3 Cobrir casos de negação em testes unitários de electron/database.test.ts (path inválido, extensão inválida, fluxo válido).

4. Fase 3 — CSP mínima (decisão alinhada: prod rígida, dev permissiva)
4.1 Implementar CSP mínima em produção no renderer com política segura e explícita para recursos necessários (self + protocolos customizados usados para mídia), sem quebrar navegação e recursos locais.
4.2 Em desenvolvimento, manter política permissiva o suficiente para HMR do Vite (connect/hmr), separada da política de produção.
4.3 Implementar no ponto mais controlável do app (Electron main e/ou HTML de entrada), garantindo comportamento consistente em dev/prod.
4.4 Validar manualmente cenários críticos: imagens shipit-evidence, sons shipit-sfx, links externos e carregamento normal das rotas.

5. Fase 4 — Patch de dependências de segurança (runtime-first)
5.1 Atualizar dependências runtime com findings atuais de maior prioridade em package.json: @xmldom/xmldom e uuid para versões corrigidas.
5.2 Regenerar lockfile (package-lock.json) e confirmar árvore efetiva com npm ls para os pacotes-alvo.
5.3 Reexecutar npm audit --omit=dev para verificar redução/eliminação de findings de runtime.
5.4 Levantar findings residuais de dev/transitivas e registrar como fase opcional posterior (fora do patch mínimo de agora). *paralelo documental com 6.4*

6. Fase 5 — Verificação integrada (gate final)
6.1 Validação estática/compilação: npm run build.
6.2 Validação de testes unitários/integrados: npm run test.
6.3 Validação E2E crítica: npm run test:e2e (ou subconjunto focado se o tempo exigir, seguido da suíte completa no CI).
6.4 Reexecutar npm audit e comparar com baseline para relatório final do patch.
6.5 Checklist manual de segurança: tentativas de path traversal nos pontos endurecidos e conferência de comportamento esperado (403/rejeição).

7. Fase 6 — Entrega e documentação de risco residual
7.1 Entregar resumo com: mudanças aplicadas por arquivo, resultados de testes/build/audit e residual risk.
7.2 Registrar backlog opcional de hardening adicional (fora do escopo imediato): tightening extra de CSP, atualização de dev/transitivas, e monitoramento contínuo via auditoria periódica.

**Relevant files**
- d:/Programacao/Electron/ship-it/electron/main.ts — protocolos customizados, IPC handlers de settings e openFileInFolder, ponto principal de enforcement.
- d:/Programacao/Electron/ship-it/electron/database.ts — entrada de arquivos de evidência (copy/write) e validações de segurança associadas.
- d:/Programacao/Electron/ship-it/electron/runtime-paths.ts — referência para utilitários de path seguro e local para extração/reuso de helper.
- d:/Programacao/Electron/ship-it/electron/runtime-paths.test.ts — suite existente para ampliar cobertura de helpers de validação de path.
- d:/Programacao/Electron/ship-it/electron/database.test.ts — cobertura de fluxos válidos/inválidos de persistência de evidências.
- d:/Programacao/Electron/ship-it/index.html — ponto potencial de CSP do renderer (se adotado via meta para produção).
- d:/Programacao/Electron/ship-it/e2e/app.spec.ts — validações E2E de links externos e candidatos para cenários de segurança.
- d:/Programacao/Electron/ship-it/package.json — atualização de versões runtime vulneráveis.
- d:/Programacao/Electron/ship-it/package-lock.json — lockfile após atualização de dependências.

**Verification**
1. Executar baseline pré-patch: npm audit --omit=dev, npm audit, npm run build, npm run test.
2. Após hardening de path/IPC: rodar testes unitários relevantes e cenários manuais de path traversal para shipit-evidence, app:openFileInFolder e reportsDirectory.
3. Após CSP: validar carregamento normal da UI, mídias via protocolos customizados e comportamento de links externos.
4. Após patch de dependências: npm ls @xmldom/xmldom uuid e npm audit --omit=dev para confirmar status runtime.
5. Gate final: npm run build, npm run test, npm run test:e2e, e comparação audit antes/depois.

**Decisions**
- Escopo de dependências: Runtime primeiro (mínimo risco).
- Estratégia CSP: Produção rígida + desenvolvimento permissivo para DX/HMR.
- Incluído no escopo: validação de path no protocolo/IPC e patch runtime de dependências com validação de build/testes.
- Excluído do escopo imediato: limpeza completa de dev/transitivas e hardening avançado além da CSP mínima.

**Further Considerations**
1. Para a fase opcional de dev/transitivas, priorizar apenas pacotes com impacto real no pipeline de release e sem breaking changes na toolchain.
2. Se houver restrição de tempo para E2E local completo, executar subset focado localmente e exigir suíte completa no CI antes de merge.
3. Manter commits separados (hardening vs deps) para facilitar rollback seletivo sem perder progresso.