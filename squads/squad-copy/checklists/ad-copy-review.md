# Ad Copy Review Checklist

**Purpose:** Validação sistemática de ad copy (headlines, descriptions, primary texts) antes de aprovar para produção.

**Used by:** @copy-chief durante tasks `review-creative` e `review-image-concept`

**Frequency:** Para cada batch de ad copy gerado

---

## ✅ CRITÉRIOS ELIMINATÓRIOS (PASS/FAIL)

Se QUALQUER item falhar → REJECTED

- [ ] **Compliance:** Zero claims proibidos para geo/plataforma
  - Verificar contra: `offer/compliance/rules.md`
  - Red flags: health claims absolutos, garantias irreais, preço sem disclaimers

- [ ] **Creative Profile:** Segue regras do perfil da oferta
  - Verificar: `config/creative-direction.md` + `offer.yaml → creative_profile`
  - Ex blackhat-dr: Nunca citar preço, nunca citar entregável, só curiosidade

- [ ] **Geo-Apropriado:** Tom cultural correto para target geo
  - FR: Formal, autoridade científica
  - ES: Emocional, testemunhal, família
  - EN: Benefício direto, pragmático

- [ ] **Platform Specs:** Dentro dos limites da plataforma
  - Meta headlines: ≤40 chars
  - Meta descriptions: ≤125 chars
  - TikTok captions: ≤150 chars

---

## 📊 CRITÉRIOS DE QUALIDADE (Score 1-5)

Score médio <3.0 → REVISION_NEEDED

### 1. Hook Strength (1-5)

- **5 — Excelente:** Para tudo. Curiosidade irresistível. FOMO imediato.
- **4 — Bom:** Chama atenção. Curiosidade clara.
- **3 — OK:** Funcional mas genérico.
- **2 — Fraco:** Não destaca. Parece spam.
- **1 — Falha:** Invisível. Zero impacto.

**Score:** _____/5

### 2. Clareza da Mensagem (1-5)

- **5 — Excelente:** Benefício óbvio em 3 segundos.
- **4 — Bom:** Claro após leitura completa.
- **3 — OK:** Compreensível mas requer esforço.
- **2 — Fraco:** Confuso. Benefício não claro.
- **1 — Falha:** Incompreensível.

**Score:** _____/5

### 3. Consistência com Ângulo (1-5)

- **5 — Excelente:** 100% alinhado com ângulo escolhido.
- **4 — Bom:** Bem alinhado.
- **3 — OK:** Alinhamento parcial.
- **2 — Fraco:** Desvia do ângulo.
- **1 — Falha:** Ângulo diferente/contradiz.

**Score:** _____/5

### 4. Variação/Criatividade (1-5)

- **5 — Excelente:** Abordagem única. Surpreende.
- **4 — Bom:** Criativo dentro do padrão.
- **3 — OK:** Funcional. Previsível.
- **2 — Fraco:** Clichê.
- **1 — Falha:** Copiado/genérico.

**Score:** _____/5

### 5. CTA / Próximo Passo (1-5)

- **5 — Excelente:** CTA óbvio e urgente.
- **4 — Bom:** CTA claro.
- **3 — OK:** CTA existe mas fraco.
- **2 — Fraco:** CTA confuso.
- **1 — Falha:** Sem CTA ou errado.

**Score:** _____/5

---

## 📈 SCORE FINAL

**Total:** _____/25
**Média:** _____/5

**Decisão:**
- ≥4.0 → **APPROVED**
- 3.0-3.9 → **APPROVED WITH OBSERVATIONS** (documentar)
- 2.0-2.9 → **REVISION_NEEDED** (listar itens para corrigir)
- <2.0 → **REJECTED** (refazer do zero)

---

## 📝 FEEDBACK (se REVISION_NEEDED ou REJECTED)

**O que precisa mudar:**
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Sugestões específicas:**
- _______________________________________
- _______________________________________

---

## ✅ APROVAÇÃO FINAL

- [ ] Todos critérios eliminatórios PASS
- [ ] Score ≥3.0
- [ ] Feedback documentado (se aplicável)
- [ ] Review round registrado (máx 2)

**Reviewer:** @copy-chief
**Date:** ___________
**Verdict:** APPROVED | APPROVED WITH OBSERVATIONS | REVISION_NEEDED | REJECTED
