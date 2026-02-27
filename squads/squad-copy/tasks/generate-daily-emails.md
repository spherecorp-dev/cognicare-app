---
task: generate-daily-emails
responsavel: "@ben-settle"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Email strategy exists"
    source: "design-email-strategy.output or user input"
    blocker: false
    validation: "Voice, personality, and vertical defined"
  - condition: "Offer context available"
    source: "data/offers/{offer_id}/offer.yaml or user input"
    blocker: true
    validation: "Product and audience known"

post-conditions:
  - condition: "Emails follow infotainment principle"
    validation: "Each email entertains AND sells"
    blocker: true
  - condition: "Emails are standalone"
    validation: "No email depends on previous emails"
    blocker: true
  - condition: "Self-review passed"
    validation: "All eliminatory items pass on 10-check self-review"
    blocker: true

Entrada:
  - offer_data: "Contexto da oferta"
  - vertical: "nutra | infoproduto | saas"
  - quantity: "Numero de emails a gerar (default: 7 — uma semana)"
  - email_types: "Tipos especificos desejados (opcional — se vazio, rotacionar os 7)"
  - tone_profile: "Perfil de tom (opcional — se vazio, derivar do vertical)"
Saida:
  - daily_emails: "Pack de emails prontos para envio"
  - subject_lines: "Subject lines para cada email"
Checklist:
  - "[ ] Identificar vertical e adaptar tom"
  - "[ ] Selecionar tipos de email (rotacao dos 7)"
  - "[ ] Gerar emails com infotainment"
  - "[ ] Verificar standalone (cada email funciona sozinho)"
  - "[ ] Verificar tamanho (200-400 palavras)"
  - "[ ] Gerar subject lines com curiosidade"
  - "[ ] Incluir CTA em cada email"
  - "[ ] Verificar plain text (sem HTML/graficos)"
  - "[ ] Rodar self-review (10 checks)"
  - "[ ] Verificar compliance"
---

# Generate Daily Emails — Emails Diarios Infotainment (Ben Settle Method)

## Objetivo

Gerar pack de daily emails usando os 7 tipos de Ben Settle. Cada email e standalone, infotainment (entretem + vende), plain text, 200-400 palavras.

## Os 7 Tipos (Rotacao Recomendada)

| Tipo | Descricao | Quando Usar |
|------|-----------|-------------|
| 1. Against Opinion | Ir contra crenca popular | Engajamento + polarizacao |
| 2. Storytelling | Historia do dia → produto | Versatil — usar mais |
| 3. Blatant Pitch | Venda direta sem disfarce | Oferta forte |
| 4. Open Loop | Curiosidade irresistivel | Fato/insight surpreendente |
| 5. Teaching | Ensinar + conectar ao produto | Demonstrar expertise |
| 6. Social Proof | Case study/depoimento | Prova forte disponivel |
| 7. Repulsion | Repelir errados, atrair certos | Fortalecer tribo |

## Rotacao Semanal Sugerida

| Dia | Tipo | Razao |
|-----|------|-------|
| Seg | Storytelling | Inicio de semana = historia |
| Ter | Teaching | Meio da semana = valor |
| Qua | Against Opinion | Polemica = engajamento |
| Qui | Open Loop | Curiosidade = opens |
| Sex | Blatant Pitch | Final de semana = venda |
| Sab | Social Proof | Relaxado = prova social |
| Dom | Repulsion | Limpeza + tribalismo |

## Formato de Cada Email

```
SUBJECT: [Subject line curiosa — NUNCA revelar conteudo]

[Opening conversacional — como se estivesse no meio de uma conversa]

[Body: historia/analogia + licao + conexao ao produto]
[200-400 palavras, plain text, mix de one-liners e paragrafos]

[CTA direto, sem pedir desculpas]

[Link simples]

[Nome]
[Descricao curta do remetente]
```

## Regras de Ouro

1. **Sell in every email** — nao existe email "so de valor"
2. **Infotainment** — cada email entretem E informa
3. **Standalone** — zero dependencia de emails anteriores
4. **Plain text** — sem graficos, sem HTML
5. **200-400 palavras** — curto o suficiente pra prender atencao
6. **CTA sempre** — ate CTA fraco > zero CTA
7. **Personalidade** — soar como pessoa real, NUNCA como empresa
8. **Nunca se desculpar por vender**

## Processo de Escrita

1. **Observar**: fato, noticia, filme, conversa, experiencia
2. **Conectar**: linkar ao mercado/produto
3. **Escrever**: 4-5 minutos por email
4. **Revisar**: fatos corretos, mensagem clara
5. **Entregar**: email pronto, plain text
