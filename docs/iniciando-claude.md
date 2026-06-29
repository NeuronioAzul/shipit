# Iniciando com o Claude

## Descrição

Quero que aprenda sobre o projeto, e ajuste esse diretório para funcionar melhor com você Claude, pois antes estava usando o Copilot e não tinha muita experiência com IAs.

## Configuração do ambiente de desenvolvimento (básico)

Usando o Windows 11, Visual Studio Code, Git, GitHub, e o PowerShell.

## Documentação do projeto (pasta `./docs`)

A documentação do projeto se concentra na pasta: `./docs`. Alguns arquivos podem estar um pouco desatualizados, mas a maioria das informações ainda é relevante. A estrutura da pasta `docs` é a seguinte:

| caminho | descrição |
| --- | --- |
| docs\assets | São imagens, ícones, e outros arquivos exemplos relacionados ao projeto, que foram ou não usadas. |
| docs\cyber-punk-style-samples | Estilo visual cyberpunk, para inspiração de design do thema. |
| docs\exemplo-publicador | Exemplo de como publicar o app, mas não sei se é mais necessário manter isso, porque na pasta scripts tem um script de publicação `docs\scripts\release.py` que já tem tudo o que precisa para publicar. Estou pensando em excluir essa pasta, verificar. |
| docs\ideias p logo | Ideias para o logo do projeto. O logo atual já é o definitivo, manter a pasta apenas para guardar as ideias que tive. |
| docs\new-ui-ux-visual | Ideias de UI/UX e visuais iniciais. Criar um todo para atualizar isso com as cores e themas atuais, para ficar mais fácil escolher e definir cores e themas do projeto. |
| docs\plans | Planos que usei com a ia no projeto, para o desenvolvimento, o plano `plan-documentationUpdate.prompt.md` foi uma ideia para que sempre que um desenvolvimento fosse concluído, a ia documentasse e atualizasse a documentação automaticamente, todos, changelog, etc, mas precisa sincronizar com o script `docs\scripts\release.py`, para não dar conflito na hora da publicação, os planos do shipit estão na pasta `docs\plans\`  numerados com iniciando com o nome `plan-shipit**-*.prompt.md`, etc. |
| docs\printscreen | Capturas de tela do projeto, apenas um print para o README.md. |
| docs\Relatórios 2026 | Relatórios planejados para 2026, esses são os arquivos usados bem no início do projeto, não sei se são mais necessários. |
| docs\scripts | Scripts python que utilizo para fazer a publicação no github. |
| docs\tray-option | imagens svg para edição se precisar. Eu fiz para o system tray do app, as imagens finais estão na pasta `public\assets\images\tray`. |
| docs\ARCHITECTURE.md | Arquitetura do projeto, explicando a estrutura de pastas, arquivos, e como o projeto é organizado. |
| docs\coisas para fazer e publicar.md | Lista de coisas para fazer, corrigir, testar, e publicar, com definição de urgência e coisas que já foram feitas. |
| docs\comandos.txt | Comandos usados para o desenvolvimento, como comandos do git, comandos do npm, etc. |
| docs\DEPENDENCIES.md | Dependências do projeto, explicando quais bibliotecas e ferramentas são necessárias. |
| docs\DEVELOPMENT.md | Guia de desenvolvimento, explicando como configurar o ambiente e contribuir para o projeto. |
| docs\Ícones em apps Electron - guia técnico completo para Windows, macOS e Linux.md | Guia técnico sobre como usar ícones em aplicativos Electron. |
| docs\TODO.md | Lista de tarefas pendentes e futuras melhorias para o projeto. |

### Organização das tarefas e histórico de desenvolvimento

Preciso atualizar a lista de TODOs no arquivo `docs\TODO.md`, e também não quero passar o que está no arquivo `docs\coisas para fazer e publicar.md` para o `docs\TODO.md`, porque não quero mais o `docs\coisas para fazer e publicar.md`. Quero manter o `docs\coisas para fazer e publicar.md` apenas como um arquivo de rascunho, para ir anotando as coisas que preciso fazer, corrigir, testar, e publicar, e depois passar para o `docs\TODO.md` apenas as coisas que realmente precisam ser feitas, corrigidas, testadas, e publicadas, para manter o `docs\TODO.md` mais organizado e atualizado com as tarefas reais do projeto.

O Arquivo de TODO está ficando muito grande, então quero criar um arquivo de DONE.md, para ir passando as coisas que já foram feitas, corrigidas, testadas, e publicadas, para manter o TODO mais organizado e atualizado com as tarefas reais do projeto, e o DONE para ter um histórico do que já foi feito, corrigido, testado, e publicado, incluindo em qual versão foi feito, corrigido, testado, e publicado, para ter um histórico completo do desenvolvimento do projeto. O arquivo `docs\coisas para fazer e publicar.md` vai continuar sendo o rascunho, onde anoto tudo o que preciso fazer, depois passo para o TODO apenas o que realmente precisa ser feito, e o arquivo com o que já foi feito fica sendo o DONE.md, para ter um histórico completo do desenvolvimento do projeto.

### Documentação do projeto na raiz do projeto

| caminho | descrição |
| --- | --- |
| CHANGELOG.md | É o arquivo que contém o histórico de mudanças do projeto, com as versões e as alterações feitas em cada versão. As alterações mais novas ficam no começo do arquivo, o arquivo segue a ordenação da mais nova para a mais velha |
| CONTRIBUTING.md | É o arquivo que contém as diretrizes para contribuir para o projeto, explicando como configurar o ambiente de desenvolvimento, como fazer pull requests, e outras informações importantes para os colaboradores. |
| README.md | É o arquivo que contém a descrição do projeto, como usar, como contribuir, e outras informações importantes para os usuários. |
