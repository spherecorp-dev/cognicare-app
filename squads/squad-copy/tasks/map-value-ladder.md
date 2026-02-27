---
task: map-value-ladder
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: strategy

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product, pricing, target audience loaded"
  - condition: "Business model understood"
    source: "User input or offer context"
    blocker: true
    validation: "Products/services portfolio and pricing tiers known"

post-conditions:
  - condition: "Value ladder with 3+ levels defined"
    validation: "At least bait, frontend, and middle levels mapped"
    blocker: true
  - condition: "Quiz positioned as bait"
    validation: "Quiz funnel mapped as entry point (bait level)"
    blocker: true
  - condition: "Funnel stacking sequence defined"
    validation: "Funnel connection between each ladder level"
    blocker: true
  - condition: "Linchpin identified"
    validation: "Continuity offer identified or recommended"
    blocker: false

Entrada:
  - offer_data: "Dados da oferta e portfolio de produtos"
  - pricing: "Faixas de preco de cada produto/servico"
  - target_audience: "Dream customer profile"
  - existing_funnels: "Funis que ja existem (opcional)"
Saida:
  - value_ladder: "Mapa completo da value ladder"
  - funnel_stacking: "Sequencia de funis conectados"
  - linchpin: "Oferta de continuidade central"
Checklist:
  - "[ ] Mapear todos os produtos/servicos existentes"
  - "[ ] Classificar por nivel da value ladder (bait/frontend/middle/backend)"
  - "[ ] Posicionar quiz como bait entry"
  - "[ ] Identificar gaps na ladder (niveis vazios)"
  - "[ ] Recomendar Linchpin (oferta de continuidade)"
  - "[ ] Definir funnel stacking entre niveis"
  - "[ ] Mapear ascensao natural do cliente"
  - "[ ] Calcular LTV projetado da ladder completa"
---

# Map Value Ladder — Mapeamento da Escada de Valor (Brunson Method)

## Objetivo

Mapear a value ladder completa da oferta, posicionando o quiz funnel como porta de entrada (bait), identificando o Linchpin (oferta de continuidade), e definindo o funnel stacking que conecta cada nivel.

## Contexto

A Value Ladder e a estrategia de negocio de Russell Brunson. A ideia: cada degrau da escada resolve um problema, entrega valor e prepara o cliente para o proximo degrau. O quiz e SEMPRE o primeiro degrau (bait).

### A Estrutura da Value Ladder

```
                    ┌─────────────────┐
                    │   BACKEND       │ $997+
                    │ Coaching/Master │ (High-touch, high-value)
                    ├─────────────────┤
                    │   MIDDLE        │ $97-$997
                    │ Curso/Webinar   │ (DIY com suporte)
                ┌───┤                 │
                │   ├─────────────────┤
   LINCHPIN ────┤   │   FRONTEND     │ $7-$97
  (Continuidade)│   │ Livro/Tripwire │ (Primeira compra)
                └───┤                 │
                    ├─────────────────┤
                    │   BAIT          │ Gratis
                    │ Quiz Funnel     │ (Qualificacao + entrada)
                    └─────────────────┘
```

## Processo

### Step 1: Inventario de Produtos

Listar TODOS os produtos/servicos existentes com:
- Nome
- Preco
- Formato (digital, fisico, servico, recorrente)
- Problema que resolve
- Resultado que entrega

### Step 2: Classificacao por Nivel

| Nivel | Faixa | Formato Tipico | Proposito |
|-------|-------|----------------|-----------|
| Bait | Gratis | Quiz, Lead Magnet, Checklist | Capturar + qualificar |
| Frontend | $7-$97 | Livro, Tripwire, Mini-curso | Converter em comprador |
| Middle | $97-$997 | Curso, Workshop, Software | Transformacao principal |
| Backend | $997+ | Coaching, Mastermind, Done-for-you | Transformacao premium |

### Step 3: Identificar o Linchpin

O Linchpin e a oferta de continuidade que fica no CENTRO:
- Membership / Assinatura / SaaS
- Receita recorrente que financia TODOS os ads
- Todo frontend alimenta o Linchpin
- Do Linchpin saem upsells para backend

Se nao existe Linchpin → RECOMENDAR criacao de um.

### Step 4: Gap Analysis

Identificar niveis vazios na ladder:
- Sem bait? → Quiz funnel urgente
- Sem frontend? → Book funnel ou tripwire
- Sem Linchpin? → Criar oferta de continuidade
- Sem backend? → Application funnel ou evento

### Step 5: Funnel Stacking

Definir a sequencia de funis que conecta os niveis:

```
[Quiz] → [SOS Emails] → [VSL/Book] → [Linchpin Offer] → [Webinar] → [Application]
```

Cada transicao precisa de:
- Gatilho (email, thank you page, retargeting)
- Tempo ideal entre funis
- Condicao de qualificacao para proximo nivel

### Step 6: LTV Projection

Calcular LTV projetado assumindo conversao por nivel:

| Nivel | Preco | Conv. % | Revenue/Lead |
|-------|-------|---------|--------------|
| Bait (Quiz) | $0 | 100% | $0 |
| Frontend | $47 | 10% | $4.70 |
| Middle (Linchpin) | $97/mo x 6 | 5% | $29.10 |
| Backend | $2,000 | 1% | $20.00 |
| **Total LTV** | | | **$53.80** |

## Output Format

```yaml
value_ladder:
  meta:
    offer_id: "{offer_id}"
    total_levels: 4
    projected_ltv: "$..."

  levels:
    - level: "bait"
      product: "Quiz Funnel — [Nome]"
      price: "Free"
      purpose: "Qualificar + capturar email"
      funnel: "Quiz Funnel"

    - level: "frontend"
      product: "[Nome]"
      price: "$..."
      purpose: "Primeira compra + liquidar ad spend"
      funnel: "[Tipo]"

    - level: "linchpin"
      product: "[Nome] (continuidade)"
      price: "$.../mo"
      purpose: "Receita recorrente central"
      funnel: "[Tipo]"

    - level: "middle"
      product: "[Nome]"
      price: "$..."
      purpose: "Transformacao principal"
      funnel: "[Tipo]"

    - level: "backend"
      product: "[Nome]"
      price: "$..."
      purpose: "High-touch premium"
      funnel: "Application Funnel"

  gaps:
    - level: "..."
      recommendation: "..."

  funnel_stacking:
    sequence:
      - from: "bait"
        to: "frontend"
        trigger: "Soap Opera Sequence email 5"
        timing: "5 dias pos-quiz"

  ltv_projection:
    per_lead: "$..."
    breakeven_cpa: "$..."
```
