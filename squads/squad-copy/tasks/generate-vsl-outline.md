---
task: generate-vsl-outline
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: strategy

pre-conditions:
  - condition: "Offer data available"
    source: "data/offers/{offer_id}/offer.yaml"
    blocker: true
    validation: "Product, pricing, mechanism, geos loaded"
  - condition: "Compliance rules loaded"
    source: "data/offers/{offer_id}/compliance/rules.md"
    blocker: true
    validation: "Geo-specific compliance rules available"
  - condition: "Starving Crowd defined"
    source: "User input or offer context"
    blocker: true
    validation: "Target audience with specific pain points and desires"

post-conditions:
  - condition: "Fact Sheet complete"
    validation: "Every product fact documented"
    blocker: true
  - condition: "Benefit List complete"
    validation: "Every fact translated to customer benefit"
    blocker: true
  - condition: "AIDA structure mapped"
    validation: "All 4 phases with timing and content direction"
    blocker: true
  - condition: "20+ grabber variants"
    validation: "At least 20 hook variants with top 3 marked"
    blocker: true
  - condition: "Proof inventory catalogued"
    validation: "All available proofs catalogued by type"
    blocker: true

Entrada:
  - offer_data: "Dados da oferta (produto, preco, mecanismo, geos)"
  - starving_crowd: "Publico-alvo com dores e desejos especificos"
  - proofs: "Testimonials, estudos, dados disponiveis"
  - vsl_format: "standard (15-45min) | mini (2-5min) | hybrid | advertorial"
Saida:
  - fact_sheet: "Todos os fatos do produto organizados"
  - benefit_list: "Cada fato traduzido em beneficio"
  - vsl_outline: "Outline com AIDA structure e timing"
  - grabbers: "20+ variantes de hook com top 3"
  - proof_inventory: "Provas catalogadas por tipo"
Checklist:
  - "[ ] Definir Starving Crowd (quem, dor, desejo)"
  - "[ ] Avaliar oferta (40/40/20 rule — oferta forte?)"
  - "[ ] Criar Fact Sheet (todos os fatos do produto)"
  - "[ ] Criar Benefit List (fatos → beneficios)"
  - "[ ] Definir Mecanismo Unico (nomeado, plausivel, proprietario)"
  - "[ ] Catalogar provas por tipo (3+ tipos necessarios)"
  - "[ ] Escrever 20+ grabbers e marcar top 3"
  - "[ ] Mapear estrutura AIDA com timing por bloco"
  - "[ ] Verificar compliance do geo"
---

# Generate VSL Outline — Pre-Producao de VSL (Halbert Method)

## Objetivo

Criar toda a base de pesquisa e estrutura ANTES de escrever o script. Fact Sheet, Benefit List, 20+ grabbers, proof inventory e AIDA outline. 90% pesquisa, 10% escrita.

## Processo

### Step 1: Starving Crowd

Definir EXATAMENTE para quem estamos escrevendo:
- Quem sao? (demografico)
- Qual a dor mais profunda? (especifica, nao generica)
- O que ja tentaram? (solucoes que falharam)
- O que estao comprando AGORA? (sinais de desespero)

### Step 2: 40/40/20 Check

Avaliar a oferta ANTES de escrever:
- A LISTA (publico) esta certa? → Se nao, PARAR e realinhar
- A OFERTA e irresistivel? → Se nao, sugerir melhorias (bonus, garantia)
- So entao pensar na COPY

### Step 3: Fact Sheet

Documentar CADA fato sobre o produto:
- Ingredientes / componentes / modulos
- Como funciona (mecanismo)
- Quem criou e por que
- Resultados documentados
- Diferenciais vs concorrentes

### Step 4: Benefit List

Para CADA fato, perguntar: "E dai? O que isso significa pro CLIENTE?"
```
Fato: Contem 500mg de Curcumina
→ Beneficio: Pode ajudar a reduzir aquele desconforto nas articulacoes que te impede de brincar com seus netos
```

### Step 5: Mecanismo Unico (Georgi Layer)

- Nomear o mecanismo (nome proprietario que gruda)
- Garantir que e: novo, plausivel, proprietario, nomeavel
- Validar que explica POR QUE nada funcionou antes

### Step 6: 20+ Grabbers

Escrever pelo menos 20 variantes de opening:
- Formulas: IF/THEN, Pattern Interrupt, 13-Word Opener, Pergunta Chocante
- Marcar os TOP 3 para teste
- Cada grabber deve passar no teste A-pile

### Step 7: Proof Inventory

Catalogar TODAS as provas por tipo:
- Testimonials (com nome, idade, resultado especifico)
- Estudos/papers
- Expert endorsements
- Dados estatisticos
- Demonstracoes/antes-depois
- Logica/analogias

### Step 8: AIDA Outline

Mapear a estrutura completa:

| Bloco | Timing | Conteudo | Tecnica |
|-------|--------|----------|---------|
| Hook/Grabber | 0-30s | Top 3 grabbers | IF/THEN, Pattern Interrupt |
| Story | 30s-5min | Epiphany Bridge | Vulnerabilidade Halbert |
| Agitate+Educate | 5-12min | Dor + Mecanismo | Halbert agitation + Georgi mechanism |
| Proof | 12-18min | Stack de provas | 3+ tipos |
| Offer | 18-22min | The Stack | Reason Why + valor empilhado |
| Close | 22-25min | CTA + P.S. | Urgencia real + P.S. forte |

## Output Format

```yaml
vsl_outline:
  meta:
    offer_id: "{offer_id}"
    format: "standard|mini|hybrid|advertorial"
    starving_crowd: "..."
    mechanism_name: "..."

  forty_forty_twenty:
    list_ok: true|false
    offer_ok: true|false
    offer_suggestions: ["..."]

  fact_sheet:
    - fact: "..."
      source: "..."

  benefit_list:
    - fact: "..."
      benefit: "..."
      emotional_trigger: "..."

  grabbers:
    variants: ["...", "..."]  # 20+
    top_3: ["...", "...", "..."]

  proof_inventory:
    testimonials: [...]
    studies: [...]
    experts: [...]
    data: [...]
    demonstrations: [...]

  aida_outline:
    attention: {timing: "...", content: "...", technique: "..."}
    interest: {timing: "...", content: "...", technique: "..."}
    desire: {timing: "...", content: "...", technique: "..."}
    action: {timing: "...", content: "...", technique: "..."}
```
