# Squad-Copy — Persuasion Engine

**Version:** 4.0.0
**Status:** Production
**Last Updated:** 2026-02-20
**Former Name:** dr-criativos (v1.0-v3.3)

---

## 🎯 Missão

**Ser o Motor de Persuasão central da empresa** — único squad responsável por TODA escrita persuasiva de Direct Response, garantindo consistência de mensagem e máxima conversão cross-format.

## 🧩 Princípios

1. **Task-First Architecture** — Tasks definem O QUÊ, agents executam ONDE precisa julgamento
2. **Single Source of Truth** — Toda copy persuasiva passa por este squad
3. **Orquestração Centralizada** — @copy-chief garante qualidade e consistência
4. **100% Autônomo** — Zero pontos humanos obrigatórios
5. **Cross-Format Consistency** — Mesma mensagem, mesmo ângulo, diferentes formatos

---

## 📦 Escopo v4.0 (Atual)

### ✅ Implementado

**Ad Copy** (Meta, TikTok, YouTube, Native)
- Headlines, descriptions, primary texts
- 5 formatos de escrita (story, list, question, testimonial, news)
- 3 combos A/B recomendados por criativo

**Image Concepts**
- Conceitos visuais + texto overlay
- Geração de prompts para APIs
- Review de imagens geradas

**Spy Automatizado**
- Scraping de plataformas (Meta Ad Library, TikTok)
- Transcrição automática (Whisper)
- Reconstrução de copy estruturada

**Pipeline 100% Autônomo**
- Intelligence → Strategy → Production → Review → Delivery
- Branching por formato (imagem vs vídeo)
- Self-healing com CodeRabbit (max 2 iterações)

### 🎨 Agents Atuais

**@copy-chief** (Lead Agent)
- Interpretação estratégica de ofertas
- Review de copy e conceitos visuais
- Decisões de formato e método
- QA e garantia de consistência

**@stefan-georgi** (Production Agent)
- Sugestão de ângulos
- Geração de ad copy
- Criação de conceitos visuais
- Variações e testes A/B

---

## 🚀 Roadmap — Expansão Futura

### v4.1 — VSL Scripts (Alta Prioridade)

**Objetivo:** Long-form persuasion para funnels

**Novo Agent:** @vsl-writer (Long-Form Storyteller)

**Novas Tasks:**
- `generate-vsl-outline` — Estruturação do roteiro
- `generate-vsl-script` — Script completo com timing
- `adapt-vsl-to-geo` — Adaptação cultural por geo

**Handoff:** squad-ofertas (funnel deployment)

**Timeline:** Q2 2026

---

### v4.2 — Landing Page Copy (Média Prioridade)

**Objetivo:** High-conversion copy para páginas de captura e vendas

**Agent:** @lp-copywriter ou expandir @stefan-georgi

**Novas Tasks:**
- `generate-lp-headline` — Headlines impactantes
- `generate-lp-body` — Body copy benefit-driven
- `generate-lp-bullets` — Bullet points persuasivos

**Handoff:** squad-ofertas (funnel deployment)

**Timeline:** Q3 2026

---

### v4.3 — Email Sequences (Média Prioridade)

**Objetivo:** Nurture e conversion sequences

**Agent:** @email-copywriter ou expandir @stefan-georgi

**Novas Tasks:**
- `generate-email-sequence` — Sequences completas
- `generate-email-subject-lines` — Subject lines A/B

**Handoff:** squad-ofertas (automation)

**Timeline:** Q4 2026

---

### v5.0 — Persuasion Engine Completo (Futuro)

**Objetivo:** Consolidação final como único squad de copy persuasiva

**Escopo Adicional:**
- Upsells & Downsells
- Webinar Scripts
- Advertorials
- Quiz Funnels

**Timeline:** 2027

---

## 📋 Workflow Principal

