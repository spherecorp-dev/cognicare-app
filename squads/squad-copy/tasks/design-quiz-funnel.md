---
task: design-quiz-funnel
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: architecture

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "offer.yaml loaded with product, geos, compliance"
  - condition: "Value Ladder mapped (recommended)"
    source: "map-value-ladder.output.value_ladder"
    blocker: false
    validation: "Value ladder defined with quiz as bait entry"
  - condition: "Compliance rules available"
    source: "data/offers/{offer_id}/compliance/rules.md"
    blocker: true
    validation: "Compliance rules loaded for target geos"

post-conditions:
  - condition: "Quiz funnel blueprint complete"
    validation: "Blueprint contains: hook_page, questions (5-9), opt_in_gate, results_page, profiles (3-5)"
    blocker: true
  - condition: "Each question serves 2+ purposes"
    validation: "Every question tagged with at least 2 of: qualify, segment, commit"
    blocker: true
  - condition: "Profiles are aspirational identities"
    validation: "All profile names are positive, memorable, shareable"
    blocker: true
  - condition: "Epiphany Bridge in every result"
    validation: "Each profile result includes cause_reveal + new_opportunity"
    blocker: true
  - condition: "The Stack defined for each profile"
    validation: "Offer stack with value breakdown per profile"
    blocker: false

Entrada:
  - offer_data: "Dados da oferta (produto, geos, compliance, performance)"
  - dream_customer: "Perfil do cliente ideal (demografico, psicografico, dores)"
  - attractive_character: "Tipo de AC escolhido (leader/adventurer/reporter/reluctant_hero)"
  - value_ladder: "Posicao do quiz na value ladder (opcional, recomendado)"
  - competitors: "Funnel hacking data de concorrentes (opcional)"
Saida:
  - quiz_blueprint: "Blueprint completo do quiz funnel"
  - profiles: "3-5 perfis de segmentacao com identidades"
  - funnel_map: "Mapa visual do funil (texto estruturado)"
Checklist:
  - "[ ] Definir Attractive Character para o funil"
  - "[ ] Definir New Opportunity (nao melhoria)"
  - "[ ] Criar hook page (headline + subheadline + CTA)"
  - "[ ] Desenhar 5-9 perguntas com progressao logica"
  - "[ ] Tagear cada pergunta com propositos (qualify/segment/commit)"
  - "[ ] Posicionar opt-in gate apos pergunta 5-7"
  - "[ ] Criar 3-5 perfis de resultado aspiracionais"
  - "[ ] Escrever Epiphany Bridge para cada perfil"
  - "[ ] Posicionar solucao como New Opportunity em cada resultado"
  - "[ ] Definir The Stack para oferta de cada perfil"
  - "[ ] Adaptar tom e estilo ao geo da oferta"
  - "[ ] Verificar compliance"
  - "[ ] Definir proximo funil na sequencia (funnel stacking)"
---

# Design Quiz Funnel — Arquitetura Completa de Quiz Funnel (Brunson Method)

## Objetivo

Arquitetar um quiz funnel completo seguindo o metodo Russell Brunson: hook page que captura atencao, perguntas estrategicas que qualificam/segmentam/comprometem, opt-in gate no momento ideal, e pagina de resultados com Epiphany Bridge + New Opportunity + The Stack.

## Contexto

O quiz funnel e o primeiro degrau da value ladder. NAO e o destino final — e a porta de entrada para uma jornada de conversao. Cada elemento do quiz serve multiplos propositos simultaneamente.

### Principios Inegociaveis

1. **Hook, Story, Offer** — O quiz E a story. O resultado E o bridge para a offer.
2. **New Opportunity** — O resultado NUNCA posiciona como melhoria. SEMPRE como novo veiculo.
3. **Epiphany Bridge** — O lead chega a conclusao SOZINHO via historia, nao via argumento.
4. **Resultados sao IDENTIDADES** — Algo que a pessoa quer compartilhar e se identificar.
5. **Cada pergunta tem 3 propositos** — Qualificar, segmentar, comprometer.

## Processo

### Step 1: Definicoes Estrategicas

Antes de qualquer pergunta, definir:

1. **Dream Customer**: Quem EXATAMENTE estamos segmentando?
2. **Attractive Character**: Qual tipo de AC guia a jornada? (Leader/Adventurer/Reporter/Reluctant Hero)
3. **New Opportunity**: Qual e o novo veiculo que oferecemos? (NAO melhoria)
4. **Epiphany Bridge**: Qual e o momento "aha!" que o lead precisa ter?
5. **Value Ladder Position**: Onde o quiz se encaixa na escada de valor?

