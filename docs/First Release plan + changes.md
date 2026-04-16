# First Release plan changes

```text
  _____ _     _       _   
 / ____| |   (_)     | |  
| (___ | |__  _ _ __ | |_ 
 \___ \| '_ \| | '_ \| __|
 ____) | | | | | |_) | |_ 
|_____/|_| |_|_| .__/ \__|
                | |       
                |_|       
```

## Atualização da Documentação

1. Analize o projeto, a pasta `docs/` e Atualize a documentação em `docs/`, incluindo o `./README.md` pois agora ele precisa conter informações e instruções para o usuário final do ShipIt!, e não mais para o time de desenvolvimento, então ele deve conter informações sobre como usar o ShipIt!, como instalar, como configurar, como usar as funcionalidades principais, etc, deixar espações para colocar imagens, gifs, vídeos, etc, para deixar a documentação mais atrativa e fácil de entender, e também para mostrar exemplos de uso do ShipIt! em diferentes cenários.
2. Analise o changelog e atualize o changelog para refletir as mudanças feitas no projeto
3. Atualize o `docs/TODO.md` para registrar as tasks concluídas e as próximas tasks a serem feitas, para manter um registro organizado do progresso do projeto e para facilitar a comunicação entre os membros da equipe, e também para mostrar o que já foi feito e o que ainda precisa ser feito, e para manter um planejamento claro e organizado do projeto.
4. Atualize o `.github/copilot-instructions.md`
5. Atualize o `docs/ARCHITECTURE.md` para refletir as mudanças feitas na arquitetura do projeto, para mostrar como o projeto está estruturado e organizado, e para facilitar a compreensão do projeto por parte dos novos membros da equipe ou de outros desenvolvedores que possam se interessar pelo projeto, e também para mostrar as decisões de design e arquitetura tomadas durante o desenvolvimento do projeto.

## Tela Detalhes da Atividade

- Na tela `Detalhes da Atividade` incluir navegação para a próxima atividade do projeto clicando no link "Next Activity" ou "Próxima Atividade" e o link "Previous Activity" ou "Atividade Anterior", para facilitar a navegação entre as atividades do projeto e permitir que os usuários possam acessar facilmente as atividades relacionadas, e também para melhorar a experiência do usuário, tornando a navegação mais fluida e intuitiva, e também para incentivar os usuários a explorar mais o projeto e conhecer todas as atividades disponíveis.

## Tela cadastro de Atividades

- Na tela de cadastro de atividades, incluir um campo para cadastrar um texto como evidência, 

## Layout

- Melhorar o layout do ShipIt!, mantendo uma consistência visual, que todas as páginas e telas do ShipIt! tenham a mesma largura da tela do dashboard, para criar uma experiência mais coesa e agradável para os usuários, e também para mostrar que o ShipIt! é um projeto bem estruturado e organizado, com um design consistente e profissional.

- Ao clicar nas imagens de evidencias, abrir as imagens em um lightbox com zoom, para que os usuários possam visualizar as evidências em um tamanho maior e com mais detalhes, sem precisar sair da página. Isso pode ser feito usando uma biblioteca de lightbox, como por exemplo o `react-image-lightbox` ou o `lightbox2`, para criar um efeito de zoom e navegação entre as imagens, permitindo que os usuários possam explorar as evidências de forma mais interativa e agradável, e também para melhorar a experiência do usuário, tornando a visualização das evidências mais fácil e agradável.

```text 
 _____     _   _   
|  ___|   (_) | | 
| |_  ___ | | | |_  ___ 
|  _|/ _ \| | | __|/ _ \
| | |  __/| | | |_| (_) |
\_|  \___||_|  \__|\___/
```

## Automatização de Commit, Update Changelog, Versionamento, Push, PR, Merge PR na Main, Criação de Tags GitHub

Baseando-se nos moldes e no estilo do script e documentação de publicação de outro projeto que está na pasta `docs\exemplo-publicador`, use python para criar um script dentro da pasta `docs/scripts/` e desenvolva um script para automatizar a publicação de uma nova tag no GitHub. O script deve verificar o freetier e o GH CLI token antes de prosseguir com a publicação.

Resumidamente precisa fazer quando preciso Validar se tem arquivos não enviados (commited), Se precisar fazer o Commit, Update Changelog com a IA CLI do github copilot, Versionamento, git Push, criar a PR dev -> main, Merge PR na main, Criação e envio da Tag, já existe o CICD no github que cria a release como draft quando envia uma nova tag, comando para mudar a release de draft para Publish Release.

O script deve incluir as seguintes funcionalidades:

- Verificar o freetier e o GH CLI token antes de prosseguir com a publicação.
- Automatizar o processo de commit, update do changelog, versionamento, push, criação de PR, merge PR na main, criação de tags no GitHub.
- Fornecer mensagens de erro claras e instruções para solucionar problemas comuns relacionados à autenticação e permissões.
- Incluir instruções detalhadas na documentação sobre como usar o script, incluindo exemplos de comandos para testar o GH CLI token e autenticação, bem como para criar uma release como rascunho.
- Atualizar a documentação para incluir um guia passo a passo sobre o processo de publicação de uma nova tag, desde a criação de tags até o uso do script automatizado, destacando as melhores práticas e dicas para evitar erros comuns.
- Incluir na documentação a instrução que explica que o cicd do GitHub irá criar uma release como rascunho quando uma nova tag for enviada, e fornecer o comando para mudar a release de rascunho para publicação.
- Crie a documentação e readme para o processo de publicação de uma nova release, incluindo a criação de tags e o uso do script automatizado, troubleshooting para erros comuns e melhores práticas, incluindo instruções para verificações e comandos de teste, também inclua instruções e comandos para testar o GH cli token e autenticação, e também para criar um teste e publicar como draft, para verificar se o script de publicação está funcionando corretamente antes de usá-lo em um ambiente de produção.




## Fazendo 

## Temas para o 'ShipIt!'

Cores melhoraro tema escuro e claro, e criar outros temas para o ShipIt!, como por exemplo um tema colorido, tons de rosa e roxo feminino, alto contraste, preto e branco, um tema minimalista, um tema futurista, etc, para que os usuários possam escolher o tema que mais combina com eles e com o estilo do projeto deles, e também para deixar o ShipIt! mais atrativo e personalizado.
Leve em conta que teremos outros Temas para que as pessoas com problemas de visão possam escolher o que melhor lhes agrada.

1. Quero mudar as cores do ShipIt! tanto do tema escuro quanto do tema claro, para deixar o ShipIt! mais moderno, atrativo e agradável de usar, e também para melhorar a experiência do usuário, deixando o ShipIt! mais fácil de usar e mais bonito de se olhar, e também para mostrar que o ShipIt! é um projeto atualizado e moderno, que acompanha as tendências de design atuais.

2. Usando as Skills de temas vamos criar Temas, vamos criar outros temas para o ShipIt!, além do tema escuro e claro, vamos criar outros temas, como por exemplo um tema colorido, um tema minimalista, um tema futurista, etc, para que os usuários possam escolher o tema que mais combina com eles e com o estilo do projeto deles, e também para deixar o ShipIt! mais atrativo e personalizado.