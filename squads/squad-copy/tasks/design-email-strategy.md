---
task: design-email-strategy
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: strategy

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product, audience, and value proposition defined"
  - condition: "Vertical identified"
    source: "User input"
    blocker: true
    validation: "nutra | infoproduto | saas"

post-conditions:
  - condition: "Email strategy document complete"
    validation: "Frequency, types, voice, goals, and sequences defined"
    blocker: true
  - condition: "Terminator approach mapped"
    validation: "Rifle (sequences) and Shotgun (daily) plans defined"
    blocker: true

Entrada:
  - offer_data: "Dados da oferta (produto, publico, value prop)"
  - vertical: "nutra | infoproduto | saas"
  - current_list_size: "Tamanho atual da lista (opcional)"
  - current_frequency: "Frequencia atual de envio (opcional)"
Saida:
  - email_strategy: "Documento completo de estrategia de email"
  - sequence_map: "Mapa de sequences necessarias"
  - daily_plan: "Plano de daily emails (tipos, temas, rotacao)"
Checklist:
  - "[ ] Identificar vertical e adaptar tom"
  - "[ ] Definir frequencia (daily recomendado)"
  - "[ ] Mapear sequences necessarias (Rifle)"
  - "[ ] Planejar daily emails (Shotgun)"
  - "[ ] Definir voz/personalidade para o remetente"
  - "[ ] Definir opt-in transparency (frequencia upfront)"
  - "[ ] Mapear Terminator Approach (Rifle + Shotgun)"
  - "[ ] Verificar compliance do vertical"
---

# Design Email Strategy — Plano Completo de Email Marketing (Ben Settle Method)

## Objetivo

Criar estrategia completa de email marketing usando o Terminator Approach: Rifle (sequences automatizadas ao estilo Chaperon) + Shotgun (daily emails ao estilo Settle).

## Elicitacao

Antes de planejar, coletar:

1. **Vertical**: nutra, infoproduto ou SaaS?
2. **Produto principal**: O que estamos vendendo?
3. **Publico**: Quem e a starving crowd?
4. **Lista atual**: Tamanho, frequencia atual, engagement?
5. **Objetivos**: Aquisicao, nurture, launch, retencao?
6. **Tom desejado**: Controverso, profissional-pessoal, educativo?

## Output: Email Strategy Document

```markdown
# Email Strategy — [Offer ID] — [Vertical]

## 1. Voice & Personality
- Tom: [descricao]
- Personalidade do remetente: [perfil]
- Inimigo comum: [goo-roos do nicho]
- Tribo: [identidade do publico]

## 2. Frequency
- Daily emails: [sim/nao, quantos por semana]
- Opt-in message: [transparencia sobre frequencia]

## 3. RIFLE — Sequences Automatizadas
### Onboarding (Dia 1-7)
- Email 1: [welcome + small win]
- Email 2: [origin story]
- ...

### Launch Sequence (quando aplicavel)
- [Pre-launch, launch, post-launch emails]

### SOS — Soap Opera Sequence (quando aplicavel)
- [5 emails com story arc]

### Cart Abandonment (quando aplicavel)
- [3 emails de recuperacao]

## 4. SHOTGUN — Daily Emails
### Rotacao dos 7 Tipos
- Semana 1: [tipo por dia]
- Temas recorrentes: [lista]
- Repulsion targets: [inimigos]

## 5. Subject Line Strategy
- Patterns principais: [lista]
- Reciclagem: [plano]

## 6. Compliance
- [regras do vertical]
```

## Adaptacao por Vertical

| Aspecto | Nutra | Infoproduto | SaaS |
|---------|-------|-------------|------|
| **Tom** | Amigo de saude | Mentor | Amigo tech-savvy |
| **Repulsion** | Big pharma | Gurus, preguicosos | Ferramentas complicadas |
| **Rifle** | Origin story do produto | Story arc do metodo | Onboarding progressivo |
| **Shotgun** | Historias + beneficio | Insights + polemicas | Tips + hacks |
| **Compliance** | Rigoroso | Moderado | Flexivel |
