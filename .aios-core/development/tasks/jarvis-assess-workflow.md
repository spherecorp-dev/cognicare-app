# Jarvis Assess Workflow — Avaliar Situacao e Apresentar Opcoes com Trade-offs

## Purpose

Avaliar uma situacao, cenario ou dilema apresentado pelo CEO, reunir dados relevantes, identificar opcoes viaveis e analisar trade-offs de cada uma. O assessment deve sempre culminar em uma recomendacao fundamentada com analise de trade-offs — nunca apresentar opcoes sem analise comparativa.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisAssess()
id: jarvis-assess-workflow
version: 2.0.0
responsavel: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: interactive
atomic_layer: Organism

**Entrada:**
- campo: situation
  tipo: string
  origem: User Input (CEO)
  obrigatorio: true
  validacao: "Descricao da situacao a ser avaliada — minimo 10 palavras"

- campo: urgency
  tipo: string
  origem: User Input
  obrigatorio: false
  validacao: "immediate|short-term|strategic — default: short-term"

- campo: criteria
  tipo: array
  origem: User Input
  obrigatorio: false
  validacao: "Criterios de decisao especificos do CEO (ex: custo, velocidade, qualidade)"

**Saida:**
- campo: assessment
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: recommendation
  tipo: object
  destino: Console Output
  persistido: false

- campo: decision_record
  tipo: object
  destino: DecisionRecordSystem (JSON persistence)
  persistido: true

**Integrações (v2.0):**
- PatternRecognitionEngine: .aios-core/core/intelligence/jarvis-pattern-engine.js
- DecisionRecordSystem: .aios-core/core/intelligence/jarvis-decision-record.js
- ProactiveIntelligence: .aios-core/core/intelligence/jarvis-proactive.js
- JarvisBusinessMemory: .aios-core/core/memory/jarvis-business-memory.js
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Situacao descrita com contexto suficiente para analise
    tipo: pre-condition
    blocker: true
    validacao: |
      Situacao deve conter: o que esta acontecendo, qual o problema ou decisao necessaria
    error_message: "Senhor, preciso de mais contexto sobre a situacao. O que exatamente precisa ser avaliado?"

  - [ ] Pelo menos 2 opcoes viaveis existem para a situacao
    tipo: pre-condition
    blocker: false
    validacao: |
      Se existe apenas 1 opcao, redirecionar para *delegate em vez de *assess
    error_message: "Apenas 1 opcao viavel identificada — redirecionando para execucao direta."
