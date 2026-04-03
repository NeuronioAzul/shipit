# 🚀 Plano de Desenvolvimento: ShipIt!

## 1. Visão Geral

O ShipIt! é uma aplicação desktop multiplataforma (Windows, macOS e Linux) projetada para automatizar a criação do "Relatório Mensal de Atividades Desenvolvidas" seguindo o padrão institucional do MEC. O foco é facilitar a vida de desenvolvedores e arquitetos, permitindo registros diários com evidências que se consolidam em um PDF formatado ao final do mês. Tendo acesso fácil ficando no system tray, o ShipIt! é a solução ideal para quem busca praticidade e eficiência na documentação de suas atividades. Bastará clicar, registrar o print, colando, selecionando na máquina ou arrastando e soltando, escrever o texto e deixar o resto com o ShipIt!, sempre salva automaticamente impedindo perdas de dados.

## 2. Stack Tecnológica

Componente | Tecnologia | Justificativa
Framework Desktop | Electron | Multiplataforma nativo e fácil acesso ao sistema de arquivos.
Interface (UI) | React + Tailwind CSS | Rapidez no desenvolvimento e estilização precisa ("Pixel Perfect").
Banco de Dados | SQLite (via TypeORM ou Knex) | Local, rápido e não exige servidor externo.
Geração de PDF | Puppeteer | Renderiza o PDF a partir de HTML com fidelidade absoluta ao layout original.
Armazenamento | File System Local | Os prints serão salvos por padrão em uma pasta com o nome do aplicativo no diretório de documentos do usuário ou home, perguntar na instalação onde o cliente deseja salvar os prints, e o cliente pode alterar a pasta de destino posteriormente nas configurações do aplicativo.

## 3. Arquitetura de Dados (Schema)

O banco de dados local será estruturado em três eixos:

### A. Perfil do Usuário (user_profile)

full_name: Texto
role: Texto (Ex: `Engenheiro de Software`) o cliente fica livre para escolher o que colocar aqui.
seniority_level: Enum (Aprendiz, Júnior, Pleno, Sênior, Especialista, Líder, Master)
contract_number: Texto (Ex: `Contrato n° 06/2022 – Digisystem Serviços Especializados Ltda`)
profile_type: Texto (Ex: `DEV-9`)
correlating_activities: Texto (Ex: `Desenvolve recursos e capacidades para usuários finais através de plataformas e ferramentas de desenvolvimento ou aprendizado de máquina, escrevendo código de qualidade com clareza e testabilidade - de acordo com padrões e práticas de arquitetura, design implementação e segurança. Configura e personaliza software. Investiga e propõe soluções para problemas de desenvolvimento e design. Conduz análises para determinar necessidades de integração, projeta e planeja integrações.  Desenvolve blocos de construção de software reutilizáveis ​​para permitir uma entrega mais rápida. Participa do trabalho de estimativa e previsão de trabalho.  Melhora o desempenho do software existente, diagnosticando e resolvendo problemas críticos. Prepara documentação técnica. Nos projetos de machine learning desenvolve, implementa e aplica técnicas de aprendizado de máquina; além de experimentos e testes de aprendizado de máquina, colaborando no desenvolvimento de modelos de aprendizado de máquina e pipelines de dados. Nos projetos de inteligência artificial cria sistemas automatizados e estruturas de modelos de dados que permitem sua extração e processamento eficiente: desenvolve e mantém pipeline de dados. Domina plataformas, ferramentas e linguagens de programação, engenharia de software, big data, cloud computing, interface e configuração de dados, machine learning e inteligência artificial.`)
attendance_type: Enum (Presencial, Remoto, Híbrido)
squad_project_application: Texto (Ex: `Squad 2 / Projeto SIMEC; Squad SESU / Projeto PNAES`) Pode ter mais do que um valor, separados por vírgula, pois o cliente pode atuar em mais de uma squad/projeto/aplicação. Adicionar exemplo de preenchimento (`<Squad/Projeto/Aplicação>: <nomear a Squad, o projeto e a aplicação. Exemplo: Squad SESU / Projeto PNAES>`)

### B. Atividades (activities)

id: UUID
order: Inteiro (Ordem de exibição)
description: Texto longo (Texto simples)
date_start: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
date_end: Data (opcional quando em andamento, obrigatório quando concluído para gerar o relatório mensal)
link_ref: Texto (URL GitLab, etc.) (opcional)
status: Enum (Em andamento, Concluído, Cancelado, Pendente) (opcional, mas o cliente pode deixar como "Pendente" e atualizar depois, por exemplo)
month_reference: String (MM/YYYY)
attendance_type: Enum (Presencial, Remoto, Híbrido) (sobrepõe o tipo de atendimento do perfil do usuário quando diferente, pois o cliente pode registrar atividades com diferentes tipos de atendimento)

Para gerar o relatório mensal, todos os campos precisam estar preenchidos, exceto os opcionais.

- O campo `order` é preenchido automaticamente com base na data de início da atividade, mas o cliente pode arrastar e soltar para editá-lo e reorganizar a ordem de exibição das atividades.
- O campo `description` é um campo de texto simples, mas o cliente pode usar formatação básica como negrito, itálico e listas para organizar melhor as informações.
- O campo `date_start` é opcional, para registrar o início da atividade, mas o cliente pode deixar o campo em branco e preenchê-lo posteriormente.
- O campo `date_end` é opcional, para registrar a conclusão da atividade, mas o cliente pode deixar o campo em branco e preenchê-lo posteriormente.
- O campo `link_ref` é opcional, para registrar um link de referência relacionado à atividade, mas o cliente pode deixar o campo em branco se não tiver um link específico para adicionar.
- O campo `status` é opcional, mas será preenchido automaticamente com "Em andamento" quando a atividade for criada, e o cliente pode atualizá-lo para "Concluído", "Cancelado" ou "Pendente" conforme o progresso da atividade.
- O campo `month_reference` é preenchido automaticamente com base na data de início da atividade, mas o cliente pode editá-lo caso queira registrar uma atividade retroativa ou futura.
- O campo `attendance_type` é preenchido automaticamente com base no tipo de atendimento do perfil do usuário, mas pode ser sobrescrito caso a atividade tenha um tipo de atendimento diferente.

### C. Evidências (evidences)

id: UUID
activity_id: Relacionamento
file_path: Caminho local da imagem
caption: Legenda da imagem

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

| Elemento         | Hexadecimal | Cor Visual       | Recomendação de Uso                                                            |
| ---------------- | ----------- | ---------------- | ------------------------------------------------------------------------------ |
| Azul Principal   | #1A427F   | Azul Navy        | Cabeçalhos, botões principais (CTA), barras de navegação e texto "Ship".       |
| Laranja Destaque | #F27A21   | Laranja Vibrante | Botão "ShipIt!" (Gerar PDF), ícone de alerta, detalhes de hover e texto "It!". |
| Azul Light       | #E8F0F9   | Azul Gelo        | Fundo de campos de texto ou hover em listas de atividades.                     |
| Neutro Dark      | #333333   | Grafite          | Textos longos de descrições e logs de atividades.                              |
| Neutro Light     | #F8F9FA   | Cinza Off-white  | Cor de fundo geral da aplicação (evita cansaço visual).                        |

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
