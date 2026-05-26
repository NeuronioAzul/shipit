# Plan: Ícone do App + Release + Instaladores Multi-formato + Docs

Corrigir o ícone Electron aparecendo no lugar do foguete, gerar instaladores para todos os formatos com nomes claros por OS/arch, melhorar o workflow de release com draft manual, e atualizar toda a documentação.

---

### Fase 1: Corrigir Ícone do App

**Causa raiz**: `build.win.icon` no `package.json` (linha ~109) aponta para `ms-icon-310x310.png` (PNG), mas Windows precisa de `.ico` para embutir no `.exe` e na taskbar. O arquivo `favicon.ico` já existe em `public/assets/images/icons/` mas não está referenciado.

1. Alterar `build.win.icon` para `public/assets/images/icons/favicon.ico`
2. Verificar que o `favicon.ico` contém resolução 256×256 (mínimo para ícone de app Windows). Se não, regenerar a partir do `ms-icon-310x310.png`
3. Renomear os icones de `favicon` para `ShipIt` para clareza e organização.
---

### Fase 2: Instaladores Multi-formato com Nomes Claros — *paralelo com Fase 1*

3. Adicionar targets Windows: `portable` e `msi` além do `nsis` existente
4. Adicionar targets Linux: `deb` e `rpm` além do `AppImage`
5. Configurar macOS com duas arquiteturas: `arm64` + `x64` (DMGs separados)
6. Definir `artifactName` por target:

| Target | Nome gerado |
|--------|------------|
| NSIS | `ShipIt-1.2.1-Windows-x64-Setup.exe` |
| Portable | `ShipIt-1.2.1-Windows-x64-Portable.exe` |
| MSI | `ShipIt-1.2.1-Windows-x64.msi` |
| DMG | `ShipIt-1.2.1-macOS-arm64.dmg` / `ShipIt-1.2.1-macOS-x64.dmg` |
| AppImage | `ShipIt-1.2.1-Linux-x86_64.AppImage` |
| deb | `ShipIt-1.2.1-Linux-amd64.deb` |
| rpm | `ShipIt-1.2.1-Linux-x86_64.rpm` |

**Arquivo**: `package.json` — seção `build`

---

### Fase 3: Workflow de Release — *depende de Fase 2*

7. Adicionar job `create-release` que roda primeiro: cria a GitHub Release como **draft** com título descritivo (ex: `v1.2.1`) — você revê e publica manualmente
8. Os 3 build jobs (`build-windows`, `build-macos`, `build-linux`) dependem de `create-release` e publicam os artefatos no draft
9. No macOS, gerar dois DMGs com `electron-builder --mac --arm64 --x64`
10. Atualizar upload paths para incluir `*.msi`, `*.deb`, `*.rpm`

**Arquivo**: `.github/workflows/release.yml`

---

### Fase 4: Documentação — *paralelo com Fases 1-3*

11. **README.md**: expandir seção Download com todos os formatos, guia "Qual versão baixar?", badge de release
12. **CHANGELOG.md**: documentar ícone fix + multi-formato + release draft
13. **docs/TODO.md**: marcar itens concluídos da Fase 9
14. **docs/DEVELOPMENT.md**: atualizar seção CI/CD com novos targets e tabela de artefatos

---

## Arquivos a criar/modificar

- `package.json` — `build.win.icon` → `.ico`, targets Windows (nsis + portable + msi), targets Linux (AppImage + deb + rpm), macOS arch, `artifactName` por target
- `.github/workflows/release.yml` — job `create-release` (draft), macOS `--arm64 --x64`, upload patterns atualizados
- `README.md` — seção Download expandida, badge de release, guia por plataforma
- `CHANGELOG.md` — documentar mudanças
- `docs/TODO.md` — marcar itens da Fase 9
- `docs/DEVELOPMENT.md` — atualizar seção CI/CD

---

## Verificação

1. Verificar `favicon.ico` tem resolução ≥256×256
2. `npm run build` passa
3. `npm test` — 55 testes passando
4. Tag `v1.2.1-beta.2` → verificar draft no GitHub Releases com todos os artefatos (~8 instaladores)
5. Instalar `.exe` gerado → confirmar ícone do foguete na taskbar e no programa

## Decisões

- Release como **draft manual** — você revê o título/notas e publica
- Windows: NSIS + Portable + MSI (x64)
- macOS: dois DMGs separados (arm64 + x64)
- Linux: AppImage + deb + rpm
- Sem code signing (mantido)

## Considerações

1. **MSI**: pode precisar de WiX Toolset no runner Windows. Testar na primeira run e remover se falhar.
2. **macOS x64**: `macos-latest` é ARM, então electron-builder faz cross-compile para x64 — pode aumentar o tempo de build.
3. **Tamanho da Release**: ~1.2 GB total com todos os formatos + blockmaps.
