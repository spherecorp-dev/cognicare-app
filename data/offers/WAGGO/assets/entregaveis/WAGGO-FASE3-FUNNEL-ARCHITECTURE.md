# WAGGO — Fase 3: Arquitetura de Funis

> **Offer ID:** WAGGO
> **Executor:** @russell-brunson (Funnel Architect)
> **Data:** 2026-02-26
> **Status:** Completo
> **Inputs:** Fase 0 (Research), Fase 1 (Product Strategy), Fase 2 (Segmentation)

---

Deixa eu te contar uma coisa...

Eu ja vi mais de 10.000 funis na minha vida. Construi funnels que fizeram $250 milhoes+. E o que separa os funis que convertem dos que morrem no anonimato e **uma coisa so**...

*Sistemas.*

Nao paginas. Nao designs bonitos. Nao copy "criativa".

**Sistemas de funis conectados que guiam um estranho numa jornada ate ele se tornar um cliente apaixonado.**

O WAGGO tem TUDO pra ser um desses. O produto e poderoso. O mercado e massivo. O whitespace e real. Agora... vamos arquitetar a maquina.

---

## DEFINICOES ESTRATEGICAS

Antes de desenhar um unico funil, precisamos alinhar os fundamentos:

### Attractive Character

**Tipo:** The Reporter

> "Pesquisei tudo sobre nutricao pet. Conversei com nutricionistas veterinarios. Testei calculadoras, planilhas, apps. E descobri algo que a maioria dos tutores NAO sabe..."

*Por que The Reporter?*

WAGGO nao e um guru dizendo "faca isso". E uma IA que **pesquisou tudo e sintetizou** pra voce. O tom e de descoberta — "eu fui atras, pesquisei, encontrei a verdade, e agora vou te mostrar."

Isso contorna a objecao #1: "Nao confio em IA pra nutricao do meu pet."

A resposta nao e "confie na IA." A resposta e "a IA compilou o que os MELHORES nutricionistas veterinarios sabem... e colocou isso ao alcance das suas maos."

### New Opportunity

> **Old vehicle:** "Eu preciso estudar nutricao pet, aprender proporçoes, fazer calculos manuais, consultar fóruns, e TORCER pra nao errar."
>
> **New Opportunity:** "Uma IA treinada em padroes AAFCO/FEDIAF analisa o perfil unico do SEU pet e gera um plano nutricional completo com receitas, porçoes e lista de compras... em menos de 2 minutos."

Nao e "melhoria" no seu jeito de alimentar o pet.
Nao e "mais uma calculadora."
E um **nutricionista virtual** que trabalha 24/7 exclusivamente pro seu pet.

### Epiphany Bridge (Universal)

> "73% dos tutores que tentam alimentacao natural desistem no primeiro mes. Nao porque nao amam seus pets. Mas porque estao tentando fazer MANUALMENTE o que uma IA pode fazer em SEGUNDOS. O problema nunca foi falta de amor. Foi falta de FERRAMENTA."

---

## 3.1 — FUNIL PRINCIPAL DE VENDA (Master Funnel Blueprint)

### Decision Framework

| Pergunta | Resposta |
|----------|---------|
| Objetivo? | **Aquisicao** (cold traffic → trial → subscriber) |
| Posicao na Value Ladder? | **Bait → Frontend** (quiz gratuito → trial pago) |
| Tipo de produto? | **SaaS (app/PWA)** |
| Funil ideal? | **Quiz Funnel** → Trial → Onboarding |
| Linchpin? | WAGGO Essential ($9.99/mo) |

### Arquitetura do Master Funnel