```

---

## SEQUENTIAL Task Execution

### Step 1: Compreender a Situacao

**Objetivo:** Entender completamente a situacao antes de buscar dados ou propor opcoes.

**Acoes:**
1. Analisar a situacao descrita pelo CEO:
   - **O que esta acontecendo:** Fatos objetivos da situacao
   - **Qual o problema:** O que precisa ser resolvido ou decidido
   - **Qual o contexto:** Projetos, agentes ou sistemas envolvidos
   - **Qual a urgencia:** Impacto de nao agir agora vs. depois
2. Classificar o tipo de assessment:
   - **Tecnico:** Escolha de tecnologia, abordagem de implementacao
   - **Operacional:** Mudanca de processo, alocacao de recursos
   - **Estrategico:** Direcao de produto, investimento, pivoteamento
   - **Risco:** Avaliacao de risco de uma acao ou inacao
   - **Conflito:** Resolucao de conflito entre prioridades ou agentes
3. Se a situacao for ambigua, solicitar clarificacao:
   - "Senhor, para uma avaliacao precisa: {pergunta especifica sobre contexto}"
4. Definir criterios de decisao (se nao fornecidos pelo CEO):
   - Custo (financeiro ou de esforco)
   - Velocidade (tempo para resultado)
   - Qualidade (robustez e sustentabilidade)
   - Risco (probabilidade e impacto de falha)
   - Reversibilidade (facilidade de mudar de rumo)

**Output do Step:** Situacao compreendida com classificacao e criterios de decisao

---

### Step 2: Reunir Dados Relevantes (+ Contexto Histórico v2.0)

**Objetivo:** Coletar informacoes concretas que fundamentem a analise de opcoes, enriquecidas com dados históricos.

**Acoes:**
1. Consultar fontes de dados relevantes:
   - `.aios/project-status.yaml` — status dos projetos
   - `docs/stories/` — stories relacionadas a situacao
   - `docs/stories/backlog.md` — tech debt relacionado
   - `data/jarvis-delegation-history.md` — historico de acoes anteriores
2. **(v2.0) Consultar PatternRecognitionEngine para padrões similares:**
   - `patternEngine.recognizePatterns({ description: situation, category, keywords })` — padrões anteriores relevantes
   - Se houver match forte (>= 70%): informar CEO sobre precedentes e outcomes
   - `patternEngine.suggestAction(context)` — ações bem-sucedidas em contextos similares
3. **(v2.0) Consultar DecisionRecordSystem para decisões anteriores:**
   - `decisionRecord.getDecisionHistory({ topic: situation_keywords })` — decisões passadas relacionadas
   - Se houver decisão anterior no mesmo tópico: informar outcome e lições aprendidas
4. Identificar precedentes (agora data-driven):
   - Situacao similar ja ocorreu antes? Qual foi o resultado? **(v2.0: resposta vem do PatternEngine)**
   - Ha padrao recorrente que indica causa raiz? **(v2.0: detecção automática)**
5. Mapear stakeholders impactados:
   - Quais agentes serao afetados pela decisao?
   - Quais projetos serao impactados?
   - Qual impacto no timeline geral?
4. Quantificar quando possivel:
   - Numeros concretos (%, dias, stories afetadas)
   - Evitar adjetivos vagos — "muitas stories" deve ser "7 de 12 stories"
5. Se dados insuficientes, informar lacunas explicitamente:
   - "Dados insuficientes para quantificar {aspecto} — assumindo {premissa} para analise"

**Output do Step:** Base de dados coletada com fatos, metricas e precedentes

---

### Step 3: Identificar Opcoes Viaveis

**Objetivo:** Mapear todas as opcoes razoaveis para a situacao.

**Acoes:**
1. Brainstorm de opcoes (minimo 2, ideal 3-4):
   - **Opcao A — Acao direta:** Resolver o problema da forma mais objetiva
   - **Opcao B — Alternativa conservadora:** Resolver com menor risco
   - **Opcao C — Nao agir (se aplicavel):** Manter status quo e monitorar
   - **Opcao D — Criativa:** Abordagem nao obvia que pode resolver de forma inovadora
2. Filtrar opcoes inviaveis (descartar com justificativa):
   - "Opcao X descartada porque {razao tecnica/financeira/temporal}"
3. Para cada opcao viavel, definir:
   - **Descricao:** O que seria feito
   - **Pre-requisitos:** O que precisa existir antes
   - **Quem executa:** Agente responsavel
   - **Timeline estimada:** Quanto tempo leva
4. Garantir que opcoes sao genuinamente diferentes:
   - Nao apresentar 3 variacoes da mesma abordagem como opcoes distintas
   - Cada opcao deve representar uma direcao fundamentalmente diferente

**Output do Step:** Lista de opcoes viaveis com descricao e pre-requisitos

---

### Step 4: Analisar Trade-offs de Cada Opcao

**Objetivo:** Comparar opcoes usando criterios objetivos e explicitar o que se ganha e perde em cada uma.

**Acoes:**
1. Para cada opcao, analisar contra cada criterio:
   ```markdown
   | Criterio | Opcao A | Opcao B | Opcao C |
   |----------|---------|---------|---------|
   | Custo | {analise} | {analise} | {analise} |
   | Velocidade | {analise} | {analise} | {analise} |
   | Qualidade | {analise} | {analise} | {analise} |
   | Risco | {analise} | {analise} | {analise} |
   | Reversibilidade | {analise} | {analise} | {analise} |
   ```
2. Para cada opcao, explicitar trade-offs:
   - **Ganho principal:** O que esta opcao entrega melhor que as outras
   - **Custo/Perda:** O que se sacrifica ao escolher esta opcao
   - **Risco principal:** O que pode dar errado especificamente nesta opcao
3. Identificar cenarios em que cada opcao seria a melhor:
   - "Opcao A e melhor SE {condicao}"
   - "Opcao B e melhor SE {condicao}"
4. Pontuar opcoes (1-5) por criterio se for util para visualizacao
5. Identificar se ha opcao dominante (melhor em todos os criterios):
   - Se sim, recomendacao e clara
   - Se nao, explicitar o dilema ao CEO

**Output do Step:** Matriz de trade-offs com analise comparativa completa

---

### Step 5: Apresentar Recomendacao Fundamentada

**Objetivo:** Entregar ao CEO uma recomendacao clara com justificativa e alternativas.

**Acoes:**
1. Formular recomendacao de Jarvis:
   ```markdown
   Senhor, aqui esta minha avaliacao da situacao:

   **Situacao:** {resumo factual em 2-3 linhas}

   **Dados Relevantes:**
   - {fato 1 com numero/metrica}
   - {fato 2 com numero/metrica}
   - {fato 3 com numero/metrica}

   **Opcoes Identificadas:**

   **Opcao A: {nome}**
   - Descricao: {o que fazer}
   - Ganho: {beneficio principal}
   - Custo: {o que se perde}
   - Risco: {principal risco}
   - Timeline: {estimativa}

   **Opcao B: {nome}**
   - Descricao: {o que fazer}
   - Ganho: {beneficio principal}
   - Custo: {o que se perde}
   - Risco: {principal risco}
   - Timeline: {estimativa}

   **Analise Comparativa:**
   | Criterio | Opcao A | Opcao B |
   |----------|---------|---------|
   | {crit1}  | {valor} | {valor} |

   **Recomendacao de Jarvis:** Opcao {X}
   - **Justificativa:** {por que esta opcao e a melhor no contexto atual}
   - **Trade-off aceito:** {o que se perde}
   - **Mitigacao:** {como minimizar o trade-off}

   Qual sua decisao, senhor?
   ```
2. Se CEO escolher, registrar decisao e rotear para execucao:
   - Decisao simples → `*delegate`
   - Decisao complexa → `*plan`
3. **(v2.0) Registrar decisão no DecisionRecordSystem:**
   ```javascript
   decisionRecord.recordDecision({
     title: `Assessment: ${situation_summary}`,
     category: assessmentType, // tecnico|operacional|estrategico|risco|conflito
     context: { situation, dataCollected, stakeholders },
     alternatives: options.map(o => ({ name: o.name, tradeoffs: o.tradeoffs })),
     chosen: ceoChoice,
     rationale: ceoRationale || jarvisRecommendation,
     decidedBy: 'CEO',
     followUp: nextAction, // delegate or plan
   });
   ```
4. **(v2.0) Capturar padrão na JarvisBusinessMemory:**
   ```javascript
   businessMemory.capture({
     title: `Assessment: ${situation_summary}`,
     category: 'decision',
     importance: urgency === 'immediate' ? 'high' : 'medium',
     context: { type: assessmentType, options_count: options.length, chosen: ceoChoice },
   });
   ```
5. Se CEO pedir mais analise, aprofundar no aspecto solicitado
6. Se CEO discordar de premissas, ajustar analise com novos inputs

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-ASSESS-001
    name: Assessment sem analise de trade-offs
    description: |
      Apresentar opcoes SEM analise de trade-offs nao e assessment — e lista.
      Cada opcao DEVE ter ganhos, custos e riscos explicitados.
      Comparacao direta entre opcoes e obrigatoria.
    severity: BLOCK
    action: |
      Completar analise de trade-offs antes de apresentar.
      Cada opcao deve ter: ganho, custo, risco, timeline.

  - id: VETO-ASSESS-002
    name: Assessment sem dados concretos
    description: |
      Assessment baseado apenas em opiniao sem dados de suporte.
      Afirmacoes devem ser acompanhadas de fatos, metricas ou precedentes.
    severity: BLOCK
    action: |
      Se dados insuficientes, declarar premissas explicitamente:
      "Assumindo {premissa} na ausencia de dados concretos."

  - id: VETO-ASSESS-003
    name: Assessment sem recomendacao
    description: |
      Jarvis DEVE sempre emitir uma recomendacao. Apresentar opcoes
      sem sugerir caminho preferencial nao agrega valor ao CEO.
    severity: BLOCK
    action: Incluir recomendacao fundamentada antes de apresentar
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Todas as opcoes tem trade-offs explicitados
    tipo: post-condition
    blocker: true
    validacao: Cada opcao tem ganho, custo e risco documentados
    error_message: "Opcoes sem trade-offs — completar analise comparativa"

  - [ ] Recomendacao presente com justificativa
    tipo: post-condition
    blocker: true
    validacao: Recomendacao inclui opcao escolhida, justificativa e mitigacao
    error_message: "Recomendacao ausente ou sem justificativa"

  - [ ] Dados concretos fundamentam a analise
    tipo: post-condition
    blocker: true
    validacao: Afirmacoes acompanhadas de fatos ou premissas explicitas
    error_message: "Analise sem fundamentacao em dados — adicionar evidencias"
```

