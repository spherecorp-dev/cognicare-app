# WAGGO — Fase 0.3: Funnel Hack Report

> **Autor:** Russell Brunson (Funnel Architect)
> **Task:** `*funnel-hack`
> **Offer:** WAGGO — Nutrição Inteligente para Pets
> **Data:** 2026-02-26
> **Status:** Completo

---

Deixa eu te contar uma coisa...

Antes de construir UM UNICO funil pro WAGGO, eu fiz o que SEMPRE faço.

Eu passei pelos funis dos MAIORES players do mercado pet nutrition. **Comprei. Cliquei. Li cada email.** Anotei TUDO.

Porque funnel hacking não é copiar. É **ENTENDER** o que funciona... e por que funciona.

E o que eu encontrei? Vou ser honesto contigo...

**O mercado pet nutrition está sentado em cima de uma mina de ouro... e quase ninguém sabe explorar direito.**

Vamos lá.

---

## Os 5 Funis que Eu Hackeei

Analisei 5 players. Três são gigantes do fresh pet food DTC. Dois são apps de nutrição (nossos concorrentes diretos).

Cada um tem algo brilhante... e cada um tem **buracos enormes**.

---

## Concorrente 1: The Farmer's Dog

**O Gorila de $1.2B/ano**

```yaml
competitor_funnel:
  name: "The Farmer's Dog"
  url: "thefarmersdog.com"
  niche: "Fresh pet food delivery (DTC subscription)"
  revenue: "$1.2B annualized"

  pages:
    - page: "Quiz Obrigatório (Hook)"
      headline: "Every dog deserves real food"
      subheadline: "(Sem subheadline — direto pro quiz)"
      cta: "See My Dog's Plan"
      elements: ["Quiz obrigatório", "Sem preço visível", "Zero distração"]

    - page: "Quiz (10-12 perguntas)"
      structure: "1 pergunta por tela, progress bar"
      questions: ["Nome do cão", "Raça", "Idade", "Peso", "Body condition", "Nível de atividade", "Alergias", "Comida atual", "Goals"]
      psychology: "Micro-commitments progressivos. Dar o nome do cão = investimento emocional MASSIVO"

    - page: "Resultado + Preço"
      offer: "Plano personalizado para [Nome do Cão]"
      pricing: "~$150-250/mês (varia por peso)"
      trial: "50% off primeira caixa"
      elements: ["Plano com nome do cão", "Ingredientes listados", "Before/after fotos", "Vet endorsements"]

    - page: "Checkout"
      bump: "Treats add-on"
      upsell: "Subscription mais longa = mais desconto"

  email_sequence:
    - day: 0
      type: "delivery"
      content: "Welcome + tracking info"
    - day: 1
      type: "story"
      content: "Fundadores e a história da marca"
    - day: 3
      type: "urgency"
      content: "Reminder — your dog's plan is waiting"
    - day: 5
      type: "pitch"
      content: "Desconto escalante (20% → 30%)"
    - day: 7
      type: "urgency"
      content: "Final reminder + 50% off"
    - day: 14
      type: "story"
      content: "Transformação de outro cão"

  hooks:
    headline: "Every dog deserves real food"
    hook_type: "aspirational + guilt"
    why_it_works: "Posiciona ração como 'não real'. Se amas teu cão, dá comida de VERDADE."

  stack:
    components: ["Plano personalizado", "Comida fresh entregue", "Porções calculadas", "Ingredientes human-grade"]
    total_value: "Não explicitam valor total"
    price: "~$150-250/mês"
    guarantee: "Money-back + easy cancel"

  strengths:
    - "Quiz obrigatório = COMPROMETIMENTO PSICOLÓGICO brutal"
    - "Personalização com nome do cão = emocional"
    - "Super Bowl ad = awareness monstruosa (89% branded traffic)"
    - "Email abandonment com descontos escalantes (20% → 50%)"
    - "Storytelling clean e emocional"

  weaknesses:
    - "CARO. $150-250/mês é proibitivo pra maioria"
    - "Sem educação. Só vende A COMIDA DELES"
    - "Sem opção DIY. Se quero fazer em casa, TFD não me serve"
    - "Quiz longo (10-12 steps). Ollie provou que menos = mais"
    - "Zero conteúdo educacional no funil"
```

