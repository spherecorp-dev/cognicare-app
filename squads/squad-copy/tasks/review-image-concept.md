---
task: review-image-concept
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review

pre-conditions:
  - condition: "Image concepts generated"
    source: "generate-image-concepts.output.image_concepts"
    blocker: true
    validation: "image_concepts array with visual + copy"
  - condition: "Offer context available"
    source: "fetch-offer-data.output.offer_context"
    blocker: true
    validation: "offer.yaml with compliance rules"
  - condition: "Platform specs defined"
    source: "decide-format.output OR generate-image-concepts.input.platforms"
    blocker: true
    validation: "Target platforms for compliance check"

post-conditions:
  - condition: "All concepts reviewed with verdict"
    validation: "Each concept has verdict: APPROVED|REVISION_NEEDED|REJECTED"
    blocker: true
  - condition: "Feedback provided for REVISION_NEEDED"
    validation: "Specific instructions for revision"
    blocker: true
  - condition: "At least 1 concept APPROVED or feedback given"
    validation: "Pipeline can proceed or knows how to fix"
    blocker: true
  - condition: "Compliance validated"
    validation: "No prohibited claims, geo-appropriate tone"
    blocker: true
  - condition: "Max 2 review rounds tracked"
    validation: "review_rounds counter to prevent infinite loop"
    blocker: false

Entrada:
  - image_concepts: "Conceitos visuais + ad copy do @stefan-georgi"
  - offer_context: "Dados da oferta (creative_profile, mecanismo, publico, geo, compliance)"
  - platforms: "Plataformas target"
Saida:
  - verdict: "APPROVED | REVISION_NEEDED | REJECTED (por conceito)"
  - feedback: "Feedback detalhado por conceito e variacao"
Checklist:
  - "[ ] Receber conceitos do @stefan-georgi"
  - "[ ] Carregar creative_profile da oferta"
  - "[ ] Carregar compliance da oferta (offer_data.compliance)"
  - "[ ] Avaliar criterios eliminatorios (imagem)"
  - "[ ] Avaliar criterios de qualidade (imagem)"
  - "[ ] Avaliar ad copy (5 formatos de escrita)"
  - "[ ] Emitir veredicto por conceito"
  - "[ ] Se REVISION_NEEDED: detalhar O QUE mudar"
---

# Review Image Concept — Revisao de Conceito Visual + Ad Copy

## Objetivo

Revisar conceitos visuais + ad copy ANTES de gerar a imagem. Filtrar conceitos que nao tem potencial de winner antes de gastar recursos com geracao de imagem.

## Por que agente (nao task pura)?

Avaliar se um conceito visual vai "funcionar" requer julgamento: o visual para o scroll? O ad copy gera clique? A combinacao imagem + copy conta a mesma historia? Compliance visual e subjetivo.

## Diferenca do review-creative (video)

| Aspecto | review-creative (video) | review-image-concept (imagem) |
|---------|-------------------------|-------------------------------|
| Foco principal | Script (narrativa) | Visual + ad copy combinados |
| Hook | Primeiros 3 segundos de audio | Primeiros 0.5s visual (para scroll) |
| Copy avaliado | Script inteiro | Texto overlay (50 palavras) + 5 formatos ad copy |
| Compliance | Audio + texto | Visual + texto overlay + ad copy |
| Plataforma | Secundario | PRIMARIO (specs de imagem variam muito) |

## Processo

### 1. Criterios Eliminatorios

Se QUALQUER destes falhar → REVISION_NEEDED ou REJECTED:

- [ ] Conceito visual alinhado com creative_profile?
  - blackhat-dr: NAO pode parecer anuncio, produto, preco
  - low-ticket: produto OK, mas hook visual necessario
  - saas-demo: interface/demo deve ser visivel
- [ ] Texto overlay legivel? (nao muito texto, contraste adequado)
- [ ] CTA presente e visivel no conceito?
- [ ] Sem violacao de compliance? (verificar compliance/rules.md DA OFERTA — regras por geo e plataforma)
  - Sem before/after proibido (saude)
  - Sem imagens sensacionalistas
  - Sem claims visuais proibidos
  - Verificar restricoes de plataforma conforme definido na oferta

### 2. Criterios de Qualidade

Avaliar em escala (forte / ok / fraco):

| Criterio | Avaliacao |
|----------|----------|
| Hook visual (para scroll < 1s) | |
| Coerencia visual + texto (contam mesma historia?) | |
| Headline (impacto, curiosidade) | |
| Ad copy — variedade (5 formatos usados?) | |
| Ad copy — qualidade (gera clique?) | |
| CTA (claro, urgente, visivel) | |
| Diferenciacao entre variacoes | |
| Adaptacao geo (tom visual + textual correto?) | |
| Composicao (espaco para texto overlay adequado?) | |

