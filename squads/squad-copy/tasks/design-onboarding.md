---
task: design-onboarding
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: architecture

pre-conditions:
  - condition: "Quiz profiles defined"
    source: "segment-profiles.output.profiles OR design-quiz-funnel.output.profiles"
    blocker: true
    validation: "3-5 profiles with names, descriptions, pain points"
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product details, features, pricing loaded"
  - condition: "Attractive Character defined"
    source: "design-quiz-funnel.output.attractive_character"
    blocker: false
    validation: "AC type and backstory available"

post-conditions:
  - condition: "Small Win engineered"
    validation: "First action achievable in under 5 minutes with clear result"
    blocker: true
  - condition: "Micro-commitment ladder defined"
    validation: "5 progressive levels from quiz to purchase"
    blocker: true
  - condition: "Soap Opera Sequence complete"
    validation: "5 emails with timing, content, and objectives"
    blocker: true
  - condition: "Celebration moments defined"
    validation: "At least 1 celebration per micro-commitment level"
    blocker: true

Entrada:
  - profiles: "Perfis de segmentacao do quiz (3-5)"
  - offer_data: "Dados da oferta (produto, features, pricing)"
  - attractive_character: "Tipo e backstory do AC"
  - product_aha_moment: "O momento onde o usuario 'entende' o valor do produto"
Saida:
  - onboarding_blueprint: "Blueprint completo do onboarding"
  - soap_opera_sequence: "5 emails com timing, conteudo e objetivos"
  - small_win_map: "Engenharia reversa do primeiro resultado"
Checklist:
  - "[ ] Identificar o Aha Moment do produto"
  - "[ ] Engenharia reversa: menor acao que leva ao Aha Moment"
  - "[ ] Eliminar toda friccao entre signup e small win"
  - "[ ] Definir celebracao para cada micro-commitment"
  - "[ ] Escrever Soap Opera Sequence (5 emails)"
  - "[ ] Adaptar por perfil de quiz (personalizacao)"
  - "[ ] Definir metricas de sucesso por etapa"
  - "[ ] Integrar com funnel stacking (proximo passo apos onboarding)"
---

# Design Onboarding — Engenharia de Onboarding (Brunson Method)

## Objetivo

Criar uma sequencia de onboarding que engenharia o "Aha Moment" no menor tempo possivel, usando micro-commitments progressivos, Soap Opera Sequence e celebracoes obrigatorias para maximizar conversao de trial para pago.

## Contexto

Onboarding NAO e tutorial. E uma JORNADA DE TRANSFORMACAO. O objetivo e fazer o lead EXPERIMENTAR a primeira vitoria rapida (small win) o mais rapido possivel. Small win = prova de que a solucao funciona = confianca = conversao.

### Principios Inegociaveis

1. **Small Win nos primeiros 5 minutos** — Se demorar mais, ja perdeu.
2. **Micro-commitments progressivos** — Cada passo prepara o proximo. NUNCA pular.
3. **Celebracao e OBRIGATORIA** — Reforco positivo em cada conquista.
4. **Personalizacao por perfil** — Usar dados do quiz para personalizar a jornada.
5. **Storytelling sempre** — Cada email conta uma parabola, nao uma instrucao.

## Processo

### Step 1: Small Win Engineering

Engenharia reversa do sucesso:

1. **Identificar o Aha Moment**: Qual e o momento onde o usuario "entende" o valor?
2. **Backward engineer**: Qual e a MENOR acao que leva a esse momento?
3. **Eliminar friccao**: Remover TUDO que esta entre signup e essa acao
4. **Time-box**: O small win DEVE acontecer nos primeiros 5 minutos

```
[Signup] → [Eliminar friccao] → [Acao minima] → [Resultado visivel] → [CELEBRACAO!]
           ← menos de 5 minutos →
```

### Step 2: Micro-Commitment Ladder

Definir 5 niveis progressivos de comprometimento:

| Level | Acao | Commitment | Celebracao |
|-------|------|------------|------------|
| 1 | Completar quiz | Investiu 60s, revelou info | "Parabens! Seu perfil e..." |
| 2 | Abrir email de resultado | Confirmou interesse | Preview personalizado |
| 3 | Iniciar trial / recurso | Investiu tempo | "Voce acabou de dar o primeiro passo!" |
| 4 | Completar small win | Experimentou resultado | "Incrivel! Voce ja esta..." |
| 5 | Aceitar oferta | Investimento financeiro | Welcome exclusivo |

### Step 3: Soap Opera Sequence

5 emails pos-quiz que constroem relacionamento e vendem:

**Email 1: "O Resultado" (Setting the Stage)**
- Timing: Imediato
- Conteudo: Resultado detalhado + apresentacao do Attractive Character
- Tecnica Brunson: High drama opening — comece com o momento mais intenso
- Objetivo: Entregar valor prometido + abrir loop para email 2
- CTA: Acessar recurso/trial

**Email 2: "A Backstory" (The Backstory)**
- Timing: 24h depois
- Conteudo: Historia do AC — como chegou ao mesmo ponto que o lead. A luta. O fracasso.
- Tecnica Brunson: Vulnerabilidade real — mostrar que ja esteve "no fundo do poco"
- Objetivo: Conexao emocional + "eu era como voce" + abrir loop do aha moment

**Email 3: "A Epifania" (The Epiphany)**
- Timing: 48h depois
- Conteudo: O momento "aha!" — a descoberta da New Opportunity
- Tecnica Brunson: Epiphany Bridge completa — a revelacao que mudou tudo
- Objetivo: Lead chega a mesma conclusao do AC + introducao sutil da oferta

**Email 4: "Os Beneficios Ocultos" (Hidden Benefits)**
- Timing: 72h depois
- Conteudo: Beneficios que o lead NAO esperava + social proof segmentada por perfil
- Tecnica Brunson: Expandir desejo alem do obvio — "e isso nao e tudo..."
- Objetivo: Amplificar desejo + provar resultados com pessoas do mesmo perfil

**Email 5: "A Urgencia" (Urgency & CTA)**
- Timing: 96h depois
- Conteudo: Oferta completa com The Stack + bonus exclusivo + deadline real
- Tecnica Brunson: "Se nao agora, quando?" — urgencia real, nao fabricada
- Objetivo: Conversao final. Remover ultima objecao com garantia.

### Step 4: Personalizacao por Perfil

Cada perfil de quiz recebe variacao personalizada:
- Subject lines diferentes por perfil
- Historias/parabolas relevantes ao perfil
- Social proof de pessoas com mesmo perfil
- Bonus/oferta especifica por perfil

### Step 5: Metricas de Sucesso

| Etapa | Metrica | Target |
|-------|---------|--------|
| Email 1 | Open rate | 60%+ |
| Email 2 | Open rate | 45%+ |
| Email 3 | Click rate | 15%+ |
| Small win | Completion rate | 40%+ |
| Email 5 | Conversion rate | 5-10% |

## Output Format

```yaml
onboarding_blueprint:
  meta:
    offer_id: "{offer_id}"
    aha_moment: "{description}"
    small_win: "{action + expected time}"

  small_win_engineering:
    aha_moment: "..."
    minimum_action: "..."
    friction_removed: ["...", "..."]
    time_to_win: "< 5 minutes"
    celebration: "..."

  micro_commitments:
    - level: 1
      action: "..."
      trigger: "..."
      celebration: "..."

  soap_opera_sequence:
    - email: 1
      name: "O Resultado"
      timing: "immediate"
      subject_by_profile:
        profile_a: "..."
        profile_b: "..."
      content_outline: "..."
      cta: "..."

  metrics:
    - stage: "..."
      metric: "..."
      target: "..."
```

## Notas Importantes

- **NUNCA** instrucoes secas — sempre storytelling (parabolas)
- **SEMPRE** celebrar cada micro-commitment (reforco positivo)
- O small win DEVE ser mensuravel e visivel para o lead
- Adaptar tom ao geo (FR=sofisticado, ES=caloroso, EN=direto)
- Cada email da Soap Opera termina com um hook para o proximo (loop aberto)
