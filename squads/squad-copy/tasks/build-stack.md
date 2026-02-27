---
task: build-stack
responsavel: "@russell-brunson"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product, pricing, bonuses defined"
  - condition: "Target profile defined"
    source: "segment-profiles.output.profiles OR user input"
    blocker: false
    validation: "Dream customer pain points and desires known"

post-conditions:
  - condition: "Stack has 4+ components"
    validation: "Main offer + at least 3 bonuses"
    blocker: true
  - condition: "Total value is 5-10x price"
    validation: "Sum of component values >= 5x actual price"
    blocker: true
  - condition: "Guarantee included"
    validation: "Risk reversal mechanism defined"
    blocker: true
  - condition: "Each component has clear value"
    validation: "Individual dollar values assigned to each item"
    blocker: true

Entrada:
  - offer_data: "Dados da oferta (produto, preco, features)"
  - profiles: "Perfis de segmentacao (opcional)"
  - competitor_offers: "Ofertas concorrentes para referencia (opcional)"
Saida:
  - stack: "The Stack completo com componentes e valores"
  - stack_copy: "Copy de apresentacao do Stack"
  - guarantee: "Mecanismo de garantia"
Checklist:
  - "[ ] Definir produto principal com valor transformacional"
  - "[ ] Criar Bonus #1 — Acelerador"
  - "[ ] Criar Bonus #2 — Ponte de conhecimento"
  - "[ ] Criar Bonus #3 — Comunidade/suporte"
  - "[ ] Bonus exclusivo por perfil (se aplicavel)"
  - "[ ] Atribuir valores individuais ($) a cada componente"
  - "[ ] Calcular valor total (deve ser 5-10x preco)"
  - "[ ] Definir garantia ousada"
  - "[ ] Escrever copy de apresentacao progressiva"
  - "[ ] Verificar compliance"
---

# Build Stack — Construcao do Stack de Oferta (Brunson Method)

## Objetivo

Construir The Stack — a tecnica de empilhamento de valor de Russell Brunson que torna qualquer oferta irresistivel. Cada componente tem valor explicito. A soma total e absurdamente maior que o preco. O lead pensa: "Isso vale $2.847... e custa so $97?!"

## Contexto

O Stack NAO e uma lista de features. E uma APRESENTACAO ESTRATEGICA de valor empilhado. Cada componente e revelado progressivamente, construindo momentum. O preco so aparece DEPOIS que o valor total e absurdo.

## Processo

### Step 1: Produto Principal

O carro-chefe da oferta:
- Descrever o **valor transformacional**, nao features
- "O que voce VAI conseguir", nao "o que voce recebe"
- Valor percebido: O que alguem pagaria por isso isoladamente?

```
"[Nome do Produto] — O sistema completo para [resultado transformacional]"
Valor: $X
```

### Step 2: Bonus #1 — O Acelerador

Algo que acelera o resultado:
- "Pra quem quer resultado mais rapido..."
- Templates, atalhos, checklists, quick-start guides
- Resolve a objecao: "Mas quanto tempo vai demorar?"

```
"[Nome do Bonus] — [Promessa de velocidade]"
Valor: $X
```

### Step 3: Bonus #2 — Ponte de Conhecimento

Preenche um gap de conhecimento:
- "Mesmo se voce nunca fez X antes..."
- Tutoriais, treinamentos basicos, guias passo-a-passo
- Resolve a objecao: "Mas eu nao sei fazer isso..."

```
"[Nome do Bonus] — [Promessa de acessibilidade]"
Valor: $X
```

### Step 4: Bonus #3 — Comunidade/Suporte

Reduz risco percebido com acesso humano:
- Acesso a grupo, suporte, mentoria, comunidade
- "Voce nao vai estar sozinho nessa jornada"
- Resolve a objecao: "E se eu travar?"

```
"[Nome do Bonus] — [Promessa de suporte]"
Valor: $X
```

### Step 5: Bonus Exclusivo por Perfil (Opcional)

Se usando quiz funnel, bonus extra POR PERFIL:
- Algo ultra-relevante para aquele perfil especifico
- "Porque voce e um [Perfil], preparamos algo especial..."
- Aumenta sensacao de personalizacao

### Step 6: Calcular Valor Total

| Componente | Valor Individual |
|-----------|-----------------|
| Produto Principal | $X |
| Bonus #1 — Acelerador | $X |
| Bonus #2 — Ponte de Conhecimento | $X |
| Bonus #3 — Comunidade/Suporte | $X |
| Bonus Exclusivo [Perfil] | $X |
| **VALOR TOTAL** | **$XXXX** |
| **PRECO HOJE** | **$XX** |

**Regra**: Valor total DEVE ser 5-10x o preco pedido.

### Step 7: Garantia

A garantia vem DEPOIS do stack (reduz a ultima objecao):
- **30 dias**: Padrao. "Se nao gostar, devolvemos tudo."
- **60 dias**: Melhor. "Teste por 60 dias, sem risco."
- **90 dias**: Ousada. "Se nao tiver resultado em 90 dias..."
- **Double your money back**: Ultra-ousada. "Se nao funcionar, devolvemos o DOBRO."

Quanto mais ousada a garantia, maior a conversao (e maior a confianca necessaria no produto).

### Step 8: Copy de Apresentacao

O Stack e apresentado PROGRESSIVAMENTE (construir momentum):

```
"Quando voce se inscreve hoje, voce recebe...

**#1: [Produto Principal]** (Valor: $497)
[Descricao transformacional em 1-2 linhas]

Mas isso nao e tudo...

**#2: [Bonus Acelerador]** (Valor: $197)
[Descricao em 1 linha — foco na velocidade]

E tambem...

**#3: [Bonus Ponte]** (Valor: $97)
[Descricao em 1 linha — foco na acessibilidade]

E pra garantir que voce nunca trave...

**#4: [Bonus Suporte]** (Valor: $297)
[Descricao em 1 linha — foco no apoio]

**Valor total: $1.088**

Mas voce NAO vai pagar $1.088...
Nem $500...
Nem mesmo $200...

**Hoje: apenas $97**

E com nossa Garantia de [X] Dias:
Se por qualquer razao voce nao ficar satisfeito, devolvemos cada centavo.
Sem perguntas. Sem drama.

[CTA BUTTON]"
```

## Output Format

```yaml
the_stack:
  meta:
    offer_id: "{offer_id}"
    total_value: "$..."
    price: "$..."
    value_ratio: "Xx"

  components:
    - type: "main"
      name: "..."
      description: "..."
      value: "$..."
    - type: "accelerator"
      name: "..."
      description: "..."
      value: "$..."
    - type: "knowledge_bridge"
      name: "..."
      description: "..."
      value: "$..."
    - type: "support"
      name: "..."
      description: "..."
      value: "$..."

  profile_bonuses:
    - profile: "..."
      bonus: "..."
      value: "$..."

  guarantee:
    type: "30_day|60_day|90_day|double_money_back"
    copy: "..."

  presentation_copy: |
    [Copy completa de apresentacao progressiva]

  cta:
    text: "..."
    urgency: "..."
```

## Notas Importantes

- **NUNCA** listar features — sempre descrever TRANSFORMACAO
- **NUNCA** revelar o preco antes de empilhar todo o valor
- A apresentacao e PROGRESSIVA — cada item constroi sobre o anterior
- Garantia SEMPRE depois do stack (ultima objecao a ser removida)
- CTA IMEDIATO apos garantia (nao dar tempo de hesitar)
