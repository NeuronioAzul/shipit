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

## Fix

- n1
  - 🔴 feat and fix: 
    1. primeiro quero que remova completamento o tema do cyberpunk, arquivos, testes documentação, etc, faça o commit.
    2. Os temas precisam ser melhorados e padronizados, o CSS está com inconsistências nos estilos e cores quero que melhore e corrija o css, os botões e todos os campos de formulário, campos do tipo texto, textarea, select, checkbox, etc, precisam de uma verificação geral em todos os estilos para que trabalhem do mesmo jeito. 

- Temas Principais

| Tema | Descrição |
|------|-----------|
| ☀️ **Claro** | Tema padrão com tons de azul e branco |
| 🌙 **Escuro** | Visual escuro com acentos vibrantes |

- Temas com Personalidade

| Tema | Descrição |
|------|-----------|
| 🎨 **Colorido** | Paleta vibrante e multicolorida focado nas cores primárias |
| 🌹 **Rosa & Violeta** | Elegância em tons de rosa, violeta e roxo, com detalhes sutis, background image `public/assets/images/bg/tema-rosa.jpg` |
| ⚪ **Minimalista** | Tons de cinza com acento sutil |
| 🚀 **Futurista** | Neon ciano e roxo em fundo escuro |
| 🌊 **Oceano** | Tons de azul e verde-água |
| 🌅 **Pôr do Sol** | Tons quentes de laranja e dourado |

- Cores para o Tema Futurista:

```css
/* ==========================================================
   FUTURISTIC THEME
   Inspirado em:
   - Neon Color Palette
   - Cyberpunk 2077
   - Akira
   - Ghost in the Shell
   - Synthwave / Retrowave
   - Interfaces holográficas
   ========================================================== */

/* ==========================================================
   NEUTRAL / BACKGROUND
   ========================================================== */

--black-1000: #030305;
--black-900:  #070B14;
--black-800:  #0C1021;
--black-700:  #141A2E;
--black-600:  #1D243A;

/* ==========================================================
   CYAN / HOLOGRAPHIC
   ========================================================== */

--cyan-100: #D5FFFF;
--cyan-200: #9CFBFF;
--cyan-300: #5CEEFF;
--cyan-400: #25DFFF;
--cyan-500: #00CFFF;
--cyan-600: #00A7D6;
--cyan-700: #007CA3;

/* ==========================================================
   ELECTRIC BLUE
   ========================================================== */

--blue-300: #75B8FF;
--blue-400: #4C8FFF;
--blue-500: #2972FF;
--blue-600: #1B4DE4;
--blue-700: #1232AF;

/* ==========================================================
   NEON PURPLE
   ========================================================== */

--purple-300: #C26FFF;
--purple-400: #A83DFF;
--purple-500: #8B00FF;
--purple-600: #7100D0;
--purple-700: #56009E;

/* ==========================================================
   CYBER PINK
   ========================================================== */

--pink-300: #FF73F1;
--pink-400: #FF33EA;
--pink-500: #FF00D4;
--pink-600: #D500B0;
--pink-700: #A50088;

/* ==========================================================
   MAGENTA
   ========================================================== */

--magenta-300: #FF62B7;
--magenta-400: #FF2D91;
--magenta-500: #F21872;
--magenta-600: #D41461;
--magenta-700: #AA104E;

/* ==========================================================
   NEON GREEN
   ========================================================== */

--green-300: #A8FF00;
--green-400: #6EFF00;
--green-500: #39FF14;
--green-600: #1DE300;
--green-700: #13B500;

/* ==========================================================
   NEON ORANGE
   ========================================================== */

--orange-300: #FFB347;
--orange-400: #FF8A00;
--orange-500: #FF6A00;
--orange-600: #F04A17;
--orange-700: #C93A10;

/* ==========================================================
   WARNING / ALERT COLORS
   ========================================================== */

/* Success - Matrix Green */
--success:            #39FF14;
--success-bg:         #0D2B0A;
--success-border:     #1DE300;

/* Info - Holographic Cyan */
--info:               #00CFFF;
--info-bg:            #082836;
--info-border:        #00A7D6;

/* Warning - Neon Amber */
--warning:            #FFB800;
--warning-bg:         #3A2900;
--warning-border:     #D99800;

/* Error - Neon Red */
--error:              #FF3A20;
--error-bg:           #350D08;
--error-border:       #D1260E;

/* Critical - Plasma Pink */
--critical:           #FF0088;
--critical-bg:        #330018;
--critical-border:    #C70069;

/* ==========================================================
   UI SURFACES
   ========================================================== */

--background:             #030305;
--background-secondary:   #070B14;

--surface-primary:        #0C1021;
--surface-secondary:      #141A2E;
--surface-tertiary:       #1D243A;

--card-background:        #101629;
--modal-background:       #131B33;

/* ==========================================================
   BORDERS
   ========================================================== */

--border-subtle:          #253152;
--border-default:         #31436D;
--border-strong:          #4664A3;

/* ==========================================================
   PRIMARY ACTIONS
   ========================================================== */

--primary:                #00CFFF;
--primary-hover:          #25DFFF;
--primary-active:         #00A7D6;

--secondary:              #FF00D4;
--secondary-hover:        #FF33EA;
--secondary-active:       #D500B0;

/* ==========================================================
   TEXT
   ========================================================== */

--text-primary:           #F6F8FF;
--text-secondary:         #B8C2E0;
--text-muted:             #7682A8;
--text-disabled:          #4B5370;

--text-on-primary:        #FFFFFF;

/* ==========================================================
   GLOW EFFECTS
   ========================================================== */

--glow-cyan:              #00CFFF;
--glow-blue:              #2972FF;
--glow-purple:            #8B00FF;
--glow-pink:              #FF00D4;
--glow-green:             #39FF14;
--glow-orange:            #FF8A00;

/* ==========================================================
   FOCUS / INTERACTION
   ========================================================== */

--focus-ring:             #5CEEFF;
--hover-overlay:          rgba(0,207,255,0.12);
--active-overlay:         rgba(255,0,212,0.16);
--selection:              rgba(139,0,255,0.35);

/* ==========================================================
   DASHBOARDS / CHARTS
   ========================================================== */

--chart-1:                #00CFFF;
--chart-2:                #FF00D4;
--chart-3:                #8B00FF;
--chart-4:                #39FF14;
--chart-5:                #FFB800;
--chart-6:                #FF3A20;
--chart-7:                #2972FF;
--chart-8:                #FF8A00;

Paleta principal recomendada para um sistema futurista

Função	Cor
Background	#030305
Surface	#0C1021
Primary	#00CFFF
Secondary	#FF00D4
Accent	#8B00FF
Success	#39FF14
Warning	#FFB800
Error	#FF3A20
Text	#F6F8FF

Esta combinação (preto + cyan + magenta + roxo neon) é atualmente a estética futurista/cyberpunk mais popular para interfaces de sistemas, dashboards e aplicações voltadas a tecnologia.
```

