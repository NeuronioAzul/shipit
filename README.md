<p align="center">
  <img src="assets/images/logo-composto-colorido.svg" alt="ShipIt! Logo" width="400" />
</p>

<h1 align="center">ShipIt!</h1>

<p align="center">
  <strong>Automatize a criação do seu Relatório Mensal de Atividades Desenvolvidas seguindo o padrão institucional do MEC.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versão-1.2.2-blue" alt="Versão" />
  <img src="https://img.shields.io/badge/Plataforma-Windows%20|%20macOS%20|%20Linux-brightgreen" alt="Plataformas" />
  <img src="https://img.shields.io/badge/Offline-100%25-orange" alt="Offline" />
  <img src="https://img.shields.io/badge/license-ISC-green" alt="License" />
</p>

<!-- Screenshot: Captura do Dashboard do ShipIt! mostrando o gráfico de Gantt e cards de resumo mensal -->

---

## Sobre

O **ShipIt!** é uma aplicação desktop gratuita e multiplataforma para profissionais de TI que precisam documentar suas atividades mensais e gerar relatórios no padrão institucional do **MEC** (Ministério da Educação).

O app fica no **System Tray** para fácil acesso — basta clicar, registrar a atividade com evidências (prints, links), e deixar o resto com o ShipIt!

### Por que usar o ShipIt?

- **Chega de planilhas** — registre atividades com poucos cliques em uma interface intuitiva
- **Relatório pronto em segundos** — gere o DOCX no padrão MEC automaticamente, com encarte de atividades e páginas de evidências
- **Nunca perca dados** — salvamento automático contínuo, tudo armazenado localmente no seu computador
- **100% offline** — funciona sem conexão com a internet, seus dados nunca saem da sua máquina
- **Atualizações automáticas** — receba novas versões sem esforço

---

## Download

