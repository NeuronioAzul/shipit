# First Release plan changes

```txt
  _____ _     _       _   
 / ____| |   (_)     | |  
| (___ | |__  _ _ __ | |_ 
 \___ \| '_ \| | '_ \| __|
 ____) | | | | | |_) | |_ 
|_____/|_| |_|_| .__/ \__|
                | |       
                |_|       
```

## Detalhes da atividade

## validar funcionalidades, corrigir erros e criar testes

Validar funcionalidade e caso necessário corrigir e criar testes para não acontecer mais o erro.

- testar todas as funcionalidades do titlebar:
  - clicar e arrastar para mover a janela
  - clicar no ícone de minimizar
  - maximizar a janela e restaurar para o tamanho anterior
  - fechar a janela
  - verificar se:
    - o campo de busca está funcionando corretamente,
    - se os resultados da busca estão sendo exibidos corretamente,
    - se o ícone de busca está sendo exibido corretamente,
    - se a navegação entre os resultados da busca usando as setas para cima e para baixo está funcionando corretamente;
  - verificar se as setas anterior e próximo estão funcionando corretamente, navegando entre as páginas visitadas pelo usuário,
    - e se o histórico de navegação está sendo registrado corretamente para permitir a navegação entre as páginas visitadas.
  - verificar todos os itens do menu, para garantir que estão funcionando corretamente, e que as funcionalidades estão sendo executadas conforme o esperado.

### features

- feat: Adicionar o Botão de excluir ao lado de editar na tela de detalhes da atividade, para excluir a atividade, com confirmação modal para evitar exclusão acidental, e também para melhorar a experiência do usuário.
- feat: na tela de detalhes da atividade remova o elemento `id="activity-nav-mode-toggle"` e no lugar coloque um seletor de meses, para facilitar a navegação entre os meses e permitir que os usuários possam acessar facilmente as atividades de meses anteriores.
-

## Tela do aplicativo

- feat: ao clicar no menu `Help/Verificar Atualizações`, exibir uma modal para o usuário, onde o aplicativo deve verificar se existe uma nova versão disponível igual como faz na tela de configurações, e caso exista uma nova versão, informar que existe uma nova versão disponível, com um botão para instalar a nova versão.

------------------------------------------------------------------

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

## Temas para o 'ShipIt!'

Cores melhoraro tema escuro e claro, e criar outros temas para o ShipIt!, como por exemplo um tema colorido, tons de rosa e roxo feminino, alto contraste, preto e branco, um tema minimalista, um tema futurista, etc, para que os usuários possam escolher o tema que mais combina com eles e com o estilo do projeto deles, e também para deixar o ShipIt! mais atrativo e personalizado.
Leve em conta que teremos outros Temas para que as pessoas com problemas de visão possam escolher o que melhor lhes agrada.

1. Quero mudar as cores do ShipIt! tanto do tema escuro quanto do tema claro, para deixar o ShipIt! mais moderno, atrativo e agradável de usar, e também para melhorar a experiência do usuário, deixando o ShipIt! mais fácil de usar e mais bonito de se olhar, e também para mostrar que o ShipIt! é um projeto atualizado e moderno, que acompanha as tendências de design atuais.

2. Usando as Skills de temas vamos criar Temas, vamos criar outros temas para o ShipIt!, além do tema escuro e claro, vamos criar outros temas, como por exemplo um tema colorido, um tema minimalista, um tema futurista, etc, para que os usuários possam escolher o tema que mais combina com eles e com o estilo do projeto deles, e também para deixar o ShipIt! mais atrativo e personalizado.

## Atualização da Documentação

