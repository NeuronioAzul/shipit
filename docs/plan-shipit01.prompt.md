# 🚀 Plano de Desenvolvimento: ShipIt!

## 1. Visão Geral

O que significa "ShipIt!"? O nome é uma brincadeira com a expressão "Ship It!" usada no mundo do desenvolvimento de software para indicar que algo está pronto para ser lançado ou entregue. O nome reflete a missão do aplicativo de ajudar os profissionais a "enviar" seus relatórios mensais de atividades de forma rápida e eficiente, sem complicações.

O ShipIt! é uma aplicação desktop multiplataforma (Windows, macOS e Linux) projetada para automatizar a criação do "Relatório Mensal de Atividades Desenvolvidas" seguindo o padrão institucional do MEC (Ministério da Educação). O foco é facilitar a vida dos profissionais  desenvolvedores, arquitetos, levantadores de requisitos e testadores, permitindo registros diários com evidências (prints e links) que se consolidarão em um PDF formatado ao final do mês. 

Fácil de acessar ficando no system tray, o ShipIt! é a solução ideal para quem busca praticidade e eficiência na documentação de suas atividades desenvolvidas para o relatório mensal. 

Bastará clicar no ícone no System Tray e se abrirá a janela para continuar ou registrar uma nova atividade e evidência, (inserindo o link) ou (colando, selecionando na máquina, arrastando e soltando o print), escrever o texto e deixar o resto com o ShipIt!, sempre salva automaticamente impedindo perdas de dados.

## 2. Stack Tecnológica

| Componente | Tecnologia | Justificativa |
| ---------- | ---------- | ------------- |
| Framework Desktop | Electron | Multiplataforma nativo e fácil acesso ao sistema de arquivos. |
| Backend | Node.js | Permite integração com Electron e fácil manipulação de arquivos e banco de dados. |
| Interface (UI) | React + Tailwind CSS + font-awesome | Rapidez no desenvolvimento e estilização precisa ("Pixel Perfect"). font-awesome para ícones e elementos visuais consistentes, instalada via npm. |
| Banco de Dados | SQLite (via TypeORM) | Local, rápido e não exige servidor externo. |
| Geração de PDF | Puppeteer | Renderiza o PDF a partir de HTML com fidelidade absoluta ao layout original. |
| Armazenamento | File System Local | Os prints serão salvos por padrão em uma pasta com o nome do aplicativo no diretório de documentos do usuário ou home, perguntar na instalação onde o usuário deseja salvar os prints, e o usuário pode alterar a pasta de destino posteriormente nas configurações do aplicativo. |

*Important*: As bibliotecas não devem usar links externos para acessar os arquivos, todas as dependências devem ser instaladas localmente via npm e incluídas no bundle final do aplicativo, para garantir que o ShipIt! funcione completamente offline, sem depender de conexões externas para acessar recursos essenciais como ícones, templates de PDF ou arquivos de estilo e fonts.

## 3. Arquitetura de Dados (Schema)

O banco de dados local será estruturado em 4 eixos:

### A. Perfil do Usuário (user_profile)

- *full_name*: Texto (Ex: `Maria Silva de Souza e Silva`) Precisa ser o nome completo para preencher o campo "Nome Completo" do relatório.
- *role*: Texto (Ex: `Engenheiro de Software`) o usuário fica livre para escolher entre:
  - 'ADMINISTRADOR DE DADOS', 'ANALISTA DE DADOS E BUSINESS INTELLIGENCE', 'ANALISTA DE QUALIDADE E TESTES DE SOFTWARE', 'ANALISTA DE REQUISITOS', 'ARQUITETO DE DADOS', 'ARQUITETO DE SOFTWARE', 'ARQUITETO DE SOFTWARE DEVOPS', 'ENGENHEIRO DE AUTOMAÇÃO', 'CIENTISTA DE DADOS', 'ENGENHEIRO DE SOFTWARE', 'ENGENHEIRO DE DADOS'