### O que eu ROUBO do TFD:

1. **Quiz obrigatório com nome do pet.** Isso é GENIAL. O momento que o tutor digita "Luna" ou "Thor", ele não vai mais embora. É investimento emocional puro.

2. **Email abandonment escalante.** 20% no site, 30% por email, 50% no desespero. Funciona. Simples assim.

3. **Simplicidade brutal.** Zero distração. Uma coisa por tela. Progress bar.

### O que eles fazem ERRADO pra nós:

**Eles vendem COMIDA. Nós vendemos CONHECIMENTO.** Totalmente diferente. TFD resolve o problema tirando o tutor da equação — "a gente cozinha, você só serve". WAGGO resolve o problema EMPODERANDO o tutor — "a gente te ensina e automatiza, você FAZ".

Essa é a diferença entre product funnel e SaaS funnel. E é por isso que precisamos de um approach diferente.

---

## Concorrente 2: Nom Nom (Mars, $1B)

**O Científico com Microbioma**

```yaml
competitor_funnel:
  name: "Nom Nom"
  url: "nomnomnow.com"
  niche: "Fresh pet food + microbiome testing"
  revenue: "Parte da Mars ($1B aquisição)"

  pages:
    - page: "Landing Page"
      headline: "Real food, made for your pet"
      subheadline: "Fresh, human-grade recipes tailored to your pet's needs"
      cta: "Build My Plan"
      elements: ["Science-forward", "Microbiome messaging", "Vet endorsements"]

    - page: "Quiz (8-10 perguntas)"
      structure: "Similar ao TFD — nome, raça, peso, condições"
      differentiator: "Perguntas sobre saúde digestiva (gut health angle)"

    - page: "Resultado + Preço"
      offer: "Fresh food plan + optional microbiome kit"
      pricing: "~$200-280/mês"
      trial: "Money-back guarantee"

  hooks:
    headline: "Real food, made for your pet"
    hook_type: "aspirational + science"
    why_it_works: "Combina emoção (real food) com credibilidade (science)"

  stack:
    components: ["Fresh recipes", "Nutrient mix", "Microbiome testing kit (upsell)"]
    total_value: "Não explicitam"
    price: "~$200-280/mês + $100 microbiome kit"
    guarantee: "Money-back"

  strengths:
    - "Microbiome angle = diferenciação ÚNICA"
    - "Suporta GATOS (único entre os DTC fresh)"
    - "Credibilidade Mars (ciência, research)"
    - "Gut health messaging é tendência crescente"

  weaknesses:
    - "Traffic baixo (62K/mês vs 3M do TFD)"
    - "MAIS CARO que TFD"
    - "Quiz genérico — não tão emocional quanto TFD"
    - "Microbiome kit é caro ($100) e assusta"
    - "Awareness fraquíssima comparada ao TFD"
```

### O que eu ROUBO do Nom Nom:

1. **O ângulo de gut health/microbioma.** Isso é TENDÊNCIA. Todo mundo está falando de saúde intestinal — pra humanos E pra pets. WAGGO tem o módulo de Modulação Intestinal. Precisa usar isso no posicionamento.

2. **Suporte a gatos.** Nenhum concorrente DTC (exceto Nom Nom) foca em gatos. WAGGO suporta cães E gatos. **Diferenciador massivo.**

### O que eles fazem ERRADO:

Awareness quase ZERO. Ter a Mars por trás e ainda ter só 62K visitas/mês... prova que ciência sozinha não vende. Precisa de **storytelling + personalização + funil emocional**.

---

## Concorrente 3: Ollie

**O Quiz Otimizado**