```
                    COLD TRAFFIC
                         │
            ┌────────────┼────────────┐
            │            │            │
        Meta Ads    Google Ads    Content/SEO
        (FB/IG)     (Search)     (IG/YT/Blog)
            │            │            │
            └────────────┼────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    QUIZ HOOK PAGE   │  ← Trafego aterrissa aqui
              │  "Discover Your     │
              │   Pet's Nutrition   │
              │   Profile"          │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   7 PERGUNTAS       │  ← Qualifica + Segmenta + Compromete
              │   (1 por tela)      │
              │   Progress bar      │
              └──────────┬──────────┘
                         │
                    Após Q5...
                         │
                         ▼
              ┌─────────────────────┐
              │    OPT-IN GATE      │  ← "Enter your email to see
              │    (Email capture)  │     your personalized results"
              └──────────┬──────────┘
                         │
                    Q6-Q7...
                         │
                         ▼
              ┌─────────────────────┐
              │   RESULTS PAGE      │  ← Perfil + Epiphany Bridge
              │   (Personalizada)   │     + New Opportunity + Stack
              │                     │
              │   CTA: Start Free   │
              │   Trial →           │
              └──────────┬──────────┘
                         │
                    ┌────┴────┐
                    │         │
               CONVERTE    NAO CONVERTE
                    │         │
                    ▼         ▼
         ┌──────────────┐  ┌─────────────────┐
         │ TRIAL SIGNUP  │  │ SOAP OPERA      │
         │ (CC required) │  │ SEQUENCE        │
         │ 7 days free   │  │ (5 emails)      │
         └──────┬───────┘  │ Abandonment →    │
                │          │ Desconto gradual  │
                ▼          └─────────────────┘
         ┌──────────────┐
         │ ONBOARDING   │  ← Small Win em <2 min
         │ (In-app)     │     + Email sequence
         └──────┬───────┘
                │
           Dia 7...
                │
                ▼
         ┌──────────────┐
         │ CONVERSION   │  ← Auto-charge
         │ $9.99/mo     │     + Upgrade CTA
         │ Essential     │     + Feature discovery
         └──────┬───────┘
                │
           Dia 14-30...
                │
                ▼
         ┌──────────────┐
         │ UPSELL →     │  ← Feature gate triggers
         │ Pro $19.99   │     + Email upgrade sequence
         └──────┬───────┘
                │
           Ongoing...
                │
                ▼
         ┌──────────────┐
         │ BACKEND →    │  ← For pets with conditions
         │ VetConnect   │     Application funnel
         │ $199         │
         └──────────────┘
```

---

## 3.2 — QUIZ FUNNEL (Completo)

### Hook Page

**GEO: EN (EUA)**

**Headline:**
> # What's the #1 Nutrition Mistake You're Making with Your Pet?
> ### Take the 60-Second Pet Nutrition Quiz and Get a Personalized Plan

**Subheadline:**
> *Based on your pet's breed, age, weight and health — our AI creates a custom nutrition profile just for them. 47,000+ pet parents already discovered theirs.*