- *seniority_level*: Enum (Aprendiz, Júnior, Pleno, Sênior, Especialista, Líder, Master)
- *contract_identifier*: Texto - Identificador do Contrato (Ex: `Contrato n° 06/2022 – Digisystem Serviços Especializados Ltda`)
- *profile_type*: Texto (Ex: `DEV-9`) valores reais de (DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-06, DEV-07, DEV-08, DEV-09, DEV-10)
- *correlating_activities*: Texto Longo (Ex: `Desenvolve ... artificial.`) é um texto explicativo para correlacionar as atividades do mês com o perfil do usuário, será copiado do arquivo modelo que o profissional receber.
- *attendance_type*: Enum (Presencial, Remoto, Híbrido)
- *project_scope*: Texto (Ex: `Squad 2 / Projeto SIMEC; Squad SESU / Projeto PNAES`) Pode ter mais do que um valor, separados por vírgula, pois o usuário pode atuar em mais de uma squad/projeto/aplicação. Adicionar exemplo de preenchimento (`<Squad/Projeto/Aplicação>: <nomear a Squad, o projeto e a aplicação. Exemplo: Squad SESU / Projeto PNAES>`)
- *last_updated*: Timestamp (Data e hora da última atualização do perfil) (preenchido automaticamente) apenas loga a última vez que o usuário atualizou o perfil, para fins de controle e para exibir essa informação na tela de configurações do perfil do usuário.
- *mode*: Enum (Dark Mode *Default, Light Mode) (preenchido automaticamente) o usuário escolhe o modo na configuração inicial, e pode alterar posteriormente nas configurações do perfil do usuário, para personalizar a aparência do aplicativo de acordo com sua preferência visual.

### A.1. Configurações de Alertas (alerts)

Configurações dos meus alertas 5 dias antes duas vezes por dia, 3 dias antes três vezes por dia, 2 dias antes quatro vezes por dia, 1 dia antes cinco vezes por dia, e no último dia do mês seis vezes por dia, o app deve exibir um alerta para o usuário preencher os campos obrigatórios para gerar o relatório mensal, e o app deve impedir a geração do PDF se houver atividades com campos obrigatórios faltando.

- *alert_days_before*: Array de Inteiros (Ex: [5, 3, 2, 1, 0]) (preenchido automaticamente) o usuário pode escolher quantos dias antes do final do mês deseja receber os alertas, e o app deve exibir os alertas de acordo com a configuração escolhida.
- *alert_frequency*: Array de Inteiros (Ex: [2, 3, 4, 5, 6]) (preenchido automaticamente) o usuário pode escolher quantas vezes por dia deseja receber os alertas nos dias configurados, e o app deve exibir os alertas de acordo com a configuração escolhida.
- *last_alert_sent*: Timestamp (Data e hora do último alerta enviado) (preenchido automaticamente) o app deve logar a data e hora do último alerta enviado para evitar enviar alertas repetidos no mesmo dia, e para exibir essa informação na tela de configurações do perfil do usuário.
- *alert_enabled*: Boolean (true/false) (preenchido automaticamente) o usuário pode escolher habilitar ou desabilitar os alertas, e o app deve respeitar essa configuração para enviar ou não os alertas.
- *alert_time*: String (HH:mm) (preenchido automaticamente) o usuário pode escolher o horário do dia para receber os alertas, e o app deve respeitar essa configuração para enviar os alertas no horário escolhido.
- *alert_message*: String (Ex: "Lembrete: Preencha os campos obrigatórios para gerar o relatório mensal!") (preenchido automaticamente) o usuário pode personalizar a mensagem do alerta, e o app deve exibir a mensagem personalizada nos alertas enviados.
- *alert_sound_enabled*: Boolean (true/false) (preenchido automaticamente) o usuário pode escolher habilitar ou desabilitar o som dos alertas, e o app deve respeitar essa configuração para tocar ou não um som quando exibir os alertas.
- *alert_sound_file*: String (caminho do arquivo de som) (preenchido automaticamente) o usuário pode escolher um arquivo de som personalizado para os alertas, e o app deve tocar o som escolhido quando exibir os alertas, caso o som esteja habilitado ou ele pode escolher entre os sons padrão do app.

### B. Atividades (activities)

