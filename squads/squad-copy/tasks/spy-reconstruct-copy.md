---
task: spy-reconstruct-copy
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - raw_transcripts: "Transcricoes brutas do spy-transcribe"
  - raw_media: "Imagens baixadas pelo spy-scrape (analise visual)"
  - spy_manifest: "Indice completo do spy run"
Saida:
  - reconstructed_references: "Copy reconstruido e estruturado (Hook/Problema/Mecanismo/Prova/CTA)"
  - cross_niche_insights: "Insights adaptaveis de outros nichos"
Checklist:
  - "[ ] Receber transcricoes brutas e imagens"
  - "[ ] Para videos: limpar transcricao (ruido, repeticoes)"
  - "[ ] Para videos: identificar estrutura da mensagem"
  - "[ ] Para videos: reconstruir como copy intencional"
  - "[ ] Para imagens: analisar texto overlay e conceito visual"
  - "[ ] Marcar tom, estilo, agressividade"
  - "[ ] Consolidar insights cross-niche"
  - "[ ] Entregar para catalog-references"
---

# Spy Reconstruct Copy — Reconstrucao Inteligente de Copy

## Objetivo

Transformar transcricoes brutas de video e imagens de concorrentes em copy ESTRUTURADO e INTELIGIVEL. Nao e so limpar — e RECONSTRUIR a intencao da mensagem: que hook usou? Que mecanismo apresentou? Que prova ofereceu? Como fechou?

## Por que agente (nao task pura)?

Esta e a task mais inteligente do spy pipeline. Requer:
- Separar fala casual de copy intencional
- Identificar a ESTRUTURA por tras do texto (nao so as palavras)
- Avaliar se um pattern e adaptavel para outra oferta/nicho
- Detectar tom, estilo, nivel de agressividade
- Para imagens: "ler" o conceito visual e extrair a estrategia

## Diferenca do Catalog + Deconstruct

| Task | O que faz |
|------|----------|
| **spy-reconstruct-copy** | Transforma RAW em COPY inteligivel (trabalho pesado) |
| **catalog-references** | Adiciona metadata estruturada (formato, nicho, plataforma) |
| **deconstruct-references** | Extrai Hook/Mechanism/Proof/CTA + consolida patterns |

O reconstruct faz o trabalho BRUTO. Catalog e deconstruct trabalham com material ja limpo.

## Processo

### 1. Processar Videos (transcricoes)

Para cada transcricao bruta:

#### 1.1 Limpar
- Remover hesitacoes (ums, ahs, ehs)
- Remover repeticoes nao intencionais
- Corrigir pontuacao (Whisper nem sempre pontua bem)
- Manter repeticoes INTENCIONAIS (enfase retorica)
- Preservar giriase tom informal (e informacao, nao ruido)

#### 1.2 Identificar Estrutura
Usando os timestamps, mapear:
- **Hook (0-3s):** O que disse/mostrou nos primeiros 3 segundos?
- **Problema (3-10s):** Como agravou a dor?
- **Mecanismo (10-20s):** Como apresentou a solucao?
- **Prova (20-25s):** Que evidencia usou?
- **CTA (ultimos 5s):** Como fechou?

Nem todo video segue essa estrutura exata. Adaptar:
- Se nao tem mecanismo explicito → marcar como "implicito" ou "ausente"
- Se o hook e visual (nao verbal) → descrever o que aparece
- Se e formato podcast → hook pode ser pergunta, nao afirmacao

#### 1.3 Reconstruir como Copy
Transformar a transcricao limpa em COPY INTENCIONAL:

