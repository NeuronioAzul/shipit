**Plano**

O ajuste principal em [docs/scripts/release.py](docs/scripts/release.py) deve mudar a definição de “CI/CD pronto”. Hoje o script considera pronto quando a draft release existe; o que aprendemos no `v1.3.0` é que a draft existir não significa que os jobs do `electron-builder` já terminaram nem que os assets foram anexados.

1. **Separar “draft criada” de “release pronta para publicar”**

   Manter uma etapa curta para aguardar a draft aparecer, mas renomear a lógica para algo como `wait_for_draft_release`.

   Criar uma nova etapa depois dela: `wait_for_release_workflow_completion`, responsável por esperar o workflow de tag terminar com `conclusion: success`.

2. **Encontrar o workflow run correto da tag**

   Depois de `create_and_push_tag`, obter:

   - `tag_name = vX.Y.Z`
   - SHA do commit da tag, via `git rev-list -n 1 vX.Y.Z`
   - run do workflow `Build & Release`, em [.github/workflows/release.yml](.github/workflows/release.yml), filtrando por tag/SHA/evento `push`

   Estratégia provável:

   - usar `gh run list --workflow "Build & Release" --event push --json databaseId,headBranch,headSha,status,conclusion,url,displayTitle,createdAt`
   - filtrar por `headBranch == tag_name` ou `headSha == tag_sha`
   - se não encontrar de primeira, aguardar em polling até aparecer

3. **Aguardar todos os jobs, não só a draft**

   Implementar polling não interativo com:

   - `gh run view <run_id> --json status,conclusion,jobs,url`
   - timeout maior que o atual, porque 5 minutos é pouco para Windows/macOS/Linux
   - sugestão: `TIMEOUT_WORKFLOW_SECONDS = 3600` ou `5400`
   - imprimir progresso compacto por job: `create-release`, `build-windows`, `build-macos`, `build-linux`

   Se algum job terminar com `failure`, `cancelled` ou `timed_out`, o script deve parar antes de publicar.

4. **Validar assets antes de publicar**

   Adicionar uma etapa `validate_release_assets(version)` antes de `publish_release`.

   Ela deve chamar:

   - `gh release view vX.Y.Z --json isDraft,assets,url`

   E validar:

   - release ainda está em draft
   - assets existem
   - assets têm `state == uploaded`
   - nomes esperados existem

   Para o estado atual do workflow, os assets esperados são:

   - `ShipIt-X.Y.Z-Windows-x64-Setup.exe`
   - `ShipIt-X.Y.Z-Windows-x64-Portable.exe`
   - `ShipIt-X.Y.Z-Windows-x64.msi`
   - `ShipIt-X.Y.Z-Windows-x64-Setup.exe.blockmap`
   - `latest.yml`
   - `ShipIt-X.Y.Z-macOS-arm64.dmg`
   - `ShipIt-X.Y.Z-macOS-arm64.dmg.blockmap`
   - `ShipIt-X.Y.Z-macOS-x64.dmg`
   - `ShipIt-X.Y.Z-macOS-x64.dmg.blockmap`
   - `latest-mac.yml`
   - `ShipIt-X.Y.Z-Linux-x86_64.AppImage`
   - `ShipIt-X.Y.Z-Linux-amd64.deb`
   - `ShipIt-X.Y.Z-Linux-x86_64.rpm`
   - `latest-linux.yml`

5. **Bloquear publicação se assets estiverem faltando**

   Se a validação falhar, o script não deve publicar. Ele deve mostrar uma mensagem operacional clara, por exemplo:

   ```powershell
   gh release view vX.Y.Z --json isDraft,assets,url
   gh run view <run_id> --log
   gh run rerun <run_id>
   ```

   Para o caso específico que vimos, também pode sugerir:

   ```powershell
   gh release edit vX.Y.Z --draft=true
   gh run rerun <run_id>
   ```

6. **Corrigir o comportamento quando a release já está pública**

   Hoje `publish_release` vê `isDraft=false` e trata como sucesso. Isso mascara o bug.

   Novo comportamento:

   - se `isDraft=false`, validar assets mesmo assim
   - se assets completos: sucesso
   - se assets faltando: erro explícito dizendo que a release foi publicada cedo demais
   - não tentar mexer automaticamente em release pública sem confirmação

7. **Adicionar flags úteis, mas sem complicar demais**

   Sugestões:

   - `--ci-timeout 5400`
   - `--skip-asset-validation`, só para emergência
   - opcional: `--expected-assets-file`, se quiser externalizar a lista depois

   Eu deixaria a primeira versão com constantes internas e só `--skip-asset-validation`, para manter o script simples.

8. **Atualizar labels e resumo final**

   O fluxo deixa de ser `Step 1/11` a `Step 11/11` e vira algo como:

   - Step 10: aguardar draft
   - Step 11: aguardar workflow concluir
   - Step 12: validar assets
   - Step 13: publicar release

   O resumo final deve imprimir:

   - URL da release
   - status publicada/draft
   - quantidade de assets
   - nomes dos assets anexados
   - URL do workflow run

9. **Validação da correção**

   Antes de usar em release real:

   - rodar `python -m compileall docs/scripts/release.py`
   - rodar `python docs/scripts/release.py --dry-run --version 1.3.1`
   - testar os helpers com uma tag já existente, sem publicar nada
   - idealmente simular uma release draft sem assets e confirmar que o script bloqueia a publicação

10. **Ajuste futuro recomendado no workflow**

   O script pode resolver o problema sozinho, mas o workflow ficaria mais robusto se a publicação não dependesse do `release.py`.

   Uma melhoria posterior seria adicionar um job final em [.github/workflows/release.yml](.github/workflows/release.yml), dependente de `build-windows`, `build-macos` e `build-linux`, para publicar a draft só depois dos builds. Aí o `release.py` poderia apenas criar tag e acompanhar o resultado.