- *id*: UUID v7 (Identificador único da atividade e pode ser ordenado cronologicamente)
- *order*: Inteiro (Ordem de exibição)
- *description*: Texto longo (Texto simples)
- *date_start*: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
- *date_end*: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
- *link_ref*: Texto (URL GitLab, etc.) (opcional) Podem ser inseridos vários links por atividade
- *status*: Enum (Em andamento, Concluído, Cancelado, Pendente) (opcional, mas o usuário pode deixar como "Pendente" e atualizar depois, por exemplo)
- *month_reference*: String (MM/YYYY)
- *attendance_type*: Enum (Presencial, Remoto, Híbrido) (sobrepõe o tipo de atendimento do perfil do usuário quando for selecionado um diferente, pois o usuário pode registrar atividades com diferentes tipos de atendimento)
- *last_updated*: Timestamp (Data e hora da última atualização da atividade) (preenchido automaticamente) apenas loga a última vez que o usuário atualizou a atividade, para fins de controle e para exibir essa informação na tela de detalhes da atividade.

Para gerar o relatório mensal, todos os campos obrigatórios para gerar o relatório precisam estar preenchidos, exceto os opcionais.

- O campo `order` é preenchido automaticamente com base na data de início da atividade, mas o usuário pode arrastar e soltar para editá-lo e reorganizar a ordem de exibição das atividades na listagem do mês.
- O campo `description` é um campo de texto com formatação simples, o usuário pode usar formatação básica como negrito, itálico e listas para organizar melhor as informações.
- O campo `date_start` é opcional, para registrar a atividade, o usuário pode deixar o campo em branco e preenchê-lo posteriormente. Obrigatório estar preenchido para gerar o relatório mensal.
- O campo `date_end` é opcional, para registrar a atividade, o usuário pode deixar o campo em branco e preenchê-lo posteriormente. Obrigatório estar preenchido para gerar o relatório mensal.
- O campo `link_ref` é opcional, serve para registrar um ou mais links de referência, o usuário pode deixar o campo em branco caso não tenha links específicos para adicionar.
- O campo `status` é opcional, mas será preenchido automaticamente com "Em andamento" quando a atividade for criada, e o usuário pode atualizá-lo para "Concluído", "Cancelado" ou "Pendente" conforme o progresso da atividade.
- O campo `month_reference` é preenchido automaticamente com base na data de início da atividade, mas o usuário pode editá-lo caso queira registrar uma atividade retroativa ou futura.
- O campo `attendance_type` é preenchido automaticamente com base no tipo de atendimento do perfil do usuário, mas pode ser sobrescrito caso a atividade tenha um tipo de atendimento diferente.

### C. Evidências (evidences)

- *id*: UUID v7 (Identificador único da evidência e pode ser ordenado cronologicamente)
- *activity_id*: Relacionamento (Identificador da atividade associada)
- *file_path*: Caminho local da imagem que foi copiada para o diretório interno do app (preenchido automaticamente) o usuário seleciona a imagem na máquina, arrasta e solta ou cola a imagem, e o app copia para o diretório interno e salva o caminho local no banco de dados.
- *caption*: Legenda da imagem
- *date_added*: Timestamp (Data e hora em que a evidência foi adicionada) (preenchido automaticamente) apenas loga a data e hora em que a evidência foi adicionada, para fins de controle e para exibir essa informação na tela de detalhes da atividade.

### D. Relatórios gerados (reports)

- *id*: UUID v7 (Identificador único do relatório e pode ser ordenado cronologicamente)
- *month_reference*: String (MM/YYYY)
- *file_path*: Caminho local do arquivo PDF gerado (preenchido automaticamente) o app deve salvar o PDF gerado em um diretório específico dentro da pasta do aplicativo, e salvar o caminho local no banco de dados para referência futura.
- *date_generated*: Timestamp (Data e hora em que o relatório foi gerado) (preenchido automaticamente) apenas loga a data e hora em que o relatório foi gerado, para fins de controle e para exibir essa informação na tela de histórico de relatórios gerados.
- *report_name*: String (Nome do arquivo PDF gerado) (preenchido automaticamente) o app deve salvar o nome do arquivo PDF gerado seguindo o padrão de nomenclatura exigido pelo MEC, e salvar essa informação no banco de dados para referência futura e para exibir na tela de histórico de relatórios gerados.
- *status*: Enum (Gerado, Falha, Excluído) (preenchido automaticamente) o app deve atualizar o status do relatório para "Gerado" quando o PDF for gerado com sucesso, ou "Falha" caso ocorra algum erro durante a geração do PDF, para fins de controle e para exibir essa informação na tela de histórico de relatórios gerados. Caso seja gerado um novo relatório para o mesmo mês, o app deve atualizar o status do relatório anterior para "Excluído" e avisar que o relatório será substituído, para manter um histórico claro dos relatórios gerados e evitar confusões com múltiplos relatórios para o mesmo mês.