1. Analize o projeto, a pasta `docs/` e Atualize a documentação em `docs/`, incluindo o `./README.md` pois agora ele precisa conter informações e instruções para o usuário final do ShipIt!, e não mais para o time de desenvolvimento, então ele deve conter informações sobre como usar o ShipIt!, como instalar, como configurar, como usar as funcionalidades principais, etc, deixar espações para colocar imagens, gifs, vídeos, etc, para deixar a documentação mais atrativa e fácil de entender, e também para mostrar exemplos de uso do ShipIt! em diferentes cenários.
2. Analise e atualize o `./CHANGELOG.md` para refletir as mudanças feitas no projeto já organizando para a próxima publicação. baseando-se nas mudanças feitas no projeto, desde a ultima tag e release publicada.
3. Atualize o `docs/TODO.md` para registrar as tasks concluídas e as próximas tasks a serem feitas, para manter um registro organizado do progresso do projeto e para facilitar a comunicação entre os membros da equipe, e também para mostrar o que já foi feito e o que ainda precisa ser feito, e para manter um planejamento claro e organizado do projeto.
4. Atualize o `.github/copilot-instructions.md`
5. Atualize o `docs/ARCHITECTURE.md` para refletir as mudanças feitas na arquitetura do projeto, para mostrar como o projeto está estruturado e organizado, e para facilitar a compreensão do projeto por parte dos novos membros da equipe ou de outros desenvolvedores que possam se interessar pelo projeto, e também para mostrar as decisões de design e arquitetura tomadas durante o desenvolvimento do projeto.

## Layout

- Melhorar o layout do ShipIt!, mantendo uma consistência visual, que todas as páginas e telas do ShipIt! tenham a mesma largura da tela do dashboard, para criar uma experiência mais coesa e agradável para os usuários, e também para mostrar que o ShipIt! é um projeto bem estruturado e organizado, com um design consistente e profissional.

- Ao clicar nas imagens de evidências, abrir as imagens em um lightbox com zoom, para que os usuários possam visualizar as evidências em um tamanho maior e com mais detalhes, sem precisar sair da página. Isso pode ser feito usando uma biblioteca de lightbox, como por exemplo o `react-image-lightbox` ou o `lightbox2`, para criar um efeito de zoom e navegação entre as imagens, permitindo que os usuários possam explorar as evidências de forma mais interativa e agradável, e também para melhorar a experiência do usuário, tornando a visualização das evidências mais fácil e agradável.

## Tela Detalhes da Atividade

- Na tela `Detalhes da Atividade` exibir todos os dados sobre a atividade.

- Na tela `Detalhes da Atividade` incluir navegação para a próxima atividade do projeto clicando no link "Next Activity" ou "Próxima Atividade" e o link "Previous Activity" ou "Atividade Anterior", para facilitar a navegação entre as atividades do projeto e permitir que os usuários possam acessar facilmente as atividades relacionadas, e também para melhorar a experiência do usuário, tornando a navegação mais fluida e intuitiva, e também para incentivar os usuários a explorar mais o projeto e conhecer todas as atividades disponíveis.

## feature: Tela cadastro de Atividades

Na tela de cadastro de atividades, incluir um campo no formulário para inserir uma evidencia do tipo texto, permitindo que os usuários possam adicionar descrições detalhadas ou observações relacionadas à atividade. (Exemplo: "A atividade foi concluída com sucesso, mas houve um pequeno atraso devido a um problema técnico que foi resolvido posteriormente.")

- Modelar a tabela no banco do sqlite para registrar as evidências do tipo texto, associando-as às atividades correspondentes, garantindo que cada evidência de texto esteja vinculada à atividade correta e possa ser facilmente recuperada e exibida na interface do usuário.

