# Planejamento de Implementacao da Funcionalidade de Geracao DOCX

## 1. Objetivo

Planejar a implementacao da exportacao de relatorios em formato DOCX no ShipIt, usando como base o modelo institucional ja adaptado para template. Essa funcionalidade sera tratada como uma fase posterior do projeto, entrando somente depois que o fluxo principal de cadastro, persistencia e geracao de PDF estiver estavel.

## 2. Contexto Atual

- Ja existe um modelo base real em Word preservando o layout institucional.
- Ja existe um template pronto para automacao: RELATORIO DE SERVICO - TEMPLATE.docx.
- O mapa de placeholders e blocos repetiveis foi documentado em docs/docx-template-map.md.
- O template ja foi preparado para atualizar campos do Word ao abrir o arquivo.
- A aplicacao ainda nao possui o motor de geracao DOCX nem a camada de montagem de dados para exportacao.

## 3. Objetivo da Primeira Entrega DOCX

Entregar uma primeira versao de exportacao DOCX que seja valida, editavel no Word e consistente com o relatorio institucional, com os seguintes comportamentos:

- Gerar um arquivo DOCX a partir dos dados salvos no SQLite.
- Preencher automaticamente capa, informacoes basicas e dados do profissional.
- Gerar o Encarte A agrupando atividades por projeto, squad ou aplicacao.
- Gerar o Encarte B com uma evidencia por pagina, incluindo imagem e legenda.
- Preencher a coluna Referencia com links e ou paginas das evidencias.
- Salvar o arquivo em local escolhido pelo usuario.
- Abrir o arquivo final no aplicativo padrao do sistema, sem exigir preview interno na primeira entrega.

## 4. Fora do Escopo da Primeira Entrega

- Edicao bidirecional do DOCX com retorno automatico para o banco de dados.
- Preview nativo de DOCX dentro do app.
- Conversao automatica de DOCX para PDF.
- Compatibilidade visual identica em todos os visualizadores de escritorio.
- Suporte completo a texto rico complexo dentro da descricao da atividade.

## 5. Dependencias e Pre-Requisitos

Antes de iniciar a implementacao do exportador DOCX, o projeto precisa ter estes pontos estaveis:

- Cadastro e edicao do perfil do usuario funcionando.
- Cadastro de atividades com ordenacao persistida.
- Cadastro de evidencias com ordem manual persistida.
- Caminho de armazenamento de arquivos definido nas configuracoes do app.
- Estrategia final de geracao de PDF ja validada, para evitar retrabalho no compartilhamento de regras de negocio.

## 6. Ajustes Recomendados no Modelo de Dados

O schema descrito hoje cobre boa parte da necessidade, mas ainda ha lacunas para uma geracao DOCX robusta.

### 6.1 Campo de agrupamento por projeto

Hoje o documento precisa gerar uma tabela por projeto, squad ou aplicacao, mas a modelagem atual nao associa explicitamente cada atividade a um agrupador proprio. Para suportar isso sem ambiguidade, a recomendacao e adicionar um destes caminhos:

- Opcao simples: adicionar `project_scope` em `activities`.
- Opcao escalavel: criar uma entidade `project_scopes` e relacionar `activities.project_scope_id`.

Recomendacao pragmatica para o MVP expandido: usar `project_scope` como texto em `activities`.

### 6.2 Ordenacao de evidencias

Como o usuario podera reorganizar prints arrastando e soltando, a tabela `evidences` precisa de um campo de ordenacao explicito.

- Adicionar `sort_index` em `evidences`.

### 6.3 Regras de referencia

E necessario definir com clareza a regra final de exibicao da coluna Referencia no Encarte A:

- Quando houver apenas `link_ref`, usar o link.
- Quando houver apenas evidencias, usar a lista de paginas.
- Quando houver os dois, recomendacao: renderizar o link na primeira linha e as paginas na linha seguinte.

## 7. Estrategia Tecnica Recomendada

### 7.1 Decisao principal

Nao e recomendado gerar esse DOCX do zero com bibliotecas de composicao alto nivel, porque isso aumentaria muito o custo para reproduzir o layout institucional existente. A melhor estrategia e partir do template DOCX ja preparado e manipular sua estrutura OpenXML de forma controlada.

### 7.2 Abordagem sugerida

Implementar o gerador no processo principal do Electron, em Node.js, com uma camada propria de renderizacao baseada em OpenXML.

Stack recomendada:

- `jszip` para abrir e reempacotar o arquivo `.docx`.
- `@xmldom/xmldom` para parse e manipulacao XML.
- `xpath` para localizar tabelas, linhas e paragrafos do template.
- Biblioteca de imagens apenas para leitura de dimensoes e ajuste proporcional, se necessario.

### 7.3 Por que essa abordagem e a mais segura