```
Trigger: offer_id + format_request [ads | vsl | both | lp | email]

┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: INTELLIGENCE                                           │
├─────────────────────────────────────────────────────────────────┤
│ • fetch-offer-data (task pura)                                 │
│ • @copy-chief: interpret-offer-data                           │
│ • spy-scrape → spy-transcribe → spy-reconstruct (autônomo)    │
│ • catalog-references → deconstruct-references (task pura)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: STRATEGY                                               │
├─────────────────────────────────────────────────────────────────┤
│ • @stefan-georgi: suggest-angles                              │
│ • @copy-chief: select-method (modelagem vs do-zero)           │
│ • @copy-chief: decide-format (imagem vs vídeo)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: PRODUCTION (Branch por formato)                        │
├─────────────────────────────────────────────────────────────────┤
│ [ADS — IMAGEM]                                                 │
│ • @stefan-georgi: generate-image-concepts                     │
│                                                                 │
│ [ADS — VÍDEO]                                                  │
│ • @stefan-georgi: generate-scripts                            │
│ • @stefan-georgi: generate-ad-copy                            │
│                                                                 │
│ [VSL — FUTURO v4.1]                                            │
│ • @vsl-writer: generate-vsl-outline                           │
│ • @vsl-writer: generate-vsl-script                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: REVIEW                                                 │
├─────────────────────────────────────────────────────────────────┤
│ • @copy-chief: review-image-concept (se imagem)               │
│ • @copy-chief: review-creative (se vídeo)                     │
│ • @copy-chief: review-vsl-script (FUTURO v4.1)                │
│ • @copy-chief: cross-format-consistency-check                 │
│   ↓                                                            │
│ APPROVED | REVISION_NEEDED                                     │
│   ↓ (max 2 rodadas)                                           │
│ Se REVISION: request-revision → volta Production              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FASE 5: DELIVERY                                               │
├─────────────────────────────────────────────────────────────────┤
│ [IMAGEM]                                                       │
│ • generate-image-prompts → generate-images-api                │
│ • package-image-creative → HANDOFF squad-criativos (visual)   │
│                                                                 │
│ [VÍDEO]                                                        │
│ • build-video-brief → HANDOFF squad-criativos (produção)      │
│                                                                 │
│ [VSL — FUTURO v4.1]                                            │
│ • package-vsl-script → HANDOFF squad-ofertas (funnel)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📤 Handoffs

### INPUT (squad-copy CONSOME)

**squad-ofertas:**
- `offer.yaml` (ICP, mecanismo, Big Idea)
- `compliance/rules.md` (regras por geo + plataforma)
- `performance.yaml` (winners, métricas)

### OUTPUT (squad-copy PRODUZ)

**→ squad-criativos (visual/produção):**
- Ad copy completo (headlines, descriptions, primary texts)
- Image concepts
- Video briefs
- Platform specs

**→ squad-ofertas (funnel deployment) — FUTURO:**
- VSL scripts (v4.1)
- Landing page copy (v4.2)
- Email sequences (v4.3)

---

## 📊 Arquitetura

| Componente | Quantidade v4.0 | Roadmap Futuro |
|-----------|-----------------|----------------|
| Agents | 2 (@copy-chief, @stefan-georgi) | +3 (vsl-writer, lp-copywriter, email-copywriter) |
| Tasks | 23 (6 agent, 17 puras) | +12 (VSL, LP, Email) |
| Workflows | 1 (creative-pipeline) | +2 (vsl-pipeline, funnel-copy-pipeline) |
| Templates | 2 (Meta, TikTok) | +4 (VSL, LP, Email) |

---

## 🏗️ Estrutura de Arquivos

```
squad-copy/
├── README.md                       # Este arquivo
├── squad.yaml                      # Manifest do squad
├── agents/
│   ├── copy-chief.md              # Lead Agent (QA, estratégia)
│   └── stefan-georgi.md           # Production Agent (ads)
├── tasks/
│   ├── fetch-offer-data.md
│   ├── interpret-offer-data.md
│   ├── suggest-angles.md
│   ├── generate-ad-copy.md
│   ├── generate-image-concepts.md
│   ├── review-image-concept.md
│   ├── review-creative.md
│   ├── package-image-creative.md
│   └── ... (23 tasks total)
├── workflows/
│   └── creative-pipeline.yaml      # Workflow principal
├── templates/
│   ├── META-AD-COPY-template.md
│   └── TIKTOK-AD-COPY-template.md
├── data/
│   ├── geo-cultural-guide.md
│   └── winners-library.md
└── config/
    └── creative-direction.md
```

---

## 📝 Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 4.0.0 | 2026-02-20 | **REBRAND:** dr-criativos → squad-copy (Persuasion Engine). Nova missão, roadmap VSL/LP/Email |
| 3.3.0 | 2026-02-20 | Output structure flat, templates Meta/TikTok |
| 3.2.0 | 2026-02-20 | Limpeza artifacts deprecated |
| 3.1.0 | 2026-02-20 | Geo e compliance centralizados na oferta |
| 3.0.0 | 2026-02-20 | Pipeline autônomo, spy automatizado |
| 2.0.0 | 2026-02-17 | Redesign task-first (5→2 agentes) |
| 1.0.0 | 2026-02-15 | Versão inicial (5 agentes) |

---

## 🤝 Contribuindo

Este squad segue a **arquitetura task-first do AIOS**. Ao adicionar novos componentes:

1. **Tasks primeiro** — Definir inputs, outputs, pre/post-conditions
2. **Agents quando necessário** — Apenas onde precisa julgamento
3. **Validar dependencies** — Garantir que orquestrador pode compor dinamicamente
4. **Documentar handoffs** — Interfaces claras entre squads

---

**Rebrand Rationale:** Expandir escopo para TODA copy persuasiva, garantir consistência cross-format, orquestração centralizada via @copy-chief. v4.0 mantém escopo atual (ad copy), roadmap documenta expansão gradual e sustentável.

---

*Squad mantido por @squad-creator (Craft) — Motor de Persuasão em evolução* 🏗️