- Cores para o Tema Oceano:

```css
/* ==========================================================
   OCEAN THEME PALETTE
   Inspirado em: águas rasas, mar tropical, oceano profundo,
   recifes, céu marítimo e bioluminescência.
   ========================================================== */

/* ==========================================================
   CORE OCEAN COLORS
   ========================================================== */

--ocean-50:   #F2FAFC;
--ocean-100:  #DDF2F7;
--ocean-200:  #B7E2EA;
--ocean-300:  #86CEDB;
--ocean-400:  #57B8CC;
--ocean-500:  #2CA3C3;
--ocean-600:  #1E86A8;
--ocean-700:  #156C8D;
--ocean-800:  #0F536D;
--ocean-900:  #0A3C52;

/* ==========================================================
   AQUA / TROPICAL WATER
   ========================================================== */

--aqua-50:    #EDFDFC;
--aqua-100:   #D4F8F5;
--aqua-200:   #A8F0E8;
--aqua-300:   #78E4D9;
--aqua-400:   #43D1C6;
--aqua-500:   #1DB7AE;
--aqua-600:   #149A93;
--aqua-700:   #0F7A75;
--aqua-800:   #0B5C59;
--aqua-900:   #083F3D;

/* ==========================================================
   DEEP OCEAN
   ========================================================== */

--deep-50:    #EEF4FB;
--deep-100:   #D7E5F4;
--deep-200:   #B2CCE7;
--deep-300:   #82A8D3;
--deep-400:   #5A84BF;
--deep-500:   #3E67A9;
--deep-600:   #2F538E;
--deep-700:   #23406F;
--deep-800:   #192E50;
--deep-900:   #101D34;

/* ==========================================================
   ABYSS (Oceano profundo)
   ========================================================== */

--abyss-100:  #1A2B45;
--abyss-200:  #16263C;
--abyss-300:  #122032;
--abyss-400:  #0E1A29;
--abyss-500:  #09131F;

/* ==========================================================
   SURFACES
   ========================================================== */

--background:            #071826;
--background-secondary:  #0D2436;
--surface-primary:       #123148;
--surface-secondary:     #183E57;
--surface-tertiary:      #22516B;

--border-subtle:         #295A74;
--border-default:        #37718C;
--border-strong:         #4E8CA9;

/* ==========================================================
   PRIMARY COLORS
   ========================================================== */

--primary:               #2CA3C3;
--primary-hover:         #57B8CC;
--primary-active:        #1E86A8;

--secondary:             #1DB7AE;
--secondary-hover:       #43D1C6;
--secondary-active:      #149A93;

/* ==========================================================
   TEXT COLORS
   ========================================================== */

--text-primary:          #F5FBFD;
--text-secondary:        #C0D9E2;
--text-muted:            #8EA9B5;
--text-disabled:         #637887;

--text-on-primary:       #FFFFFF;
--text-on-dark:          #F5FBFD;

/* ==========================================================
   STATUS COLORS
   Inspirados em fenômenos marítimos
   ========================================================== */

/* SUCCESS - Verde água tropical */
--success:               #1BCB8F;
--success-bg:            #0E3F37;
--success-border:        #1F8D6B;

/* INFO - Azul oceânico */
--info:                  #37B7FF;
--info-bg:               #143B58;
--info-border:           #2D7EB5;

/* WARNING - Areia dourada / pôr do sol marítimo */
--warning:               #E8B84A;
--warning-bg:            #473514;
--warning-border:        #A17A1D;

/* ERROR - Coral vermelho */
--error:                 #D65A5A;
--error-bg:              #421B1B;
--error-border:          #A64040;

/* CRITICAL - Abismo vulcânico */
--critical:              #B83535;
--critical-bg:           #2B0F0F;
--critical-border:       #7D2222;

/* ==========================================================
   INTERACTIVE STATES
   ========================================================== */

--hover-overlay:         rgba(87,184,204,0.12);
--active-overlay:        rgba(29,183,174,0.18);
--focus-ring:            #6BD6FF;
--selection:             rgba(55,183,255,0.28);

/* ==========================================================
   SPECIAL EFFECTS
   Bioluminescência
   ========================================================== */

--glow-cyan:             #59E7FF;
--glow-aqua:             #68FFE1;
--glow-blue:             #6CAEFF;

/* ==========================================================
   CHARTS / DASHBOARDS
   ========================================================== */

--chart-1:               #2CA3C3;
--chart-2:               #1DB7AE;
--chart-3:               #57B8CC;
--chart-4:               #3E67A9;
--chart-5:               #E8B84A;
--chart-6:               #D65A5A;
--chart-7:               #68FFE1;
--chart-8:               #82A8D3;
```