- Regras de negócio para o campo de evidência do tipo texto, com vinculo com a atividade, a data do registro, soft delete, campo de texto simples com negrito, itálico, listas, etc, para permitir que os usuários possam formatar suas descrições de forma mais clara e organizada, facilitando a leitura e compreensão das informações fornecidas, e também para melhorar a experiência do usuário, tornando as descrições mais legíveis e atraentes visualmente.
  - Fica disponível um botão "Adicionar Texto como Evidência" ou "Add Text as Evidence" que, ao ser clicado, exibe uma modal com um campo de textarea para o usuário inserir a descrição ou observação relacionada à atividade e dois botões: "Salvar" e "Cancelar".
  - Ao clicar em "Salvar", a descrição inserida é salva como uma nova evidência do tipo texto associada à atividade, e a modal é fechada. A nova evidência de texto deve ser exibida na lista de evidências da atividade, com um ícone ou rótulo indicando que é uma evidência de texto.
  - Ao clicar em "Cancelar", a modal é fechada sem salvar nenhuma informação.
  - Ao clicar na evidência de texto na lista de evidências, a descrição completa deve ser exibida em um formato legível, como um modal para que os usuários possam ler facilmente o conteúdo da evidência de texto, especialmente se for uma descrição longa.
  - O campo deve aceitar um número limitado de caracteres, por exemplo, até 2000 caracteres, para garantir que as descrições sejam concisas e relevantes.
  - O campo deve ser opcional.
  - O campo deve ser exibido em um formato de textarea, para facilitar a inserção de múltiplas linhas de texto e melhorar a legibilidade das descrições.
  - O campo deve ser validado para evitar a inserção de conteúdo inadequado.

### fix

- Fix: o campo de busca esta ocupando todo o espaço da menubar, ficando sem espaço para clicar e mover a janela, para resolver isso, o campo de busca deve ter um tamanho máximo definido, para que ele não ocupe todo o espaço da menubar, e para que os usuários possam clicar e arrastar a janela normalmente, sem precisar clicar no campo de busca, e também para melhorar a experiência do usuário.

- Fix: Tema cyberpunk com tema quebrando o campo de busca do menubar
  - tema cyberpunk, que é um tema separado do padrão, o campo de busca está quebrando e sumindo quando eu digito algo no campo de busca.
  - O ícone de busca não está sendo exibido.
  - Os resultados da busca também estão quebrando e movendo de lugar para baixo.

## Janela do aplicativo

### features

- Adicionar ao lado esquerdo do campo de busca a navegação anterior e próximo igual no vscode, para navegar no histórico de navegação do usuário, facilitando voltar para última tela onde estava.
- Permitir o menu de contexto ao clicar com o botão direito do mouse (right-click) para copiar, recortar e colar, - links devem abrir no navegador padrão do usuário fora do app

- Adicionar um menu ao lado do logo para acessar as funcionalidades sugira outros que possam ser úteis para o usuário, além dos que já estão listados:
  - File
    - Nova Atividade - ctrl+n
    - divisor ----
    - Abrir Pasta dos Relatórios - ctrl+o
    - Abrir Pasta das Evidências - ctrl+e
    - divisor ----
    - Salvar - ctrl+s
    - divisor ----
    - Configurações - ctrl+, (vírgula)
    - divisor ----
    - Sair - ctrl+q
  - Edit
    - Copiar - ctrl+c
    - Recortar - ctrl+x
    - Colar - ctrl+v
    - Selecionar Tudo - ctrl+a
    - Desfazer - ctrl+z
    - Refazer - ctrl+y
    - divisor ----
    - Buscar - ctrl+f -> define o foco no campo de busca para buscar atividades, projetos, evidências, etc
  - View
    - Zoom In - ctrl+plus
    - Zoom Out - ctrl+minus
    - Reset Zoom - ctrl+0
    - divisor ----
    - Minimizar - ctrl+m
    - Maximizar - ctrl+shift+m
    - Fechar - ctrl+q
  - Ajuda
    - Sobre o ShipIt!
    - Verificar Atualizações / atualizar
    - Manual do Usuário - criar tela com as instruções de uso do ShipIt!. Depois será melhorado e atualizado com imagens, gifs, vídeos, etc, para deixar a documentação mais atrativa e fácil de entender, e também para mostrar exemplos de uso do ShipIt! em diferentes cenários.
    - Reportar um Problema - link para o usuário abrir uma issue no GitHub para reportar um problema, bug, sugestão, etc, para ajudar a melhorar o ShipIt! e para mostrar que o projeto é aberto a contribuições e feedbacks da comunidade.

