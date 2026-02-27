---
task: generate-images-api
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 4-review

pre-conditions:
  - condition: "Image prompts generated and formatted"
    source: "generate-image-prompts.output.api_ready_prompts"
    blocker: true
    validation: "Prompts array formatted for target API"
  - condition: "API credentials configured"
    source: "env vars or config"
    blocker: true
    validation: "API keys for NanoBanana/Midjourney/DALL-E/Flux"
  - condition: "Platform specs available"
    source: "generate-image-prompts.input.platforms"
    blocker: true
    validation: "Size requirements (1080x1350, 1080x1920, etc)"

post-conditions:
  - condition: "Images generated for all prompts"
    validation: "generated_images array with one image per prompt"
    blocker: true
  - condition: "Images saved with metadata"
    validation: "Each image has: prompt_id, api_used, generation_params, file_path"
    blocker: true
  - condition: "Failed generations logged"
    validation: "Errors logged but don't halt pipeline"
    blocker: false
  - condition: "Quality metadata captured"
    validation: "API response data (seed, model, etc) saved"
    blocker: false

Entrada:
  - api_ready_prompts: "Prompts aprovados e formatados (do generate-image-prompts)"
  - api_config: "Configuracao da API target (nanobanana, midjourney, dalle, flux)"
Saida:
  - generated_images: "Imagens geradas com metadata"
  - generation_report: "Relatorio de geracao (sucesso/falha por prompt)"
Checklist:
  - "[ ] Receber prompts aprovados"
  - "[ ] Validar configuracao de API"
  - "[ ] Enviar prompts para API"
  - "[ ] Receber imagens geradas"
  - "[ ] Aplicar texto overlay (se suportado)"
  - "[ ] Salvar em data/offers/{ID}/assets/criativos/"
  - "[ ] Gerar relatorio de geracao"
  - "[ ] Entregar para review-generated-image do @copy-chief"
---

# Generate Images API — Chamada de API de Geracao

## Objetivo

Enviar prompts aprovados para API(s) de geracao de imagem, receber as imagens geradas, e preparar para review visual.

## Por que task pura?

E wrapper de API — enviar prompt, receber imagem. Zero julgamento necessario.

## Nota de Integracao

**Esta task define o FLUXO e formato de dados. A implementacao tecnica (conexao com APIs, autenticacao, retry logic) sera feita pelo @dev.**

As APIs planejadas para integracao:
- **NanoBanana** — API primaria (custo/qualidade equilibrado)
- **Midjourney** — Via API nao-oficial ou Discord automation
- **DALL-E** — Via OpenAI API
- **Flux** — Via Replicate ou API direta

## Processo

### 1. Receber Prompts Aprovados

Do output de `generate-image-prompts`:
```yaml
prompt_id: "MEMFR02-IMG-A1-V1"
api_prompts:
  nanobanana: { prompt, negative_prompt, size, style, steps, cfg_scale }
  midjourney: { prompt }
  dalle: { prompt, size, quality, style }
  flux: { prompt, width, height }
text_overlay: { headline, cta, positions }
```

### 2. Enviar para API

Para cada prompt:
1. Selecionar API configurada (padrao: nanobanana)
2. Enviar request com parametros
3. Aguardar geracao (polling ou webhook)
4. Receber imagem(s) gerada(s)
5. Se falha: retry 1x, se falha novamente: marcar como failed

### 3. Aplicar Texto Overlay

Se a API de geracao NAO suporta texto overlay nativo:
1. Receber imagem base da API
2. Aplicar texto overlay via ferramenta de composicao:
   - Headline na posicao especificada
   - CTA na posicao especificada
   - Font, cor, sombra conforme specs
3. Gerar versao COM e SEM overlay (para flexibilidade)

### 4. Salvar Output

```
data/offers/{offer_id}/assets/criativos/{timestamp}/
├── MEMFR02-IMG-A1-V1/
│   ├── base.png                    # Imagem sem overlay
│   ├── final.png                   # Imagem com overlay
│   ├── metadata.yaml               # Prompt usado, API, parametros
│   └── ad-copy.yaml                # Headlines, descriptions, primary texts
├── MEMFR02-IMG-A1-V2/
│   ├── ...
└── generation-report.yaml          # Relatorio consolidado
```

### 5. Relatorio de Geracao

```yaml
report:
  total_prompts: 25
  total_generated: 23
  total_failed: 2
  api_used: nanobanana
  total_time_seconds: 180
  per_prompt:
    - prompt_id: "MEMFR02-IMG-A1-V1"
      status: success
      file: "base.png"
      size: "1080x1350"
      generation_time_seconds: 8
    - prompt_id: "MEMFR02-IMG-A1-V6"
      status: failed
      error: "Content policy violation"
      retry: true
      retry_status: failed
```

## Configuracao

```yaml
# Em config ou .env — definido pelo @dev
image_api:
  primary: nanobanana
  fallback: dalle
  max_retries: 1
  timeout_seconds: 60
  batch_size: 5          # Enviar N de cada vez
  overlay_tool: "sharp"  # ou "canvas" ou API externa
```

## Proximo Passo

Imagens geradas vao para `review-generated-image` do @copy-chief.