- Preserva o layout, estilos, cabecalhos, rodapes e indice do template original.
- Evita dependencia de Microsoft Word instalado na maquina do usuario.
- Permite clonar tabelas e linhas com controle fino.
- Permite inserir bookmarks e campos `PAGEREF` para referencias de pagina.
- Evita dependencia de modulos pagos de templating DOCX.

## 8. Arquitetura Proposta

### 8.1 Modulos principais

Sugestao de organizacao futura no codigo:

```text
src/main/modules/report-export/
  application/
    generate-docx-report.ts
    build-report-export-payload.ts
    validate-report-export.ts
  domain/
    report-export.types.ts
    report-export.rules.ts
  infrastructure/docx/
    docx-template-loader.ts
    docx-openxml-renderer.ts
    docx-project-table-builder.ts
    docx-evidence-page-builder.ts
    docx-word-field-builder.ts
    docx-image-service.ts
```

### 8.2 Responsabilidades

`build-report-export-payload.ts`

- Buscar dados do perfil, atividades e evidencias.
- Agrupar atividades por `project_scope`.
- Ordenar atividades por `order`.
- Ordenar evidencias por `sort_index`.
- Montar um DTO unico para a exportacao.

`validate-report-export.ts`

- Verificar campos obrigatorios do mes selecionado.
- Validar existencia fisica dos arquivos de evidencia.
- Impedir exportacao quando houver atividade incompleta.

`docx-openxml-renderer.ts`

- Abrir o template.
- Substituir placeholders simples.
- Clonar a tabela do Encarte A por projeto.
- Clonar a linha modelo de atividade por item.
- Inserir o Encarte B a partir da ancora `{{evidence_pages}}`.
- Salvar o DOCX final.

`docx-evidence-page-builder.ts`

- Inserir quebra de pagina por evidencia.
- Inserir imagem em proporcao adequada.
- Inserir legenda.
- Criar bookmark unico por pagina de evidencia.

`docx-word-field-builder.ts`

- Criar os campos `PAGEREF` que alimentam a coluna Referencia.
- Garantir o formato `Paginas x, y e z`.

## 9. Estrategia de Paginacao e Referencias

Esse e o ponto tecnicamente mais sensivel da funcionalidade.

Em DOCX, o numero real da pagina depende do motor de layout do Word. Isso significa que o app nao deve tentar calcular numeracao final de pagina por conta propria apenas com base no XML. Em vez disso, a estrategia recomendada e:

1. Cada pagina de evidencia recebe um bookmark unico.
2. A coluna Referencia de cada atividade recebe campos `PAGEREF` apontando para esses bookmarks.
3. O template permanece com `updateFields=true`, para o Word recalcular tudo ao abrir.

Exemplo conceitual:

- Evidencia 1 da atividade A gera o bookmark `evidence_activityA_1`.
- Evidencia 2 da atividade A gera o bookmark `evidence_activityA_2`.
- A coluna Referencia recebe algo equivalente a `Paginas { PAGEREF evidence_activityA_1 }, { PAGEREF evidence_activityA_2 }`.

Consequencia importante:

- No Microsoft Word, a numeracao deve ser atualizada corretamente ao abrir o arquivo.
- Em outros visualizadores, a atualizacao de campos pode variar.

## 10. Fluxo de Geracao End-to-End

1. Usuario seleciona o mes e aciona `Gerar DOCX`.
2. O app valida se todas as atividades exportaveis do mes estao completas.
3. O app monta um payload de exportacao com perfil, atividades, projetos e evidencias.
4. O motor DOCX carrega o template base.
5. O motor substitui placeholders simples da capa e das informacoes basicas.
6. O motor clona a tabela do Encarte A para cada projeto.
7. O motor clona a linha de atividade dentro de cada tabela.
8. O motor insere o Encarte B com uma pagina por evidencia.
9. O motor cria bookmarks e campos `PAGEREF` para referencias cruzadas.
10. O arquivo final e salvo no destino escolhido.
11. O app oferece abrir a pasta ou abrir o arquivo gerado.

## 11. Regras de Negocio para a Implementacao

- Uma atividade sem data inicial, data final, descricao e status nao pode entrar na exportacao mensal.
- A ordem visual das atividades precisa respeitar o campo `order` salvo pelo usuario.
- A ordem das evidencias precisa respeitar o `sort_index` salvo pelo usuario.
- Cada evidencia gera exatamente uma pagina no Encarte B.
- Cada evidencia precisa exibir sua propria legenda.
- O template original nunca deve ser sobrescrito.
- O processo de geracao deve ser deterministico para a mesma base de dados e a mesma ordem de evidencias.

## 12. Tratamento de Imagens

Para evitar DOCX gigantes e imagens quebrando o layout, a implementacao deve prever:

- Leitura de dimensoes da imagem antes da insercao.
- Redimensionamento proporcional para caber na area util da pagina.
- Preservacao da resolucao suficiente para leitura.
- Tratamento de formatos comuns: PNG, JPG e JPEG.
- Falha clara quando o arquivo da evidencia estiver ausente ou corrompido.

