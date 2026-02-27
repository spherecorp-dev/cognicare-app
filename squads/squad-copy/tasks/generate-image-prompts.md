---
task: generate-image-prompts
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review
Entrada:
  - image_concepts: "Conceitos visuais aprovados pelo @copy-chief (inclui geo da oferta)"
  - platforms: "Plataformas target com specs de tamanho"
Saida:
  - api_ready_prompts: "Prompts formatados para APIs de geracao (NanoBanana, Midjourney, DALL-E, Flux)"
  - text_overlay_specs: "Especificacoes de texto overlay por imagem"
Checklist:
  - "[ ] Receber conceitos aprovados"
  - "[ ] Gerar prompt base por conceito"
  - "[ ] Adaptar para specs de cada plataforma (tamanho, ratio)"
  - "[ ] Gerar 5+ variacoes de prompt por conceito"
  - "[ ] Incluir negative prompts"
  - "[ ] Definir zonas de texto overlay"
  - "[ ] Formatar para APIs target"
---

# Generate Image Prompts — Prompts para API de Geracao

## Objetivo

Transformar conceitos visuais aprovados em prompts otimizados para APIs de geracao de imagem. Output deve ser payload pronto para chamada de API.

## Por que task pura?

E transformacao mecanica: conceito visual → prompt seguindo regras de formatacao. Nao requer julgamento — segue specs tecnicas.

## Processo

### 1. Analisar Conceito Visual

Do conceito aprovado, extrair:
- Cena (sujeito, acao, ambiente)
- Mood (emocao, atmosfera)
- Estilo (fotografico, editorial, ilustrado, etc)
- Cores (paleta dominante)
- Composicao (layout, posicao do sujeito)

### 2. Gerar Prompt Base

Estrutura do prompt:

```
[SUJEITO] + [ACAO/CONTEXTO] + [AMBIENTE] + [ESTILO] + [ILUMINACAO] + [COMPOSICAO] + [MOOD]
```

**Exemplo:**
```
Close-up portrait of a smiling elderly French woman (65-75 years old),
holding a small jar of golden honey, warm kitchen background with morning light,
editorial photography style, soft natural lighting from window,
shallow depth of field, hopeful and serene mood,
clean composition with empty space on the right for text overlay
```

### 3. Definir Specs por Plataforma

| Plataforma | Placement | Tamanho | Ratio |
|------------|-----------|---------|-------|
| Meta Feed | Feed | 1080x1080 | 1:1 |
| Meta Feed | Feed (vertical) | 1080x1350 | 4:5 |
| Meta Stories | Stories/Reels | 1080x1920 | 9:16 |
| TikTok | Feed | 1080x1920 | 9:16 |
| TikTok | Spark Ads | 1080x1350 | 4:5 |

### 4. Gerar Variacoes de Prompt (5+)

Para cada conceito, gerar variacoes de prompt alterando:
- **Cores:** warm tones vs cool tones vs high contrast vs muted
- **Estilo:** photographic vs editorial vs cinematic vs minimalist
- **Composicao:** centered vs rule-of-thirds vs asymmetric
- **Iluminacao:** natural vs studio vs dramatic vs golden hour
- **Mood:** hopeful vs urgent vs mysterious vs authoritative

### 5. Definir Negative Prompts

O que NAO deve aparecer:
```
text, watermark, logo, blurry, low quality, distorted,
deformed, extra limbs, bad anatomy, [specificos do creative_profile]
```

Para blackhat-dr adicionar:
```
product packaging, price tag, discount label, promotional banner,
advertising look, corporate style, polished brand aesthetic
```

### 6. Definir Zonas de Texto Overlay

Marcar areas da imagem que devem ter espaco limpo para texto:

```yaml
text_overlay_zones:
  headline:
    position: "top-center"      # ou top-left, top-right
    safe_area: "top 25%"        # area que deve estar limpa
    max_lines: 2
  cta:
    position: "bottom-center"   # ou bottom-right
    safe_area: "bottom 15%"
    max_lines: 1
  subheadline:
    position: "center"          # se aplicavel
    safe_area: "center band 20%"
    max_lines: 1
```

### 7. Formatar para APIs

```yaml
prompt_id: "MEMFR02-IMG-A1-V1"
concept_ref: "conceito-1-variacao-3"
angle: "Curiosidade metodo ancestral"
geo: fr

# Specs por plataforma
platform_specs:
  - platform: meta_feed
    size: "1080x1350"
    ratio: "4:5"
  - platform: meta_stories
    size: "1080x1920"
    ratio: "9:16"
  - platform: tiktok
    size: "1080x1920"
    ratio: "9:16"

# Prompts por API
api_prompts:
  nanobanana:
    prompt: "{prompt completo}"
    negative_prompt: "{negative prompt}"
    style: "photographic"
    size: "1080x1350"
    steps: 30
    cfg_scale: 7.5

  midjourney:
    prompt: "{prompt} --ar 4:5 --style raw --v 6"

  dalle:
    prompt: "{prompt adaptado para DALL-E}"
    size: "1024x1024"
    quality: "hd"
    style: "natural"

  flux:
    prompt: "{prompt adaptado para Flux}"
    width: 1080
    height: 1350

# Texto overlay
text_overlay:
  headline:
    text: "{headline do conceito}"
    position: "top-center"
    font_suggestion: "sans-serif bold"
    color_suggestion: "white with dark shadow"
  cta:
    text: "{CTA do conceito}"
    position: "bottom-center"
    style: "button or banner"

# Variacoes
variations:
  - id: "V1"
    description: "Warm tones, fotografico natural"
    prompt_override: "{ajustes especificos}"
  - id: "V2"
    description: "Cool tones, editorial"
    prompt_override: "{ajustes especificos}"
  - id: "V3"
    description: "High contrast, bold"
    prompt_override: "{ajustes especificos}"
  - id: "V4"
    description: "Cinematic, dramatic lighting"
    prompt_override: "{ajustes especificos}"
  - id: "V5"
    description: "Minimalist, clean"
    prompt_override: "{ajustes especificos}"
```

## Ponto de Integracao

Esta task gera o payload. A task `generate-images-api` (proxima no pipeline) envia para a API e recebe as imagens. @dev implementa a conexao tecnica.

## Proximo Passo

Prompts vao para `generate-images-api` (chamada de API) ou diretamente para `review-generated-image` se imagens forem geradas manualmente.