### E. Atividades do Relatório (activities_report)

- *id*: UUID v7 (Identificador único da atividade do relatório e pode ser ordenado cronologicamente)
- *report_id*: Relacionamento (Identificador do relatório associado)
- *activity_id*: Relacionamento (Identificador da atividade associada) o app deve criar um registro nessa tabela para cada atividade que for incluída no relatório mensal, associando a atividade ao relatório gerado, para fins de controle e para exibir essa informação na tela de detalhes do relatório gerado.
- *date_added*: Timestamp (Data e hora em que a atividade foi associada ao relatório) (preenchido automaticamente) apenas log da data e hora em que a atividade foi associada ao relatório, para fins de controle e para exibir essa informação na tela de detalhes do relatório gerado.

---

## 4. Definição de campos obrigatórios para gerar o relatório mensal

Para gerar o relatório mensal, os seguintes campos precisam estar preenchidos:

- *Perfil do Usuário*:
  - full_name
  - role
  - seniority_level
  - contract_identifier
  - profile_type
  - correlating_activities
  - attendance_type
  - project_scope
- *Atividades*: ter pelo menos uma atividade registrada no mês selecionado com os seguintes campos preenchidos:
  - description
  - date_start
  - date_end
  - status (pode ser "Pendente" se a atividade ainda não tiver sido concluída, mas não pode estar em branco)
  - *Evidências*: não é obrigatório ter evidências para a atividade  e para gerar o relatório mensal, mas se a atividade tiver evidências, cada evidência pode ter o campo "caption" preenchido para descrever a imagem, e o campo "file_path" precisa estar preenchido para que a imagem possa ser incluida e exibida no PDF.

---

## 5. Roadmap de Desenvolvimento (Fases)

### Fase 1: Fundação

Setup do Electron + React (Vite).
Backend: Node.js (Permite integração com Electron e fácil manipulação de arquivos e banco de dados).
Integração com SQLite e criação das tabelas.
Tela inicial vazia (Empty State) com a logo do ShipIt! e um botão para "Criar Perfil" que leva à tela de Configurações Iniciais.
Implementação da tela de Configurações Iniciais (Cadastro de Perfil do Usuário).

#### Fase 1.1: Dark Mode e Light Mode

Essa implementação afeta apenas a camada de apresentação (UI) do aplicativo.

Na tela de Configuração botão para escolher entre modo escuro (Dark Mode) e claro (Light Mode), e o app deve salvar a preferência do usuário e aplicar o tema escolhido em toda a interface, garantindo uma experiência visual consistente. O usuário pode alterar essa configuração posteriormente nas configurações do perfil do usuário.

Implementação de um toggle para alternar entre modo claro e modo escuro.

### Fase 2: Fluxo de Registro

Desenvolvimento do formulário de Nova Atividade:
Seleção de período (X até Y).
Área de {Upload / Arraste de imagens (prints) / colar da área de transferência}.
Lógica para copiar imagens para o diretório interno do app.

### Fase 2.1: Tela de Listagem de Atividades

Exibição das atividades registradas no mês selecionado.
Opção para editar ou excluir atividades.
Reorganização por arrastar e soltar para editar a ordem de exibição.

### Fase 2.2: Tela de Detalhes da Atividade
Exibição detalhada da atividade, incluindo descrição, período, status, links de referência e evidências (prints) com suas legendas.
Opção para editar os detalhes da atividade e adicionar/editar legendas das evidências.

### Fase 2.3: Validação de Campos Obrigatórios

Implementação de validação para garantir que os campos obrigatórios estejam preenchidos antes de permitir a geração do PDF.
Exibição de mensagens de erro ou alertas para atividades que não atendem aos requisitos.

