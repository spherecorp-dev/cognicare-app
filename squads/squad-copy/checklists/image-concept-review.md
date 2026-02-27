# Image Concept Review Checklist

**Purpose:** Validação de conceitos visuais + ad copy ANTES de gerar imagens via API (economiza custo/tempo).

**Used by:** @copy-chief durante task `review-image-concept`

**Frequency:** Para cada conceito visual gerado

---

## ✅ CRITÉRIOS ELIMINATÓRIOS (PASS/FAIL)

Se QUALQUER item falhar → REJECTED

- [ ] **Compliance Visual:** Conceito não viola regras da plataforma/geo
  - Verificar: `offer/compliance/rules.md`
  - Red flags: imagens médicas explícitas, before/after proibidos, claims visuais absolutos

- [ ] **Creative Profile:** Alinhado com perfil da oferta
  - Verificar: `config/creative-direction.md`
  - Ex blackhat-dr: Parece orgânico/notícia, não parece ad

- [ ] **Texto Overlay:** Máximo 50 palavras, legível em mobile
  - Fonte grande o suficiente (min 48px equivalent)
  - Contraste adequado (texto vs background)

- [ ] **Geo-Cultural:** Visualmente apropriado para target geo
  - FR: Sóbrio, científico
  - ES: Emocional, familiar, cores quentes
  - EN: Clean, profissional, benefício claro

- [ ] **Platform Fit:** Funciona nos placements target
  - Meta Feed (1080x1350): Composição vertical
  - Stories/Reels (1080x1920): Foco central, safe zones
  - TikTok In-Feed (1080x1920): Parece orgânico

---

## 📊 CRITÉRIOS DE QUALIDADE (Score 1-5)

Score médio <3.0 → REVISION_NEEDED

### 1. Visual Hook (1-5)

- **5 — Excelente:** Para scroll. Curiosidade visual imediata.
- **4 — Bom:** Chama atenção. Destaca no feed.
- **3 — OK:** Visível mas não destaca.
- **2 — Fraco:** Genérico. Passa batido.
- **1 — Falha:** Invisível. Zero impacto.

**Score:** _____/5

### 2. Clareza Visual (1-5)

- **5 — Excelente:** Mensagem óbvia em <1 segundo.
- **4 — Bom:** Claro e compreensível.
- **3 — OK:** Compreensível mas requer atenção.
- **2 — Fraco:** Confuso. Muita informação.
- **1 — Falha:** Incompreensível.

**Score:** _____/5

### 3. Texto Overlay Quality (1-5)

- **5 — Excelente:** Hook perfeito. Legível. Impactante.
- **4 — Bom:** Bom hook, legível.
- **3 — OK:** Funcional mas genérico.
- **2 — Fraco:** Fraco ou ilegível.
- **1 — Falha:** Ruim ou ausente.

**Score:** _____/5

### 4. Consistência com Ângulo (1-5)

- **5 — Excelente:** Visual reforça ângulo perfeitamente.
- **4 — Bom:** Bem alinhado.
- **3 — OK:** Alinhamento parcial.
- **2 — Fraco:** Desvia do ângulo.
- **1 — Falha:** Contradiz o ângulo.

**Score:** _____/5

### 5. Ad Copy Quality (1-5)

- **5 — Excelente:** 5 formatos robustos, 3 combos A/B prontos.
- **4 — Bom:** Copy sólido, bem estruturado.
- **3 — OK:** Funcional mas genérico.
- **2 — Fraco:** Copy fraco ou incompleto.
- **1 — Falha:** Copy inadequado.

**Score:** _____/5

---

## 🎨 VALIDAÇÃO TÉCNICA

- [ ] **Aspect Ratios:** Conceito funciona em todos os sizes necessários
  - Feed 1080x1350 (4:5)
  - Stories 1080x1920 (9:16)
  - Square 1080x1080 (1:1) — se aplicável

- [ ] **Composition:** Elementos importantes em safe zones
  - Mobile: 20% margens laterais
  - Stories/Reels: Top 250px e bottom 250px evitados (UI overlap)

- [ ] **Text Readability:** Texto overlay legível em todos os sizes
  - Min 48px equivalent em mobile
  - Contraste ≥4.5:1 (WCAG AA)

---

## 📈 SCORE FINAL

**Total:** _____/25
**Média:** _____/5

**Decisão:**
- ≥4.0 → **APPROVED** (pode gerar imagem)
- 3.0-3.9 → **APPROVED WITH OBSERVATIONS** (gerar com notas)
- 2.0-2.9 → **REVISION_NEEDED** (ajustar conceito antes de gerar)
- <2.0 → **REJECTED** (refazer conceito)

---

## 📝 FEEDBACK (se REVISION_NEEDED ou REJECTED)

**Conceito Visual:**
- _______________________________________
- _______________________________________

**Texto Overlay:**
- _______________________________________
- _______________________________________

**Ad Copy:**
- _______________________________________
- _______________________________________

---

## ✅ APROVAÇÃO FINAL

- [ ] Todos critérios eliminatórios PASS
- [ ] Score ≥3.0
- [ ] Validação técnica OK
- [ ] Feedback documentado (se aplicável)
- [ ] Review round registrado (máx 2)

**Reviewer:** @copy-chief
**Date:** ___________
**Verdict:** APPROVED | APPROVED WITH OBSERVATIONS | REVISION_NEEDED | REJECTED
