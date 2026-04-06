# 🚀 Plano de Desenvolvimento: ShipIt!

## 1. Visão Geral

O ShipIt! é uma aplicação desktop multiplataforma (Windows, macOS e Linux) projetada para automatizar a criação do "Relatório Mensal de Atividades Desenvolvidas" seguindo o padrão institucional do MEC (Ministério da Educação). O foco é facilitar a vida dos profissionais  desenvolvedores, arquitetos, levantadores de requisitos e testadores, permitindo registros diários com evidências (prints e links) que se consolidarão em um PDF formatado ao final do mês. 

Fácil de acessar ficando no system tray, o ShipIt! é a solução ideal para quem busca praticidade e eficiência na documentação de suas atividades desenvolvidas para o relatório mensal. 

Bastará clicar no ícone no System Tray e se abrirá a janela para continuar ou registrar uma nova atividade e evidência, (inserindo o link) ou (colando, selecionando na máquina, arrastando e soltando o print), escrever o texto e deixar o resto com o ShipIt!, sempre salva automaticamente impedindo perdas de dados.

## 2. Stack Tecnológica

| Componente | Tecnologia | Justificativa |
|----------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Framework Desktop | Electron | Multiplataforma nativo e fácil acesso ao sistema de arquivos. |
| Interface (UI) | React + Tailwind CSS | Rapidez no desenvolvimento e estilização precisa ("Pixel Perfect"). |
| Banco de Dados | SQLite (via TypeORM) | Local, rápido e não exige servidor externo. |
| Geração de PDF | Puppeteer | Renderiza o PDF a partir de HTML com fidelidade absoluta ao layout original. |
| Armazenamento | File System Local | Os prints serão salvos por padrão em uma pasta com o nome do aplicativo no diretório de documentos do usuário ou home, perguntar na instalação onde o usuário deseja salvar os prints, e o usuário pode alterar a pasta de destino posteriormente nas configurações do aplicativo. |

## 3. Arquitetura de Dados (Schema)

O banco de dados local será estruturado em três eixos:

### A. Perfil do Usuário (user_profile)

- *full_name*: Texto (Ex: `Maria Silva de Souza e Silva`) Precisa ser o nome completo para preencher o campo "Nome Completo" do relatório.
- *role*: Texto (Ex: `Engenheiro de Software`) o usuário fica livre para escolher o que colocar aqui.
- *seniority_level*: Enum (Aprendiz, Júnior, Pleno, Sênior, Especialista, Líder, Master)
- *contract_identifier*: Texto - Identificador do Contrato (Ex: `Contrato n° 06/2022 – Digisystem Serviços Especializados Ltda`)
- *profile_type*: Texto (Ex: `DEV-9`)
- *correlating_activities*: Texto Longo (Ex: `Desenvolve ... artificial.`) é um texto explicativo para correlacionar as atividades do mês com o perfil do usuário, será copiado do arquivo modelo que o profissional receber.
- *attendance_type*: Enum (Presencial, Remoto, Híbrido)
- *squad_project_application*: Texto (Ex: `Squad 2 / Projeto SIMEC; Squad SESU / Projeto PNAES`) Pode ter mais do que um valor, separados por vírgula, pois o usuário pode atuar em mais de uma squad/projeto/aplicação. Adicionar exemplo de preenchimento (`<Squad/Projeto/Aplicação>: <nomear a Squad, o projeto e a aplicação. Exemplo: Squad SESU / Projeto PNAES>`)

### B. Atividades (activities)

- *id*: UUID
- *order*: Inteiro (Ordem de exibição)
- *description*: Texto longo (Texto simples)
- *date_start*: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
- *date_end*: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
- *link_ref*: Texto (URL GitLab, etc.) (opcional) Podem ser inseridos vários links por atividade
- *status*: Enum (Em andamento, Concluído, Cancelado, Pendente) (opcional, mas o usuário pode deixar como "Pendente" e atualizar depois, por exemplo)
- *month_reference*: String (MM/YYYY)
- *attendance_type*: Enum (Presencial, Remoto, Híbrido) (sobrepõe o tipo de atendimento do perfil do usuário quando for selecionado um diferente, pois o usuário pode registrar atividades com diferentes tipos de atendimento)

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

- *id*: UUID
- *activity_id*: Relacionamento
- *file_path*: Caminho local da imagem
- *caption*: Legenda da imagem

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
  - squad_project_application
- *Atividades*: ter pelo menos uma atividade registrada no mês selecionado com os seguintes campos preenchidos:
  - description
  - date_start
  - date_end
  - status (pode ser "Pendente" se a atividade ainda não tiver sido concluída, mas não pode estar em branco)
  

---

## 4. Roadmap de Desenvolvimento (Fases)

### Fase 1: Fundação

Setup do Electron + React (Vite).
Integração com SQLite e criação das tabelas.
Implementação da tela de Configurações Iniciais (Cadastro de Nome/Cargo).

### Fase 2: Fluxo de Registro