### Fase 2.3.1: System Tray icon

Implementação do ícone do ShipIt! no System Tray para fácil acesso.
Ao clicar no ícone, a janela para registrar uma nova atividade ou continuar editando atividades existentes que não foi fechada deve ser exibida.

### Fase 2.4: Sistema de Rascunho e Salvamento Automático

Implementação de salvamento automático para evitar perda de dados em caso de fechamento inesperado.
Permitir que o usuário salve rascunhos de atividades incompletas e retome-las posteriormente.

### Fase 2.5: Dashboard de Resumo Mensal

Desenvolvimento do dashboard que será a tela inicial.
Exibe campo na parte superior para escolha do mês de referência número do mês e do ano para carregamento dos dados, ao iniciar trazendo o último mês e ano selecionado ou o mês e ano atual. botão para gerar o PDF do mês selecionado.
Exibe um resumo visual do mês, como número total de atividades, número de atividades concluídas, número de atividades em andamento, número de atividades canceladas, etc.
Exibir o gráfico de Gantt de atividades do mês, na coluna da esquerda nome das atividades como 'Atividade <número>', em cima os dias do mês.
Exibir a listagem de atividades do mês selecionado, com as seguintes informações: Atividade <número>, Descrição resumida (primeira linha da descrição) opção ver mais para expandir, Período (Data de início e Data de término), Status, Tipo de atendimento, Referência (página onde estão as evidências da atividade listadas no formato "Páginas x, y e z"), e um ícone de alerta para atividades que não têm os campos obrigatórios preenchidos para gerar o relatório mensal.

Poder trocar o mês de referência para visualizar os dados de meses anteriores e gerar o relatório mensal correspondente.
Trocando o mês de referência, a listagem de atividades, o dashboard de resumo mensal e a opção de gerar PDF devem ser atualizados para refletir os dados do mês selecionado.

### Fase 3: O Motor de PDF

Pergunta para confirmar se o Mês está correto antes de gerar o PDF, para evitar erros de geração com o mês errado.
o PDF deve exibir um print por página, se tiver legenda insere abaixo da imagem, e as páginas onde as evidências estão inseridas devem ser listadas na coluna Referência da tabela no formato (Páginas x, y e z).
Desenvolvimento do template HTML/CSS idêntico ao PDF do MEC.
Implementação do serviço de geração via Puppeteer.
Sistema de Preview: Visualizar o PDF antes de salvar.

### Fase 4: Polimento e Distribuição

Validação: Garantir que o PDF não ultrapasse as margens ou quebre tabelas de forma incorreta.
Configuração do electron-builder para gerar:
.exe (Windows 10/11)
.dmg (macOS)
.AppImage (Linux)

## 5. Regras de Negócio Importantes

- *Modelo PDF*: O PDF gerado deve seguir estritamente a risca o modelo oficial do MEC, não pode haver variações no layout, formatação ou estrutura do conteúdo, para garantir que o relatório seja aceito sem problemas. 
- *Integridade do Print*: Se o usuário deletar o print da área de trabalho, o app não deve perder a imagem (por isso o app deve criar uma cópia interna) e guardar por 3 meses na lixeira.
- *Alertas*: o app deve exibir os alertas seguindo a programação da tabela de `alerts` para o usuário fazer os lançamentos e gerar o relatório.
- *Fechamento do Mês*: O usuário deve preencher os campos obrigatórios para gerar o relatório mensal, e o app deve impedir a geração do PDF se houver atividades com campos obrigatórios faltando.
- *O botão "Gerar PDF"*: aciona a validação das informações preenchidas nas atividades, e só gera o PDF se todas as atividades do mês tiverem os campos obrigatórios preenchidos (Data de início, Data de término, Descrição, Status).
- *Evidências*: O app deve permitir anexar múltiplos prints por atividade, o PDF deve exibir um print por página, e cada print deve ter uma legenda (campo "caption") para descrever a evidência, as páginas onde as evidências estão inseridas devem ser listadas na coluna Referência da tabela `Encarte A: Detalhamento das atividades executadas e entregas efetuadas`.
- *Persistência*: O app deve salvar rascunhos automaticamente para evitar perda de dados em caso de fechamento inesperado, reabre quando o app é reiniciado.
- *Nome do PDF*: Nome final para o arquivo PDF: `RELATÓRIO DE SERVIÇO - <CARGO DO USUÁRIO>_<NOME_COMPLETO_DO_USUÁRIO>_<NOME_DO_MÊS>.pdf` seguindo o padrão de nomenclatura exigido pelo MEC, onde:
  - <CARGO DO USUÁRIO>: Tudo em maiúsculo, sem acentos, e sem caracteres especiais, para evitar problemas de formatação no nome do arquivo PDF final.
  - <NOME_COMPLETO_DO_USUÁRIO>: O nome completo do usuário, conforme preenchido no campo "full_name" do perfil do usuário, Tudo em maiúsculo, sem acentos, e sem caracteres especiais, substituir os espaços por underline (_) para evitar problemas de formatação no nome do arquivo PDF final.
  - <NOME_DO_MÊS>: O nome do mês referente ao relatório, em português, tudo em maiúsculo, sem acentos, e sem caracteres especiais, para evitar problemas de formatação no nome do arquivo PDF final. Exemplo: JANEIRO, FEVEREIRO, MARÇO, ABRIL, MAIO, JUNHO, JULHO, AGOSTO, SETEMBRO, OUTUBRO, NOVEMBRO, DEZEMBRO.

