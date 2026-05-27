# Coisas para fazer e publicar

SHIPIT!  

## New features

- 🟢 feat: Adicionar um campo para colocar as releases que fazem parte daquela atividade; Essas releases são usadas depois para fazer a publicação da atividade concluida e homologada em homologação ou produção. Essas releases não serão incluidas para a geração do relatório (deixar explícito) colocar esse campo em uma seção separada.
- 🟢 feat: Implementar em configurações a opção de escolher a pasta onde ficam as evidências, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.
- 🟢 feat: Implementar em configurações a opção de escolher a pasta onde ficará o banco de dados e informações configurações do app
- 🟢 feat: Implementar opção de backup do app com 2 botões, um para salvar as evidências, e outro para salvar o banco de dados e informações de configurações do app.

- 🟢 feat: Quando criar uma nova atividade, criar e associar uma pasta para cada atividade dentro da pasta de evidências, para organizar melhor as evidências e facilitar a localização das evidências relacionadas a cada atividade, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.

## Verificação, correção e criação de testes

- 🟡 Verificar se os textos escritos no ShipIt! estão sendo passados para o DOCX com os pulos de linha, negrito, itálico, listas, etc, para garantir que as formatações estejam sendo mantidas corretamente no documento gerado.

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

### features

- feat: Adicionar o Botão de excluir ao lado de editar na tela de detalhes da atividade, para excluir a atividade, com confirmação modal para evitar exclusão acidental, e também para melhorar a experiência do usuário.
- feat: na tela de detalhes da atividade remova o elemento `id="activity-nav-mode-toggle"` e no lugar coloque um seletor de meses, para facilitar a navegação entre os meses e permitir que os usuários possam acessar facilmente as atividades de meses anteriores.

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

## validar funcionalidades, corrigir erros e criar testes

Fix: Acontecendo um excesso de notificações de atualização, quando o usuário clica em "Verificar Atualizações" e existe uma nova versão disponível, o aplicativo exibe uma notificação informando que existe uma nova versão disponível, e na sequencia aparece uma outra notificação em inglês com o logo do electron, dizendo "New version available". Quando eu testar o aplicativo novamente eu gostaria que uma rotina fosse executada para remover o lixo que pode ter ficado, deixando o meu conputador mais limpo e organizado, removendo registros e arquivos temporários que possam ter sido criados durante os testes, só não pode mexer no que eu estou usando com a versão instalada na máquina.
Hoje estou desenvolvendo no windows 11 e tenho a ultima versão do ShipIt! instalada. Não quero que essa versão seja afetada, e também não quero que os arquivos e registros relacionados a essa versão sejam afetados, A rotina também precisa limpar o cache de ícones do aplicativo, para evitar que ícones antigos ou corrompidos sejam exibidos, e o que mais for preciso para garantir o aplicativo em produção que está instalado na minha máquina não seja afetado. Além das mensagens aparecendo duplicadas ainda tem problema onde o ícone da taskbar fica com o ícone do electron, e não o ícone do ShipIt!. Também as mensagens de notificação quando clicadas abrem uma janela do electron com o logo do electron, e não do ShipIt!.

- fix: Notificações avaliar, corrigir e criar testes para garantir que as notificações de atualização estejam funcionando corretamente.
- fix: Verificar se as notificações estão sendo exibidas corretamente, sem mensagens duplicadas, e com o ícone correto do ShipIt!.
- fix: Verificar se as notificações estão abrindo a janela correta do ShipIt! quando clicadas, e não uma janela do electron.
- fix: Verificar se o aplicativo está limpando corretamente os arquivos e registros temporários relacionados aos testes, sem afetar a versão instalada do ShipIt! na máquina, e garantindo que o cache de ícones do aplicativo seja limpo para evitar problemas de exibição de ícones antigos ou corrompidos.
- fix: Verificar se o aplicativo está com o ícone correto do ShipIt! na taskbar, e não o ícone do electron, para garantir uma experiência de usuário consistente e profissional.