Criação do Dashboard Mensal (Timeline).
Desenvolvimento do formulário de Nova Atividade:
Seleção de período (X até Y).
Upload/Arraste de imagens (prints).
Lógica para copiar imagens para o diretório interno do app.

### Fase 3: O Motor de PDF

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

Integridade do Print: Se o usuário deletar o print da área de trabalho, o app não deve perder a imagem (por isso o app deve criar uma cópia interna).
Fechamento do Mês: O botão "Gerar PDF", aciona a validação das informações preenchidas nas atividades, e só gera o PDF se todas as atividades do mês tiverem os campos obrigatórios preenchidos (Data de início, Data de término, Descrição, Status).
Evidências: O app deve permitir anexar múltiplos prints por atividade, o PDF deve exibir um print por página, e cada print deve ter uma legenda (campo "caption") para descrever a evidência, as páginas onde as evidências estão inseridas devem ser listadas na coluna Referência da tabela `Encarte A: Detalhamento das atividades executadas e entregas efetuadas`.
Persistência: O app deve salvar rascunhos automaticamente para evitar perda de dados em caso de fechamento inesperado.

## 6. Pontos Pendentes (Informações Necessárias)

Para refinar este plano, preciso de algumas definições suas:

Categorias de Atividade: Além de "Engenharia de Software", existem categorias fixas que você deseja que apareçam num campo de seleção (Ex: Reunião, Coding, Documentação)?

Limite de Prints: Deve haver um limite de quantos prints podem ser anexados por atividade para não "explodir" o tamanho do PDF?
Carga Horária: O relatório exige o preenchimento de horas exatas por tarefa ou apenas o período (Data X a Data Y)?
Local de Armazenamento: Você prefere que o banco de dados seja um arquivo único que você possa levar num pendrive ou pode ficar fixo na instalação do app?

1. As Categorias de Atividade: poderão ser incluídas depois, então o app precisa poder ser atualizado. minha ideia seria puxar do github
2. Limite de Prints: não pode ter limite de prints, e o usuário deverá escolher onde salvar as imagens quando estiver instalando, também poderá trocar a ordem arrastando e soltando, O app deve permitir anexar múltiplos prints por atividade, o PDF deve exibir um print por página, e cada print deve ter uma legenda (campo "caption") para descrever a evidência, as páginas onde as evidências estão inseridas devem ser listadas na coluna Referência da tabela `Encarte A: Detalhamento das atividades executadas e entregas efetuadas`. todas as páginas de evidências da atividade ficam listadas no formato (Páginas x, y e z)
3. Carga Horária: obrigatório somente a (Data DD/MM/YYYY a Data DD/MM/YYYY)
4. Local de Armazenamento: banco de dados seja um arquivo único SQLite

## 7. Guia de Cores e Aplicação Visual

Para manter a consistência visual do ShipIt! em todas as plataformas, aqui está o guia de cores extraído da logo e as recomendações de aplicação na interface:

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
| Vermelho Alerta   | #a11e10   | Vermelho Alerta  | Indicadores de atividades canceladas ou status de erro.                     |

### Cores para Modo Escuro (Dark Mode)

| Elemento         | Hexadecimal | Cor Visual       | Recomendação de Uso                                                            |
| ---------------- | ----------- | ---------------- | ------------------------------------------------------------------------------ |
| Azul para Dark Mode     | #1A427F   | Azul Navy        | O Azul deve permanecer o mesmo para manter a identidade visual e contraste em fundos escuros. |
| Laranja para Dark Mode   | #F27A21   | Laranja Vibrante | O Laranja deve permanecer o mesmo para manter o contraste em fundos escuros. |
| Fundo Escuro      | #121212   | Preto Profundo   | Fundo para modo escuro (dark mode). O Laranja deve permanecer o mesmo para manter o contraste. |
| Cards Escuros      | #1E1E1E   | Cinza Escuro     | Fundo de cards e modais no modo escuro. O Laranja deve permanecer o mesmo para manter o contraste. |
| Textos Escuros      | #E0E0E0   | Cinza Claro      | Textos no modo escuro para garantir legibilidade. O Laranja deve permanecer o mesmo para manter o contraste. |
| Foguete Cinza Claro | #CCCCCC   | Cinza Claro      | Ilustração do foguete para o estado vazio (empty state) quando não houver atividades registradas. |
| Vermelho Pendente   | #ff3300   | Laranja Pendente  | Indicadores de atividades pendentes ou em andamento. |
| Amarelo Alerta   | #FFD700   | Amarelo Alerta  | Indicadores de atividades com status de alerta ou atenção. |
| Roxo Destaque   | #800080   | Roxo Vibrante    | Detalhes de destaque em gráficos ou indicadores de progresso. |


🛠️ Recomendações de Uso na Interface (UI)

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
4. Dark Mode (Opcional)
   Fundo: #121212
   Cards: #1E1E1E
   Textos: #E0E0E0
   O Laranja deve permanecer o mesmo, pois tem excelente contraste em fundos escuros.
