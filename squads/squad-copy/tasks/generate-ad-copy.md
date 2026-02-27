---
task: generate-ad-copy
responsavel: "@stefan-georgi"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: 3-production

pre-conditions:
  - condition: "Scripts approved"
    source: "review-creative.output.approved"
    blocker: true
    validation: "Approved scripts array from @copy-chief"
  - condition: "Platform specified"
    source: "trigger.platforms OR decide-format.output"
    blocker: true
    validation: "Target platform (Meta, TikTok) for format rules"
  - condition: "Offer context available"
    source: "fetch-offer-data.output.offer_context"
    blocker: true
    validation: "Geo and compliance rules for copy adaptation"

post-conditions:
  - condition: "Headlines generated (3-5 per script)"
    validation: "headlines array with 3-5 options, max 40 chars each"
    blocker: true
  - condition: "Descriptions generated (2-3 per script)"
    validation: "descriptions array with 2-3 options, max 125 chars each"
    blocker: true
  - condition: "Captions/Primary texts generated"
    validation: "Platform-appropriate copy (TikTok captions or Meta primary text)"
    blocker: true
  - condition: "Geo-adapted copy"
    validation: "Copy culturally adapted to target geo"
    blocker: true
  - condition: "Compliance validated"
    validation: "No prohibited claims per platform/geo rules"
    blocker: true

Entrada:
  - scripts: "Scripts aprovados pelo @copy-chief"
  - plataforma: "Meta | TikTok"
Saida:
  - headlines: "3-5 opcoes de headline por script"
  - descriptions: "2-3 opcoes de description por script"
  - captions: "1-2 opcoes de caption por script"
Checklist:
  - "[ ] Receber scripts aprovados"
  - "[ ] Confirmar plataforma (elicit). Geo vem da oferta."
  - "[ ] Gerar headlines (curtas, impactantes, max 40 chars)"
  - "[ ] Gerar descriptions (complementar headline, max 125 chars)"
  - "[ ] Gerar captions (texto do post, tom conversacional)"
  - "[ ] Adaptar formato e tom por plataforma"
  - "[ ] Entregar ad copy pronto pra subir"
---

# Generate Ad Copy — Headlines, Descriptions e Captions

## Objetivo

Gerar textos de anuncio (headlines, descriptions, captions) para scripts aprovados, otimizados por plataforma. Geo vem da oferta.

## Contexto

Ad copy e a "embalagem" do criativo na plataforma. Um video excelente com headline fraca perde CTR. Cada plataforma tem limites e boas praticas diferentes.

## Processo

### 1. Inputs

- Scripts ja aprovados pelo @copy-chief (APPROVED)
- Plataforma alvo (Meta ou TikTok)
- Geo e compliance vem da oferta (offer_data)

### 2. Regras por Plataforma

**Meta (Facebook/Instagram):**
- Headline: max 40 chars, impacto imediato
- Description: max 125 chars, complementar
- Primary text: ate 3 linhas visiveis (125 chars), restante escondido
- Testar 3-5 combinacoes de headline + description

**TikTok:**
- Caption: max 150 chars (ideal < 100)
- Tom mais casual e nativo
- Hashtags estrategicas (2-3 max)
- Sem headline/description separados

### 3. Adaptacao por Geo (da oferta)

> Geo vem do offer_data. Usar creative-direction.md para tom por geo.

- FR: tom mais sofisticado, evitar emojis excessivos
- ES: emocional, pode usar emojis, tom proximo
- EN: direto, urgente, numeros quando possivel

### 4. Formato de Entrega

```markdown
### Ad Copy — Script: {nome_do_script}
**Plataforma:** {Meta|TikTok}
**Geo:** {geo da oferta}

**Headlines:**
1. {headline_1}
2. {headline_2}
3. {headline_3}

**Descriptions:**
1. {description_1}
2. {description_2}

**Primary Text / Caption:**
{texto_completo}
```

### 5. Quantidade

- 3-5 headlines por script
- 2-3 descriptions por script
- 1-2 captions/primary texts por script

## Proximo Passo

Ad copy entregue junto com o criativo para handoff ao gestor de trafego.
