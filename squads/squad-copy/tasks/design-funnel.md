---
task: design-funnel
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: architecture

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "offer.yaml loaded with product, pricing, geos"
  - condition: "Value Ladder mapped (recommended)"
    source: "map-value-ladder.output.value_ladder"
    blocker: false
    validation: "Value ladder positions defined"
  - condition: "Funnel Hacking data (recommended)"
    source: "funnel-hack.output.analysis"
    blocker: false
    validation: "3 competitor funnels analyzed"

post-conditions:
  - condition: "Funnel type selected with rationale"
    validation: "Funnel type justified via decision framework"
    blocker: true
  - condition: "All pages defined"
    validation: "Each page has: purpose, offer, copy direction, CTA"
    blocker: true
  - condition: "Email triggers mapped"
    validation: "Automation triggers between pages and email sequences"
    blocker: true
  - condition: "Funnel stacking defined"
    validation: "Next funnel in sequence identified"
    blocker: false

Entrada:
  - objective: "Objetivo do funil (aquisicao, monetizacao, ascensao)"
  - offer_data: "Dados da oferta completos"
  - value_ladder_position: "Posicao na value ladder (bait/frontend/middle/backend)"
  - competitors: "Funnel hacking data (opcional)"
Saida:
  - funnel_blueprint: "Blueprint completo do funil"
  - page_specs: "Especificacao de cada pagina"
  - email_automation: "Gatilhos e sequencias de email"
  - funnel_stacking_map: "Conexao com funis adjacentes"
Checklist:
  - "[ ] Definir objetivo do funil (aquisicao/monetizacao/ascensao)"
  - "[ ] Selecionar tipo de funil via decision framework"
  - "[ ] Fazer funnel hacking de 3 concorrentes (ou usar dados existentes)"
  - "[ ] Mapear cada pagina com proposito e oferta"
  - "[ ] Definir email triggers entre etapas"
  - "[ ] Incluir OTOs/upsells na sequencia"
  - "[ ] Definir funnel stacking (proximo funil)"
  - "[ ] Verificar Linchpin connection"
  - "[ ] Adaptar compliance ao geo"
---

# Design Funnel — Arquitetura de Funil Completo (Brunson Method)

## Objetivo

Arquitetar qualquer tipo de funil (VSL, webinar, book, application, quiz) seguindo o decision framework de Russell Brunson, com funnel stacking e integracao na value ladder.

## Decision Framework

### Passo 1: Qual e o objetivo?

| Objetivo | Tipo de Funil |
|----------|---------------|
| Aquisicao de Clientes | Frontend Funnels (Free+Shipping, SLO, Quiz) |
| Monetizar Leads | Middle Funnels (Webinar, VSL, Product Launch) |
| Ascender Clientes | Backend Funnels (Application Funnel) |

### Passo 2: Qual posicao na Value Ladder?

| Nivel | Faixa de Preco | Exemplos |
|-------|----------------|----------|
| Bait | Gratuito | Quiz, Lead Magnet |
| Frontend | $7-$97 | Livro (Free+Shipping), Tripwire, SLO |
| Middle | $97-$997 | Curso, Workshop, Webinar, VSL |
| Backend | $997+ | Coaching, Mastermind, Evento |

### Passo 3: Qual funil ideal?

| Situacao | Funil | Por que |
|----------|-------|---------|
| Infoproduto Blackhat (Nutra) | VSL Funnel | Direto, emocional, alta conversao trafego frio |
| Aquisicao para App/SaaS | Quiz Funnel | Segmenta, qualifica, pre-vende antes do trial |
| Converter Trial para Pago | Onboarding Funnel | Engenharia do Aha Moment |
| Oferta High-Ticket ($2k+) | Perfect Webinar / Application | Autoridade + qualificacao consultiva |
| Construir Lista + Liquidar Ads | Book Funnel (Free+Shipping) | Adquire compradores, LTV paga ads |

## Tipos de Funil

### VSL Funnel
- **Paginas**: VSL Page → Order Form → OTO1 → OTO2 → Thank You
- **Ideal para**: Nutra, infoprodutos, blackhat-dr
- **Copy**: Emocional, hook forte, mecanismo unico, urgencia

### Perfect Webinar Funnel
- **Paginas**: Registration → Thank You → Webinar Room → Replay → Application
- **Ideal para**: Cursos, coaching, SaaS enterprise
- **Copy**: Educacional, 3 segredos, The Stack no final

### Book Funnel (Free+Shipping)
- **Paginas**: Book Page → Shipping Form → OTO1 (Audiobook) → OTO2 (Course) → Thank You
- **Ideal para**: Construcao de lista de compradores, autoridade
- **Copy**: Valor imenso, frete como barreira minima

### Application Funnel
- **Paginas**: VSL/Webinar → Application Form → Calendar Booking → Sales Call
- **Ideal para**: Coaching, mastermind, servicos premium ($2k+)
- **Copy**: Qualificacao, escassez real, high-touch

### Quiz Funnel
- **Paginas**: Hook Page → Perguntas → Opt-in → Results → OTO
- **Ideal para**: SaaS trials, nutra, servicos personalizados
- **Copy**: Conversacional, personalizado, Epiphany Bridge
- **Task dedicada**: Usar `design-quiz-funnel` para detalhamento

## Funnel Stacking

Mapear como o funil se conecta ao proximo:

```
[Quiz Funnel] → [Soap Opera Emails] → [VSL Funnel] → [Upsell Emails] → [Webinar]
[Book Funnel] → [Thank You OTO] → [Email Nurture] → [Webinar] → [Application]
[Free Challenge] → [Tripwire] → [Course] → [Mastermind Application]
```

## Linchpin Integration

Verificar se existe oferta de continuidade (membership/SaaS) no centro:
- Frontend funnels alimentam o Linchpin
- Backend funnels levam do Linchpin para high-ticket
- Receita recorrente do Linchpin financia ads

## Output Format

```yaml
funnel_blueprint:
  meta:
    offer_id: "{offer_id}"
    funnel_type: "{type}"
    objective: "{aquisicao|monetizacao|ascensao}"
    value_ladder_position: "{bait|frontend|middle|backend}"
    price_point: "$..."

  pages:
    - name: "..."
      purpose: "..."
      offer: "..."
      copy_direction: "..."
      cta: "..."
      conversion_target: "...%"

  otos:
    - name: "OTO1"
      offer: "..."
      price: "$..."
      relationship_to_main: "..."

  email_automation:
    - trigger: "..."
      sequence: "..."
      emails: [...]

  funnel_stacking:
    feeds_from: "..."
    feeds_into: "..."
    linchpin_connection: "..."

  metrics:
    - page: "..."
      target_conversion: "...%"
```

## Notas Importantes

- **SEMPRE** comecar pelo objetivo, nao pelo tipo de funil
- **SEMPRE** fazer funnel hacking antes de criar (modelar ESTRUTURA, nao copy)
- **NUNCA** funil isolado — pensar em sistema conectado (funnel stacking)
- **SEMPRE** verificar Linchpin connection (receita recorrente no centro)
- OTOs devem ser complementares, nao substitutos do produto principal
