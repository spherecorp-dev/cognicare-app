# Jarvis Prioritize Workflow — Priorizar Itens com Framework MoSCoW/RICE

## Purpose

Priorizar demandas, tarefas, stories ou itens de backlog de forma estruturada usando frameworks reconhecidos (MoSCoW e/ou RICE). Toda priorização deve ser justificada com critérios explícitos — nunca baseada em intuição sem dados.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisPrioritize()
id: jarvis-prioritize-workflow
version: 2.0.0
responsável: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: interactive
atomic_layer: Organism

**Entrada:**
- campo: items
  tipo: array
  origem: User Input (CEO)
  obrigatório: true
  validação: "Lista de itens para priorizar — mínimo 2 itens"

- campo: framework
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "moscow|rice|both — default: rice"

- campo: context
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "Contexto adicional para informar a priorização (ex: 'foco em receita este trimestre')"

**Saída:**
- campo: prioritized_list
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: framework_analysis
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
- JarvisBusinessMemory: .aios-core/core/memory/jarvis-business-memory.js
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Pelo menos 2 itens fornecidos para priorização
    tipo: pre-condition
    blocker: true
    validação: |
      Lista de itens deve conter no mínimo 2 itens distintos
    error_message: "Senhor, preciso de pelo menos 2 itens para priorizar. Com 1 item, não há decisão a tomar."

  - [ ] Itens com descrição suficiente para avaliação
    tipo: pre-condition
    blocker: false
    validação: |
      Cada item deve ter nome e descrição mínima para avaliação
    error_message: "Alguns itens precisam de mais contexto. Posso solicitar detalhes, senhor?"
