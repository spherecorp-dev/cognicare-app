---
task: review-generated-image
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review
Entrada:
  - generated_images: "Imagens geradas pela API (com e sem overlay)"
  - image_concepts: "Conceitos originais aprovados (referencia)"
  - platform_specs: "Specs da plataforma target"
Saida:
  - verdict: "APPROVED | REGENERATE | REJECTED (por imagem)"
  - feedback: "Feedback detalhado por imagem"
Checklist:
  - "[ ] Receber imagens geradas"
  - "[ ] Comparar com conceito original aprovado"
  - "[ ] Avaliar qualidade visual"
  - "[ ] Avaliar texto overlay (legibilidade, posicao)"
  - "[ ] Verificar compliance visual final"
  - "[ ] Verificar specs de plataforma (tamanho, safe zones)"
  - "[ ] Emitir veredicto por imagem"
---

# Review Generated Image — Revisao da Imagem Gerada

## Objetivo

Revisar a IMAGEM GERADA pela API (nao o conceito — isso ja foi feito em review-image-concept). Aqui avalia-se o resultado visual final: qualidade, fidelidade ao conceito, legibilidade do texto overlay, compliance visual.

## Por que agente (nao task pura)?

Avaliar se uma imagem gerada por IA "funciona" como criativo requer julgamento visual: proporcoes naturais? Emocao correta? Texto legivel sobre o fundo? Artefatos visiveis?

## Diferenca do review-image-concept

| Aspecto | review-image-concept | review-generated-image |
|---------|---------------------|----------------------|
| O que avalia | Conceito descritivo + ad copy | Imagem real gerada |
| Quando | ANTES de gerar | DEPOIS de gerar |
| Foco | Estrategia + copy | Qualidade visual + execucao |
| Veredictos | APPROVED/REVISION_NEEDED/REJECTED | APPROVED/REGENERATE/REJECTED |

## Processo

### 1. Criterios de Qualidade Visual

- [ ] Sem artefatos de IA visiveis (dedos extras, distorcoes, blur anormal)
- [ ] Proporcoes humanas corretas (se tem pessoas)
- [ ] Resolucao adequada para a plataforma
- [ ] Cores consistentes e alinhadas com o mood do conceito
- [ ] Composicao respeita o layout planejado

### 2. Fidelidade ao Conceito

- [ ] Cena corresponde ao descrito no conceito?
- [ ] Mood/emocao transmitida esta correta?
- [ ] Estilo visual (fotografico/editorial/etc) conforme solicitado?
- [ ] Sujeito principal esta em destaque?

### 3. Texto Overlay

- [ ] Headline legivel sobre o fundo? (contraste suficiente)
- [ ] CTA visivel e destacado?
- [ ] Posicao do texto conforme planejado? (nao cobre elementos importantes)
- [ ] Font e tamanho adequados para mobile (leitura rapida)
- [ ] Texto nao ultrapassa area segura da plataforma

### 4. Compliance Visual

- [ ] Sem imagens que violam compliance da oferta (saude, before/after, etc)
- [ ] Restricoes de plataforma conforme definido na oferta (compliance/rules.md)
- [ ] Creative_profile respeitado visualmente
  - blackhat-dr: NAO parece anuncio (parece organico, noticia, descoberta)
  - low-ticket: produto pode aparecer
  - saas-demo: interface deve ser clara

### 5. Specs de Plataforma

- [ ] Tamanho correto (1080x1350 feed, 1080x1920 stories, etc)
- [ ] Elementos importantes dentro da safe zone
- [ ] Aspecto adequado para o placement

### 6. Veredictos

**APPROVED:**
- Imagem com qualidade, fiel ao conceito, texto legivel, compliance OK
- Pronto para `package-image-creative`

**REGENERATE:**
- Conceito e bom mas a geracao nao ficou boa
- Causas comuns: artefatos, mood errado, composicao ruim, texto ilegivel
- Acao: ajustar prompt (mais especifico) e re-gerar
- Max 2 tentativas de re-geracao
- Apos 2x: avaliar se REJECTED ou aceitar com ressalvas

**REJECTED:**
- Imagem fundamentalmente nao funciona
- Conceito nao traduz bem para imagem real
- Opcoes: voltar para `generate-image-concepts` com novo conceito, ou converter angulo para video

### 7. Formato de Feedback

```markdown
### Review Imagem — {prompt_id}

**Veredicto:** {APPROVED | REGENERATE | REJECTED}

**Qualidade Visual:**
- Artefatos: {nenhum|poucos|muitos} — {comentario}
- Proporcoes: {ok|distorcido} — {comentario}
- Resolucao: {adequada|baixa}

**Fidelidade ao Conceito:**
- Cena: {conforme|diferente} — {comentario}
- Mood: {correto|incorreto} — {comentario}
- Estilo: {conforme|diferente} — {comentario}

**Texto Overlay:**
- Legibilidade: {boa|media|ruim} — {comentario}
- Posicao: {correta|ajustar}
- Contraste: {bom|insuficiente}

**Compliance (da oferta):**
- {OK | ISSUE}

**Se REGENERATE — Ajustes no prompt:**
1. {ajuste 1 — ex: "adicionar 'clean background' para melhorar legibilidade do texto"}
2. {ajuste 2}

**Se REJECTED — Motivo:**
{por que nao funciona e sugestao de alternativa}
```

## Loop de Re-geracao

```
review → REGENERATE → ajustar prompt → generate-images-api → re-review
Max 2 tentativas. Se ainda REGENERATE apos 2x → REJECTED.
```

## Importante

- Esta review e RAPIDA — nao e review estrategico (isso ja foi feito)
- Foco e qualidade tecnica e visual da geracao
- Se o conceito foi aprovado mas a imagem nao ficou boa, o problema e do prompt (nao do conceito)
- Sempre sugerir ajustes CONCRETOS no prompt quando REGENERATE

### Output JSON Schema (OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

```json
{
  "verdict": "APPROVED|REGENERATE|REJECTED",
  "review_round": 1,
  "approved_images": [
    {
      "image_id": "prompt_id ou image_id",
      "verdict": "APPROVED",
      "quality": { "artifacts": "nenhum|poucos|muitos", "proportions": "ok|distorcido", "resolution": "adequada|baixa" },
      "fidelity": { "scene": "conforme|diferente", "mood": "correto|incorreto", "style": "conforme|diferente" },
      "overlay": { "legibility": "boa|media|ruim", "position": "correta|ajustar", "contrast": "bom|insuficiente" },
      "compliance": "OK"
    }
  ],
  "regenerate_images": [
    {
      "image_id": "prompt_id ou image_id",
      "verdict": "REGENERATE",
      "issues": ["Artefatos visiveis nas maos", "Texto ilegivel sobre fundo claro"],
      "adjusted_prompt": "Prompt ajustado com correcoes especificas para re-geracao"
    }
  ],
  "rejected_images": [
    {
      "image_id": "prompt_id ou image_id",
      "verdict": "REJECTED",
      "reason": "Conceito nao traduz bem para imagem real",
      "suggestion": "Voltar para generate-image-concepts ou converter para video"
    }
  ],
  "adjusted_prompts": [
    {
      "image_id": "prompt_id ou image_id",
      "original_prompt": "Prompt original usado",
      "adjusted_prompt": "Prompt com ajustes para re-geracao",
      "adjustments": ["adicionar 'clean background'", "especificar 'no text artifacts'"]
    }
  ],
  "feedback": "Resumo geral da qualidade das imagens geradas"
}
```
