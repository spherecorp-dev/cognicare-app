---
task: generate-vsl-script
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: production

pre-conditions:
  - condition: "VSL outline exists"
    source: "generate-vsl-outline.output"
    blocker: true
    validation: "Fact Sheet, Benefit List, Grabbers, AIDA outline, Proof inventory"
  - condition: "Compliance rules loaded"
    source: "data/offers/{offer_id}/compliance/rules.md"
    blocker: true
    validation: "Geo-specific compliance rules"

post-conditions:
  - condition: "Complete script with timing markers"
    validation: "Every section has [TIMESTAMP] markers"
    blocker: true
  - condition: "Greased slide verified"
    validation: "No dead spots or exit points"
    blocker: true
  - condition: "Self-review passed"
    validation: "All eliminatory items pass on Halbert 13-point checklist"
    blocker: true

Entrada:
  - vsl_outline: "Outline completo do generate-vsl-outline"
  - geo: "Geo alvo"
  - format: "standard | mini | hybrid | advertorial"
Saida:
  - vsl_script: "Script completo word-by-word com timing markers"
Checklist:
  - "[ ] Escrever Hook/Grabber (top 3 do outline)"
  - "[ ] Escrever Story block (Epiphany Bridge)"
  - "[ ] Escrever Agitate + Educate (dor + mecanismo)"
  - "[ ] Escrever Proof Stacking (3+ tipos)"
  - "[ ] Escrever Offer com The Stack e Reason Why"
  - "[ ] Escrever Close com CTA 3x + P.S."
  - "[ ] Inserir bucket brigades a cada 30-60s"
  - "[ ] Inserir disclaimers (inicio + fim)"
  - "[ ] Adaptar tom ao geo"
  - "[ ] Rodar self-review (13 perguntas Halbert)"
---

# Generate VSL Script — Geracao de Script Completo (Halbert+Georgi)

## Objetivo

Gerar VSL script completo word-by-word com timing markers, bucket brigades e compliance. Requer o outline do `generate-vsl-outline` como input.

## Pre-Requisito

NUNCA gerar script sem o outline aprovado (Fact Sheet, Benefit List, Grabbers, Proof Inventory, AIDA outline).

## Tom e Estilo

Seguir writing rules Halbert+Georgi:
- Nivel 5a-6a serie
- Paragrafos de 1 linha
- Elipses para ritmo (Georgi)
- Bucket brigades a cada 30-60s
- Especificidade brutal (numeros, nomes, locais)
- Venda o buraco, nao a furadeira

## Script Structure

O script e entregue como documento Markdown com timing markers:

```markdown
# VSL Script — [Offer ID] — [Geo] — [Format]

## [00:00 - 00:30] HOOK / GRABBER

[Script word-by-word do grabber...]

---

## [00:30 - 05:00] STORY / EPIPHANY BRIDGE

[Script da historia vulneravel...]

Mas espere... porque aqui e que fica interessante...

---

## [05:00 - 12:00] AGITATE + MECHANISM REVEAL

[Script de agitacao + revelacao do mecanismo...]

---

## [12:00 - 18:00] PROOF STACKING

[Stack de provas...]

---

## [18:00 - 22:00] THE OFFER + STACK

[Apresentacao da oferta com Stack...]

---

## [22:00 - 25:00] CLOSE + CTA + P.S.

[Fechamento com urgencia, CTA 3x e P.S.]

---

**DISCLAIMER:** [Disclaimer de compliance]
```

## Self-Review Obrigatorio

Rodar as 13 perguntas do @gary-halbert antes de entregar.
Items eliminatorios DEVEM todos passar.
