---
task: work-vsl-block
responsavel: "@gary-halbert"
responsavel_type: agent
atomic_layer: task
elicit: true
squad: squad-copy
phase: production

pre-conditions:
  - condition: "Block type specified"
    source: "User input"
    blocker: true
    validation: "Valid block: lead|story|agitation|mechanism|proof|offer|close|fascinations"
  - condition: "Product context available"
    source: "Offer data or user input"
    blocker: true
    validation: "Sufficient context to write the block"

post-conditions:
  - condition: "Block complete"
    validation: "Block ready to be inserted into VSL"
    blocker: true
  - condition: "Multiple variants provided (for lead/hook)"
    validation: "At least 10 variants for lead/hook blocks"
    blocker: false

Entrada:
  - block_type: "Tipo do bloco (lead, story, agitation, mechanism, proof, offer, close, fascinations)"
  - context: "Contexto do produto/oferta"
  - existing_vsl: "VSL existente onde o bloco sera inserido (opcional)"
Saida:
  - block_copy: "Copy do bloco pronto pra inserir"
  - variants: "Variantes (se aplicavel)"
Checklist:
  - "[ ] Identificar bloco solicitado"
  - "[ ] Aplicar tecnica Halbert+Georgi especifica pro bloco"
  - "[ ] Gerar copy (e variantes se aplicavel)"
  - "[ ] Verificar greased slide (transicao com blocos adjacentes)"
  - "[ ] Verificar compliance"
---

# Work VSL Block — Trabalho Isolado em Blocos (Halbert Method)

## Objetivo

Criar ou otimizar partes ESPECIFICAS de uma VSL isoladamente, aplicando as tecnicas de Halbert+Georgi para cada tipo de bloco.

## Blocos Disponiveis

### Lead (Hook/Grabber)
- **Tecnica**: 13-Word Opener de Halbert + IF/THEN + Pattern Interrupt
- **Output**: 10+ variacoes de abertura
- **Regra**: Cada variante deve passar no teste A-pile

### Story (Epiphany Bridge)
- **Tecnica**: Storytelling vulneravel com arco: dor → busca → descoberta → resultado
- **Output**: Historia completa com transicoes
- **Regra**: O viewer deve pensar "essa pessoa e COMO EU"

### Agitation (Amplificacao de Dor)
- **Tecnica**: Cenarios especificos e sensoriais. Linguagem visual.
- **Output**: Bloco de agitacao com cenarios e invalidacao de alternativas
- **Regra**: O viewer deve SENTIR a dor, nao apenas entender

### Mechanism (Revelacao do Mecanismo)
- **Tecnica**: Mecanismo Unico nomeado (Georgi) + credibilidade (Halbert)
- **Output**: Revelacao com nome proprietario e credencial
- **Regra**: Novo + plausivel + proprietario + nomeavel

### Proof (Stack de Provas)
- **Tecnica**: 3+ tipos de prova empilhados com especificidade brutal
- **Output**: Bloco de provas com transicoes
- **Regra**: "1.726 clientes em 32 estados" > "muitos clientes"

### Offer (The Stack)
- **Tecnica**: Empilhamento de valor (5-10x) + Reason Why
- **Output**: Apresentacao progressiva de componentes com valores
- **Regra**: Preco so aparece DEPOIS de todo valor empilhado

### Close (Fechamento)
- **Tecnica**: CTA 3x + P.S. poderoso + Reason Why pra urgencia
- **Output**: Bloco de close com recapitulacao + urgencia + P.S.
- **Regra**: Close = 20% do script. P.S. com beneficio mais forte.

### Fascinations (Bullets de Curiosidade)
- **Tecnica**: Fascinations Halbert — cada uma abre loop irresistivel
- **Output**: 10-20 fascinations por oferta
- **Regra**: Cada fascination PROMETE beneficio sem ENTREGAR a resposta
- **Formulas**:
  - "Como [resultado desejado] sem [sacrificio temido]..."
  - "Por que [crenca popular] esta ERRADA..."
  - "O [substancia/ritual] de [tempo curto] que [resultado]..."
  - "A verdade sobre [topico] que [autoridade] esconde..."