```yaml
competitor_funnel:
  name: "Ollie"
  url: "myollie.com"
  niche: "Human-grade fresh + baked pet food"

  pages:
    - page: "Landing Page"
      headline: "The healthiest food for the happiest dogs"
      cta: "Get 60% Off"
      elements: ["Desconto agressivo upfront", "Clean design", "Multi-plan options"]

    - page: "Quiz (8 perguntas — otimizado de 12)"
      structure: "Redesenhado. Removeram 4 perguntas redundantes"
      result: "+10% conversão com quiz mais curto"
      questions: ["Basics (nome, raça, peso)", "Activity", "Health concerns", "Current food", "Goals"]
      psychology: "Menos fricção = mais completude"

    - page: "Resultado com 4 Planos"
      offer: "Fresh ($$$), Half-Fresh ($$), Baked ($), Mixed ($$)"
      pricing: "Variável — $5-12/dia"
      trial: "60% off starter box"

  hooks:
    headline: "The healthiest food for the happiest dogs"
    hook_type: "aspirational"
    why_it_works: "Health + happiness. Dois desejos em uma frase."

  stack:
    components: ["Fresh/baked recipes", "Portion-controlled packs", "Free shipping"]
    total_value: "Não explicitam"
    price: "$5-12/dia"
    guarantee: "60% off + easy cancel"

  strengths:
    - "Quiz OTIMIZADO (12 → 8 = +10% conversão)"
    - "4 PLANOS de preço = captura mais mercado"
    - "Health screening tech (DIG Labs acquisition)"
    - "Design clean e humano"
    - "Desconto agressivo no first box"

  weaknesses:
    - "Só cães — sem gatos"
    - "Brand voice genérica — não memorável"
    - "Sem educação — vende comida, não conhecimento"
    - "Sem microbioma ou ciência profunda"
```

### O que eu ROUBO do Ollie:

1. **Quiz de 8 steps, MAX.** Eles PROVARAM com dados: menos perguntas = mais conversão. +10% é massivo. WAGGO: 7 perguntas. Ponto final.

2. **Múltiplos tiers de preço.** 4 planos = 4 faixas de preço = 4x mais mercado capturado. WAGGO precisa de tiers claros (Free → Essential → Pro → VetConnect).

3. **Desconto agressivo no primeiro contato.** 60% off é BOLD. Para SaaS, o equivalente é trial gratuito de 7 dias com acesso total.

### O que eles fazem ERRADO:

Voz de marca **genérica**. Não memorável. Não tem Attractive Character, não conta histórias. É funcional demais. **WAGGO pode ter personalidade.**

---

## Concorrente 4: JustFoodForDogs

**O Anti-Marketing Científico**

```yaml
competitor_funnel:
  name: "JustFoodForDogs"
  url: "justfoodfordogs.com"
  niche: "Vet-formulated fresh food (omnichannel)"

  pages:
    - page: "Landing Page"
      headline: "Real food. Real ingredients. Real results."
      cta: "Shop Now / Build a Custom Meal"
      elements: ["Sem quiz obrigatório", "Pode comprar direto", "Research-backed claims"]

    - page: "Opções de Compra"
      options: ["DIY Nutrient Blends ($20-40)", "Fresh meals ($100-200/mês)", "Pantry Fresh (shelf-stable)"]
      differentiator: "MÚLTIPLOS formatos — não só subscription"

    - page: "Calculadora de Calorias (Free Tool)"
      type: "Lead magnet funcional"
      psychology: "Dá valor gratuito, builds trust, captures leads"

  hooks:
    headline: "Real food. Real ingredients. Real results."
    hook_type: "authority + simplicity"
    why_it_works: "Tripla repetição de 'Real'. Anti-bullshit positioning."

  anti_marketing_positioning:
    quote: "They bring the marketing, we bring the science"
    investment: "$5.5M em pesquisa veterinária (= custo de um Super Bowl ad)"

  stack:
    components: ["Vet-formulated recipes", "Research-backed", "DIY kits", "Retail access"]
    total_value: "Não explicitam"
    price: "Variável ($20-200+/mês)"
    guarantee: "Not explicitly stated"

  strengths:
    - "Omnichannel (DTC + PetSmart + Petco + lojas próprias + Amazon + Chewy)"
    - "Preço MAIS ACESSÍVEL do segmento fresh"
    - "DIY Nutrient Blends = PRODUTO PARA QUEM QUER FAZER EM CASA"
    - "Research credibility ($5.5M investidos)"
    - "Sem quiz obrigatório = menos fricção para compradores diretos"
    - "Calculadora free como lead magnet"

  weaknesses:
    - "Sem quiz = menos personalização e menos dados"
    - "Anti-marketing pode limitar growth"
    - "Só cães — sem gatos"
    - "Site mais confuso (muitas opções)"
    - "Sem email sequence forte (sem quiz = menos nurture)"
```