```markdown
### Referencia Video {N}
- **Plataforma:** {meta | tiktok}
- **Formato original:** {ugc | editorial | talking_head | breaking_news}
- **Nicho:** {health/memory | beauty | fitness | etc}
- **Idioma:** {fr | en | es}
- **Duracao:** {segundos}
- **Quality score:** {clean | noisy}

**Copy Reconstruido:**

> **HOOK (0-3s):** "{texto limpo}"
> Tipo: {curiosity | fear | result | authority | controversy | pattern_interrupt}

> **PROBLEMA (3-10s):** "{texto limpo}"
> Agravamento: {como intensifica a dor}

> **MECANISMO (10-20s):** "{texto limpo}"
> Tipo: {ingredient | method | discovery | technology | story}

> **PROVA (20-25s):** "{texto limpo}"
> Tipo: {testimonial | statistic | expert | before_after | study}

> **CTA (final):** "{texto limpo}"
> Tipo: {urgency | scarcity | curiosity | bonus | guarantee}

**Analise:**
- Tom: {formal | casual | urgente | educativo | emocional}
- Agressividade: {baixa | media | alta}
- Creative profile aparente: {blackhat-dr | low-ticket | saas-demo | whitehat}
- O que funciona: {1-2 frases sobre por que esse criativo provavelmente performa}
- Insight adaptavel: {o que pode ser replicado para OUTRA oferta/nicho}
```

### 2. Processar Imagens

Para cada imagem baixada:

#### 2.1 Analisar Elementos Visuais
- **Sujeito:** O que/quem aparece na imagem?
- **Composicao:** Como os elementos estao organizados?
- **Cores:** Paleta dominante
- **Estilo:** Fotografico, editorial, ilustrado, UGC-style, bold
- **Mood:** Emocao transmitida

#### 2.2 Extrair Texto
- **Headline:** Texto principal overlay
- **Subheadline:** Texto secundario (se existir)
- **CTA:** Botao ou texto de acao
- **Outros:** Logos, badges, numeros em destaque

#### 2.3 Reconstruir Estrategia

```markdown
### Referencia Imagem {N}
- **Plataforma:** {meta | tiktok}
- **Formato:** {imagem_unica | carrossel | dinamico}
- **Nicho:** {health/memory | beauty | etc}
- **Geo aparente:** {fr | en | es}

**Elementos Visuais:**
- Sujeito: {descricao}
- Composicao: {descricao}
- Estilo: {fotografico | editorial | etc}
- Cores: {paleta}
- Mood: {emocao}

**Texto Encontrado:**
- Headline: "{texto}"
- Subheadline: "{texto}"
- CTA: "{texto}"

**Estrategia Identificada:**
- Hook visual: {o que para o scroll}
- Tipo: {curiosity | shock | beauty | authority | social_proof}
- Relacao texto-imagem: {complementar | redundante | contrastante}

**Analise:**
- Creative profile aparente: {blackhat-dr | low-ticket | etc}
- O que funciona: {analise}
- Insight adaptavel: {replicavel para outra oferta?}
```

### 3. Consolidar Insights Cross-Niche

Apos processar todas as referencias, consolidar:

```markdown
## Insights Cross-Niche

### Patterns de Hook (adaptaveis)
1. {Pattern 1} — Visto em: {nichos} — Frequencia: {N vezes}
   - Como adaptar para {oferta atual}: {sugestao}
2. {Pattern 2} — ...

### Patterns de Mecanismo (adaptaveis)
1. {Pattern 1} — ...

### Patterns de Prova (adaptaveis)
1. {Pattern 1} — ...

### Patterns de CTA (adaptaveis)
1. {Pattern 1} — ...

### Formatos que Destacam
1. {Formato} — Visto em: {plataforma} — Por que funciona: {explicacao}

### Tendencias Identificadas
- {Tendencia 1}
- {Tendencia 2}
```

## Importante

- COMO a mensagem e passada importa MAIS que o conteudo especifico
- Cross-niche: buscar ESTRUTURAS replicaveis, nao copiar conteudo
- Nao inventar estrutura onde nao existe (se video e caos, marcar como "nao-estruturado")
- Marcar qualidade do reconstruct (se transcricao era noisy, copy reconstruido e menos confiavel)
- Imagens sem texto overlay → focar na estrategia visual (composicao, mood, estilo)
- Videos sem fala (music_heavy/no_speech) → focar em elementos visuais e texto overlay

## Proximo Passo

Reconstruct vai para `catalog-references` (adicionar metadata) → `deconstruct-references` (extrair patterns).