```

---

## SEQUENTIAL Task Execution

### Step 1: Listar e Catalogar Itens (+ Contexto Histórico v2.0)

**Objetivo:** Organizar e enriquecer a lista de itens com informações relevantes para priorização, incluindo dados históricos.

**Ações:**
1. Listar todos os itens fornecidos pelo CEO
2. Para cada item, catalogar:
   - **Nome/Título:** Identificador claro
   - **Descrição:** O que o item entrega
   - **Tipo:** Feature, bug fix, tech debt, research, infrastructure
   - **Status atual:** Novo, em andamento, bloqueado
   - **Dependências:** Outros itens dos quais depende ou que dependem dele
3. Se itens são stories existentes, enriquecer com dados do projeto:
   - Verificar em `docs/stories/` se a story existe
   - Coletar complexidade estimada, epic associado, agente designado
4. **(v2.0) Consultar PatternRecognitionEngine para histórico de itens similares:**
   - `patternEngine.recognizePatterns({ description: item.description, category: item.type })` para cada item
   - Se houver padrão similar com outcome registrado: informar CEO sobre resultado anterior
   - Usar dados históricos para informar os scores Confidence (RICE) ou classificação (MoSCoW)
5. **(v2.0) Consultar DecisionRecordSystem para priorizações anteriores:**
   - `decisionRecord.getDecisionHistory({ topic: 'prioritization' })` — como itens similares foram priorizados antes
   - Se CEO priorizou item similar no passado: informar posição anterior e outcome
6. Solicitar contexto adicional ao CEO se necessário:
   - "Senhor, para priorizar melhor: qual é o foco estratégico atual? (ex: receita, estabilidade, crescimento)"
7. Confirmar lista com CEO antes de prosseguir

**Output do Step:** Lista catalogada de itens com metadados completos

---

### Step 2: Aplicar Framework de Priorização

**Objetivo:** Avaliar cada item usando critérios objetivos e estruturados.

#### Se framework = MoSCoW:

1. Classificar cada item em:
   - **Must have:** Essencial para o objetivo. Sem isso, o projeto falha.
   - **Should have:** Importante, mas não fatal se adiado. Alto valor de negócio.
   - **Could have:** Desejável. Agrega valor mas pode esperar.
   - **Won't have (this time):** Não agora. Descartado para este ciclo.
2. Critérios para classificação:
   - Impacto no negócio se NÃO for feito
   - Dependências de outros itens Must have
   - Alinhamento com objetivo estratégico declarado
   - Risco de não fazer agora vs. depois

#### Se framework = RICE:

1. Pontuar cada item nos 4 critérios (escala 1-10 exceto Effort):
   - **Reach (Alcance):** Quantos usuários/processos são impactados?
     - 10: Toda a organização/todos os usuários
     - 7: Maioria dos usuários/processos core
     - 4: Subconjunto significativo
     - 1: Caso isolado
   - **Impact (Impacto):** Quanto valor gera se implementado?
     - 10: Transformacional — muda o jogo
     - 7: Alto — melhoria significativa mensurável
     - 4: Médio — melhoria perceptível
     - 1: Mínimo — nice to have
   - **Confidence (Confiança):** Quão certos estamos do impacto?
     - 100%: Dados históricos comprovam
     - 80%: Forte evidência mas sem dados completos
     - 50%: Hipótese razoável
     - 20%: Aposta especulativa
   - **Effort (Esforço):** Quanto esforço exige? (inverso — menor = melhor)
     - 1: Trivial (< 1 dia)
     - 3: Baixo (1-3 dias)
     - 5: Médio (1-2 semanas)
     - 8: Alto (2-4 semanas)
     - 13: Muito alto (1+ mês)
2. Calcular RICE Score: `(Reach x Impact x Confidence%) / Effort`
3. Se framework = both, aplicar MoSCoW PRIMEIRO e depois RICE dentro de cada categoria MoSCoW

**Output do Step:** Scores calculados para cada item com justificativa por critério

---

### Step 3: Rankear e Ordenar

**Objetivo:** Produzir lista ordenada por prioridade com justificativa para cada posição.

**Ações:**
1. Ordenar itens por score (RICE) ou categoria (MoSCoW):
   - RICE: Maior score primeiro
   - MoSCoW: Must > Should > Could > Won't
   - Both: Must haves rankeados por RICE, depois Should haves por RICE, etc.
2. Verificar sanity check na ordenação:
   - Dependências respeitadas (item dependente não pode vir antes da dependência)
   - Bloqueios não afetam itens na frente da fila
   - Ajustar posições se necessário e documentar ajuste
3. Para cada item na lista final, documentar:
   - Posição no ranking
   - Score ou categoria
   - Justificativa em 1-2 frases
   - Dependência (se relevante)
4. Identificar "quick wins" — itens de alto impacto e baixo esforço

**Output do Step:** Lista rankeada com scores e justificativas

---

### Step 4: Apresentar Lista Rankeada com Justificativa

**Objetivo:** Apresentar ao CEO de forma clara e acionável.

**Ações:**
1. Formatar apresentação:
   ```markdown
   Senhor, aqui está a priorização usando [MoSCoW|RICE|ambos]:

   **Contexto estratégico aplicado:** {contexto do CEO}

   **Ranking:**
   | # | Item | Score | Categoria | Justificativa |
   |---|------|-------|-----------|---------------|
   | 1 | {item} | {score} | {Must/Should/etc} | {justificativa} |
   | 2 | {item} | {score} | {Must/Should/etc} | {justificativa} |

   **Quick Wins identificados:** {itens de alto impacto e baixo esforço}

   **Recomendação de Jarvis:**
   - Iniciar imediatamente: {top 1-2 itens}
   - Agendar para próximo ciclo: {itens 3-5}
   - Considerar descartar/adiar: {últimos itens}

   Deseja ajustar alguma posição, senhor?
   ```
2. Destacar trade-offs importantes:
   - "Se priorizar {A} sobre {B}, o impacto é {X}."
3. Oferecer re-priorização se CEO discordar de algum posicionamento
4. Após aprovação do CEO, os itens priorizados podem ser delegados via `*delegate`
5. **(v2.0) Registrar decisão de priorização no DecisionRecordSystem:**
   ```javascript
   decisionRecord.recordDecision({
     title: `Priorização: ${items.length} itens via ${framework}`,
     category: 'strategy',
     context: { items: items.map(i => i.name), framework, strategicContext },
     alternatives: ranking.map(r => ({ name: r.item, score: r.score, position: r.rank })),
     chosen: `Top priority: ${ranking[0].item}`,
     rationale: ranking[0].justificativa,
     decidedBy: 'CEO',
     followUp: 'Executar itens na ordem priorizada via *delegate',
   });
   ```
6. **(v2.0) Capturar padrão de priorização na JarvisBusinessMemory:**
   ```javascript
   businessMemory.capture({
     title: `Priorização ${framework}: ${items.length} itens`,
     category: 'decision',
     importance: 'medium',
     context: { framework, top_items: ranking.slice(0, 3).map(r => r.item), strategic_focus: context },
   });
   ```

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-PRIORITIZE-001
    name: Priorização sem justificativa de framework
    description: |
      Priorização NUNCA pode ser apresentada sem scores ou categorias
      de um framework reconhecido. "Acho que X é mais importante" não é válido.
      Cada posição no ranking deve ter critérios explícitos e mensuráveis.
    severity: BLOCK
    action: |
      Aplicar framework completo (MoSCoW ou RICE) antes de apresentar ranking.
      Cada item deve ter score calculado ou classificação com justificativa.

  - id: VETO-PRIORITIZE-002
    name: Priorização ignorando dependências
    description: |
      Item dependente não pode ser priorizado acima de sua dependência
      sem documentar explicitamente o risco de execução fora de ordem.
    severity: BLOCK
    action: |
      Verificar dependências e ajustar ranking ou documentar exceção:
      "Senhor, {item A} depende de {item B}. Priorizar A antes de B requer {condição}."
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Todos os itens avaliados com scores/categorias do framework
    tipo: post-condition
    blocker: true
    validação: Cada item tem score RICE ou classificação MoSCoW com justificativa
    error_message: "Itens sem avaliação de framework — completar scores"

  - [ ] Lista rankeada apresentada com justificativa por posição
    tipo: post-condition
    blocker: true
    validação: Ranking ordenado com justificativa para cada posição
    error_message: "Ranking sem justificativas — adicionar razão para cada posição"

  - [ ] Dependências verificadas e respeitadas no ranking
    tipo: post-condition
    blocker: true
    validação: Nenhum item dependente posicionado antes de sua dependência sem documentação
    error_message: "Conflito de dependências no ranking — ajustar"
```

