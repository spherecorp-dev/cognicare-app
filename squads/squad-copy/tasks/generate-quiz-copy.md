---
task: generate-quiz-copy
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Quiz funnel blueprint exists"
    source: "design-quiz-funnel.output.quiz_blueprint"
    blocker: true
    validation: "Blueprint with hook_page, questions, profiles, stack"
  - condition: "Compliance rules loaded"
    source: "data/offers/{offer_id}/compliance/rules.md"
    blocker: true
    validation: "Geo-specific compliance rules available"
  - condition: "Creative direction loaded"
    source: "config/creative-direction.md"
    blocker: false
    validation: "Creative profile and tone guidelines"

post-conditions:
  - condition: "All quiz stages have copy"
    validation: "hook_page + questions + opt_in + results_page copy complete"
    blocker: true
  - condition: "Copy follows Brunson voice"
    validation: "Conversational, short paragraphs, ellipsis, storytelling"
    blocker: true
  - condition: "Compliance verified"
    validation: "No prohibited claims, disclaimers present"
    blocker: true
  - condition: "Geo adaptation applied"
    validation: "Tone matches target geo (FR/ES/EN)"
    blocker: true

Entrada:
  - quiz_blueprint: "Blueprint do quiz funnel completo"
  - offer_data: "Dados da oferta"
  - geo: "Geo alvo"
  - creative_profile: "Perfil criativo (blackhat-dr, low-ticket, etc)"
Saida:
  - quiz_copy: "Copy completa para todas as etapas do quiz"
  - email_copy: "Copy dos 5 emails da Soap Opera Sequence"
Checklist:
  - "[ ] Gerar copy da hook page (headline, subheadline, CTA)"
  - "[ ] Gerar copy de cada pergunta (texto + opcoes)"
  - "[ ] Gerar copy do opt-in gate"
  - "[ ] Gerar copy de cada resultado/perfil (com Epiphany Bridge)"
  - "[ ] Gerar The Stack para cada perfil"
  - "[ ] Gerar Soap Opera Sequence (5 emails)"
  - "[ ] Verificar compliance por geo"
  - "[ ] Self-review completo"
---

# Generate Quiz Copy — Geracao de Copy para Quiz Funnel (Brunson Method)

## Objetivo

Gerar TODA a copy de um quiz funnel: hook page, perguntas, opt-in gate, paginas de resultado (com Epiphany Bridge, New Opportunity e The Stack), e a Soap Opera Sequence de 5 emails.

## Pre-Requisito

Esta task requer o blueprint do `design-quiz-funnel` como input. NAO gerar copy sem blueprint aprovado.

## Tom e Estilo

Seguir rigorosamente as writing rules do @russell-brunson:

- **Tom**: Energetico, conspiratorio, storyteller apaixonado, empatia profunda
- **Estilo**: Paragrafos de UMA frase. Reticencias. Negrito/italico. Linguagem simples.
- **Voz Brunson**: Conspiratorio, empatico, energetico, vulneravel, celebratorio
- **Proibido**: Linguagem corporativa, paragrafos longos, instrucoes sem storytelling, tom neutro

### Adaptacao por Geo

| Geo | Adaptacao |
|-----|-----------|
| FR | Elegante, sofisticado, "bilan personnalise", logica > hype |
| ES | Caloroso, pessoal, intimo, comunidade, emocao forte |
| EN | Direto, resultado rapido, numeros, action steps, pode ser agressivo |

## Processo de Geracao

### 1. Hook Page Copy

```
HEADLINE: [Focada no resultado, nao no quiz]
SUBHEADLINE: [Velocidade + personalizacao + social proof]
CTA BUTTON: [Acao + identidade, nao "comece"]
SOCIAL PROOF: [Numero + resultado]
```

### 2. Question Copy

Para cada pergunta:
```
TEXTO: [Conversacional, como amigo perguntando]
OPCOES: [3-4 opcoes visuais, claras, sem jargao]
FEEDBACK: [Micro-feedback pos-resposta]
PROGRESS: [Indicador de progresso]
```

### 3. Opt-in Gate Copy

```
HEADLINE: [Promessa do resultado personalizado]
SUBHEADLINE: [Preview sem revelar]
FIELD LABEL: [Informal, nao "Email:"]
CTA: [Receber + resultado]
TRUST: [Privacidade]
```

### 4. Results Page Copy (por perfil)

```
CELEBRACAO: [Parabens + nome do perfil]
IDENTIDADE: [O que significa ser esse perfil (empoderado)]
EPIPHANY BRIDGE: [Historia: por que tudo que tentou falhou + causa real]
NEW OPPORTUNITY: [O novo veiculo que muda tudo]
THE STACK:
  - Componente principal: [nome] (valor $X)
  - Bonus #1 - Acelerador: [nome] (valor $X)
  - Bonus #2 - Ponte de conhecimento: [nome] (valor $X)
  - Bonus #3 - Comunidade/suporte: [nome] (valor $X)
  - TOTAL: $XXXX de valor
  - HOJE: $XX (desconto por perfil)
  - GARANTIA: [30/60/90 dias]
CTA: [Acao + urgencia + bonus exclusivo]
```

### 5. Soap Opera Sequence (5 emails)

Gerar copy completa para cada email:

| Email | Subject | Preview | Body Outline |
|-------|---------|---------|--------------|
| 1 - O Resultado | Personalizado por perfil | Teaser | Resultado + AC intro + hook email 2 |
| 2 - A Backstory | Loop do email 1 | Vulnerabilidade | Historia do AC + hook email 3 |
| 3 - A Epifania | Loop do email 2 | Revelacao | Aha moment + oferta sutil + hook email 4 |
| 4 - Beneficios Ocultos | Surpresa | Expansao | Beneficios extras + social proof + hook email 5 |
| 5 - A Urgencia | Deadline | FOMO real | Stack completo + garantia + CTA final |

## Output Format

Entregar como documento Markdown organizado por secao:

```markdown
# Quiz Copy — [Offer ID] — [Geo]

## Hook Page
...

## Perguntas
### Pergunta 1
...

## Opt-in Gate
...

## Resultado: [Perfil A]
...

## Resultado: [Perfil B]
...

## Soap Opera Sequence
### Email 1: O Resultado
Subject: ...
Body:
...
```

## Self-Review Obrigatorio

Antes de entregar, rodar o self-review do @russell-brunson (15 items).
Items eliminatorios DEVEM todos passar.