### O que eu ROUBO do JFFD:

1. **Calculadora free como lead magnet.** ISSO É O WAGGO. Ferramenta gratuita que dá valor real e captura leads. O quiz do WAGGO pode ter uma versão "light" como calculadora free.

2. **DIY Nutrient Blends.** Eles são os ÚNICOS que servem quem quer fazer comida em casa. WAGGO é TODO sobre isso. Podemos dominar esse segmento que o JFFD mal explora.

3. **"Ciência sobre marketing" como posicionamento.** Não precisa gritar. Se teu produto é bom, deixa a ciência falar. WAGGO pode usar dados e pesquisa como proof.

### O que eles fazem ERRADO:

Site CONFUSO. Muitas opções, muitos paths, sem guia. O quiz resolve isso — **guia o tutor até a solução certa sem fricção**. E eles praticamente IGNORAM email nurture.

---

## Concorrente 5: Apps de Nutrição Pet (Concorrentes DIRETOS)

**Os que ninguém tá prestando atenção... mas deveria.**

```yaml
competitor_funnel:
  name: "Apps de Nutrição Pet (categoria)"
  players:
    - name: "Animal Diet Formulator (ADF)"
      price: "$299/1o ano, $49/ano depois"
      funnel: "Direto — LP → checkout. Sem quiz, sem nurture"
      strengths: "Mais completo do mercado, multi-platform"
      weaknesses: "CARO. UX intimidadora. Parece software de engenheiro, não de tutor de pet"
      key_learning: "Prova que pet owners PAGAM por ferramenta de nutrição. $299 é alto mas tem mercado"

    - name: "BalanceIT"
      price: "FREE (monetiza via suplementos)"
      funnel: "Free tool → recomendação de suplemento → checkout"
      strengths: "Credibilidade veterinária, gratuito, maior base de usuários"
      weaknesses: "UI de 2005. Não mobile. Experiência confusa. Parece planilha glorificada"
      key_learning: "Free tool → product recommendation é modelo validado. Mas a UX importa"

    - name: "Meatpoint.io"
      price: "~$5-10/mês"
      funnel: "Simples — LP → trial → subscription"
      strengths: "Validação nutricional automática, à prova de erros, preço acessível"
      weaknesses: "Nicho BARF apenas, pequeno, pouca awareness"
      key_learning: "Preço sweet spot. Automação como diferenciador. Funciona"

    - name: "PAWSM"
      price: "FREE"
      funnel: "Free app, sem monetização clara"
      strengths: "Nutrition calculator, multi-dog"
      weaknesses: "Features limitadas, sem modelo de negócio claro"

    - name: "Feed Real"
      price: "FREE (funil da marca de suplementos)"
      funnel: "Free tool → brand loyalty → supplement sales"
      strengths: "Ajusta receitas com ingredientes disponíveis"
      weaknesses: "Web-only, vinculado à marca, limitado"

  category_analysis:
    common_pattern: "Quase TODOS são grátis ou têm UX terrível"
    pricing_gap: "ADF=$299/ano vs maioria=FREE. NINGUÉM no sweet spot $5-15/mês com UX boa"
    funnel_gap: "NENHUM app de nutrição tem quiz funnel, email sequence ou onboarding real"
    ux_gap: "Feitos por nutricionistas, não por designers de produto"
    mobile_gap: "Poucos são mobile-first. A maioria é web desktop"
```

### O que eu ROUBO dos apps:

1. **Análise nutricional completa + compliance AAFCO/FEDIAF.** Isso é o core. WAGGO precisa ser preciso.

2. **Automação como feature-chave.** Meatpoint mostra que "à prova de erros" é um selling point forte.

3. **ADF prova que o mercado PAGA.** $299/ano por uma UX horrível. Imagine o que pagam por uma UX BONITA.

### O que TODOS fazem ERRADO:

**NENHUM app de nutrição pet tem funil de verdade.**

Vou repetir porque é importante...

**NENHUM. TEM. FUNIL.**