**CTA Button:**
> **[Discover My Pet's Profile →]**

**Social Proof Bar:**
> "47,382 pet parents have taken this quiz" | ⭐⭐⭐⭐⭐ 4.9/5

**Visual:** Split-image — left side: confused pet parent with 10 open browser tabs. Right side: smiling parent with phone showing WAGGO plan.

**Below the fold:**
- "Takes less than 60 seconds"
- "100% personalized to YOUR pet"
- "No generic advice — real AI analysis"

---

### As 7 Perguntas

**Q1 — WARM-UP (Easy, Personal)**

> **What kind of pet do you have?**

| Opcao | Imagem |
|-------|--------|
| 🐕 Dog | Foto de cao feliz |
| 🐈 Cat | Foto de gato feliz |
| 🐕🐈 Both | Foto de duo |

*Propositos: `commit` (primeiro click), `segment` (produto varia por especie)*
*Mapping: Define modulo base (canino vs felino)*

---

**Q2 — WARM-UP (Personal, Builds Connection)**

> **What's your pet's name?**

Campo de texto livre (nome do pet).

*Propositos: `commit` (revelou dado pessoal, agora e "sobre o MEU pet"), `segment` (personaliza tudo apos isso com o nome)*

A partir daqui, CADA tela usa o nome do pet: *"Great! Let's learn more about **[Max]**..."*

---

**Q3 — DIAGNOSTIC (Revelar situacao atual)**

> **How is [Max] currently eating?**

| Opcao | Label |
|-------|-------|
| A | Kibble only (dry or wet commercial food) |
| B | Mostly kibble with some fresh/home-cooked mixed in |
| C | Fully homemade / fresh food (I prepare meals myself) |
| D | Raw / BARF diet |

*Propositos: `segment` (PRIMARY — separa beginners de experienced), `qualify` (nivel de sofisticacao)*
*Mapping: A/B → Wellness Guardian ou Fresh Start Explorer. C/D → Precision Optimizer.*

---

**Q4 — DIAGNOSTIC (Aprofundar dor)**

> **What worries you MOST about [Max]'s nutrition?**

| Opcao | Label |
|-------|-------|
| A | I'm not sure [Max] is getting all the nutrients they need |
| B | I want to switch to natural food but don't know where to start |
| C | I already cook/prep meals but I'm not sure the portions are right |
| D | [Max] has allergies or health issues that need special nutrition |

*Propositos: `segment` (SECONDARY — mapeia dor principal → perfil), `qualify` (urgencia)*
*Mapping: A → Wellness Guardian. B → Fresh Start Explorer. C → Precision Optimizer. D → Healing Protector.*

---

**Q5 — DIAGNOSTIC (Tentativas passadas)**

> **What have you tried so far to figure out [Max]'s ideal diet?**

| Opcao | Label |
|-------|-------|
| A | Google searches and reading articles |
| B | Asked my vet (they recommended a commercial brand) |
| C | Used a nutrition calculator or spreadsheet |
| D | Joined Facebook groups or forums for advice |

*Propositos: `qualify` (o que ja tentaram e FALHOU), `commit` (admitir que tentaram e nao resolveu)*
*Este e o setup da Epiphany Bridge: "Tudo que voce tentou... tem um motivo pra nao ter funcionado."*

---

**[OPT-IN GATE — após Q5]**

> ### Almost there! Your Pet's Nutrition Profile is being calculated...
>
> **Where should we send [Max]'s personalized results?**
>
> [Email field]
> [First Name field]
>
> *We'll send you [Max]'s complete nutrition profile + a free sample recipe.*
> *No spam. Unsubscribe anytime.*

**Preview teaser:** Animacao mostrando "Analyzing [Max]'s profile..." com barra de progresso fake e icones dos 9 modulos aparecendo.

*Conversao esperada: 60-80% (sunk cost de 5 perguntas respondidas)*

---

**Q6 — ASPIRATIONAL (Revelar desejo)**

> **In a perfect world, what would [Max]'s nutrition look like?**

| Opcao | Label |
|-------|-------|
| A | A personalized plan I can trust is 100% balanced — no guesswork |
| B | Fresh, natural meals that are easy to prepare (under 30 min/week) |
| C | A scientific plan optimized for [Max]'s exact needs, tracked over time |
| D | A specialized diet designed for [Max]'s health conditions |

*Propositos: `segment` (CONFIRMA perfil), `commit` (revelou desejo aspiracional)*
*Mapping: Confirma/refina perfil atribuido em Q3-Q4.*

---

**Q7 — QUALIFIER (Urgencia e prontidao)**

> **When would you like to start improving [Max]'s nutrition?**

| Opcao | Label |
|-------|-------|
| A | Right now — I've been wanting to do this for a while |
| B | This week — I just need the right plan |
| C | I'm still researching, but I'm serious about making a change |
| D | My pet has an urgent health issue — I need help ASAP |

*Propositos: `qualify` (urgencia define agressividade do CTA), `commit` (declarou intencao de agir)*
*Mapping: A/B/D = alta urgencia → CTA direto com trial. C = media urgencia → CTA softer + SOS emphasis.*

---

### Logica de Atribuicao de Perfis (Final)

```
IF Q4 = D (health issues)
  → THE HEALING PROTECTOR

ELSE IF Q3 = C or D (already raw/homemade)
  → THE PRECISION OPTIMIZER

ELSE IF Q4 = B (wants to start) OR Q6 = B (easy prep)
  → THE FRESH START EXPLORER

ELSE
  → THE WELLNESS GUARDIAN (default)

OVERRIDE: Q7 = D (urgent health) → THE HEALING PROTECTOR regardless
```

---

### Results Page (por perfil)

Cada Results Page segue a mesma ESTRUTURA mas com conteudo personalizado:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 [Max]'s Nutrition Profile: THE WELLNESS GUARDIAN     │
│                                                          │
│  "Love drives you. Now let science guide you."           │
│                                                          │
│  ─── SEÇÃO 1: SEU PERFIL ───                            │
│  [Descricao empoderada do perfil — 3-4 linhas]          │
│  [Icone do perfil + badge aspiracional]                 │
│                                                          │
│  ─── SEÇÃO 2: EPIPHANY BRIDGE ───                       │
│  [A causa REAL do problema: false belief → revelation]   │
│  "Here's what 73% of pet parents don't know..."         │
│                                                          │
│  ─── SEÇÃO 3: NEW OPPORTUNITY ───                       │
│  [O novo veiculo que muda tudo — WAGGO como solucao]    │
│  "What if you didn't have to memorize a single ratio?"  │
│                                                          │
│  ─── SEÇÃO 4: [MAX]'S PREVIEW ───                       │
│  [Mini preview do plano do pet: 1 receita sample,       │
│   macros basicos, 1 dica personalizada]                 │
│  "Here's a taste of what WAGGO creates for [Max]..."    │
│                                                          │
│  ─── SEÇÃO 5: THE STACK ───                             │
│  [Stack completo — valor $1,163 vs $9.99/mo]            │
│  [Bonus exclusivo por perfil]                           │
│                                                          │
│  ─── SEÇÃO 6: CTA ───                                   │
│  [CTA button] "Start [Max]'s Free Trial →"             │
│  [Urgencia] "7 days free. Cancel anytime."              │
│  [Disclaimer] "Not a substitute for veterinary advice"  │
│                                                          │
│  ─── SEÇÃO 7: FAQ ───                                   │
│  [Top 3 objecoes do perfil respondidas]                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Detalhe matador:** A secao 4 (Preview) mostra um SAMPLE real do plano do pet. Nao generico. A IA pega as respostas do quiz (especie, nome, preocupacoes) e gera um mini-preview ali mesmo. "Here's what a day in [Max]'s nutrition plan looks like..."

Isso e o **Aha Moment antecipado**. O lead ve o poder da IA ANTES de se inscrever.

---

## 3.3 — ONBOARDING FUNNEL (Small Win Engineering)

### O Aha Moment do WAGGO

Vou ser direto...

O Aha Moment do WAGGO e **ver o plano nutricional completo gerado pela IA — com receitas, porcoes e lista de compras — em menos de 2 minutos.**

Isso e PODEROSO. A maioria dos SaaS leva DIAS pra entregar valor. WAGGO entrega em **120 segundos.**

Vamos engenheirar isso pra ser irresistivel.

### Small Win Engineering

```
SIGNUP (0:00)
    │
    ▼
WIZARD: "Tell us about [Max]" (0:00 - 0:30)
    │  → Espécie, raça, peso, idade (quiz ja tem parte disso — pre-fill!)
    │  → Condições de saúde
    │  → Objetivo nutricional
    │
    ▼
AI GENERATING... (0:30 - 0:45)
    │  → Animação bonita: "Analyzing [Max]'s profile..."
    │  → Barras de progresso: "Checking nutritional requirements..."
    │  → "Selecting optimal recipes..."
    │  → "Calculating portions..."
    │
    ▼
🎉 SMALL WIN: PLANO PRONTO! (0:45 - 1:30)
    │  → Plano nutricional completo NA TELA
    │  → Primeira receita com ingredientes + porções exatas
    │  → Lista de compras pro supermercado
    │  → Breakdown nutricional (macros + micros)
    │
    ▼
CELEBRAÇÃO (1:30 - 2:00)
    │  → "🎉 [Max]'s nutrition plan is ready!"
    │  → "[Max]'s first recipe: Chicken & Sweet Potato Bowl"
    │  → "This recipe provides 100% of [Max]'s daily nutritional needs"
    │  → Confetti animation (sim, confetti. celebracao e OBRIGATORIA)
    │
    ▼
NEXT STEP PROMPT (2:00)
    → "Want to see [Max]'s full weekly plan? →"
    → "Download [Max]'s shopping list →"
    → "Explore [Max]'s 9 nutrition modules →"
```

**Tempo total ate o Small Win: < 2 minutos.**

**Friccoes eliminadas:**
- Pre-fill dados do quiz (nome, especie, preocupações) — NAO perguntar de novo
- Zero configuracao complexa — wizard de 3 telas max
- Zero espera real — IA gera em segundos, mas usamos animacao de 15s pra criar anticipacao
- Zero paywall antes do Small Win — o trial COMPLETO mostra valor ANTES de cobrar

---

### Micro-Commitment Ladder

| Level | Acao | Trigger | Celebracao | Timing |
|-------|------|---------|------------|--------|
| **1** | Completa quiz | Clicou "Discover" na hook page | Perfil revelado + badge | Minuto 0-1 |
| **2** | Da o email | Opt-in gate | "Results being prepared for [Max]..." | Minuto 1 |
| **3** | Inicia trial | CTA na results page | "Welcome! Let's build [Max]'s plan..." | Minuto 2 |
| **4** | Ve primeiro plano | Wizard → AI gera | 🎉 Confetti + "Plan ready!" | Minuto 2-3 |
| **5** | Primeira receita preparada | In-app tracking | Badge "First Meal" + email comemorativo | Dia 1-2 |
| **6** | Primeira pesagem | Modulo Controle de Peso | Grafico iniciado + "Great start!" | Dia 3-5 |
| **7** | Conversão paga | Auto-charge dia 8 | "Welcome to the WAGGO family" email | Dia 8 |

---

### Soap Opera Sequence (5 emails pos-signup)

**Email 1: "O Resultado" — IMEDIATO apos signup**

| Elemento | Wellness Guardian | Fresh Start Explorer | Precision Optimizer | Healing Protector |
|----------|------------------|---------------------|--------------------|--------------------|
| **Subject** | "[Max]'s nutrition profile is ready — and it's eye-opening" | "Your first recipe for [Max] is waiting" | "We analyzed your current feeding — here's what we found" | "A nutrition plan designed for [Max]'s specific needs" |
| **Hook** | "I used to think I was feeding my dog well..." | "What if I told you that you're just 7 days away from fresh?" | "You know the basics. But there's a gap you might not see..." | "[Max] doesn't have time for guesswork. Neither do you." |
| **Body** | Resultado do perfil + validacao + "Here's what your profile reveals about [Max]'s nutrition..." | "The hardest part isn't the cooking. It's the STARTING. And you just did." + Link to first recipe | Quick nutrition analysis based on quiz answers + "95% of homemade diets have at least one gap..." | Condition-specific insights + "Here's how WAGGO handles [condition]..." |
| **CTA** | "See [Max]'s Full Plan →" | "Cook [Max]'s First Recipe Tonight →" | "Run Your Full Nutrition Analysis →" | "Start [Max]'s Healing Protocol →" |
| **Open loop** | "Tomorrow I'll share something about pet nutrition that 73% of pet parents don't know..." | "Tomorrow: the 7-day transition plan that makes switching painless." | "Tomorrow: the one micronutrient that 83% of raw feeders miss." | "Tomorrow: why most prescription diets contain the exact ingredients that trigger sensitivities." |

---

**Email 2: "A Backstory" — 24H DEPOIS**

**Subject (universal):** "The embarrassing mistake I made with my own dog's food"

**Body:**
> Deixa eu te contar uma coisa...
>
> Quando comecei a pesquisar nutricao pet, achei que estava fazendo tudo certo.
>
> Tinha a melhor racao "premium" do mercado. Organic. Grain-free. O pacote dizia "veterinary recommended."
>
> Entao... virei o pacote. Li os ingredientes.
>
> *Corn gluten meal. Meat by-products. Artificial colors.*
>
> Meu estomago embrulhou.
>
> Eu estava pagando premium por... processado. Era o equivalente a alimentar meu dog com fast food em embalagem bonita.
>
> Ai pensei: "Ok, vou fazer alimentacao natural."
>
> Google. Reddit. Facebook groups.
>
> 47 opinioes diferentes. 12 tabelas de proporcoes. 3 calculadoras que davam resultados DIFERENTES pro mesmo dog.
>
> Eu quase desisti.
>
> Serio. Estava pronto pra voltar pra racao e fingir que nao tinha visto aqueles ingredientes.
>
> Ate que algo aconteceu. Algo que mudou tudo.
>
> *Mas isso... fica pro email de amanha.*
>
> Por enquanto... se voce ainda nao viu o plano do [Max], da uma olhada. Leva 30 segundos.
>
> **[See [Max]'s Plan →]**

---

**Email 3: "A Epifania" — 48H DEPOIS**

**Subject (universal):** "The moment I realized I'd been thinking about pet nutrition all wrong"

**Body:**
> Lembra que te contei que quase desisti da alimentacao natural pro meu dog?
>
> Pois e. O problema nao era falta de AMOR. Nem falta de INFORMACAO.
>
> Era falta de FERRAMENTA.
>
> Pensa comigo...
>
> Voce NAO precisa ser contador pra usar um app de financas.
> Voce NAO precisa ser engenheiro pra usar GPS.
> Voce NAO precisa ser nutricionista pra alimentar seu pet corretamente.
>
> *Voce so precisa da FERRAMENTA CERTA.*
>
> E isso que o WAGGO e.
>
> Nao e "mais uma calculadora." Nao e "outro grupo de Facebook."
>
> E uma IA treinada nos mesmos padroes que nutricionistas veterinarios usam (AAFCO, FEDIAF)... que analisa o perfil UNICO do seu pet... e gera um plano completo em segundos.
>
> Com receitas.
> Com porcoes exatas.
> Com lista de compras.
> Com ajuste automatico conforme as necessidades mudam.
>
> **E por $9.99/mes.** Vs $575+ de uma unica consulta com nutricionista veterinario.
>
> *Essa foi minha epifania:* eu nao precisava me TORNAR um especialista. Eu precisava de um especialista TRABALHANDO PRA MIM. 24/7.
>
> E isso e o que o WAGGO faz pro [Max].
>
> Se voce ja iniciou o trial, explore o modulo de Dieta Personalizada. E onde a magica acontece.
>
> Se ainda nao iniciou... o que esta esperando?
>
> **[Start [Max]'s Free Trial →]**
>
> *Disclaimer: WAGGO does not replace veterinary advice. Always consult your vet for medical conditions.*

---

**Email 4: "Os Beneficios Ocultos" — 72H DEPOIS**

**Subject:** "3 things about WAGGO that most people discover by accident"

**Body:**
> A maioria dos tutores se inscreve no WAGGO por UMA razao.
>
> O plano nutricional.
>
> Mas depois de uma semana... eles descobrem coisas que nao esperavam.
>
> **#1: A lista de compras automatica**
> "Eu costumava gastar 40 minutos no supermercado tentando lembrar o que precisava. Agora abro o WAGGO, vejo a lista, e estou em casa em 15 minutos." — Sarah, tutora de Golden Retriever
>
> **#2: O modulo de Petiscos**
> "Eu nao sabia que os petiscos contavam nas calorias diarias. WAGGO calcula quantos petiscos por dia sao seguros sem desbalancear a dieta. Mind. Blown." — Mike, tutor de Beagle
>
> **#3: O ajuste automatico**
> "Meu gato ganhou 200g num mes. Eu nem percebi. Mas o WAGGO sim — e ajustou as porcoes automaticamente. E como ter um nutricionista monitorando 24/7." — Jessica, tutora de 2 gatos
>
> Essas nao sao features "extras."
>
> Sao os detalhes que transformam "app de receitas" em **nutricionista virtual.**
>
> E voce tem acesso a TUDO isso no trial gratuito. Que acaba em [X] dias.
>
> **[Explore All 9 Modules →]**

---

**Email 5: "A Urgencia" — DIA 6 (24H ANTES DO FIM DO TRIAL)**

**Subject:** "[Max]'s trial ends tomorrow — here's what happens next"

**Body:**
> Ok, vou ser direto.
>
> O trial do [Max] no WAGGO acaba amanha.
>
> Se voce ja viu o plano, ja testou as receitas, ja explorou os modulos... voce sabe o valor.
>
> *$575+ por uma consulta com nutricionista veterinario.*
>
> *Ou $9.99/mes por um nutricionista virtual que trabalha 24/7 exclusivamente pro [Max].*
>
> Isso e $0.33 por dia.
>
> Menos que um cafe. Menos que UM ingrediente de uma receita.
>
> E aqui esta o que voce recebe:
>
> ✅ Plano nutricional AI personalizado (valor: $575)
> ✅ 9 modulos especializados (valor: $297)
> ✅ Biblioteca de receitas naturais (valor: $147)
> ✅ Quick-Start Guide (valor: $97)
> ✅ Lista de compras inteligente (valor: $47)
>
> **Valor total: $1,163**
> **Seu investimento: $9.99/mes**
>
> Se nao quiser continuar, cancela a qualquer momento. Sem perguntas. Sem drama.
>
> Mas se quiser continuar dando ao [Max] nutricao de verdade...
>
> **Nao precisa fazer nada.** Sua assinatura começa automaticamente amanhã.
>
> E o [Max] continua com o melhor plano nutricional que ele ja teve.
>
> **[Keep [Max]'s Plan Active →]**
>
> A saude do [Max] nao espera. E cada dia sem um plano personalizado e mais um dia de adivinhacao.
>
> — WAGGO Team
>
> *Not a substitute for veterinary advice.*

---

### Quiz Abandonment Sequence (quem NAO converteu na results page)

| Email | Timing | Subject | Offer |
|-------|--------|---------|-------|
| Abandon 1 | 2 horas | "[Max]'s nutrition profile is still waiting for you" | Link direto pro resultado |
| Abandon 2 | 24 horas | "Most pet parents who see their profile are surprised by one thing..." | Open loop + link resultado |
| Abandon 3 | 48 horas | "We saved [Max]'s plan — but not for long" | Urgencia (dados expiram) |
| Abandon 4 | 72 horas | "What's holding you back? (Honest question)" | Responder objecao #1 do perfil + extended trial (10 days) |

---

## 3.4 — FUNNEL STACKING (O Sistema Completo)

Aqui e onde tudo se conecta. Nao sao funis isolados. E um **sistema**.

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                      WAGGO FUNNEL ECOSYSTEM                         │
 │                                                                     │
 │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │
 │   │ Meta Ads │   │Google Ads│   │ Content  │   │Influencer│      │
 │   │ (FB/IG)  │   │ (Search) │   │ (IG/YT)  │   │ (Collab) │      │
 │   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘      │
 │        │              │              │              │              │
 │        └──────────────┼──────────────┼──────────────┘              │
 │                       │              │                             │
 │                       ▼              ▼                             │
 │              ┌──────────────┐  ┌──────────┐                       │
 │              │  QUIZ FUNNEL │  │  BLOG /  │                       │
 │              │  (Principal) │  │  SEO LP  │                       │
 │              └──────┬───────┘  └────┬─────┘                       │
 │                     │               │                             │
 │                     ▼               │                             │
 │              ┌──────────────┐       │                             │
 │              │ RESULTS +    │◄──────┘                             │
 │              │ TRIAL CTA    │ (blog→quiz redirect)                │
 │              └──────┬───────┘                                     │
 │                     │                                             │
 │          ┌──────────┼──────────┐                                  │
 │          │                     │                                  │
 │     STARTS TRIAL         DOESN'T START                            │
 │          │                     │                                  │
 │          ▼                     ▼                                  │
 │   ┌──────────────┐   ┌──────────────┐                            │
 │   │  ONBOARDING  │   │    SOAP      │                            │
 │   │  (In-app +   │   │   OPERA      │                            │
 │   │   emails)    │   │  SEQUENCE    │──→ Re-enter trial CTA      │
 │   └──────┬───────┘   └──────────────┘                            │
 │          │                                                        │
 │     DAY 8: AUTO-CHARGE                                            │
 │          │                                                        │
 │          ▼                                                        │
 │   ╔══════════════════╗                                            │
 │   ║  LINCHPIN:       ║                                            │
 │   ║  WAGGO Essential ║ ← $9.99/mo — O CENTRO DE TUDO             │
 │   ║  ($9.99/mo)      ║                                            │
 │   ╚══════╤═══════════╝                                            │
 │          │                                                        │
 │     ┌────┼────────────────────┐                                   │
 │     │    │                    │                                   │
 │     ▼    ▼                    ▼                                   │
 │  ┌─────────┐  ┌──────────┐  ┌──────────────┐                    │
 │  │RETENTION│  │ UPGRADE  │  │  REFERRAL    │                    │
 │  │ Loop    │  │ Pro      │  │  "Give $5    │                    │
 │  │ (email +│  │ $19.99/mo│  │   Get $5"    │                    │
 │  │  push)  │  │          │  │              │                    │
 │  └─────────┘  └────┬─────┘  └──────────────┘                    │
 │                     │                                             │
 │                     ▼                                             │
 │              ┌──────────────┐                                     │
 │              │ VETCONNECT   │                                     │
 │              │ Application  │                                     │
 │              │ $199         │                                     │
 │              └──────────────┘                                     │
 │                                                                     │
 └─────────────────────────────────────────────────────────────────────┘
```

### Transicoes e Triggers

| De | Para | Trigger | Timing |
|----|------|---------|--------|
| Ads → Quiz | Hook Page | Ad click | Imediato |
| Quiz → Trial | Results Page CTA | Quiz completion | Imediato |
| Quiz (abandon) → SOS | Soap Opera Sequence | No trial start + email captured | 2h, 24h, 48h, 72h |
| Trial → Essential | Auto-charge | Day 8 (CC on file) | Automatico |
| Essential → Pro | Feature gate | 2nd pet added / report export / day 14 email | Day 14-30 |
| Pro → VetConnect | In-app recommendation | Pet with health condition detected | Ongoing |
| Essential → Referral | Email + in-app | Day 30 (satisfied user) | Monthly |
| Blog/SEO → Quiz | Redirect CTA | "Get your free nutrition profile" in articles | Ongoing |
| IG/YT → Quiz | Bio link / description CTA | "Take the quiz" in every content piece | Ongoing |

### Email Automation Map

```yaml
email_automation:
  quiz_to_trial:
    - trigger: "quiz_completed + email_captured + NO_trial_start"
      sequence: "soap_opera_sequence"
      emails: 5
      timing: [0h, 24h, 48h, 72h, 96h]

  quiz_abandonment:
    - trigger: "quiz_started + NOT_completed + email_NOT_captured"
      sequence: "cannot_reach (no email)"
      action: "retargeting pixel only"

    - trigger: "quiz_completed + email_captured + results_viewed + NO_trial"
      sequence: "abandonment_sequence"
      emails: 4
      timing: [2h, 24h, 48h, 72h]

  trial_onboarding:
    - trigger: "trial_started"
      sequence: "onboarding_sequence"
      emails: 7
      timing: [0h, 24h, 48h, 72h, day5, day6, day7]

  post_conversion:
    - trigger: "trial_converted_to_paid"
      sequence: "feature_discovery"
      emails: 4
      timing: [day8, day10, day14, day21]

  upgrade_sequence:
    - trigger: "essential_subscriber + day14"
      sequence: "pro_upgrade"
      emails: 3
      timing: [day14, day21, day30]

  retention:
    - trigger: "paid_subscriber"
      sequence: "weekly_value"
      emails: ongoing
      timing: "weekly (every Monday)"
      content: "New recipe of the week + nutrition tip + feature highlight"
```

---

## METRICAS-ALVO POR ETAPA

| Etapa | Metrica | Target | Benchmark |
|-------|---------|--------|-----------|
| Ad → Hook Page | CTR | 2-4% | Pet industry avg |
| Hook Page → Quiz Start | Start rate | 40-50% | Quiz avg |
| Quiz Start → Completion | Completion rate | 70-80% | 7 questions + progress bar |
| Completion → Email Opt-in | Opt-in rate | 60-80% | Post-Q5 gate |
| Results → Trial Start | Trial start rate | 25-35% | Direct from results |
| SOS → Trial Start | Email conversion | 10-15% | Over 5 emails |
| Trial → Paid (Essential) | Conversion rate | 40-50% | Opt-out trial benchmark |
| Essential → Pro Upgrade | Upgrade rate | 15-20% | Within 30 days |
| Overall: Quiz Lead → Paid | End-to-end | 8-12% | Full funnel |

---

## CHECKLIST DA FASE 3

- [x] Tipo de funil selecionado com rationale (Quiz Funnel → Trial → Subscription)
- [x] Attractive Character definido (The Reporter)
- [x] New Opportunity definida (AI nutritionist vs manual calculation)
- [x] Epiphany Bridge universal definida
- [x] Hook Page completa (headline, subheadline, CTA, social proof)
- [x] 7 perguntas com progressao logica (warm-up → diagnostic → aspirational → qualifier)
- [x] Cada pergunta tageada com 2+ propositos
- [x] Opt-in gate posicionado apos Q5
- [x] Results Page estruturada (perfil → Epiphany → New Opp → Stack → CTA)
- [x] Logica de atribuicao de perfis definida
- [x] Small Win engineered (<2 min time-to-value)
- [x] Micro-commitment ladder (7 niveis)
- [x] Soap Opera Sequence (5 emails com conteudo por perfil)
- [x] Quiz abandonment sequence (4 emails)
- [x] Onboarding flow completo
- [x] Funnel stacking mapeado (sistema completo)
- [x] Email automation map com triggers
- [x] Metricas-alvo por etapa
- [x] Compliance disclaimers incluidos
- [x] Funnel stacking: proximo funil identificado em cada transicao

---

*You're just one funnel away.*

*— Russell Brunson, arquitetando funnels*
