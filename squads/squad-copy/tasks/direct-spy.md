---
task: direct-spy
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - offer_context: "Dados da oferta (nicho, mecanismo, publico, creative_profile, geo, compliance)"
  - performance_analysis: "Analise interpretada pelo @copy-chief (de interpret-offer-data)"
  - platforms: "Plataformas target (se informadas)"
Saida:
  - spy_brief: "Brief estruturado com queries, plataformas, nichos, criterios de selecao"
Checklist:
  - "[ ] Receber contexto da oferta e analise de performance"
  - "[ ] Identificar gaps criativos (o que falta?)"
  - "[ ] Decidir: spy no mesmo nicho ou cross-niche"
  - "[ ] Definir queries de busca por plataforma"
  - "[ ] Definir criterios de selecao (spend, formato, geo)"
  - "[ ] Gerar spy_brief estruturado para spy-scrape"
---

# Direct Spy — Estrategia de Pesquisa Competitiva

## Objetivo

Definir a ESTRATEGIA do spy automatizado: o que buscar, onde buscar, por que buscar, e com quais criterios selecionar. O @copy-chief e o cerebro — ele direciona o spy baseado em gaps criativos identificados.

## Por que agente (nao task pura)?

Decidir ONDE e O QUE buscar requer julgamento estrategico: se os winners estao fatigando, precisa de hooks novos? Se o CTR e baixo, precisa de patterns de scroll-stopping? Se e oferta nova, precisa de referencia de nicho? Essas decisoes mudam completamente o resultado.

## Contexto

O spy substitui o antigo "human_spy" (Copy humano pesquisando manualmente). Agora o @copy-chief define a estrategia e o sistema executa automaticamente. O copy humano pode opcionalmente adicionar referencias manuais.

## Processo

### 1. Analisar Gaps Criativos

Baseado na analise de performance (interpret-offer-data):

| Situacao | Gap Identificado | Direcao do Spy |
|----------|-----------------|----------------|
| CTR baixo | Hooks fracos | Buscar hooks que param scroll (mesmo nicho + cross-niche) |
| CTR alto + CVR baixo | Mecanismo/prova fracos | Buscar mecanismos criveis e provas convincentes (mesmo nicho) |
| Winners fatigando | Precisa de angulos novos | Spy cross-niche para patterns frescos |
| Oferta nova sem historico | Tudo | Spy amplo: mesmo nicho + top performers cross-niche |
| Formato especifico performa | Precisa mais do formato | Spy focado em formato (ex: carrossel, UGC) |

### 2. Decidir Nicho do Spy

**Mesmo nicho — quando:**
- Precisa de claims, mecanismos, provas especificas do nicho
- Busca por compliance patterns (como concorrentes falam de saude sem violar)
- Validar se angulo existe no mercado

**Cross-niche — quando:**
- Precisa de ESTRUTURAS de mensagem (hooks, storytelling patterns)
- Winners do nicho esgotaram — precisa de inspiracao fresca
- Busca por formatos criativos novos (como outros nichos usam carrossel, UGC)
- O QUE importa e COMO a mensagem e passada, nao o conteudo

**Misto (recomendado por padrao):**
- 60% mesmo nicho + 40% cross-niche
- Garante relevancia + inovacao

### 3. Definir Queries de Busca

Para cada plataforma, definir queries especificas:

#### Meta Ad Library
```yaml
meta_queries:
  same_niche:
    - keywords: ["memoria", "cerebro", "esquecimento"]
      country: "FR"
      media_type: "all"  # image + video
      active_status: "active"
    - keywords: ["honey", "brain", "memory"]
      country: "US"
      media_type: "all"
      active_status: "active"
  cross_niche:
    - keywords: ["natural remedy", "secret method", "doctors discovered"]
      country: "US"
      media_type: "all"
      min_spend_estimate: "medium"  # filtrar por spend
    - keywords: ["methode naturelle", "decouverte"]
      country: "FR"
      media_type: "all"
```

#### TikTok Creative Center
```yaml
tiktok_queries:
  same_niche:
    - category: "health_wellness"
      region: "FR"
      sort_by: "ctr"
      period: "last_30_days"
    - category: "health_wellness"
      region: "US"
      sort_by: "impressions"
  cross_niche:
    - category: "beauty_personal_care"
      region: "US"
      sort_by: "ctr"
      note: "Beauty usa hooks de transformacao similares"
    - category: "education"
      region: "US"
      sort_by: "engagement"
      note: "Education usa curiosity gaps bem"
```

#### [Futuro] YouTube
```yaml
youtube_queries:
  - search: "health supplement ad"
    type: "video"
    duration: "short"  # < 60s
    region: "US"
```

#### [Futuro] Native (Taboola/Outbrain)
```yaml
native_queries:
  - category: "health"
    geo: "FR"
    format: "advertorial"
```

### 4. Definir Criterios de Selecao

```yaml
selection_criteria:
  max_references_total: 50          # Nao baixar mais que 50 por spy run
  max_per_platform: 30
  max_per_query: 10

  priority_filters:
    - spend_estimate: "medium+"     # Priorizar ads com spend medio/alto
    - active_days: ">= 7"          # Ads ativos ha pelo menos 7 dias (sinal de performance)
    - format_preference:            # Priorizar formatos de interesse
        - imagem                    # Pra pipeline de imagem
        - video_short               # < 60s
        - carrossel

  format_distribution:
    video: "40%"
    imagem: "40%"
    carrossel: "20%"

  quality_signals:
    - "Alto spend = provavelmente funciona"
    - "Ativo ha 7+ dias = nao foi cortado"
    - "Multiplas variacoes = advertiser esta escalando"
```

### 5. Formato de Saida (spy_brief)

```yaml
spy_brief:
  offer_id: "MEMFR02"
  geo: "fr"
  generated_at: "{timestamp}"
  strategy:
    focus: "misto"  # mesmo-nicho | cross-niche | misto
    same_niche_pct: 60
    cross_niche_pct: 40
    reasoning: "Winners MEMFR02 fatigando. CTR caindo -12%. Precisa de hooks novos (cross-niche) + mecanismos atualizados (mesmo nicho)."

  gaps_identified:
    - gap: "hooks"
      severity: high
      note: "Top 3 hooks ja tem CTR decaindo"
    - gap: "formatos"
      severity: medium
      note: "So testamos UGC e imagem. Carrossel nao testado."

  queries:
    meta: [{...}]
    tiktok: [{...}]
    youtube: null    # Futuro
    native: null     # Futuro

  selection_criteria: {max, filters, distribution}

  special_instructions:
    - "Priorizar hooks de curiosity gap em FR — historicamente melhor CTR"
    - "Buscar carrosseis de health em Meta — formato nao testado ainda"
    - "Cross-niche: buscar em beauty e fitness — mesma estrutura de transformacao"
```

## Importante

- O spy_brief e INPUT para a task `spy-scrape` que executa o download
- @copy-chief NAO baixa nada — so define a estrategia
- O brief deve ser especifico o suficiente para execucao automatica
- Se plataformas foram informadas no trigger, respeitar como restricao
- Brief pode ser refinado se spy-scrape retornar poucos resultados

## Proximo Passo

spy_brief vai para `spy-scrape` (task pura que baixa o conteudo).
