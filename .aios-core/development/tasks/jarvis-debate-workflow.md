# Jarvis Debate Workflow — Propor e Mediar Debates Entre Agentes

## Purpose

Estruturar e mediar debates produtivos entre agentes quando há incerteza técnica, decisões com trade-offs significativos ou necessidade de consenso. Jarvis atua como mediador imparcial, garantindo que ambos os lados sejam ouvidos e que o CEO receba uma recomendação clara ao final.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisDebate()
id: jarvis-debate-workflow
version: 1.0.0
responsável: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: interactive
atomic_layer: Organism

**Entrada:**
- campo: topic
  tipo: string
  origem: User Input (CEO)
  obrigatório: true
  validação: "Tópico ou pergunta clara para debate — mínimo 5 palavras"

- campo: agents
  tipo: array
  origem: User Input ou Auto-detectado
  obrigatório: false
  validação: "Lista de agentes participantes (mínimo 2). Se não fornecido, Jarvis seleciona."

- campo: format
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "quick|structured|deep — default: structured"

**Saída:**
- campo: debate_summary
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: recommendation
  tipo: object
  destino: Console Output
  persistido: false
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Tópico de debate claramente definido
    tipo: pre-condition
    blocker: true
    validação: |
      Tópico deve ser uma pergunta ou dilema com pelo menos 2 perspectivas válidas
    error_message: "Senhor, preciso de um tópico mais específico. O que exatamente está em debate?"

  - [ ] Pelo menos 2 perspectivas possíveis
    tipo: pre-condition
    blocker: true
    validação: |
      O tópico deve admitir no mínimo 2 posições legítimas para constituir debate
    error_message: "Este tópico não admite debate — há apenas uma opção viável. Posso assessorar diretamente."
