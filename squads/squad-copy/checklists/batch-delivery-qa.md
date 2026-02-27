# Batch Delivery QA Checklist

**Purpose:** Validação final antes de handoff para squad-criativos (visual) ou gestor de tráfego.

**Used by:** @copy-chief ou @qa antes de marcar batch como `ready_for_traffic`

**Frequency:** Uma vez por batch completo (antes de delivery)

---

## 📦 ESTRUTURA DE ARQUIVOS

- [ ] **Diretórios criados corretamente**
  ```
  data/offers/{ID}/assets/criativos/batches/{timestamp}-batch-{num}/
  ├── BATCH-README.md
  ├── meta/
  │   ├── images/
  │   ├── META-AD-COPY.md
  │   └── batch-specs.yaml
  └── tiktok/
      ├── images/
      ├── TIKTOK-AD-COPY.md
      └── batch-specs.yaml
  ```

- [ ] **Naming Pattern:** Todas as imagens seguem padrão
  - `{OFFER}-{ANGLE}-{VARIATION}-{PLACEMENT}-{SIZE}.png`
  - Ex: `MEMFR02-A1-V1-feed-1080x1350.png`
  - Nenhum arquivo fora do padrão

- [ ] **Organizados por plataforma:** Meta e TikTok separados
  - Nenhuma imagem TikTok em meta/ e vice-versa

---

## 📄 DOCUMENTAÇÃO

- [ ] **BATCH-README.md existe e está completo**
  - Batch ID
  - Offer info
  - Total de criativos
  - Platforms
  - Geo
  - Método distribution
  - Quick summary

- [ ] **META-AD-COPY.md completo**
  - Header com batch info
  - Seção por criativo
  - 3 combos A/B recomendados por criativo
  - Mix & Match com todas as opções (5 headlines, 3 descriptions, 5 styles)
  - Metadata por criativo (compliance, review rounds, etc)

- [ ] **TIKTOK-AD-COPY.md completo** (se aplicável)
  - Header com batch info
  - Seção por criativo
  - 3 variações de caption (<150 chars)
  - Hashtags recomendados
  - Display name sugerido

- [ ] **batch-specs.yaml completo**
  - Batch metadata (ID, offer, geo, platform, created_at, pipeline_version)
  - Creatives array (id, angle, method, variation, images, copy_combos, compliance, review_rounds)
  - Stats (total_creatives, total_images, total_angles, methods distribution)
  - Status: ready_for_traffic

---

## 🖼️ IMAGENS (se aplicável)

- [ ] **Todas as imagens geradas**
  - Nenhum creative com imagem faltando
  - Todas aprovadas pelo @copy-chief

- [ ] **Formatos corretos**
  - Meta Feed: 1080x1350 (4:5)
  - Meta Stories/Reels: 1080x1920 (9:16)
  - TikTok In-Feed: 1080x1920 (9:16)

- [ ] **Qualidade visual**
  - Resolução mínima: 1080px
  - Texto overlay legível
  - Sem artefatos/erros de geração

- [ ] **Files sizes razoáveis**
  - Max 5MB por imagem (otimizar se maior)
  - Formato: PNG ou JPG

---

## ✅ COPY QUALITY

- [ ] **Todos os criativos têm copy completa**
  - Headlines (5 opções)
  - Descriptions (3 opções)
  - Primary texts (5 estilos: story, list, question, testimonial, news)

- [ ] **3 Combos A/B recomendados por criativo**
  - Combo 1, 2, 3 prontos para uso
  - Diferentes o suficiente para testar

- [ ] **Geo-adaptado**
  - Tom cultural correto (FR formal, ES emocional, EN benefício)
  - Não é tradução literal

- [ ] **Compliance validado**
  - Passed compliance-check.md
  - Zero critical issues

---

## 🎯 METADATA & TRACKING

- [ ] **Cada criativo tem ID claro**
  - Pattern: {OFFER}-{ANGLE}-{VARIATION}
  - Ex: MEMFR02-A1-V1, MEMFR02-A1-V2, MEMFR02-A2-V1

- [ ] **Metadata rastreável**
  - Angle name
  - Method (modelagem, do-zero, variação)
  - Variation tested (visual_style, headline, etc)
  - Compliance status
  - Review rounds
  - Image API used (se aplicável)

- [ ] **Stats corretos no batch-specs.yaml**
  - total_creatives bate com arquivos
  - total_images bate com arquivos
  - total_angles correto
  - methods distribution soma 100%

---

## 🚀 HANDOFF READINESS

- [ ] **Status field = ready_for_traffic**
  - No batch-specs.yaml

- [ ] **Nenhum creative com status PENDING ou REVISION_NEEDED**
  - Todos APPROVED

- [ ] **Pipeline version registrada**
  - pipeline_version: "4.0.1" (ou current)

- [ ] **Created_at timestamp correto**
  - ISO format: 2026-02-20T15:30:00Z

- [ ] **Target squad documentado**
  - Se imagem → squad-criativos (visual production)
  - Se vídeo → squad-criativos (video production)
  - Se VSL (futuro) → squad-ofertas (funnel)

---

## 📊 FINAL QUALITY SCORE

**Estrutura:** ___/5 (todos os arquivos e pastas OK)
**Documentação:** ___/5 (READMEs e specs completos)
**Copy Quality:** ___/5 (copy robusta e completa)
**Compliance:** ___/5 (zero critical issues)
**Metadata:** ___/5 (tracking completo)

**Total:** ___/25
**Média:** ___/5

**Decisão:**
- ≥4.5 → **READY FOR HANDOFF** (excelente)
- 4.0-4.4 → **READY WITH NOTES** (bom, documentar observações)
- 3.0-3.9 → **NEEDS MINOR FIXES** (ajustar antes de handoff)
- <3.0 → **NOT READY** (issues significativos)

---

## 📝 ISSUES ENCONTRADOS (se < 4.5)

1. _______________________________________
2. _______________________________________
3. _______________________________________

**Action Items:**
- [ ] _______________________________________
- [ ] _______________________________________

---

## ✅ FINAL APPROVAL

- [ ] Estrutura de arquivos 100% OK
- [ ] Documentação completa
- [ ] Copy quality ≥4.0
- [ ] Zero compliance critical issues
- [ ] Metadata rastreável
- [ ] Status: ready_for_traffic

**QA Reviewer:** _____________
**Date:** ___________
**Batch ID:** _______________________
**Verdict:** READY FOR HANDOFF | READY WITH NOTES | NEEDS FIXES | NOT READY