Baixe o instalador para sua plataforma na página de [**Releases**](https://github.com/NeuronioAzul/shipit/releases/latest):

| Plataforma | Formato | Descrição |
|------------|---------|-----------|
| **Windows** | `.exe` (Setup) | Instalador recomendado |
| **Windows** | `.exe` (Portable) | Executável portátil, sem instalação |
| **Windows** | `.msi` | Instalador MSI para deploy corporativo |
| **macOS** | `.dmg` (arm64) | Apple Silicon (M1/M2/M3/M4) |
| **macOS** | `.dmg` (x64) | Intel |
| **Linux** | `.AppImage` | Universal, sem instalação |
| **Linux** | `.deb` | Debian/Ubuntu |
| **Linux** | `.rpm` | Fedora/RHEL |

### Qual versão devo baixar?

- **Windows**: use o **Setup (.exe)** se quiser instalar normalmente. Use o **Portable** para rodar sem instalar (pendrive, etc.) ou se preferir o **MSI** para deploy corporativo.
- **macOS**: use **arm64** se tem Mac com chip Apple Silicon (M1+). Use **x64** se tem Mac Intel.
- **Linux**: **AppImage** roda em qualquer distro. Use **.deb** ou **.rpm** se preferir instalar pelo gerenciador de pacotes.

---

## Instalação

### Windows

1. Baixe o arquivo `ShipIt-x.x.x-Windows-x64-Setup.exe` da página de [Releases](https://github.com/NeuronioAzul/shipit/releases/latest)
2. Execute o instalador e siga as instruções na tela
3. O ShipIt! será instalado e um atalho será criado no Menu Iniciar
4. Na primeira execução, configure seu perfil para começar a usar

> **Versão Portable**: Baixe `ShipIt-x.x.x-Windows-x64-Portable.exe` e execute diretamente — não precisa instalar.

### macOS

1. Baixe o arquivo `.dmg` correspondente ao seu processador (arm64 para Apple Silicon, x64 para Intel)
2. Abra o `.dmg` e arraste o ShipIt! para a pasta Aplicativos
3. Na primeira execução, clique com botão direito → "Abrir" para permitir a execução

### Linux

1. Baixe o formato de sua preferência (`.AppImage`, `.deb` ou `.rpm`)
2. **AppImage**: torne executável com `chmod +x ShipIt-*.AppImage` e execute
3. **deb**: instale com `sudo dpkg -i ShipIt-*.deb`
4. **rpm**: instale com `sudo rpm -i ShipIt-*.rpm`

---

## Primeiros Passos

### 1. Configure seu Perfil

Na primeira vez que abrir o ShipIt!, você verá a tela de boas-vindas. Clique em **"Criar Perfil"** e preencha suas informações:

- Nome completo, cargo, nível de senioridade
- Tipo de atendimento (Presencial, Remoto ou Híbrido)
- Escopo do projeto/squad e atividades correlatas

<!-- Screenshot: Tela de cadastro do perfil do usuário -->

### 2. Registre suas Atividades

Acesse **Atividades** no menu lateral e clique em **"Nova Atividade"**:

- Descreva a atividade realizada
- Defina o período (data início e fim)
- Escolha o status (Em andamento, Concluído, Pendente, Cancelado)
- Adicione links de referência, se necessário

<!-- Screenshot: Formulário de nova atividade preenchido -->

### 3. Adicione Evidências (Prints)

Na tela de detalhes da atividade, adicione capturas de tela como evidência. Você pode:

- **Arrastar e soltar** arquivos de imagem diretamente na área de upload
- **Colar da área de transferência** — tire um print (PrintScreen) e cole com `Ctrl+V`
- **Selecionar arquivos** — clique no botão de upload e escolha as imagens

Cada evidência pode ter uma **legenda** descritiva que aparecerá no relatório final.

<!-- Screenshot: Tela de detalhes da atividade com evidências e legendas -->

### 4. Acompanhe pelo Dashboard

O **Dashboard** mostra um resumo visual do seu mês:

- **Cards de status** — total, concluídas, em andamento, pendentes, canceladas
- **Gráfico de Gantt** — visualize o período de cada atividade ao longo do mês
- **Tabela de atividades** — lista completa com indicadores de campos incompletos

<!-- Screenshot: Dashboard completo com Gantt chart e cards de resumo -->

### 5. Gere o Relatório

Quando todas as atividades do mês estiverem preenchidas, clique em **"Gerar Relatório"** no Dashboard:

1. O ShipIt! valida se o perfil e todas as atividades têm os campos obrigatórios preenchidos
2. Confirme o mês de referência
3. O relatório DOCX é gerado automaticamente no padrão MEC
4. Clique em **"Abrir pasta"** para visualizar o documento gerado

O relatório inclui:

- **Encarte A** — tabela de atividades agrupadas por escopo de projeto, com checkboxes de tipo de atendimento
- **Encarte B** — páginas de evidências com imagens em tamanho otimizado e legendas

<!-- Screenshot: Exemplo de relatório DOCX gerado pelo ShipIt! -->

---

## Funcionalidades

### Dashboard Mensal

Resumo visual completo do mês com cards de status, gráfico de Gantt interativo e tabela detalhada de atividades. Navegue entre meses para comparar progresso.

<!-- Screenshot: Dashboard com navegação entre meses -->

### Gerenciamento de Atividades

CRUD completo de atividades com campos para descrição, período, status, links de referência, tipo de atendimento e escopo do projeto. Reorganize a ordem das atividades arrastando e soltando.

<!-- Screenshot: Lista de atividades com drag & drop -->

### Evidências com Prints

Múltiplas formas de adicionar evidências: upload de arquivos, arrastar e soltar, ou colar da área de transferência. Cada imagem aceita uma legenda descritiva. Suporta PNG, JPEG, GIF, BMP e WebP.

<!-- Screenshot: Upload de evidências com área de drag & drop -->

### Geração de Relatório DOCX

Documento formatado automaticamente seguindo o modelo oficial do MEC, com:

- Dados do perfil na capa
- Encarte A com atividades agrupadas por projeto
- Encarte B com evidências (uma por página) e referências cruzadas de páginas

### 11 Temas Visuais 🎨

Personalize a aparência do ShipIt! com **11 temas** organizados em categorias:

#### Principais

| Tema | Descrição |
|------|-----------|
| ☀️ **Claro** | Tema padrão com tons de azul e branco |
| 🌙 **Escuro** | Visual escuro com acentos vibrantes |

#### Personalidade

| Tema | Descrição |
|------|-----------|
| 🎨 **Colorido** | Paleta vibrante e multicolorida |
| 🌹 **Rosa & Violeta** | Elegância em tons de rosa e roxo |
| ⚪ **Minimalista** | Tons de cinza com acento sutil |
| 🚀 **Futurista** | Neon ciano e roxo em fundo escuro |
| 🌊 **Oceano** | Tons de azul e verde-água |
| 🌅 **Pôr do Sol** | Tons quentes de laranja e dourado |

#### Acessibilidade

| Tema | Descrição |
|------|-----------|
| 🔲 **Alto Contraste** | WCAG AAA — preto/branco/azul para baixa visão |
| 🔳 **Alto Contraste Escuro** | WCAG AAA — amarelo/ciano em fundo preto |

#### Bônus

| Tema | Descrição |
|------|-----------|
| 💛 **Cyberpunk** | Neon amarelo e ciano, efeitos de glitch, scanlines CRT e cantos angulares |

Acesse **Configurações → Aparência** para trocar de tema a qualquer momento. A transição é suave e instantânea.

<!-- Screenshot: Seletor de temas na tela de Configurações -->
<!-- Screenshot: Comparação lado a lado de diferentes temas (Light, Dark, Cyberpunk, Ocean) -->

### System Tray

O ShipIt! fica no System Tray (bandeja do sistema) para acesso rápido sem interromper seu trabalho. O ícone muda de cor conforme o status:

| Ícone | Significado |
|-------|-------------|
| 🔵 Azul | Padrão — app rodando normalmente |
| 🟢 Verde | Tudo em dia — todas as atividades do mês concluídas |
| 🟡 Amarelo (piscando) | Atenção — atividades incompletas no mês |
| 🔴 Vermelho (piscando) | Urgente — últimos 3 dias do mês com pendências |

Clique com botão direito no ícone para acessar atalhos rápidos (Nova Atividade, Dashboard, Sair).

### Alertas e Notificações 🔔

Configure lembretes para não esquecer de preencher suas atividades:

- Defina quantos dias antes do final do mês deseja ser alertado
- Escolha o horário das notificações
- Personalize a mensagem do alerta
- Ative ou desative o som de notificação

Acesse **Configurações → Notificações** para configurar.

### Busca de Atividades 🔍

Use `Ctrl+K` para abrir a barra de busca rápida (estilo Command Palette). Pesquise por:

- Descrição da atividade
- Escopo do projeto
- Links de referência
- Legendas das evidências

### Lixeira de Evidências 🗑️

Evidências excluídas vão para a **Lixeira** e podem ser restauradas a qualquer momento. Itens na lixeira são automaticamente removidos após 3 meses.

### Atualizações Automáticas

O ShipIt! verifica e baixa atualizações automaticamente em segundo plano. Quando uma nova versão estiver pronta, você será notificado e pode instalar com um clique em **Configurações → Atualizações**.

---

## Atalhos e Dicas

| Atalho / Dica | Descrição |
|---------------|-----------|
| `Ctrl+K` | Abre a barra de busca rápida |
| `Ctrl+V` | Cola um print da área de transferência como evidência (na tela de detalhes) |
| **System Tray** | Fechar a janela minimiza para o tray — o app continua rodando |
| **Salvamento automático** | Não precisa clicar "Salvar" — seus rascunhos são salvos continuamente |
| **Arrastar e soltar** | Arraste atividades na lista para reorganizar a ordem no relatório |
| **Arrastar evidências** | Arraste imagens do seu computador direto para a área de upload |
| **Iniciar com o sistema** | Ative em Configurações para o ShipIt! abrir automaticamente ao ligar o PC |

---

## Requisitos do Sistema

| Requisito | Mínimo |
|-----------|--------|
| **Windows** | Windows 10 ou superior (x64) |
| **macOS** | macOS 11 Big Sur ou superior (arm64 ou x64) |
| **Linux** | Ubuntu 20.04+, Fedora 36+, ou equivalente (x64) |
| **Espaço em disco** | ~200 MB para instalação + espaço para evidências |
| **Conexão** | **Não necessária** — 100% offline |

---

## Perguntas Frequentes (FAQ)

<details>
<summary><strong>Onde ficam meus dados?</strong></summary>

Todos os dados são armazenados localmente no seu computador, na pasta de dados do usuário do sistema operacional:
- **Windows**: `%APPDATA%/shipit/`
- **macOS**: `~/Library/Application Support/shipit/`
- **Linux**: `~/.config/shipit/`

O banco de dados é o arquivo `shipit.db`, e as evidências ficam na subpasta `evidences/`.
</details>

<details>
<summary><strong>Posso mudar a pasta onde os relatórios são salvos?</strong></summary>

Sim! Acesse **Configurações → Diretório de Relatórios** e escolha a pasta de sua preferência.
</details>

<details>
<summary><strong>Como faço backup dos meus dados?</strong></summary>

Copie a pasta de dados do app (veja a pergunta acima). Ela contém o banco de dados (`shipit.db`), as evidências (`evidences/`) e as configurações (`settings.json`).
</details>

<details>
<summary><strong>Excluí uma evidência por engano. Posso recuperar?</strong></summary>

Sim! Evidências excluídas vão para a **Lixeira** (acessível pelo menu lateral). Você pode restaurá-las a qualquer momento dentro de 3 meses.
</details>

<details>
<summary><strong>O relatório gerado está em qual formato?</strong></summary>

O relatório é gerado em formato **DOCX** (Microsoft Word), seguindo o modelo oficial do MEC. Você pode abri-lo com Word, LibreOffice Writer ou Google Docs.
</details>

<details>
<summary><strong>Preciso de internet para usar o ShipIt?</strong></summary>

Não. O ShipIt! funciona **100% offline**. A única funcionalidade que usa internet é a verificação de atualizações, que é opcional.
</details>

<details>
<summary><strong>O ShipIt! é gratuito?</strong></summary>

Sim! O ShipIt! é software livre, distribuído sob a [Licença ISC](LICENSE).
</details>

<details>
<summary><strong>Quais formatos de imagem são aceitos como evidência?</strong></summary>

PNG, JPEG, GIF, BMP e WebP.
</details>

---

## Para Desenvolvedores

Se você deseja contribuir com o projeto ou entender a arquitetura interna, consulte a documentação técnica:

| Documento | Descrição |
|-----------|-----------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup de desenvolvimento, comandos, stack e estrutura |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura detalhada, fluxo IPC, decisões técnicas |
| [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) | Auditoria de dependências com versões e justificativas |
| [docs/TODO.md](docs/TODO.md) | Roadmap de desenvolvimento com status de cada fase |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões e alterações |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guia para contribuir com o projeto |

**Stack tecnológico**: Electron 41, React 19, TypeScript 6, Vite 8, Tailwind CSS 4, TypeORM + SQLite, Vitest + Playwright.

---

## Licença

Este projeto está licenciado sob a [Licença ISC](LICENSE).

---

<p align="center">
  Feito com ☕ por <a href="https://github.com/NeuronioAzul">NeuronioAzul</a>
</p>