### 3. Avaliacao do Ad Copy (Especifico de Imagem)

Verificar os 5 formatos de escrita:

| Formato | Presente? | Qualidade |
|---------|-----------|-----------|
| Story-style (narrativa curta) | | |
| List-style (beneficios/problemas) | | |
| Question-style (pergunta provocadora) | | |
| Testimonial-style (depoimento) | | |
| News-style (editorial/noticia) | | |

**Regras:**
- Todos os 5 formatos devem estar presentes
- Pelo menos 3 devem ser "forte" ou "ok"
- Cada formato deve ter tom distinto (nao 5 versoes do mesmo texto)
- Headlines (min 5), descriptions (min 3), primary texts (min 3)

### 4. Veredictos

**APPROVED:**
- Conceito visual forte, ad copy completo, compliance OK
- Proximo passo: `generate-image-prompts` → `generate-images-api`

**REVISION_NEEDED:**
- Potencial existe mas precisa de ajustes
- OBRIGATORIO: detalhar O QUE mudar (sem reescrever)
- Pode ser: visual fraco, ad copy incompleto, compliance issue, diferenciacao baixa
- Proximo passo: @stefan-georgi corrige → re-review
- Max 2 rodadas

**REJECTED:**
- Conceito nao funciona como imagem (talvez funcione como video?)
- Completamente fora do creative_profile
- Sem potencial de conversao
- Sugestao: converter para video ou descartar

### 5. Formato de Feedback

```markdown
### Review — Conceito {N}: {nome}

**Veredicto:** {APPROVED | REVISION_NEEDED | REJECTED}

**Visual:**
- Hook visual: {forte|ok|fraco} — {comentario}
- Composicao: {forte|ok|fraco} — {comentario}
- Coerencia visual+texto: {forte|ok|fraco} — {comentario}

**Texto Overlay:**
- Headline: {forte|ok|fraco} — {comentario}
- CTA: {forte|ok|fraco} — {comentario}
- Legibilidade: {forte|ok|fraco} — {comentario}

**Ad Copy:**
- Story-style: {forte|ok|fraco} — {comentario}
- List-style: {forte|ok|fraco} — {comentario}
- Question-style: {forte|ok|fraco} — {comentario}
- Testimonial-style: {forte|ok|fraco} — {comentario}
- News-style: {forte|ok|fraco} — {comentario}

**Compliance (da oferta):**
- {OK | ISSUE: descricao}

**Feedback geral:**
{O que funciona e o que precisa mudar}

**Instrucoes de revisao (se REVISION_NEEDED):**
1. {mudanca especifica 1}
2. {mudanca especifica 2}
```

## Loop de Revisao

```
review → REVISION_NEEDED → @stefan-georgi corrige → re-review
Max 2 rodadas. Se ainda REVISION_NEEDED apos 2x → REJECTED.
```

## Importante

- Julgar com base em PADROES de performance, nao gosto pessoal
- Imagem + ad copy sao um CONJUNTO — avaliar juntos, nao separados
- Compliance vem da OFERTA (compliance/rules.md) — contem regras por geo e por plataforma
- Instruir O QUE mudar, nunca reescrever

### Output JSON Schema (OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

```json
{
  "verdict": "APPROVED|REVISION_NEEDED|REJECTED",
  "review_round": 1,
  "approved_concepts": [
    {
      "concept_id": 1,
      "concept_name": "Nome do conceito",
      "verdict": "APPROVED",
      "visual_score": { "hook": "forte|ok|fraco", "composition": "forte|ok|fraco", "coherence": "forte|ok|fraco" },
      "copy_score": { "story": "forte|ok|fraco", "list": "forte|ok|fraco", "question": "forte|ok|fraco", "testimonial": "forte|ok|fraco", "news": "forte|ok|fraco" },
      "compliance": "OK"
    }
  ],
  "revision_needed_concepts": [
    {
      "concept_id": 2,
      "concept_name": "Nome do conceito",
      "verdict": "REVISION_NEEDED",
      "issues": ["Hook visual fraco", "Ad copy list-style ausente"],
      "revision_instructions": ["Reforcar hook visual com contraste maior", "Adicionar formato list-style ao ad copy"]
    }
  ],
  "rejected_concepts": [
    {
      "concept_id": 3,
      "concept_name": "Nome do conceito",
      "verdict": "REJECTED",
      "reason": "Conceito fora do creative_profile",
      "suggestion": "Converter para video ou descartar"
    }
  ],
  "feedback": "Resumo geral do review com pontos fortes e fracos",
  "revision_instructions": "Instrucoes consolidadas para conceitos que precisam revisao"
}
```
