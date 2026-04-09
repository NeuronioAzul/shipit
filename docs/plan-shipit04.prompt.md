
---

## Apêndice: Fases Futuras (Sob Demanda)

> ⚠️ **Nota:** As seções abaixo são de baixa prioridade e devem ser executadas apenas quando solicitado. Não fazem parte do escopo atual de desenvolvimento.

---

### A.0 Diretório de Armazenamento de Dados

**Prioridade:** Baixa
**Complexidade:** Alta

**Decisão anterior:** Adiado por complexidade vs. valor baixo.

Se implementar:
- Seletor de diretório na `SettingsPage`
- Migração: copiar `shipit.db` + `evidences/` + `trash/` para novo local
- Atualizar paths no main process
- Restart obrigatório após migração
- Fallback se diretório não existir no startup

**Recomendação:** Manter adiado. A maioria dos usuários não precisa disso.

---

### A.1 Fase 12: Distribuição Multiplataforma 📦

**Prioridade:** Baixa (somente Windows é usado atualmente)
**Complexidade:** Média

**Objetivo:** Gerar builds para macOS e Linux, configurar CI/CD.

| # | Tarefa | Complexidade |
|---|--------|-------------|
| 12.1 | Build macOS (.dmg) + ajustes de tray (template images) | Média |
| 12.2 | Build Linux (.AppImage) + AppIndicator | Média |
| 12.3 | Testar auto-launch e paths por plataforma | Média |
| 12.4 | GitHub Actions CI/CD (build matrix + publish) | Alta |
| 12.5 | Testes finais e empacotamento de release v1.1.0 | Alta |

#### A.1.1 Build macOS (.dmg)

- Ícone de tray como template image (22×22pt, sufixo `Template`)
- Testar `app.dock` behavior (macOS não tem "close to tray" padrão)
- Assinar com certificado Apple Developer (ou distribuir sem assinatura para teste)
- Configurar `electron-builder` target `dmg`
- Testar auto-launch via `Login Items`

#### A.1.2 Build Linux (.AppImage)

- Testar com AppIndicator (Ubuntu, Fedora)
- Verificar se tray funciona em Wayland
- Configurar `.desktop` file para auto-launch
- Testar paths de `userData` em distribuições diferentes

#### A.1.3 CI/CD

- GitHub Actions workflow para build automático em push/tag
- Matrix: Windows, macOS, Linux
- Upload de artefatos como assets no Release
- Auto-publish com `electron-builder --publish`

---

### A.2 Backlog de Melhorias Futuras

Itens de baixa prioridade para considerar após a release v1.1:

| Item | Complexidade | Descrição |
|------|-------------|-----------|
| Exportar PDF | Alta | Usar Puppeteer/wkhtmltopdf para gerar PDF a partir do DOCX |
| Backup automático | Média | Backup periódico do `shipit.db` com rotação |
| Import/export de dados | Média | Exportar atividades em JSON/CSV, importar de backup |
| Busca global | Média | Pesquisar atividades por descrição, links, legendas |
| Templates de atividade | Baixa | Atividades recorrentes pré-configuradas |
| Relatório multi-mês | Alta | Gerar relatório consolidado de vários meses |
| Estatísticas anuais | Média | Dashboard com overview do ano (atividades, evidências, relatórios) |
| Atalhos de teclado | Baixa | `Ctrl+N` nova atividade, `Ctrl+S` salvar, `Ctrl+G` gerar relatório |
| i18n | Alta | Suporte a inglês e espanhol além do português |