---

## Completion Criteria

- Todos os itens catalogados com metadados
- Framework aplicado com scores/categorias calculados
- Lista rankeada com justificativa por posição
- Quick wins identificados
- Dependências verificadas e respeitadas
- CEO informado com recomendação de ação

---

## Metadata

```yaml
story: N/A
version: 2.0.0
dependencies:
  - .aios-core/core/intelligence/jarvis-pattern-engine.js (v2.0)
  - .aios-core/core/intelligence/jarvis-decision-record.js (v2.0)
  - .aios-core/core/memory/jarvis-business-memory.js (v2.0)
tags:
  - jarvis
  - prioritization
  - moscow
  - rice
  - backlog
  - pattern-recognition
  - decision-recording
updated_at: 2026-02-21
changelog:
  - version: 2.0.0
    date: 2026-02-21
    changes:
      - Integração com PatternRecognitionEngine para histórico de itens similares
      - Integração com DecisionRecordSystem para registro de decisões de priorização
      - Step 1 enriquecido com consulta a padrões e priorizações anteriores
      - Step 4 registra decisão final no DecisionRecordSystem
      - Captura de padrão de priorização na JarvisBusinessMemory
      - Confidence score (RICE) informado por dados históricos quando disponíveis
  - version: 1.0.0
    date: 2026-02-21
    changes:
      - Versão inicial do prioritize workflow
```