- testes: Caso aconteça algum erro ou seja verificado um cenário que não esteja coberto por testes automatizados, criar testes para validar o comportamento correto, para garantir as funcionalidades sempre corretas.
- testes: Criar testes automatizados para validar o comportamento das notificações de atualização, garantindo que as mensagens sejam exibidas corretamente, sem duplicação, e com o ícone correto do ShipIt!. Os testes devem incluir cenários para verificar se as notificações estão abrindo a janela correta do ShipIt! quando clicadas, e não uma janela do electron, e também para garantir que o aplicativo esteja limpando corretamente os arquivos e registros temporários relacionados aos testes, sem afetar a versão instalada do ShipIt! na máquina, e garantindo que o cache de ícones do aplicativo seja limpo para evitar problemas de exibição de ícones antigos ou corrompidos.

## Update do app

### Funcionalidades de atualização do aplicativo

- fix: Impedir a atualização automática, não atualizar sem consentimento do usuário, permitir que os usuário escolham quando atualizar, garantir uma  experiência de usuário mais personalizada e controlada.

- feat: colocar uma bolinha de notificação no ícone do aplicativo na taskbar, para indicar que existe uma nova versão disponível, e para chamar a atenção dos usuários para a atualização, garantindo que eles estejam cientes das novidades e melhorias disponíveis na nova versão do aplicativo.
  - colocar uma bolinha no ícone de configurações, para indicar que existe uma nova versão disponível. a bolinha deve ter um efeito do tipo "sonar" para chamar a atenção do usuário, e quando o usuário clicar na bolinha ou no ícone de configurações, deve abrir a tela de configurações, na parte de atualização do aplicativo colocar também a bolinha de notificação, para indicar que existe uma nova versão disponível, remover as bolinhas quando o usuário clicar para abrir a tela de configurações e visualizar o campo de atualização aguarde 10 segundos para remover as bolinhas e para evitar que fiquem aparecendo mesmo depois do usuário ter visto a notificação.
  - Ao clicar na notificação de que existe uma nova versão disponível, o aplicativo deve abrir a tela de configurações, onde o usuário pode ver as informações da nova versão e escolher quando instalar a nova versão, para permitir que os usuários possam tomar uma decisão informada sobre a atualização do aplicativo.
  - colocar um botão para o usuário escolher quando instalar a nova versão, para permitir que os usuários possam controlar o processo de atualização do aplicativo, garantindo que eles possam escolher um momento conveniente para instalar a nova versão.

- feat: Ao fazer o download da nova versão, o aplicativo deve exibir uma notificação informando que a nova versão foi baixada e está pronta para ser instalada, com um botão na notificação para instalar a nova versão.

- feat: Ao clicar no menu `Help/Verificar Atualizações`, exibir uma modal para o usuário, onde o aplicativo deve verificar se existe uma nova versão disponível igual como faz na tela de configurações, e caso exista uma nova versão, informar que existe uma nova versão disponível botão se deseja fazer o download e um botão para instalar a nova versão após o download.

## fix: last update
Quando atualizei o ShipIt! algumas coisas indesejadas aconteceram:

- Analise e veja o que houve. A pasta de instalação mudou de "C:\Users\mauro\AppData\Roaming\shipit" para "C:\Users\mauro\AppData\Roaming\ShipIt!", e isso fez com que o aplicativo não reconhecesse a instalação anterior, e criasse uma nova instalação, e os dados que estão na pasta anterior não estão sendo reconhecidos. configure o instalador para usar a pasta "C:\Users\mauro\AppData\Roaming\shipit" para manter a compatibilidade com a instalação anterior, e para que os dados sejam mantidos e reconhecidos corretamente, e também para evitar que os usuários tenham problemas com a atualização do aplicativo, e quando usar em desenvolvimento `npm run dev` use a pasta "C:\Users\mauro\AppData\Roaming\ShipIt!".

fix: preciso desinstalar completamente o ShipIt! de desenvolvimento e registros relacionados, porque está carregando um electron como se estivesse instalado iniciando com o windows. pode ser problema na opção iniciar ocm o windows que está marcada em desenvolvimento, ou pode ser algum resquício da instalação anterior que está causando esse problema, para resolver isso, preciso desinstalar completamente o ShipIt! de desenvolvimento, removendo todos os arquivos e registros relacionados, para garantir que o aplicativo seja limpo e organizado, e para evitar que o lixo da instalação anterior cause problemas no desenvolvimento e testes do aplicativo.