```

---

## SEQUENTIAL Task Execution

### Step 1: Definir Tópico e Escopo do Debate

**Objetivo:** Formular a questão central do debate de forma clara e objetiva.

**Ações:**
1. Reformular a demanda do CEO como uma pergunta de debate:
   - Entrada do CEO: "REST ou GraphQL pro novo módulo?"
   - Questão formatada: "Qual protocolo de API adotar para o módulo {X}: REST ou GraphQL?"
2. Definir escopo e limitações:
   - Quais critérios de decisão são relevantes (performance, maintainability, team skill, etc.)
   - Quais aspectos NÃO estão em debate (decisões já tomadas, constraints fixos)
3. Identificar o tipo de debate:
   - **Tecnológico:** Escolha de tecnologia, padrão ou abordagem técnica
   - **Estratégico:** Direção de produto, priorização, alocação de recursos
   - **Arquitetural:** Design de sistema, trade-offs de escalabilidade
   - **Processo:** Metodologia, workflow, governança
4. Definir critérios de avaliação (framework de decisão):
   - Listar 3-5 critérios objetivos para avaliar cada opção
   - Atribuir peso relativo a cada critério (se aplicável)

**Output do Step:** Questão de debate formatada, critérios de avaliação definidos

---

### Step 2: Identificar Agentes Participantes

**Objetivo:** Selecionar os agentes mais qualificados para contribuir com perspectivas relevantes.

**Ações:**
1. Se CEO especificou agentes (`--agents {agent1,agent2}`):
   - Validar que os agentes selecionados são relevantes para o tópico
   - Avisar se um agente mais qualificado deveria participar
2. Se CEO NÃO especificou agentes, selecionar automaticamente:
   - Mapear tópico → agentes com expertise relevante
   - Debates tecnológicos: @architect + @dev (mínimo)
   - Debates estratégicos: @pm + @architect
   - Debates de processo: @sm + @qa + @devops
   - Debates de dados: @data-engineer + @architect
   - Debates de UX: @ux-design-expert + @dev
3. Definir papéis no debate:
   - **Proponente:** Defende a opção A
   - **Oponente:** Defende a opção B
   - **Avaliador:** Analisa ambos os lados (geralmente @architect)
   - **Mediador:** Jarvis (sempre)
4. Garantir que CADA perspectiva tem pelo menos 1 defensor
   - Se o debate tem 3+ opções, cada opção deve ter representação

**Output do Step:** Lista de participantes com papéis definidos

---

### Step 3: Apresentar Ambos os Lados

**Objetivo:** Construir argumentos sólidos para cada posição do debate.

**Ações:**
1. Para cada opção/perspectiva, compilar:
   - **Argumentos a favor:** 3-5 pontos objetivos
   - **Argumentos contra:** 2-3 pontos de risco ou limitação
   - **Evidências:** Referências técnicas, dados de mercado, experiência do projeto
   - **Impacto no projeto:** Como esta opção afeta o contexto específico
2. Garantir equilíbrio — cada lado recebe tratamento equivalente:
   - Mesmo número de argumentos
   - Mesma profundidade de análise
   - Nenhuma opinião prévia de Jarvis nos argumentos
3. Formatar como "Position Papers":
   ```markdown
   ### Opção A: {nome}
   **Defendido por:** {agente}
   **A favor:**
   - {argumento 1} — {evidência/referência}
   - {argumento 2} — {evidência/referência}
   **Contra:**
   - {risco 1} — {mitigação possível}
   **Impacto no projeto:** {análise contextual}
   ```
4. Apresentar ambos os lados ao CEO simultaneamente

**Output do Step:** Position papers para cada opção, apresentados ao CEO

---

### Step 4: Mediar Discussão e Análise Cruzada

**Objetivo:** Facilitar a análise cruzada entre as opções, identificando pontos de convergência e divergência.

**Ações:**
1. Identificar pontos de convergência entre as opções:
   - Aspectos em que ambas as opções concordam
   - Valores compartilhados (ex: ambas priorizam performance)
2. Identificar pontos de divergência irreconciliáveis:
   - Trade-offs onde ganhar em um aspecto significa perder em outro
   - Diferenças fundamentais de abordagem
3. Aplicar critérios de avaliação definidos no Step 1:
   - Pontuar cada opção contra cada critério (1-5)
   - Calcular score ponderado (se pesos foram definidos)
4. Verificar contra o contexto específico do projeto:
   - Qual opção se alinha melhor com a arquitetura existente?
   - Qual opção reduz risco no contexto atual?
   - Qual opção é mais reversível se a decisão precisar mudar?
5. Sintetizar a análise:
   ```markdown
   **Análise cruzada:**
   | Critério | Peso | Opção A | Opção B |
   |----------|------|---------|---------|
   | {crit1}  | {w}  | {score} | {score} |
   | TOTAL    |      | {total} | {total} |
   ```

**Output do Step:** Análise cruzada com scores e síntese

---

### Step 5: Compilar Consenso ou Recomendação

**Objetivo:** Gerar uma recomendação clara e justificada para o CEO decidir.

**Ações:**
1. Com base na análise, formular recomendação de Jarvis:
   - Se há consenso claro: "Senhor, ambas as perspectivas convergem para {opção}."
   - Se há trade-off claro: "Senhor, recomendo {opção} porque {justificativa}, aceitando o trade-off de {limitação}."
   - Se empate técnico: "Senhor, ambas as opções são viáveis. O fator decisivo é {critério} — sua preferência define."
2. Formatar recomendação final:
   ```markdown
   **Recomendação de Jarvis:**
   - **Opção recomendada:** {opção}
   - **Justificativa:** {razão principal}
   - **Trade-off aceito:** {o que se perde}
   - **Mitigação:** {como minimizar o trade-off}
   - **Reversibilidade:** {facilidade de mudar de rumo se necessário}
   ```
3. Apresentar ao CEO para decisão final:
   - "Senhor, apresentei os argumentos e minha recomendação. A decisão final é sua."
4. Após decisão do CEO:
   - Registrar decisão tomada
   - Identificar próximos passos decorrentes da decisão
   - Se necessário, delegar implementação da decisão (`*delegate`)

**Output do Step:** Recomendação formatada, decisão do CEO registrada

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-DEBATE-001
    name: Debate sem tópico claro
    description: |
      Debate NÃO pode ser iniciado sem uma questão clara e específica.
      "Vamos debater o projeto" é vago. "REST vs GraphQL para o módulo X" é claro.
    severity: BLOCK
    action: |
      Solicitar clarificação: "Senhor, para um debate produtivo, preciso de uma questão específica.
      Qual exatamente é o dilema ou decisão em aberto?"

  - id: VETO-DEBATE-002
    name: Debate com apenas 1 perspectiva
    description: |
      Debate com apenas 1 opção viável não é debate — é validação.
      Cada debate DEVE ter no mínimo 2 perspectivas legítimas e defensáveis.
    severity: BLOCK
    action: |
      Se apenas 1 opção é viável, redirecionar: "Senhor, não vejo debate aqui —
      há apenas uma opção viável. Posso assessorar diretamente com *assess."

  - id: VETO-DEBATE-003
    name: Debate sem análise de trade-offs
    description: |
      Apresentar opções sem analisar trade-offs é informação, não debate.
      Cada opção DEVE ter prós, contras e impacto no projeto analisados.
    severity: BLOCK
    action: Completar análise de trade-offs antes de apresentar recomendação
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Ambas as perspectivas apresentadas com equilíbrio
    tipo: post-condition
    blocker: true
    validação: Cada opção tem argumentos a favor, contra e análise de impacto
    error_message: "Debate desequilibrado — completar argumentos para todas as opções"

  - [ ] Recomendação clara com justificativa
    tipo: post-condition
    blocker: true
    validação: Recomendação contém opção, justificativa e trade-off aceito
    error_message: "Recomendação incompleta — adicionar justificativa e trade-offs"

  - [ ] Decisão do CEO registrada (ou pendente explicitamente)
    tipo: post-condition
    blocker: false
    validação: Decisão registrada ou debate marcado como aguardando decisão
    error_message: "Decisão não registrada — marcar como pendente"
```

---

## Completion Criteria

- Tópico de debate claramente formulado como pergunta
- Pelo menos 2 perspectivas apresentadas com argumentos equilibrados
- Análise cruzada com critérios objetivos realizada
- Recomendação de Jarvis clara com justificativa e trade-offs
- CEO informado e decisão registrada (ou aguardando)

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - delegation_routing (agent definition)
  - data/brainstorming-techniques.md (optional)
tags:
  - jarvis
  - debate
  - mediation
  - decision-making
updated_at: 2026-02-21
```
