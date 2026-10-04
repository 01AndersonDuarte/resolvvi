---
name: Consulta de processos
description: Interface operacional brasileira para acesso e consulta protegida de processos.
colors:
  canvas: "#f2f5f9"
  graphite: "#1b2735"
  ink: "#162435"
  line: "#cfdae5"
  muted: "#edf2f7"
  muted-ink: "#4e6073"
  route: "#155eef"
  route-strong: "#0e46bb"
  protected: "#e8eef5"
  danger: "#a12b22"
  danger-soft: "#fff1ef"
  danger-ink: "#76211b"
  success: "#08724f"
  success-soft: "#e8f6ef"
  success-ink: "#07573d"
  amber: "#8c4b00"
typography:
  headline:
    fontFamily: '"Segoe UI Variable", "Aptos", system-ui, sans-serif'
    fontSize: "30px / 36px; sm: 36px / 40px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Segoe UI Variable", "Aptos", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: '"Segoe UI Variable", "Aptos", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
rounded:
  control: "8px"
  panel: "16px"
  full: "9999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.route}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.route-strong}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  access-panel:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: Consulta de processos

## Overview

**Creative North Star: "Mesa de despacho verificada"**

A interface organiza uma tarefa sensível como uma mesa de despacho contemporânea: estrutura grafite, área de trabalho branca e fria, percurso em azul cobalto e estados de sessão sempre legíveis. A composição é sóbria e operacional. Tipografia sem serifa, hierarquia curta e alinhamento consistente ajudam pessoas sem familiaridade jurídica a entender onde estão e qual etapa vem a seguir.

A confiança é comunicada pela própria estrutura. O progresso mostra três etapas, mensagens ocupam uma faixa compacta e a área protegida permanece visualmente contida até a sessão ser confirmada. O âmbar fica reservado a exceções; tons de sucesso e erro mantêm significado sem competir com a rota azul. Preserve o português do Brasil e não introduza exemplos de processos ou resultados fictícios.

**Key Characteristics:**
- Estrutura operacional em grafite, branco frio e azul cobalto.
- Hierarquia compacta, sans-serif e estados de sessão explícitos.
- Conteúdo protegido separado e indisponível antes da validação.

## Colors

A paleta combina neutros frios com azul de rota; verde e vermelho comunicam estados, e âmbar permanece excepcional.

### Primary
- **Azul de rota**: A cor de ação e orientação. Use em ações principais, etapa atual e progresso concluído.
- **Azul de rota profundo**: Estado hover da ação primária; mantém a mesma função do azul de rota com maior peso visual.

### Neutral
- **Grafite de moldura**: Cabeçalho e moldura estrutural escura.
- **Tinta azul-grafite**: Texto principal sobre superfícies claras.
- **Tela fria**: Fundo geral da aplicação.
- **Branco de trabalho** (`#ffffff`): Superfície do painel e dos campos.
- **Linha fria**: Contornos de campos, painéis e separadores.
- **Cinza suave**: Fundo de elementos desabilitados e mensagens informativas.
- **Tinta secundária**: Texto de apoio, rótulos não ativos e instruções.
- **Destino protegido**: Superfície tonal que separa o conteúdo protegido.

### Named Rules
**The Route Accent Rule.** Azul identifica ações e avanço da jornada; âmbar aparece apenas para exceções.

## Typography

**Display Font:** Não há família display distinta; títulos usam a pilha de interface abaixo.
**Body Font:** Segoe UI Variable, com Aptos, system-ui e sans-serif como fallback.
**Label/Mono Font:** A mesma pilha de interface; não há fonte mono declarada.

**Character:** Sans-serif familiar e contida, com títulos sem excesso de expressão. Pesos semibold distinguem ações e cabeçalhos; texto de apoio mantém leitura confortável.

### Hierarchy
- **Headline** (600, 30px/36px; 36px/40px a partir do breakpoint sm, tracking -0.025em): Título da página dentro do painel.
- **Body** (400, 16px/28px): Descrições e texto de orientação.
- **Label** (600, 14px/20px): Rótulos de campo, navegação auxiliar e mensagens compactas.
- **Step label** (600, 12px; 14px em telas sm): Rótulo centrado de cada etapa.

## Layout

A moldura principal ocupa a largura disponível e centraliza o conteúdo em um máximo de 72rem. A navegação de etapas e as faixas de estado limitam-se a 48rem; o painel de acesso limita-se a 56rem. Em telas pequenas, o conteúdo mantém 16px de respiro lateral e o painel usa 20px de preenchimento; a partir de sm (640px), o respiro lateral passa a 32px e o painel a 32px; em lg (1024px), o preenchimento do painel chega a 40px. A estrutura continua em coluna única, com a trilha de três etapas distribuída igualmente.