## 6. Informações Necessárias

Para refinar este plano, preciso de algumas definições suas:

*Categorias de Atividade*: Além de "Engenharia de Software", existem categorias fixas que quero que apareçam no campo de seleção ('ADMINISTRADOR DE DADOS', 'ANALISTA DE DADOS E BUSINESS INTELLIGENCE', 'ANALISTA DE QUALIDADE E TESTES DE SOFTWARE', 'ANALISTA DE REQUISITOS', 'ARQUITETO DE DADOS', 'ARQUITETO DE SOFTWARE', 'ARQUITETO DE SOFTWARE DEVOPS', 'ENGENHEIRO DE AUTOMAÇÃO', 'CIENTISTA DE DADOS', 'ENGENHEIRO DE SOFTWARE', 'ENGENHEIRO DE DADOS') ou o usuário pode escrever livremente.
*Limite de Prints*: Não deve haver um limite.

## 7. Guia de Cores e Aplicação Visual e Sons

Para manter a consistência visual do ShipIt! em todas as plataformas, aqui está o guia de cores extraído da logo e as recomendações de aplicação na interface:

### Logo do ShipIt!:

Os logos e as imagens do app devem ficar em uma pasta `assets/images` dentro do repositório, para centralizar os arquivos de imagem e facilitar o acesso para a interface do aplicativo. Abaixo estão as imagens da logo do ShipIt! em diferentes variações de cor, todas em formato SVG com fundo transparente para garantir a melhor qualidade visual em diferentes contextos de uso na interface.

| Imagem | Descrição |
|-------|-----------|
| images\icon-foguete-logo-branco.svg | Ícone do foguete do ShipIt! em branco fundo transparente |
| images\icon-foguete-logo-colorido.svg | Ícone do foguete do ShipIt! colorido fundo transparente |
| images\icon-foguete-logo-pb.svg | Ícone do foguete do ShipIt! em preto e branco fundo transparente |
| images\icon-foguete-logo-preto.svg | Ícone do foguete do ShipIt! em preto fundo transparente |
| images\icon-foguete-logo-tons-cinza.svg | Ícone do foguete do ShipIt! em tons de cinza fundo transparente |
| images\logo-composto-colorido.svg | Logo principal composto do ShipIt! colorido em SVG fundo transparente |

### Ícones do App:

Na pasta `images/icons` tem o ícone para usar no app com vários tamanhos diferentes. Analise e renomeie como for preiso.

### System Tray Icon:

Os ícones do System Tray estão na pasta `images/tray` dentro do repositório.
ícones específicos para o System Tray e facilitar o acesso para a configuração do ícone do aplicativo. 
Abaixo estão as imagens dos ícones do System Tray em diferentes variações de cor, todas em formato SVG com fundo transparente para garantir a melhor qualidade visual no System Tray em diferentes sistemas operacionais.