- Cores para o Por do Sol:

```css
/* Primárias - Tons quentes de outono */
--color-autumn-red-900: #8F1700;
--color-autumn-red-800: #A62B12;
--color-autumn-orange-700: #B13F0A;
--color-autumn-orange-600: #C95523;
--color-autumn-orange-500: #DD6E24;
--color-autumn-orange-400: #E27D1A;

/* Secundárias - Marrons e terrosos */
--color-earth-brown-900: #2F120B;
--color-earth-brown-800: #5C1E14;
--color-earth-brown-700: #8A3F00;
--color-earth-brown-600: #9A4A1F;
--color-earth-brown-500: #A85A1A;
--color-earth-brown-400: #B06542;

/* Destaque - Dourados e amarelos */
--color-gold-700: #D8B84C;
--color-gold-600: #DDBF73;
--color-gold-500: #EDBA4E;
--color-gold-400: #E58A17;

/* Apoio - Verdes suaves */
--color-olive-500: #B5BC63;

/* Apoio - Azuis acinzentados */
--color-blue-gray-300: #BCC1DD;
--color-blue-gray-400: #8591C0;

/* Neutros para UI */
--color-background: #F5F2ED;
--color-surface: #FFFFFF;
--color-surface-secondary: #EEE7DD;
--color-border: #D6C8B8;
--color-text-primary: #2F120B;
--color-text-secondary: #6A5647;
--color-text-muted: #8C7A6B;

/* Estados */
--color-success: #7A8A45;
--color-warning: #D8B84C;
--color-error: #A62B12;
--color-info: #8591C0;

/* Hover e interação */
--color-hover-primary: #8A3F00;
--color-hover-secondary: #5C1E14;
--color-focus: #EDBA4E;
--color-disabled: #CFC7BE;
```


- Temas de Acessibilidade
  - Para baixa visão
  - Use as cores 8-bit (256 cores) para os temas de alto contraste.

| Tema | Descrição |
|------|-----------|
| 🔲 **Alto Contraste** | WCAG AAA — com fundo branco |
| 🔳 **Alto Contraste Escuro** | WCAG AAA — com fundo preto |


## New features

- n3
  - 🟡 feat: Implementar em configurações a opção de escolher a pasta onde ficam as evidências, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.
  - 🟡 feat: Implementar em configurações a opção de escolher a pasta onde ficará o banco de dados e informações configurações do app
  - 🟡 feat: Implementar opção de backup do app com 2 botões, um para salvar as evidências, e outro para salvar o banco de dados e informações de configurações do app.

- ⁉️ Não sei se precisa disso.
  - ⁉️ feat: Quando criar uma nova atividade, criar e associar uma pasta para cada atividade dentro da pasta de evidências, para organizar melhor as evidências e facilitar a localização das evidências relacionadas a cada atividade, e também para melhorar a experiência do usuário, tornando a organização das evidências mais clara e eficiente.

## Verificação, correção e criação de testes

------------------------------------------------------------------
