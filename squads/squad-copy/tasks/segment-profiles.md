---
task: segment-profiles
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: strategy

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product, target audience, geos loaded"
  - condition: "Dream customer defined"
    source: "User input or offer context"
    blocker: true
    validation: "Demographics, psychographics, pain points known"

post-conditions:
  - condition: "3-5 profiles defined"
    validation: "Number of profiles between 3 and 5"
    blocker: true
  - condition: "All profiles are aspirational"
    validation: "No negative profile names or descriptions"
    blocker: true
  - condition: "Each profile has unique offer"
    validation: "Distinct CTA/offer per profile"
    blocker: true
  - condition: "Question-to-profile mapping exists"
    validation: "Logic tree from quiz answers to profile assignment"
    blocker: true

Entrada:
  - offer_data: "Dados da oferta e publico-alvo"
  - dream_customer: "Perfil do cliente ideal"
  - quiz_questions: "Perguntas do quiz (se existirem)"
  - performance_data: "Dados de performance historica (opcional)"
Saida:
  - profiles: "3-5 perfis de segmentacao completos"
  - mapping_logic: "Logica de atribuicao perfil ← respostas"
  - offers_per_profile: "Oferta personalizada por perfil"
Checklist:
  - "[ ] Analisar dream customer e sub-segmentos"
  - "[ ] Definir 3-5 perfis distintos"
  - "[ ] Criar nomes aspiracionais e memoraveis"
  - "[ ] Escrever descricao empoderada para cada perfil"
  - "[ ] Mapear dores especificas por perfil"
  - "[ ] Definir Epiphany Bridge por perfil"
  - "[ ] Criar New Opportunity por perfil"
  - "[ ] Personalizar oferta/CTA por perfil"
  - "[ ] Criar logica de mapeamento (respostas → perfil)"
  - "[ ] Verificar que nenhum perfil e negativo"
---

# Segment Profiles — Definicao de Perfis de Segmentacao (Brunson Method)

## Objetivo

Definir 3-5 perfis de segmentacao para o quiz funnel, cada um com identidade aspiracional, Epiphany Bridge propria, New Opportunity especifica e oferta personalizada. Os perfis sao o coracao do quiz — determinam TODA a experiencia pos-quiz.

## Contexto

Perfis NAO sao "categorias". Sao IDENTIDADES. O lead deve sentir orgulho do seu perfil e querer compartilhar. "Eu sou um Metabolismo Acelerador" > "Eu tenho metabolismo tipo B".

### Principios

1. **NUNCA perfis negativos** — Todos sao positivos com diferentes caminhos
2. **Aspiracional** — Nomes que a pessoa QUER usar como identidade
3. **Distinto** — Cada perfil tem dores, solucoes e ofertas unicas
4. **Memoravel** — Nome que a pessoa lembra e compartilha
5. **Acionavel** — Cada perfil leva a uma acao/oferta especifica

## Processo

### Step 1: Analise do Dream Customer

Identificar sub-segmentos naturais:
- **Por situacao atual**: Onde estao no problema? (inicio, meio, avancado)
- **Por tentativas passadas**: O que ja tentaram? (nada, metodos tradicionais, alternativas)
- **Por objetivo**: O que querem alcançar? (resultado X, resultado Y)
- **Por urgencia**: Quao pronto estao? (explorando, decidido, urgente)

### Step 2: Definicao de Perfis (3-5)

Para cada perfil, definir:

```yaml
profile:
  id: "profile_identifier"
  name: "O [Identidade Aspiracional]"
  tagline: "Frase curta que define o perfil"
  description: "Descricao empoderada (2-3 frases)"

  characteristics:
    situation: "Situacao atual do lead neste perfil"
    past_attempts: "O que ja tentou antes"
    main_pain: "Dor principal (especifica, nao generica)"
    desire: "O que MAIS quer alcançar"
    urgency: "Nivel de prontidao"

  epiphany_bridge:
    false_belief: "O que acredita que e o problema"
    real_cause: "A causa real (revelacao)"
    aha_moment: "O momento de epifania"

  new_opportunity:
    vehicle: "O novo veiculo/abordagem"
    why_different: "Por que e diferente de tudo que tentou"
    first_step: "Primeira acao concreta"

  offer:
    main: "Oferta principal para este perfil"
    bonus_exclusive: "Bonus exclusivo do perfil"
    cta: "CTA personalizado"
    urgency: "Gatilho de urgencia"

  email_customization:
    subject_variant: "Variante de subject line para SOS"
    story_angle: "Angulo da historia do AC para este perfil"
    proof_type: "Tipo de social proof (testemunho de pessoa similar)"
```

### Step 3: Nomenclatura

Regras para nomes de perfil:

| Bom | Ruim |
|-----|------|
| O Metabolismo Acelerador | Metabolismo Tipo A |
| O Investidor Estrategico | Perfil Conservador |
| O Desbravador | Iniciante |
| O Protetor Financeiro | Risco Baixo |
| O Transformador | Caso Dificil |

Formula: "O/A [Adjetivo Empoderador] [Substantivo Aspiracional]"

### Step 4: Logica de Mapeamento

Criar arvore de decisao que mapeia respostas do quiz para perfis:

```yaml
mapping_logic:
  primary_question: "question_3"  # Pergunta com maior peso
  secondary_question: "question_5"

  rules:
    - if: "q3=A AND q5=A"
      profile: "profile_a"
      confidence: 0.9
    - if: "q3=A AND q5=B"
      profile: "profile_b"
      confidence: 0.8
    - if: "q3=B AND q5=*"
      profile: "profile_c"
      confidence: 0.85

  tiebreaker: "question_6"
  default: "profile_b"  # Perfil mais generico como fallback
```

### Step 5: Validacao

Para cada perfil, verificar:
- [ ] Nome e aspiracional e memoravel?
- [ ] Descricao e empoderada (nao diminutiva)?
- [ ] Epiphany Bridge e especifica (nao generica)?
- [ ] New Opportunity e diferente de "melhoria"?
- [ ] Oferta e personalizada (nao generica)?
- [ ] CTA faz sentido para esse perfil especificamente?

## Output Format

```yaml
segmentation:
  meta:
    offer_id: "{offer_id}"
    total_profiles: 3-5

  profiles:
    - id: "..."
      name: "O [Identidade]"
      tagline: "..."
      description: "..."
      characteristics: {...}
      epiphany_bridge: {...}
      new_opportunity: {...}
      offer: {...}
      email_customization: {...}

  mapping_logic:
    primary_question: "..."
    rules: [...]
    default: "..."

  distribution_estimate:
    profile_a: "~30%"
    profile_b: "~40%"
    profile_c: "~20%"
    profile_d: "~10%"
```