---

## Completion Criteria

- Situacao completamente compreendida e classificada
- Dados relevantes coletados e quantificados
- Minimo 2 opcoes viaveis identificadas com descricao
- Trade-offs analisados para cada opcao
- Matriz comparativa apresentada com criterios
- Recomendacao de Jarvis fundamentada
- CEO informado e aguardando decisao

---

## Metadata

```yaml
story: N/A
version: 2.0.0
dependencies:
  - .aios/project-status.yaml
  - docs/stories/ (stories ativas)
  - data/jarvis-delegation-history.md
  - .aios-core/core/intelligence/jarvis-pattern-engine.js (v2.0)
  - .aios-core/core/intelligence/jarvis-decision-record.js (v2.0)
  - .aios-core/core/intelligence/jarvis-proactive.js (v2.0)
  - .aios-core/core/memory/jarvis-business-memory.js (v2.0)
tags:
  - jarvis
  - assessment
  - trade-offs
  - decision-support
  - options-analysis
  - pattern-recognition
  - decision-recording
updated_at: 2026-02-21
changelog:
  - version: 2.0.0
    date: 2026-02-21
    changes:
      - Integração com PatternRecognitionEngine para precedentes data-driven
      - Integração com DecisionRecordSystem para registro automático de decisões
      - Step 2 enriquecido com consulta a padrões e decisões históricas
      - Step 5 registra decisão do CEO no DecisionRecordSystem
      - Captura de padrão na JarvisBusinessMemory após decisão
  - version: 1.0.0
    date: 2026-02-21
    changes:
      - Versão inicial do assess workflow
```