### Step 2: Hook Page

Criar a pagina inicial que converte visitante em participante:

- **Headline**: Focada no RESULTADO do quiz, nao no quiz em si
- **Subheadline**: Velocidade + personalizacao + prova social
- **CTA**: "Descubra Seu [Perfil]" (nao "Comece o Quiz")
- **Imagem**: Transformacao, nao processo

### Step 3: Perguntas (5-9, sweet spot: 7)

Desenhar a sequencia de perguntas seguindo a progressao:

| Posicao | Tipo | Proposito | Exemplo |
|---------|------|-----------|---------|
| 1-2 | Warm-up | Facil, pessoal, nao ameacador | "Qual sua faixa etaria?" |
| 3-5 | Diagnostica | Revelar problema real | "O que ja tentou para resolver X?" |
| 6-7 | Aspiracional | Revelar desejos | "Se pudesse mudar UMA coisa, qual seria?" |
| 8-9 | Qualificadora | Urgencia e prontidao | "Quao pronto voce esta para agir?" |

Cada pergunta DEVE ser tageada com pelo menos 2 de:
- `qualify` — Separa dream customers de curiosos
- `segment` — Define em qual perfil o lead se encaixa
- `commit` — Aumenta investimento emocional (micro-commitment)

### Step 4: Opt-in Gate

Posicionar APOS pergunta 5-7 (sunk cost emocional):
- "Para calcular seu resultado personalizado, para onde devo enviar?"
- Mostrar preview do resultado sem revelar
- Conversao esperada: 60-80% (vs 20-30% no inicio)

### Step 5: Pagina de Resultado

Para cada perfil (3-5), criar:

1. **Parabens + Nome do Perfil** — Validacao imediata. "Voce e um [Identidade]!"
2. **Descricao Empoderada** — O que esse perfil significa (positivo, aspiracional)
3. **Epiphany Bridge** — Por que tudo que tentou antes falhou (a causa real)
4. **New Opportunity** — O novo veiculo/abordagem que muda tudo
5. **The Stack** — Oferta irresistivel com componentes empilhados (valor 5-10x preco)
6. **CTA** — "Comece agora" com urgencia real + bonus exclusivo por perfil

### Step 6: Funnel Stacking

Definir o proximo funil na sequencia:
- Quiz → Soap Opera Sequence → [VSL / Webinar / Book Funnel] → Upsell
- Mapear gatilhos de email entre quiz e proximo funil

## Output Format

```yaml
quiz_funnel_blueprint:
  meta:
    offer_id: "{offer_id}"
    geo: "{geo}"
    attractive_character: "{type}"
    new_opportunity: "{description}"
    position_in_value_ladder: "bait"

  hook_page:
    headline: "..."
    subheadline: "..."
    cta_text: "..."
    social_proof: "..."

  questions:
    - number: 1
      text: "..."
      type: "warm-up"
      options: ["...", "...", "...", "..."]
      purposes: ["commit", "segment"]
      maps_to_profiles: {"option_1": "profile_a", "option_2": "profile_b"}

  opt_in_gate:
    position: "after_question_6"
    headline: "..."
    subheadline: "..."

  profiles:
    - id: "profile_a"
      name: "O [Identidade]"
      description: "..."
      epiphany_bridge: "..."
      new_opportunity: "..."
      stack:
        main_offer: {name: "...", value: "$..."}
        bonus_1: {name: "...", value: "$..."}
        bonus_2: {name: "...", value: "$..."}
        bonus_3: {name: "...", value: "$..."}
        total_value: "$..."
        price: "$..."
        guarantee: "..."
      cta: "..."

  funnel_stacking:
    next_funnel: "..."
    email_triggers: ["..."]
```

## Notas Importantes

- **NUNCA** criar quiz sem antes definir AC, New Opportunity e Epiphany Bridge
- **NUNCA** perfis negativos — todos sao positivos com diferentes caminhos
- **SEMPRE** verificar compliance do geo antes de finalizar copy
- **SEMPRE** pensar no proximo funil (funnel stacking) — quiz nao e destino final
- Tom e estilo devem seguir adaptacao geo (FR=elegante, ES=caloroso, EN=direto)