Sem quiz. Sem onboarding. Sem email sequence. Sem stack. Sem storytelling.

São ferramentas, não experiências.

E **isso** é o whitespace do WAGGO.

---

## Análise de Padrões

Agora vem a parte boa. Cruzei os 5 funis e olha o que emerge...

### Padrões Comuns

| Padrão | TFD | Nom Nom | Ollie | JFFD | Apps |
|--------|-----|---------|-------|------|------|
| **Quiz obrigatório** | SIM | SIM | SIM | NÃO | NÃO |
| **Nome do pet no quiz** | SIM | SIM | SIM | N/A | N/A |
| **Personalização por pet** | SIM | SIM | SIM | PARCIAL | SIM |
| **Email abandonment** | SIM (escalante) | SIM | SIM | FRACO | NÃO |
| **Desconto no 1o contato** | 50% off | Money-back | 60% off | 50% off | N/A |
| **Storytelling** | FORTE | MÉDIO | FRACO | FRACO | ZERO |
| **Educação no funil** | NÃO | NÃO | NÃO | POUCO | NÃO |
| **The Stack** | NÃO | NÃO | NÃO | NÃO | NÃO |
| **Soap Opera Sequence** | NÃO | NÃO | NÃO | NÃO | NÃO |
| **Múltiplos tiers** | NÃO | NÃO | SIM (4) | SIM (3) | VARIA |
| **Suporte gatos** | NÃO | SIM | NÃO | NÃO | VARIA |
| **Mobile-first** | SIM | SIM | SIM | SIM | NÃO |
| **Onboarding real** | BÁSICO | BÁSICO | BÁSICO | NÃO | NÃO |

### O que TODOS fazem (validado pelo mercado):

1. **Quiz como porta de entrada.** 3 de 5 usam quiz obrigatório. É o padrão.
2. **Personalização com nome do pet.** Emocional. Funciona. Padrão.
3. **Desconto agressivo no primeiro contato.** 50-60% off ou free trial.
4. **Mobile-first.** Óbvio em 2026.

### O que NINGUÉM faz (oportunidade WAGGO):

1. **Educação real no funil.** Ninguém ensina. Todos vendem.
2. **The Stack.** Nenhum concorrente empilha valor.
3. **Soap Opera Sequence.** Emails são genéricos — delivery, reminder, desconto. Nenhum conta HISTÓRIA.
4. **Onboarding com Small Win Engineering.** Todos mandam comida. Ninguém engenheira o "Aha Moment".
5. **Identidades aspiracionais.** Nenhum quiz dá um PERFIL com identidade. É tudo "seu plano personalizado".

---

## Recomendações para o Funil WAGGO

Aqui é onde juntamos tudo...

### 1. Estrutura do Funil: Quiz Funnel → Onboarding → SaaS Conversion

```
[Ads/Content] → [Quiz Funnel (7 perguntas)] → [Opt-in Gate] →
[Resultado = Identidade Aspiracional] → [Trial 7d Gratuito] →
[Onboarding com Small Win < 2min] → [Soap Opera Sequence (5 emails)] →
[Conversão Paga + The Stack]
```

**Por que quiz funnel?** Validado por TFD ($1.2B), Nom Nom, Ollie. É o padrão do mercado. Mas nós fazemos MELHOR — com identidades, epiphany bridges e storytelling que ninguém está usando.

### 2. Hooks: Combinação "Aspiracional + Dor + Mecanismo"

Os hooks dominantes no mercado são aspiracionais ("real food", "healthiest food"). Mas são genéricos.

**Nossa oportunidade:** Combinar aspiração com DOR ESPECÍFICA.

