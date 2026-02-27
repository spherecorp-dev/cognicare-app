---
task: spy-scrape
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - spy_brief: "Brief estruturado do @copy-chief (queries, plataformas, filtros)"
Saida:
  - raw_media: "Videos e imagens baixados com metadata"
  - spy_manifest: "Indice do que foi baixado"
Checklist:
  - "[ ] Receber spy_brief"
  - "[ ] Executar queries em cada plataforma"
  - "[ ] Baixar videos e imagens encontrados"
  - "[ ] Salvar metadata por arquivo"
  - "[ ] Respeitar limites de selecao"
  - "[ ] Gerar spy-manifest.yaml"
  - "[ ] Separar videos (para transcricao) de imagens (para analise visual)"
---

# Spy Scrape — Download Automatizado de Referencias

## Objetivo

Executar o spy_brief definido pelo @copy-chief: buscar, filtrar e baixar criativos (videos e imagens) das plataformas target.

## Por que task pura?

E execucao mecanica de scraping/API calls. Buscar keywords, aplicar filtros, baixar arquivos. Zero julgamento — segue o brief.

## Nota de Integracao

**Esta task define o FLUXO e formato de dados. A implementacao tecnica (scraping, API auth, rate limiting, proxy) sera feita pelo @dev.**

APIs e ferramentas planejadas:
- **Meta Ad Library API** — API oficial (gratis, com limitacoes)
- **TikTok Creative Center** — Scraping ou API
- **[Futuro] YouTube Ads Transparency** — API/scraping
- **[Futuro] Taboola/Outbrain** — Scraping de advertorials

## Processo

### 1. Executar Queries

Para cada plataforma no spy_brief:

#### Meta Ad Library
1. Chamar API com keywords + filtros (pais, status, tipo de media)
2. Receber lista de ads
3. Filtrar por criterios de selecao (spend, duracao ativa, formato)
4. Baixar criativos (video mp4, imagem jpg/png)
5. Salvar metadata por ad (advertiser, data inicio, formato, pais)

#### TikTok Creative Center
1. Buscar top ads por categoria + regiao
2. Filtrar por performance metrics (CTR, impressoes)
3. Baixar criativos
4. Salvar metadata (categoria, performance, regiao)

#### [Futuro] YouTube
1. Buscar ads via Ads Transparency
2. Baixar videos curtos
3. Salvar metadata

#### [Futuro] Native
1. Scrape de advertorials ativos
2. Baixar imagens + texto do advertorial
3. Salvar metadata

### 2. Estrutura de Armazenamento

```
data/offers/{offer_id}/spy/{timestamp}/
├── meta/
│   ├── video-001.mp4
│   ├── video-001.meta.yaml
│   ├── video-002.mp4
│   ├── video-002.meta.yaml
│   ├── image-001.jpg
│   ├── image-001.meta.yaml
│   └── ...
├── tiktok/
│   ├── video-001.mp4
│   ├── video-001.meta.yaml
│   └── ...
├── youtube/                    # Futuro
├── native/                     # Futuro
└── spy-manifest.yaml
```

### 3. Metadata por Arquivo

```yaml
# video-001.meta.yaml
file: video-001.mp4
type: video                     # video | image
platform: meta                  # meta | tiktok | youtube | native
query_used: "memoria cerebro"
query_type: same_niche          # same_niche | cross_niche

# Dados do ad
advertiser: "XYZ Health"
ad_id: "META-123456789"
first_seen: "2026-02-10"
last_seen: "2026-02-20"
active_days: 10
country: "FR"
language_detected: null         # Preenchido pelo spy-transcribe

# Estimativas
spend_estimate: "medium"        # low | medium | high (baseado em sinais)
format: video_short             # video_short | video_long | image | carousel
duration_seconds: 32

# Contexto do spy
niche: "health/memory"
spy_run_id: "{timestamp}"
downloaded_at: "{timestamp}"
```

### 4. Spy Manifest

```yaml
# spy-manifest.yaml
spy_run:
  offer_id: "MEMFR02"
  geo: "fr"
  timestamp: "{timestamp}"
  brief_ref: "spy_brief_{timestamp}"

summary:
  total_downloaded: 42
  by_platform:
    meta: 25
    tiktok: 17
  by_type:
    video: 28
    image: 14
  by_query_type:
    same_niche: 26
    cross_niche: 16
  by_format:
    video_short: 20
    video_long: 8
    image: 10
    carousel: 4

files:
  - file: "meta/video-001.mp4"
    type: video
    platform: meta
    niche: "health/memory"
    spend_estimate: high
  - file: "meta/image-001.jpg"
    type: image
    platform: meta
    niche: "health/memory"
    spend_estimate: medium
  # ... todos os arquivos

errors:
  - query: "memoria cerebro"
    platform: meta
    error: "rate_limit_exceeded"
    note: "Retry em 60s, sucesso parcial"

next_steps:
  videos: "spy-transcribe"
  images: "spy-reconstruct-copy (analise visual direta)"
```

### 5. Rate Limiting e Boas Praticas

```yaml
rate_limits:
  meta:
    requests_per_minute: 30
    delay_between_downloads: 2s
    max_retries: 2
  tiktok:
    requests_per_minute: 20
    delay_between_downloads: 3s
    max_retries: 2

best_practices:
  - Respeitar rate limits (nao ser bloqueado)
  - Salvar metadata ANTES de baixar (se download falhar, metadata existe)
  - Retry automatico 1x em caso de falha
  - Se plataforma bloquear: marcar no manifest e continuar com proxima
  - Nao baixar duplicatas (checar ad_id antes)
  - Priorizar downloads por spend_estimate (alto primeiro)
```

## Proximo Passo

- Videos baixados → `spy-transcribe` (transcricao com Whisper)
- Imagens baixadas → `spy-reconstruct-copy` (analise visual direta)