## New features for the next release 1.5.0

- 🔴 feat: adicionar a tela de perfil os campos a seguir que depois serão usados para preencher no template do DOCX:
  - Disponibilidade Diária `{{daily_availability}}`
  - Disponibilidade Mensal `{{monthly_availability}}`
  - Esforço Mínimo em Horas: `{{minimum_effort_hours}}`

- 🔴 fix: ao tentar instalar a ultima versão da atualização do app que fiz download, apareceu uma mensagem de erro: `Erro: No update filepath provided, can't quit and install`
  - Eu fiz o download da atualização
  - Encerrei o aplicativo completamente
  - Abri o aplicativo novamente ainda sem instalar a atualização
  - Ao clicar no botão para instalar a atualização, apareceu a mensagem de erro: `Erro: No update filepath provided, can't quit and install`

-----------------------------------------------------------

- 🔴 fix: os links de referência não estão sendo incluídos no documento.
  - No mesmo lugar onde são colocadas as referencias com as páginas para as evidências, também é colocado junto os links que foram adicionados um por linha no campo `Links de Referência`
  - Esses links precisam ser clicáveis no documento, para que os usuários possam acessar facilmente as referências relacionadas às atividades. não exiba o link url inteira porque ficaria muito grande para o espaço determinado, exiba apenas o nome link, por exemplo, link 01, link 02, etc, e quando o usuário clicar no nome do link, ele deve ser redirecionado para a url correspondente.
  - Abaixo dos links pulando linha do ultimo link, exiba as referências das evidências com as páginas como já é feito hoje.

----

- 🟡 Remover a seção com o botão que tem o link do perfil de dentro da configuração.

---

## New features

- 🟢 feat: quando exibir a quantidade de evidências na lista de atividades ou em outros lugares, separar por ícone as imagens e textos. Quero que na lista de atividades seja da mesma forma que é hoje mas separados por tipo texto e imagens, as quantidades precisam estar separadas, e nos detalhes da atividade também.

----

## Verificação, correção e criação de testes

- 🟡 Verificar se as imagens estão ocupando o tamanho máximo da página em altura ou largura considerando o tamanho da legenda que pode ter até duas linha de altura no máximo.

----

- 🟢 feat: Ajustar a barra de rolagem para usar um padrão igual do vscode e acompanhar as cores do tema escolhido, e sempre visível quando necessário.

## Sobre e Doação

modifique o botão `sobre` para ao invés de abrir uma janela com as informações do aplicativo, ele deve abrir uma página com as informações do aplicativo, como por exemplo a versão, o nome do aplicativo, o site do projeto, as redes sociais, etc, para que os usuários possam acessar facilmente as informações do aplicativo e conhecer mais sobre o projeto, e também para melhorar a experiência do usuário.

Depois dos dados sobre o aplicativo, exiba um botão "Doar" ou "Support Us" que, ao ser clicado, redireciona os usuários para a página de pagamento do Pix, onde eles podem fazer uma doação para apoiar o desenvolvimento do ShipIt! e ajudar a manter o projeto ativo e atualizado, e também para mostrar que o projeto é aberto a contribuições e apoio da comunidade. Inclua também um QR code do Pix para facilitar o processo de doação, permitindo que os usuários possam escanear o código com seus smartphones e fazer a doação de forma rápida e conveniente. Inclua também a chave Pix aleatória para aqueles que preferem fazer a doação manualmente, incluir o url da página do Pix.

URL página do pix:
https://nubank.com.br/cobrar/2w3xk/6a164c4f-fd89-47de-92bf-4bae2c2d90b8

Imagem QR code do pix:
public/assets/images/qrpixnu.png

Código do QR code do pix:
00020126780014BR.GOV.BCB.PIX01363536a7e9-0d0c-4532-9a52-30ca23b268fb0216Valeu, obrigado!520400005303986540525.005802BR5919Mauro Rocha Tavares6009SAO PAULO62140510yg0o2mR2AO6304DE4F

Chave pix aleatória:
3536a7e9-0d0c-4532-9a52-30ca23b268fb

## Fazendo

