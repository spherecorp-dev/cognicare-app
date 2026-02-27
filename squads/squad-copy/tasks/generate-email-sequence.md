---
task: generate-email-sequence
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml or user input"
    blocker: true
    validation: "Product, audience, value proposition defined"
  - condition: "Sequence type defined"
    source: "User input"
    blocker: true
    validation: "Valid type: onboarding | sos | launch | nurture | cart_abandonment | re_engagement | upsell"

post-conditions:
  - condition: "Sequence complete"
    validation: "All emails in sequence written with subject lines and CTAs"
    blocker: true
  - condition: "Rifle approach applied"
    validation: "Sequences use Chaperon-style story arc where appropriate"
    blocker: true

Entrada:
  - offer_data: "Contexto da oferta"
  - vertical: "nutra | infoproduto | saas"
  - sequence_type: "onboarding | sos | launch | nurture | cart_abandonment | re_engagement | upsell"
  - num_emails: "Numero de emails na sequence (default varia por tipo)"
  - existing_sequences: "Sequences existentes para nao duplicar (opcional)"
Saida:
  - email_sequence: "Sequence completa com todos os emails"
  - timing_map: "Mapa de timing (dia/hora de cada email)"
Checklist:
  - "[ ] Identificar tipo de sequence"
  - "[ ] Aplicar Rifle approach (Chaperon) para story arc"
  - "[ ] Gerar todos os emails da sequence"
  - "[ ] Definir timing entre emails"
  - "[ ] Verificar infotainment em cada email"
  - "[ ] Incluir CTA em cada email"
  - "[ ] Verificar compliance"
  - "[ ] Rodar self-review"
---

# Generate Email Sequence — Sequences Automatizadas (Terminator Approach: Rifle)

## Objetivo

Gerar sequences automatizadas usando o Rifle approach (Chaperon-style: planejado, episodico, story arc coeso) com infotainment Settle em cada email individual.

## Tipos de Sequence

### 1. Onboarding (Dia 1-7)
**Objetivo**: Converter subscriber em comprador + criar habito de abrir emails.

| Email | Dia | Conteudo | CTA |
|-------|-----|----------|-----|
| 1 | Dia 0 | Welcome + small win imediato | Link principal |
| 2 | Dia 1 | Origin story (como o produto surgiu) | Oferta |
| 3 | Dia 2 | Problema #1 + como resolver | Link |
| 4 | Dia 3 | Social proof / case study | Oferta |
| 5 | Dia 4 | Mito vs realidade (Against Opinion) | Link |
| 6 | Dia 5 | Fascination bullets | Oferta |
| 7 | Dia 7 | Recapitulacao + urgencia | Oferta final |

### 2. SOS — Soap Opera Sequence (5 emails)
**Objetivo**: Indoctrinar o lead com historia epica que culmina na oferta.

| Email | Dia | Arco da Historia |
|-------|-----|-----------------|
| 1 | Dia 0 | **Drama**: Situacao de crise/problema |
| 2 | Dia 1 | **Backstory**: Como chegou nessa situacao |
| 3 | Dia 2 | **Epifania**: A descoberta que mudou tudo |
| 4 | Dia 3 | **Beneficios Ocultos**: O que mais aconteceu alem do esperado |
| 5 | Dia 4 | **Urgencia**: Por que agir AGORA (com CTA forte) |

### 3. Launch Sequence (7-14 emails)
**Objetivo**: Gerar vendas concentradas num periodo curto.

| Fase | Emails | Conteudo |
|------|--------|----------|
| Pre-Launch (3) | Dia -3 a -1 | Tease, curiosidade, countdown |
| Launch (5) | Dia 0-4 | Abertura, proof, FAQ, scarcity, deadline |
| Post-Launch (2) | Dia 5-6 | Last chance, resultados de quem comprou |

### 4. Nurture (Ongoing)
**Objetivo**: Manter lista quente entre lancamentos.

- Funciona como daily emails (Shotgun approach)
- Rotacao dos 7 tipos
- Venda suave ou CTA para conteudo gratuito
- Transicao para Shotgun apos sequences Rifle

### 5. Cart Abandonment (3 emails)
**Objetivo**: Recuperar vendas perdidas.

| Email | Timing | Conteudo |
|-------|--------|----------|
| 1 | 1 hora | Lembrete simples + link |
| 2 | 24 horas | Beneficio principal + social proof |
| 3 | 48 horas | Urgencia + bonus extra ou desconto |

### 6. Re-Engagement (3 emails)
**Objetivo**: Reativar subscribers inativos.

| Email | Conteudo |
|-------|----------|
| 1 | "I noticed..." — tom pessoal, curiosidade |
| 2 | Melhor conteudo/oferta — provar valor |
| 3 | Ultimato — "Should I remove you?" |

### 7. Upsell Sequence (3-5 emails)
**Objetivo**: Vender proximo nivel da value ladder.

| Email | Conteudo |
|-------|----------|
| 1 | Celebrar compra + plantar semente do proximo |
| 2 | Case study de quem fez upgrade |
| 3 | Fascinations do proximo nivel |
| 4 | Blatant sales pitch |
| 5 | Deadline/scarcity |

## Regra: Rifle + Settle

Mesmo em sequences planejadas (Rifle/Chaperon), cada email INDIVIDUAL deve seguir os principios Settle:
- Infotainment (entreter + informar)
- Personalidade forte
- Plain text
- CTA em todo email
- Nunca boring

## Adaptacao por Vertical

| Vertical | Onboarding | Launch | Nurture |
|----------|-----------|--------|---------|
| **Nutra** | Origin story do produto + beneficio | Estoque/promo | Historias de saude |
| **Info** | Small win + expertise demo | PLF-style | Insights + polemicas |
| **SaaS** | Feature progressiva + quick wins | Trial → paid | Tips + hacks |