| Imagem | Descrição |
|-------|-----------|
| images\tray\tray-icon-foguete-dark-mode-default-2.svg | Ícone do foguete do ShipIt! em modo escuro padrão 2 |
| images\tray\tray-icon-foguete-dark-mode-red-2.svg | Ícone do foguete do ShipIt! em modo escuro vermelho 2 |
| images\tray\tray-icon-foguete-dark-mode-yellow-2.svg | Ícone do foguete do ShipIt! em modo escuro amarelo 2 |
| images\tray\tray-icon-foguete-dark-mode-green-2.svg | Ícone do foguete do ShipIt! em modo escuro verde 2 |

As variações de cor para alertas no System Tray (vermelho para alerta está atrasado, amarelo para atenção faltam 5 dias para o fim do mês, verde para sucesso tudo tranquilo nada atrasado) permitem que o usuário identifique rapidamente o status das atividades e os alertas relacionados ao preenchimento do relatório mensal, mesmo sem abrir a interface do aplicativo.

### Sons de Alerta:
Os arquivos de som para os alertas estão na pasta `assets/sounds` dentro do repositório, para centralizar os arquivos de som e facilitar o acesso para a configuração dos alertas sonoros do aplicativo. Abaixo estão os arquivos de som para os alertas em diferentes variações, todos em formato MP3 para garantir compatibilidade com a maioria dos sistemas operacionais.

| Arquivo de Som | Descrição |
|----------------|-----------|
| sfx\alert-sound-01.mp3 | Alerta padrão 1 |
| sfx\alert-sound-02.mp3 | Alerta padrão 2 |
| sfx\alert-sound-03.mp3 | Alerta padrão 3 |
| sfx\alert-sound-04.mp3 | Alerta padrão 4 |
| sfx\alert-sound-05.mp3 | Alerta padrão 5 |
| sfx\alert-sound-06.mp3 | Alerta padrão 6 |
| sfx\alert-sound-07.mp3 | Alerta padrão 7 |
| sfx\alert-sound-08.mp3 | Alerta padrão 8 |
| sfx\alert-sound-09.mp3 | Alerta padrão 9 |
| sfx\alert-sound-10.mp3 | Alerta padrão 10 |
| sfx\alert-sound-11.mp3 | Alerta padrão 11 |
| sfx\alert-sound-12.mp3 | Alerta padrão 12 |
| sfx\alert-sound-13.mp3 | Alerta padrão 13 |
| sfx\alert-sound-14.mp3 | Alerta padrão 14 |

🎨 Paleta de Cores (Brand Colors)

### Cores para Modo Claro

| Elemento         | Hexadecimal | Cor Visual       | Recomendação de Uso                                                            |
| ---------------- | ----------- | ---------------- | ------------------------------------------------------------------------------ |
| Azul Principal   | #1A427F   | Azul Navy        | Cabeçalhos, botões principais (CTA), barras de navegação e texto "Ship".       |
| Laranja Destaque | #F27A21   | Laranja Vibrante | Botão "ShipIt!" (Gerar PDF), ícone de alerta, detalhes de hover e texto "It!". |
| Azul Light       | #E8F0F9   | Azul Gelo        | Fundo de campos de texto ou hover em listas de atividades.                     |
| Neutro Dark      | #333333   | Grafite          | Textos longos de descrições e logs de atividades.                              |
| Neutro Light     | #F8F9FA   | Cinza Off-white  | Cor de fundo geral da aplicação (evita cansaço visual).                        |
| Verde Esmeralda   | #168829   | Verde Sucesso    | Indicadores de atividades concluídas ou status de sucesso.                     |
| Amarelo Alerta   | #FFCC00   | Amarelo Alerta  | Indicadores de atividades com status de alerta ou atenção.                     |
| Vermelho Alerta   | #a11e10   | Vermelho Alerta  | Indicadores de atividades canceladas ou status de erro.                        |
| Cinza Claro      | #E5E7EB   | Cinza Padrão     | Borders, separadores e backgrounds secundários.                                |
| Cinza Médio      | #9CA3AF   | Cinza Médio      | Placeholders, textos desabilitados e ícones inativos.                          |
| Branco           | #FFFFFF   | Branco Puro      | Fundos de cards, modais e elementos principais em modo claro.                  |
| Preto            | #000000   | Preto Puro       | Textos críticos e elementos de alto contraste.                                 |