Remoção total do toggle antigo de modo de navegação e substituição por seletor de mês com chevrons e label MM/YYYY no centro do nav.
Navegação no detalhe agora baseada em mês selecionado, com recarga de siblings por month_reference.
Atalhos ArrowLeft/ArrowRight ajustados para operar no contexto do mês selecionado.
Botão Excluir adicionado ao lado de Editar no detalhe da atividade.
Modal de exclusão da atividade implementada com role alertdialog, aria-modal, aria-labelledby, fechamento por clique fora e Escape.
Fluxo de exclusão reutilizando deleteActivity, toast de sucesso/erro e redirecionamento para /activities?month=mêsSelecionado.
IDs estáveis adicionados conforme plano, incluindo activity-nav-month-selector, activity-detail-btn-delete e activity-detail-delete-modal.
Modal de exclusão de evidência mantida separada com id próprio para evitar conflito de seletores.

## Fix

### Adicionar Evidencia do tipo Texto

- fix: quando eu tento adicionar uma evidência do tipo texto, e na modal eu clico no campo de textarea, em algumas partes não seleciona o campo de textarea, e não deixa eu digitar, para resolver isso, o campo de textarea deve ser ajustado para que ele seja selecionado corretamente quando o usuário clicar em qualquer parte do campo, para que os usuários possam digitar suas descrições sem problemas, e também para melhorar a experiência do usuário.
- fix: quando eu tento colar usando o ctrl+v ou o menu de contexto, o conteúdo não é colado no campo de textarea, para resolver isso, o campo de textarea deve ser ajustado para permitir a funcionalidade de colar usando o ctrl+v e o menu de contexto, para que os usuários possam colar suas descrições sem problemas, e também para melhorar a experiência do usuário.
- fix: aumentar a quantidade de caracteres permitidos no campo de textarea para 20000 caracteres, para permitir que os usuários possam inserir descrições mais detalhadas e completas, sem se preocupar com limitações de espaço, e também para melhorar a experiência do usuário, permitindo que eles possam fornecer informações mais ricas e úteis sobre as atividades.

- verificar se todos os campos do tipo input, textarea, estão permitindo a funcionalidade de colar usando o ctrl+v, ctrl+c, ctrl+x, ctrl+a, ctrl+z, ctrl+y, ctrl+shift+z, ctrl+shift+y, etc, e o menu de contexto, para garantir que os usuários possam colar suas informações sem problemas, e também para melhorar a experiência do usuário.

-----------------------------------------------------------

## Fazendo


## 1 - validar funcionalidades, corrigir erros e criar testes

Validar funcionalidade e caso necessário corrigir e criar testes para não acontecer mais o erro.

- testar todas as funcionalidades do titlebar:
  - clicar e arrastar para mover a janela
  - clicar no ícone de minimizar
  - maximizar a janela e restaurar para o tamanho anterior
  - fechar a janela
  - verificar se:
    - o campo de busca está funcionando corretamente,
    - se os resultados da busca estão sendo exibidos corretamente,
    - se o ícone de busca está sendo exibido corretamente,
    - se a navegação entre os resultados da busca usando as setas para cima e para baixo está funcionando corretamente;
  - verificar se as setas anterior e próximo estão funcionando corretamente, navegando entre as páginas visitadas pelo usuário,
    - e se o histórico de navegação está sendo registrado corretamente para permitir a navegação entre as páginas visitadas.
  - verificar todos os itens do menu, para garantir que estão funcionando corretamente, e que as funcionalidades estão sendo executadas conforme o esperado.

## 2 - criar tag

Depois que tudo estiver validado, corrigido e testado, e a documentação estiver atualizada, o próximo passo é criar uma nova tag para a versão que será publicada. Para isso, siga os passos abaixo:

Executar o script de publicação `docs\scripts\release.py` para criar uma nova tag no GitHub, seguindo as instruções detalhadas na documentação `docs\scripts\`, para publicar a nova versão do ShipIt! e disponibilizá-la para os usuários.
