# Coisas para fazer e publicar

SHIPIT!  

> 📝 **Este é o arquivo de RASCUNHO.** Anote aqui livremente tudo que precisa fazer, corrigir, testar ou publicar — sem se preocupar com formatação.
> Depois, mova só o que realmente será feito para o [TODO.md](TODO.md), e o que já foi concluído para o [DONE.md](DONE.md).
> Fluxo: **rascunho (aqui)** → `TODO.md` (pendências reais) → `DONE.md` (histórico por versão).

## Definição de urgência

- n1 🔴 urgente
  - O n1 urgente é para as coisas que precisam ser feitas o mais rápido possível, porque estão causando um grande impacto negativo no projeto, ou porque são bloqueadores para outras tarefas importantes, ou porque são correções críticas de bugs que estão afetando muitos usuários, ou porque são melhorias essenciais para a experiência do usuário, ou porque são requisitos legais ou de segurança que precisam ser atendidos imediatamente.
- n2 🟠 importante
  - O n2 importante é para as coisas que são importantes para o projeto, podem ser feitas assim que possível.
- n3 🟡 desejável
  - O n3 desejável, mas pode ser feito depois.

> ✅ Concluídos e movidos para o [DONE.md](DONE.md) (ver `[Unreleased]`): formatação de texto no DOCX (quebras de linha, negrito, itálico, listas) e o editor rich-text na descrição da atividade — [plan-shipit38](plans/plan-shipit38-richTextDescriptionAndDocxFormatting.prompt.md).
> ✅ `ELECTRON_RUN_AS_NODE=1`: não havia variável persistente (User/Machine vazios) — era herdada no nível de processo do host (VS Code/Electron). Tratada nos comandos de e2e; em terminal novo fora do host não aparece.

## FEATURES

## Fix

- n2
  - 🟠 feat: Corrigir as cores nos temas para os botões de excluir e cancelar para uma cor dentro do tema que seja ou represente o vermelho, o cancelar e excluir ficou um pouco apagado em alguns temas.
  - 



## Pensando se vale a pena fazer

- n3
  - 🟡 feat: Implementar em configurações a opção de escolher a pasta onde ficam as evidências, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.
  - 🟡 feat: Implementar em configurações a opção de escolher a pasta onde ficará o banco de dados e informações configurações do app
  - 🟡 feat: Implementar opção de backup do app com 2 botões, um para salvar as evidências, e outro para salvar o banco de dados e informações de configurações do app.

- ⁉️ Não sei se precisa disso.
  - ⁉️ feat: Quando criar uma nova atividade, criar e associar uma pasta para cada atividade dentro da pasta de evidências, para organizar melhor as evidências e facilitar a localização das evidências relacionadas a cada atividade, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.

## Verificação, correção e criação de testes

------------------------------------------------------------------