### Cores para Modo Escuro (Dark Mode)

| Elemento         | Hexadecimal | Cor Visual       | Recomendação de Uso                                                            |
| ---------------- | ----------- | ---------------- | ------------------------------------------------------------------------------ |
| Azul Principal   | #5B8FD4   | Azul Claro       | Cabeçalhos, botões principais (CTA), barras de navegação e texto "Ship".       |
| Laranja Destaque | #F27A21   | Laranja Vibrante | Botão "ShipIt!" (Gerar PDF), ícone de alerta, detalhes de hover e texto "It!". |
| Azul Light       | #2C3E50   | Azul Escuro      | Fundo de campos de texto ou hover em listas de atividades.                     |
| Neutro Dark      | #E0E0E0   | Cinza Claro      | Textos longos de descrições e logs de atividades.                              |
| Neutro Light     | #1E1E1E   | Cinza Escuro     | Cor de fundo geral da aplicação (evita cansaço visual).                        |
| Verde Esmeralda   | #4CAF50   | Verde Claro      | Indicadores de atividades concluídas ou status de sucesso.                     |
| Amarelo Alerta   | #FFD54F   | Amarelo Claro    | Indicadores de atividades com status de alerta ou atenção.                     |
| Vermelho Alerta   | #EF5350   | Vermelho Claro   | Indicadores de atividades canceladas ou status de erro.                        |
| Cinza Claro      | #424242   | Cinza Médio      | Borders, separadores e backgrounds secundários.                                |
| Cinza Médio      | #757575   | Cinza Médio      | Placeholders, textos desabilitados e ícones inativos.                          |
| Branco           | #121212   | Preto Puro       | Fundos de cards, modais e elementos principais em modo escuro.                 |
| Preto            | #FFFFFF   | Branco Puro      | Textos críticos e elementos de alto contraste.                                 |


🛠️ Recomendações de Uso na Interface (UI)

Interface em português do Brasil.

1. Botões e Ações
   Ação Primária (Novo Registro): Use o Azul Principal com texto branco.
   Ação de Sucesso (Gerar PDF): Use o Laranja Destaque. Como é a ação final do mês, o laranja serve como um "farol" visual.
   Ações Secundárias (Editar/Configurações): Use contornos (outline) em Azul Principal.
2. Tipografia (Hierarquia)
   Títulos: Inter Bold ou Montserrat em Azul Principal.
   Corpo de Texto: Inter Regular em Neutro Dark.
   Status de Atividade: Use o Laranja para "Em Aberto" e um Verde Esmeralda (opcional para sucesso) para "Concluído".
3. Estados de Input
   Foco (Focus): Ao clicar em um campo de texto, use uma borda de 2px em Laranja Destaque para indicar que o usuário está "no comando".
   Empty State: Quando não houver atividades no mês, use uma ilustração do foguete da logo em tons de cinza claro.


## Sobre o a Organização do Código e Padrões de Desenvolvimento

- **Estrutura de Pastas**: Organizar o código em pastas claras como `components`, `services`, `utils`, `assets`, etc., para facilitar a navegação e manutenção.
- **Padrões de Código**: Adotar um padrão de código consistente, como o uso de ESLint e Prettier para garantir a qualidade e legibilidade do código.
- **Versionamento**: Utilizar Git para controle de versão, com commits claros e descritivos, e branches para desenvolvimento de novas funcionalidades ou correção de bugs.
- **Documentação**: Manter uma documentação clara e atualizada do código, incluindo comentários explicativos e um README detalhado para facilitar a compreensão e colaboração futura, Changelog, roadmap.
- **Documentação do projeto**: Colocar os arquivos explicativos e de planejamento do projeto em uma pasta `docs` dentro do repositório, para centralizar as informações e facilitar o acesso para todos os colaboradores.
- **Raiz do projeto**: A pasta raiz do projeto não deve conter arquivos de documentação e scripts desnecessários. Manter a raiz limpa e organizada, com apenas os arquivos necessários.



