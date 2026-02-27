---
task: funnel-hack
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: intelligence

pre-conditions:
  - condition: "Competitors identified"
    source: "User input or market research"
    blocker: true
    validation: "At least 1 competitor URL/name provided"
  - condition: "Dream customer defined"
    source: "Offer data or user input"
    blocker: false
    validation: "Target audience known for relevance filtering"

post-conditions:
  - condition: "At least 3 competitors analyzed"
    validation: "3 funnel breakdowns with structure, copy, offers"
    blocker: true
  - condition: "Pattern analysis complete"
    validation: "Common patterns identified across competitors"
    blocker: true
  - condition: "Actionable recommendations"
    validation: "Specific recommendations for our funnel based on analysis"
    blocker: true

Entrada:
  - competitors: "Lista de concorrentes (URLs, nomes, nichos)"
  - dream_customer: "Perfil do publico-alvo compartilhado"
  - our_offer: "Nossa oferta para comparacao (opcional)"
Saida:
  - analysis: "Analise de 3+ funnels concorrentes"
  - patterns: "Padroes comuns identificados"
  - recommendations: "Recomendacoes acionaveis"
Checklist:
  - "[ ] Identificar 3 concorrentes que vendem para o MESMO dream customer"
  - "[ ] Documentar estrutura de paginas de cada funil"
  - "[ ] Documentar hooks e headlines principais"
  - "[ ] Documentar ofertas e The Stack de cada um"
  - "[ ] Documentar email sequences (se possivel)"
  - "[ ] Identificar padroes comuns entre os 3"
  - "[ ] Gerar recomendacoes para nosso funil"
  - "[ ] Entregar analise estruturada"
---

# Funnel Hack — Analise de Funnels Concorrentes (Brunson Method)

## Objetivo

Analisar 3+ funnels concorrentes seguindo o processo de Funnel Hacking de Russell Brunson: documentar estrutura, copy, ofertas e email sequences para modelar a ESTRUTURA (nao a copy) no nosso proprio funil.

## Contexto

"Funnel Hacking NAO e copiar. E ENTENDER o que funciona e POR QUE funciona."
— Russell Brunson

O objetivo e modelar a ESTRUTURA que ja foi validada pelo mercado. A copy, o mecanismo e a voz serao proprios. Igual a modelagem do @stefan-georgi: desconstruir e reconstruir.

## Processo

### Step 1: Identificar Concorrentes

Critérios para selecao:
1. Vendem para o MESMO dream customer
2. Estao ativos (ads rodando = gastando dinheiro = funcionando)
3. Tem funil com multiplas paginas (nao so uma LP)
4. Idealmente 3 niveis de referencia: lider de mercado, competidor direto, nicho adjacente

### Step 2: Passar pelo Funil como Lead

Para CADA concorrente:
1. Entrar como lead real (usar email dedicado)
2. Passar por CADA pagina do funil
3. Capturar screenshots de cada etapa
4. Se possivel, comprar o produto frontend (para ver OTOs e emails)
5. Documentar TODOS os emails recebidos nos 7 dias seguintes

### Step 3: Documentar Estrutura

Para cada funil:

```yaml
competitor_funnel:
  name: "..."
  url: "..."
  niche: "..."

  pages:
    - page: "Landing/Hook Page"
      headline: "..."
      subheadline: "..."
      cta: "..."
      elements: ["video?", "social proof?", "urgencia?"]

    - page: "Order Form"
      offer: "..."
      price: "$..."
      bump: "..."

    - page: "OTO 1"
      offer: "..."
      price: "$..."
      relationship: "Como complementa o main?"

    - page: "OTO 2"
      offer: "..."
      price: "$..."

    - page: "Thank You"
      next_step: "..."

  email_sequence:
    - day: 0
      subject: "..."
      type: "delivery|story|pitch|urgency"

  hooks:
    headline: "..."
    hook_type: "curiosity|fear|result|controversy"
    why_it_works: "..."

  stack:
    components: [...]
    total_value: "$..."
    price: "$..."
    guarantee: "..."

  strengths: ["..."]
  weaknesses: ["..."]
```

### Step 4: Analise de Padroes

Cruzar os 3+ funnels e identificar:

| Padrao | Concorrente 1 | Concorrente 2 | Concorrente 3 | Frequencia |
|--------|--------------|--------------|--------------|------------|
| Tipo de hook | ? | ? | ? | - |
| Numero de OTOs | ? | ? | ? | - |
| Tipo de garantia | ? | ? | ? | - |
| Email sequence | ? | ? | ? | - |
| Preco frontend | ? | ? | ? | - |

### Step 5: Recomendacoes

Gerar recomendacoes acionaveis:

1. **Estrutura**: Qual estrutura de funil usar (baseado no que funciona)
2. **Hooks**: Quais tipos de hook dominam o mercado (modelar)
3. **Offers**: Como posicionar nossa oferta (diferenciacao)
4. **Stack**: Como construir nosso Stack (empilhar mais/diferente)
5. **Gaps**: O que NENHUM concorrente faz (oportunidade)
6. **Email**: Patterns de email que funcionam (timing, tipos)

## Output Format

```yaml
funnel_hack_report:
  meta:
    date: "..."
    competitors_analyzed: 3
    dream_customer: "..."

  competitors:
    - name: "..."
      summary: "..."
      pages: [...]
      hooks: [...]
      stack: {...}
      emails: [...]
      strengths: [...]
      weaknesses: [...]

  pattern_analysis:
    common_hooks: [...]
    common_structure: "..."
    average_price_point: "$..."
    guarantee_patterns: [...]
    email_patterns: [...]

  recommendations:
    structure: "..."
    hooks: "..."
    differentiation: "..."
    stack: "..."
    gaps_opportunities: [...]
    email_strategy: "..."

  funnel_stacking_inspiration:
    best_practice: "..."
    recommended_sequence: "..."
```

## Notas Importantes

- **NUNCA** copiar copy — modelar ESTRUTURA
- **SEMPRE** analisar pelo menos 3 concorrentes
- O melhor funnel hack inclui comprar o produto frontend
- Documentar emails e CRITICO — muita conversao acontece la
- Gaps = oportunidade de diferenciacao (o que ninguem faz)