O ritmo recorrente usa incrementos de 8, 12, 16, 20, 24 e 32px, com intervalos maiores de 40px quando o painel precisa de mais ar. Preserve a largura mínima de viewport de 320px. Em telas estreitas, mantenha rótulos curtos centralizados e controles em largura total; não comprima a trilha nem crie uma grade de dados ilustrativa.

## Elevation & Depth

O sistema usa uma sombra ampla e muito suave apenas para destacar o painel de trabalho do canvas frio. A hierarquia restante é tonal: branco para entrada, cinza azulado para o limite protegido e linhas frias para separar controles. Não há vocabulário de sombra para navegação, mensagens ou estados.

### Shadow Vocabulary
- **Painel de trabalho** (`0 18px 42px -30px rgb(31 49 68 / 38%)`): Sombra discreta sob o painel central.

**The Tonal Boundary Rule.** Distinga áreas protegidas com superfície e contorno; não eleve o destino protegido como se fosse uma ação disponível.

## Shapes

Controles e mensagens usam cantos suavemente arredondados (8px); painéis e a região protegida usam cantos mais amplos (16px). A trilha usa marcadores circulares para comunicar sequência. Contornos finos e frios definem os limites, com anéis de foco azuis claramente visíveis. Evite cápsulas decorativas: a única forma circular recorrente é o marcador da etapa.

## Components

### Buttons
- **Caráter:** Ação primária direta, preenchida e de alto contraste.
- **Shape:** Cantos de 8px e altura mínima de 48px.
- **Primary:** Fundo azul de rota, texto branco semibold e preenchimento horizontal de 20px.
- **Hover / Focus:** Hover usa azul profundo; foco visível usa anel azul de 4px com transparência de 30%.
- **Disabled / Busy:** Fundo de tinta secundária, cursor de espera e estado ocupado exposto semanticamente.

### Cards / Containers
- **Corner Style:** Painel principal e limite protegido têm cantos de 16px.
- **Background:** O painel é branco sobre canvas frio; a região protegida usa cinza azulado.
- **Shadow Strategy:** Apenas o painel principal recebe a sombra suave descrita em Elevation & Depth.
- **Border:** Contorno de 1px em linha fria.
- **Internal Padding:** 20px em telas pequenas, 32px em sm e 40px em lg.

### Inputs / Fields
- **Style:** Campo branco, contorno frio de 1px, cantos de 8px, altura mínima de 48px e 16px de espaço horizontal.
- **Focus:** A borda muda para azul de rota e recebe anel de foco de 4px com 20% de opacidade.
- **Error / Disabled:** Erros usam tinta vermelha e texto associado ao campo; desabilitados usam fundo cinza suave e tinta secundária.
- **Labels:** Rótulo semibold acima do campo; ajuda ou erro fica logo abaixo e ligado semanticamente ao controle.

### Navigation
- **Progress rail:** Três etapas em colunas iguais, com linha fina entre marcadores circulares de 32px. A etapa atual tem círculo preenchido azul e rótulo em tinta principal; a concluída tem contorno azul e interior branco; etapas futuras usam linha e texto secundários.
- **Mobile:** Mantém as três colunas, números curtos e rótulos centralizados; a linha fica atrás dos marcadores.

### Status Messages
- **Style:** Faixa de largura contida, contorno e fundo tonal, cantos de 8px, preenchimento 12px vertical e 16px horizontal.
- **Info:** Fundo cinza suave e texto principal.
- **Success:** Fundo verde suave e tinta verde escura.
- **Error:** Fundo vermelho suave e tinta vermelho escura; destaque claro para mensagens de erro.

### Protected Boundary
- **Style:** Região de pelo menos 160px de altura, preenchida em cinza azulado e contornada em linha fria.
- **Unavailable:** Ícone de cadeado discreto, rótulo “Acesso em validação” e explicação curta; mantenha dados de processo ocultos até a sessão ser confirmada.

## Do's and Don'ts

### Do:
- **Do:** mantenha textos e mensagens em português do Brasil.
- **Do:** use azul de rota para ações primárias e avanço da jornada.
- **Do:** mantenha visível o estado de validação da sessão e a fronteira do conteúdo protegido.
- **Do:** preserve foco de teclado, rótulos associados, mensagens semânticas e redução de movimento.
- **Do:** use a região protegida sem linhas de processos de exemplo ou resultados inventados.

### Don't:
- **Don't:** use âmbar como cor de ação comum; reserve-o para exceções.
- **Don't:** revele conteúdo protegido antes da validação da sessão.
- **Don't:** adicione fotografias, gradientes, superfícies de vidro, serifas display ou ornamentos jurídicos à interface operacional.
- **Don't:** substitua a paleta fria por fundos creme ou use sombras fortes fora do painel de trabalho.