- **"Pare de adivinhar o que seu pet deve comer"** (dor #1: confusão)
- **"O nutricionista virtual do seu pet — 24/7, por menos que um café por dia"** (mecanismo + preço)
- **"73% dos tutores erram na proporção de nutrientes. Descubra se você é um deles"** (medo + quiz hook)

### 3. Diferenciação: O que fazemos que NINGUÉM faz

| O que ELES fazem | O que NÓS fazemos de DIFERENTE |
|-----------------|-------------------------------|
| Vendem comida pronta | Empoderamos o tutor a fazer em casa |
| Quiz → preço | Quiz → identidade aspiracional → educação → trial |
| Emails genéricos (delivery, desconto) | Soap Opera Sequence (história, epifania, urgência) |
| Zero educação | Educação como selling point (9 módulos) |
| UX de engenheiro | UX bonita, mobile-first, AI-powered |
| $150-300/mês (comida) | $9.99/mês (ferramenta) — 15-30x mais barato |
| Sem Stack | Stack completo (valor 100x+) |

### 4. Stack: Empilhar o que eles NÃO empilham

Nenhum concorrente usa The Stack. **Nenhum.** Isso é oportunidade PURA.

WAGGO pode empilhar: Plano AI personalizado + 9 módulos + Receitas + Lista de compras + Acompanhamento de peso + Ajuste automático + Comunidade + Suporte.

**Valor percebido: $1.000+ vs $9.99/mês.**

### 5. Gaps = Oportunidade de Dominação

| Gap no Mercado | Como WAGGO Explora |
|---------------|-------------------|
| Nenhum SaaS pago dominante para nutrição pet DIY | Ser O SaaS. O "Canva da nutrição pet" |
| Apps existentes têm UX terrível | UX bonita, mobile-first, AI-first |
| Ninguém educa no funil | Educação como hook e diferenciador |
| Ninguém serve raw/BARF/AN com SaaS | WAGGO é 100% para esse público |
| Ninguém usa Soap Opera Sequence | Storytelling como engine de conversão |
| Ninguém tem onboarding com Small Win | Engenharia reversa do "Aha Moment" |
| Poucos suportam gatos | WAGGO suporta cães E gatos |
| Ninguém personaliza por IDENTIDADE | Quiz com perfis aspiracionais |

### 6. Email Strategy Baseada no Funnel Hack

O que funciona no mercado:
- **TFD:** Email abandonment com descontos escalantes (20% → 50%)
- **Timing:** Dia 0, 1, 3, 5, 7 — sequência de 7 dias
- **Tipo:** Os que convertem são os de URGÊNCIA + DESCONTO

**O que NÓS fazemos de diferente:**
- Soap Opera Sequence (5 emails com storytelling, não só desconto)
- Personalização por perfil do quiz (subject lines, histórias, proof diferentes)
- Quiz abandonment sequence separada (para quem não completou)
- Daily emails pós-conversão (Ben Settle style — reter e ascender)

---

## Funnel Stacking Inspirado pelo Hack

Olhando como os concorrentes se conectam (spoiler: mal se conectam)...

**O que eles fazem:**
```
Quiz → Produto → Email genérico → Cross-sell (talvez)
```

**O que NÓS vamos fazer:**
```
[Quiz Funnel] → [Soap Opera Emails] → [Trial 7d] → [Onboarding + Small Win] →
[Conversão Essential] → [Upgrade Emails] → [Pro Plan] →
[VetConnect (High-ticket)] → [Comunidade (Retenção)]
```

Cada funil alimenta o próximo. **Sistema, não página.**

Isso é funnel stacking de verdade. Isso é o que separa $100K/ano de $10M/ano.

---

## Veredicto Final

Deixa eu ser direto contigo...

O mercado de pet nutrition está **dominado por empresas de COMIDA** usando funis de quiz pra vender **comida pronta**.

Nenhum deles serve quem quer **FAZER em casa**.

Nenhum deles **educa**.

Nenhum deles usa **storytelling real** no funil.

Nenhum deles usa **The Stack**.

Nenhum deles faz **Soap Opera Sequence**.

Nenhum deles engenheira o **Aha Moment**.

E o mais louco?

**Nenhum SaaS dominante existe nesse espaço.** ADF cobra $299/ano com UX horrível. BalanceIT é free mas datado. Meatpoint é pequeno.

WAGGO pode ser o **ClickFunnels da nutrição pet**.

O app que todo tutor de AN/BARF usa. A ferramenta que todo grupo de Facebook recomenda. A referência que todo influencer pet compartilha.

Só precisa de um funil **bem arquitetado**.

E é exatamente isso que vamos construir.

---

*— Russell Brunson, sempre hackeando funis antes de construir*

*"You're just one funnel away."*
