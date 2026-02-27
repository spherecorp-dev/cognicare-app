# Compliance Check Checklist

**Purpose:** Validação de compliance por geo e plataforma antes de aprovar criativos.

**Used by:** @copy-chief durante review tasks, @qa antes de delivery

**Source of Truth:** `data/offers/{ID}/compliance/rules.md`

**Frequency:** Para cada creative antes de APPROVED

---

## 📋 GEO-SPECIFIC COMPLIANCE

### FR (France) — DGCCRF + ARPP

- [ ] **Health Claims**
  - Nenhum claim absoluto de cura/tratamento
  - Claims devem ser "peut aider à" ou "contribue à"
  - Não usar "guérit", "traite", "soigne"

- [ ] **Scientific Authority**
  - Não citar estudos sem referência completa
  - Não usar "scientifiquement prouvé" sem evidência
  - Pode usar "selon des recherches" (genérico OK)

- [ ] **Price/Guarantee**
  - Preço deve ter disclaimer claro
  - "Satisfait ou remboursé" precisa condições explícitas
  - Não esconder custos adicionais (shipping, etc)

- [ ] **Visual**
  - Before/after médico: PROIBIDO
  - Imagens de profissionais saúde: disclaimers necessários

### ES (Spain) — AEPD + Autocontrol

- [ ] **Health Claims**
  - Similar a FR, claims devem ser modestos
  - Pode ser mais emocional que FR (testemunhos OK)
  - Não usar "cura", "elimina completamente"

- [ ] **Testimonials**
  - Testemunhos reais permitidos
  - Deve ter disclaimer "resultados individuais variam"
  - Não pode parecer garantia universal

- [ ] **Price/Guarantee**
  - Similar a FR
  - Transparência de preço obrigatória
  - Garantias precisam condições claras

### EN (US/UK) — FTC + ASA

- [ ] **Health Claims (FTC)**
  - Evitar claims absolutos sem evidência científica
  - "May help", "supports" são seguros
  - "Cures", "treats" requerem aprovação FDA (evitar)

- [ ] **Income/Results Claims**
  - Se não é saúde: pode ser B2B/income opportunity
  - Precisa disclaimers "results not typical"
  - Não garantir valores específicos sem prova

- [ ] **Social Proof**
  - Testemunhos devem ser verificáveis
  - Números (X pessoas usaram) devem ser reais
  - "As seen on" precisa ser verdade

---

## 🔒 PLATFORM-SPECIFIC COMPLIANCE

### Meta (Facebook/Instagram)

- [ ] **Health Products**
  - Proibido before/after de perda peso/mudança corporal
  - Proibido targeting por condições de saúde sensíveis
  - Imagens de partes do corpo: evitar zoom excessivo

- [ ] **Clickbait**
  - Não usar "Você não vai acreditar..."
  - Não fazer perguntas retóricas enganosas
  - Landing page deve entregar o prometido no ad

- [ ] **Sensationalism**
  - Não usar CAPS LOCK excessivo
  - Não usar símbolos repetidos (!!!, ???)
  - Tom deve ser informativo, não alarmista

### TikTok

- [ ] **Organic Look**
  - Ads devem parecer conteúdo orgânico
  - Evitar aparência de "hard sell"
  - Preferred: UGC style, testemunhal, educacional

- [ ] **Health/Wellness**
  - Ainda mais restritivo que Meta
  - Before/after: PROIBIDO (todos os casos)
  - Claims devem ser extremamente modestos

- [ ] **Music/Voiceover**
  - Se usar música: deve ter licença
  - Voiceover: não pode ser agressivo/alarmista

---

## ⚠️ UNIVERSAL RED FLAGS

**Se encontrar QUALQUER item abaixo → REJECTED imediato**

- [ ] **Claims Absolutos**
  - "Cura diabetes"
  - "Elimina 100% da dor"
  - "Garantido funcionar"
  - "Resultados em 24h" (sem evidência)

- [ ] **Deceptive Tactics**
  - Fake scarcity ("últimas 3 unidades" sendo falso)
  - Fake urgency (timer resetando)
  - Fake social proof (reviews inventadas)

- [ ] **Illegal Products**
  - Substâncias controladas sem prescrição
  - Suplementos proibidos (ex: efedrina)
  - Medical devices não aprovados

- [ ] **Targeting Vulnerabilities**
  - Explorar medo excessivamente
  - Targeting crianças (produtos adulto)
  - Targeting idosos de forma predatória

---

## 📊 COMPLIANCE SCORE

**Critical Issues:** _____ (must be 0 to APPROVE)
**Warnings:** _____ (document but may proceed)
**Notes:** _____ (observations for optimization)

**Decisão:**
- 0 critical → **COMPLIANT** (pode aprovar)
- 1+ critical → **NON-COMPLIANT** (rejeitar ou ajustar)

---

## 📝 NON-COMPLIANCE REPORT (if applicable)

**Issue:** _______________________________________
**Location:** Copy | Visual | Claim | Other
**Severity:** Critical | Warning | Note
**Fix Required:** _______________________________________

---

## ✅ FINAL VALIDATION

- [ ] Checked against offer compliance rules (source of truth)
- [ ] Geo-specific rules validated
- [ ] Platform-specific rules validated
- [ ] Universal red flags verified (0 found)
- [ ] Critical issues: 0

**Reviewer:** _____________
**Date:** ___________
**Geo:** FR | ES | EN
**Platform:** Meta | TikTok | YouTube | Native
**Verdict:** COMPLIANT | NON-COMPLIANT