## 13. Compatibilidade e Limitacoes Esperadas

- O foco principal da compatibilidade deve ser Microsoft Word.
- LibreOffice e outros editores podem abrir o arquivo, mas podem divergir na atualizacao de campos.
- O DOCX deve ser considerado um arquivo editavel e institucionalmente fiel, mas nao necessariamente identico ao PDF gerado pelo Puppeteer.
- A primeira versao deve tratar a descricao da atividade como texto simples com quebra de linha. Suporte a negrito, italico e listas internas pode ficar para uma iteracao posterior.

## 14. Plano de Implementacao por Etapas

### Etapa 1. Consolidacao de requisitos

- Fechar regra final da coluna Referencia.
- Confirmar se `project_scope` sera texto simples ou entidade propria.
- Confirmar o formato final do nome do arquivo gerado.

Entrega esperada:

- Documento de regras fechado.
- Ajustes de schema definidos.

### Etapa 2. Preparacao do backend de exportacao

- Criar DTO de exportacao.
- Criar validacoes de exportacao mensal.
- Criar consulta que traga atividades e evidencias em ordem correta.

Entrega esperada:

- Payload consistente para alimentar qualquer exportador.

### Etapa 3. Motor DOCX basico

- Carregar template.
- Substituir placeholders simples.
- Gerar arquivo valido sem projetos repetidos nem evidencias.

Entrega esperada:

- DOCX simples, abrindo sem erros no Word.

### Etapa 4. Geracao do Encarte A

- Clonar tabela por projeto.
- Clonar linha por atividade.
- Preencher referencias ainda sem paginacao final.

Entrega esperada:

- Documento com todas as atividades do mes corretamente agrupadas.

### Etapa 5. Geracao do Encarte B

- Inserir uma pagina por evidencia.
- Inserir imagens e legendas.
- Criar bookmarks por evidencia.

Entrega esperada:

- Documento com anexos completos.

### Etapa 6. Referencias de pagina

- Inserir campos `PAGEREF` no Encarte A.
- Validar atualizacao no Word.

Entrega esperada:

- Coluna Referencia exibindo paginas apos atualizacao de campos.

### Etapa 7. Integracao com a aplicacao

- Adicionar acao `Gerar DOCX` na UI.
- Exibir erros de validacao.
- Exibir caminho final do arquivo e opcao de abrir.

Entrega esperada:

- Fluxo funcional de ponta a ponta no app.

## 15. Estrategia de Testes

### 15.1 Testes automatizados

- Testes unitarios do montador de payload.
- Testes unitarios das validacoes de exportacao.
- Testes de XML para garantir insercao correta de placeholders, tabelas, bookmarks e campos.
- Testes de integracao gerando DOCX com massa fixa.

### 15.2 Testes manuais

- Abrir o arquivo no Microsoft Word e verificar se nao ha mensagem de reparo.
- Verificar se o indice continua funcional.
- Verificar se as paginas de evidencia aparecem na ordem correta.
- Verificar se a coluna Referencia aponta para as paginas corretas apos atualizacao.
- Verificar documentos com grande volume de imagens.

## 16. Criterios de Pronto

A funcionalidade pode ser considerada pronta quando cumprir todos estes pontos:

- Gera um `.docx` valido, sem corromper o arquivo.
- Preserva o layout institucional do template base.
- Preenche corretamente capa e informacoes basicas.
- Agrupa atividades por projeto no Encarte A.
- Gera uma pagina por evidencia no Encarte B.
- Mantem a ordem de atividades e evidencias definida pelo usuario.
- Preenche a coluna Referencia com links e ou paginas.
- Nao altera o template original durante a exportacao.

## 17. Riscos e Mitigacoes

### Risco 1. Divergencia de paginacao entre visualizadores

Mitigacao:

- Priorizar Microsoft Word como referencia.
- Basear referencias em `PAGEREF` e nao em calculo manual.

### Risco 2. Arquivos DOCX muito grandes

Mitigacao:

- Redimensionar imagens antes da insercao.
- Definir limite tecnico por resolucao, nao por quantidade.

### Risco 3. Complexidade excessiva para texto rico

Mitigacao:

- Na primeira versao, tratar descricao como texto simples com quebras de linha.
- Evoluir para rich text apenas apos a primeira exportacao estavel.

### Risco 4. Falta de agrupamento correto por projeto

Mitigacao:

- Ajustar o schema antes de comecar o motor DOCX.

## 18. Recomendacao Final

A geracao DOCX deve entrar como uma fase propria, posterior ao nucleo do produto. A implementacao deve reutilizar o template institucional ja preparado e seguir uma abordagem OpenXML controlada, em vez de gerar o documento do zero. Isso reduz risco, preserva fidelidade visual e deixa a funcionalidade pronta para crescer sem travar o roadmap principal do ShipIt.