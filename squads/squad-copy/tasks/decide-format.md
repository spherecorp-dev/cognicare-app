---
task: decide-format
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 2-strategy
Entrada:
  - method_decision: "Decisao de metodo do select-method (distribuicao e assignments)"
  - angles: "Angulos sugeridos pelo @stefan-georgi"
  - offer_context: "Dados da oferta (creative_profile, mecanismo, publico, geo, compliance)"
  - platforms: "Plataformas target (opcional — se nao informado, decidir aqui)"
Saida:
  - format_assignments: "Mapa angulo → formato (imagem|video) + sub_formato + plataforma(s)"
  - reasoning: "Justificativa por angulo"
Checklist:
  - "[ ] Receber method_decision do select-method"
  - "[ ] Analisar cada angulo: complexidade da mensagem"
  - "[ ] Avaliar plataforma target (informada ou decidida)"
  - "[ ] Atribuir formato (imagem ou video) por angulo"
  - "[ ] Definir sub-formato quando video (VSL, UGC, etc)"
  - "[ ] Definir plataforma(s) por angulo"
  - "[ ] Justificar cada decisao"
---

# Decide Format — Decisao de Formato por Angulo

## Objetivo

Decidir se cada angulo vai ser produzido como IMAGEM ou VIDEO antes da producao comecar. Esta decisao e critica porque muda completamente o pipeline de producao, o tipo de copy gerado e os criterios de review.

## Por que agente (nao task pura)?

Requer julgamento sobre como a mensagem funciona melhor: visual estatico + ad copy forte (imagem) ou narrativa + storytelling (video). Depende do angulo, mecanismo, plataforma e oferta.

## Contexto

**Imagem vs Video — Diferenca fundamental:**

| Aspecto | Imagem | Video |
|---------|--------|-------|
| Mensagem | Visual + texto curto (max 50 palavras) | Script narrativo (30s-5min) |
| Ad copy | PRIMARIO (headlines, descriptions fazem a diferenca) | Secundario (suporta o script) |
| Producao | Rapida (prompt → API → imagem) | Mais complexa (brief → editor → video) |
| Iteracao | Rapida (gerar, testar, iterar) | Mais lenta |
| Pipeline | generate-image-concepts → prompts → API → review | generate-scripts → review → brief → editor |

## Processo

### 1. Avaliar Cada Angulo

Para cada angulo no method_decision, considerar:

**Fatores que favorecem IMAGEM:**
- Mecanismo simples (pode ser resumido em 1 frase)
- Hook visual forte (curiosity gap visual, pattern interrupt)
- Plataforma target = Meta Feed (imagens performam bem)
- Angulo tipo curiosidade ou controversia (headline resolve)
- Budget / velocidade importam (imagem = mais rapido pra testar)

**Fatores que favorecem VIDEO:**
- Mecanismo complexo (precisa explicar)
- Angulo tipo storytelling ou emocional
- Plataforma target = TikTok (video nativo)
- Prova requer demonstracao (before/after visual, depoimento)
- Formato UGC ou podcast natural pro angulo

### 2. Decidir Plataformas

Se `platforms` foi informado no trigger → usar como restricao.
Se NAO informado → decidir baseado em:
- Tipo de oferta (blackhat-dr = Meta + TikTok, saas-demo = YouTube + Meta)
- Geo (FR = Meta forte, EN = TikTok + Meta)
- Formato decidido (imagem = Meta preferencialmente, video = TikTok + Meta)

### 3. Atribuir Sub-Formatos

Para VIDEO, definir sub-formato:
- VSL, UGC, podcast, AI avatar, breaking news, cinematografico

Para IMAGEM, definir tipo:
- Imagem unica, carrossel, dinamico

### 4. Formato de Saida

```yaml
format_assignments:
  - angle_id: 1
    angle_name: "Curiosidade sobre metodo ancestral"
    format: imagem
    sub_format: imagem_unica
    platforms: [meta, tiktok]
    reason: "Hook visual forte. Curiosity gap resolve com headline. Imagem + ad copy robusto."
    note: "Ad copy primario — investir em 5 formatos de escrita (story/list/question/testimonial/news)"

  - angle_id: 2
    angle_name: "Historia emocional do medico"
    format: video
    sub_format: ugc
    platforms: [tiktok, meta]
    reason: "Angulo storytelling — precisa de narrativa e emocao. UGC nativo pro TikTok."

  - angle_id: 3
    angle_name: "Conspiração farmaceutica"
    format: imagem
    sub_format: carrossel
    platforms: [meta]
    reason: "Carrossel permite revelar informacao gradualmente. Hook no slide 1, revelacao nos seguintes."

summary:
  total_imagem: 2
  total_video: 1
  platforms_used: [meta, tiktok]
```

## Regras

- Cada angulo recebe UM formato primario (nao ambos)
- Se um angulo tem potencial em ambos, criar duas entries (uma imagem, uma video)
- Para IMAGEM: sempre notar que ad copy e primario (headlines/descriptions/primary text fazem a diferenca)
- Para VIDEO: ad copy e suporte (o script carrega a mensagem)
- Respeitar creative_profile da oferta (blackhat-dr → nunca parecer anuncio, em qualquer formato)

### Output JSON Schema (OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

```json
{
  "format_assignments": [
    {
      "angle_id": 1,
      "angle_name": "Nome do angulo",
      "format": "imagem|video",
      "sub_format": "imagem_unica|carrossel|dinamico|vsl|ugc|podcast|ai_avatar|breaking_news|cinematografico",
      "platforms": ["meta", "tiktok"],
      "rationale": "Justificativa para formato e plataforma escolhidos",
      "ad_copy_priority": "primario|secundario"
    }
  ],
  "summary": {
    "total_imagem": 3,
    "total_video": 2,
    "platforms_used": ["meta", "tiktok"]
  }
}
```

## Proximo Passo

- Angulos designados como IMAGEM → `generate-image-concepts` (@stefan-georgi)
- Angulos designados como VIDEO → `generate-scripts` (@stefan-georgi)
