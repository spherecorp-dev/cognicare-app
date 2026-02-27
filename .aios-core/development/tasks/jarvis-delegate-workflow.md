# Jarvis Delegate Workflow — Analisar Demanda e Delegar ao Agente Ideal

## Purpose

Analisar uma demanda do CEO, identificar o agente mais qualificado usando a tabela de roteamento, preparar um pacote de contexto completo e delegar com rastreabilidade total. Garante que nenhuma delegação aconteça sem contexto suficiente ou para o agente errado.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisDelegate()
id: jarvis-delegate-workflow
version: 2.0.0
responsável: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: interactive
atomic_layer: Organism

**Entrada:**
- campo: demand
  tipo: string
  origem: User Input (CEO)
  obrigatório: true
  validação: "Descrição da demanda — mínimo 5 palavras"

- campo: priority
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "critical|high|medium|low — default: medium"

- campo: deadline
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "Data ou prazo relativo (ex: 'até sexta', '2 dias')"

**Saída:**
- campo: delegation_record
  tipo: object
  destino: JarvisDelegationStore (JSONL append-only)
  persistido: true

- campo: delegation_summary
  tipo: markdown
  destino: Console Output
  persistido: false

**Integrações (v2.0):**
- JarvisDelegator: .aios-core/core/orchestration/jarvis-delegator.js
- JarvisDelegationStore: .aios-core/core/orchestration/jarvis-delegation-store.js
- JarvisBusinessMemory: .aios-core/core/memory/jarvis-business-memory.js
- JarvisMonitor: .aios-core/core/orchestration/jarvis-monitor.js
- Jarvis/Orion Protocol: .aios-core/development/data/jarvis-orion-protocol.yaml
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Demanda fornecida pelo CEO com contexto mínimo
    tipo: pre-condition
    blocker: true
    validação: |
      Demanda não pode ser vazia ou genérica demais (< 5 palavras)
    error_message: "Senhor, preciso de mais contexto sobre a demanda para delegá-la adequadamente."

  - [ ] Tabela de roteamento de agentes acessível
    tipo: pre-condition
    blocker: false
    validação: |
      delegation_routing na definição do agente Jarvis está carregada
    error_message: "Tabela de roteamento não disponível — usando mapeamento padrão."
```

---

## SEQUENTIAL Task Execution

### Step 1: Parsear e Compreender a Demanda (+ Contexto Histórico)

**Objetivo:** Entender completamente o que o CEO precisa, enriquecido com contexto de memória de negócio.

**Ações:**
1. Analisar a demanda do CEO para extrair:
   - **O quê:** Entregável esperado (feature, documento, análise, decisão)
   - **Por quê:** Motivação ou contexto de negócio
   - **Urgência:** Prazo explícito ou inferido pelo contexto
   - **Escopo:** Abrangência (pontual, multi-sistema, estratégico)
2. Classificar a demanda por categoria:
   - `strategy_product` — Novo produto, feature, PRD
   - `architecture_tech` — Decisão técnica, design de sistema
   - `stories_backlog` — Criação de stories, sprint planning
   - `validation` — Validação de stories, critérios de aceite
   - `implementation` — Codificação, debugging
   - `quality` — Testes, QA gates
   - `database` — Schema, dados, migrations
   - `research` — Pesquisa, análise de mercado
   - `deploy` — CI/CD, releases, git push
   - `design` — UX/UI
   - `copy` — Copywriting, textos de conversão
   - `framework` — Operações do AIOS framework
3. Se a demanda for ambígua, solicitar clarificação ao CEO ANTES de prosseguir:
   - "Senhor, permita-me clarificar: quando diz '{trecho}', refere-se a {opção A} ou {opção B}?"
4. **(v2.0) Consultar JarvisBusinessMemory para contexto histórico:**
   - `memory.getRelevant({ category, keywords })` — padrões anteriores relevantes
   - `memory.query({ category: 'preference', agent })` — preferências do CEO para este tipo de demanda
   - Se houver delegação anterior similar: informar duração e resultado
5. **(v2.0) Estimar complexidade via JarvisDelegator:**
   - `delegator.estimateComplexity(task, suggestedAgent)` — usa histórico real
   - Retorna: `{ level: 'simple'|'standard'|'complex', avgDuration, confidence }`

**Output do Step:** Demanda classificada com categoria, complexidade data-driven e contexto histórico

---

### Step 2: Identificar o Agente Ideal via Tabela de Roteamento

**Objetivo:** Selecionar o agente mais qualificado para a demanda.

**Ações:**
1. Consultar `delegation_routing` para mapear categoria → agente:
   ```yaml
   strategy_product:  '@pm (Morgan)'
   architecture_tech: '@architect (Aria)'
   stories_backlog:   '@sm (River)'
   validation:        '@po (Pax)'
   implementation:    '@dev (Dex)'
   quality:           '@qa (Quinn)'
   database:          '@data-engineer (Dara)'
   research:          '@analyst (Atlas)'
   deploy:            '@devops (Gage)'
   design:            '@ux-design-expert (Uma)'
   copy:              '@stefan-georgi'
   framework:         '@aios-master (Orion)'
   ```
2. Verificar se a demanda cruza múltiplas categorias:
   - Se sim, identificar agente PRIMÁRIO (quem lidera) e agentes SUPORTE
   - Exemplo: "Nova API com dashboard" → Primário: @architect, Suporte: @dev, @ux-design-expert
3. Verificar authority boundaries — o agente selecionado tem autoridade para esta ação?
   - @devops é exclusivo para git push/PR
   - @po é exclusivo para validação de stories
   - @sm é exclusivo para criação de stories
4. Se demanda é complexa (COMPLEX), considerar workflow sequencial com múltiplos agentes

**Output do Step:** Agente primário selecionado, agentes de suporte (se aplicável), justificativa

---

### Step 3: Preparar Pacote de Contexto

**Objetivo:** Compilar todo o contexto necessário para que o agente execute sem precisar pesquisar.

**Ações:**
1. Reunir contexto relevante da demanda:
   - Descrição completa da demanda (parseada no Step 1)
   - Referências a stories, epics ou PRDs relacionados
   - Status atual do projeto relevante
   - Dependências conhecidas
   - Restrições ou constraints do CEO
2. Definir critérios de aceite da delegação:
   - O que o agente deve entregar
   - Formato esperado do entregável
   - Definição de "feito" para esta delegação
3. Definir timeline:
   - Prazo explícito (se fornecido pelo CEO)
   - Prazo estimado (se não fornecido, estimar com base na complexidade)
   - Marcos intermediários (para demandas COMPLEX)
4. Montar pacote de contexto no formato padrão:
   ```markdown
   **Delegação: {título curto}**
   - Agente: {agente}
   - Demanda: {descrição completa}
   - Entregável: {o que deve ser produzido}
   - Critérios de aceite: {lista de critérios}
   - Prazo: {data/período}
   - Prioridade: {critical|high|medium|low}
   - Contexto adicional: {referências, restrições}
   ```

**Output do Step:** Pacote de contexto completo pronto para delegação

---

### Step 4: Delegar via JarvisDelegator (v2.0)

**Objetivo:** Apresentar plano ao CEO e, após aprovação, delegar formalmente via JarvisDelegator.

**Ações:**
1. Apresentar ao CEO o plano de delegação:
   - Agente selecionado com justificativa
   - Pacote de contexto resumido
   - Timeline estimada (baseada em `estimateComplexity()`)
   - Performance histórica do agente (via `getAgentPerformance()`)
   - Riscos identificados (se houver)
2. Aguardar aprovação do CEO (se demanda for estratégica/COMPLEX):
   - Se CEO aprovar → prosseguir
   - Se CEO ajustar → incorporar ajustes e re-apresentar
   - Se CEO rejeitar → solicitar nova direção
3. Para demandas SIMPLE, Jarvis pode delegar diretamente informando o CEO:
   - "Senhor, delegando diretamente para {agente} — demanda simples e direta."
4. **(v2.0) Executar delegação via JarvisDelegator:**
   ```javascript
   const result = await delegator.delegate(task, agentName, {
     businessContext: { demand, category, complexity, ceoConstraints },
     priority,
     deadline,
     metadata: { ceoApproval, supportAgents },
   });
   ```
   - O JarvisDelegator automaticamente:
     - Cria registro no JarvisDelegationStore
     - Enriquece com contexto do JarvisBusinessMemory
     - Aplica retry/timeout se executor configurado
     - Emite eventos para monitoramento
5. Comunicar ao agente receptor (via instrução ao CEO para ativar o agente):
   - "Senhor, delegação registrada (ID: {delegationId}). Recomendo ativar @{agente} com o contexto preparado."

**Output do Step:** Delegação registrada no store e apresentada ao CEO

---

### Step 5: Registrar e Monitorar (v2.0)

**Objetivo:** Garantir rastreabilidade e monitoramento contínuo via JarvisMonitor.

**Ações:**
1. **(v2.0) Registro automático via JarvisDelegationStore:**
   - Já realizado automaticamente pelo `delegator.delegate()` no Step 4
   - Registro JSONL append-only com replay capability
   - Índice atualizado para consultas rápidas
2. **(v2.0) Capturar padrão de negócio na memória:**
   ```javascript
   memory.capture({
     title: `Delegação: ${task}`,
     description: `Delegado para ${agentName} — ${category}`,
     category: 'delegation',
     importance: priority === 'critical' ? 'high' : 'medium',
     context: { agents_involved: [agentName], business_domain: category },
   });
   ```
3. **(v2.0) Ativar monitoramento via JarvisMonitor:**
   - Monitor detecta automaticamente se delegação fica stale
   - Thresholds ajustados por prioridade (critical = 30min, high = 1h, medium = 2h, low = 4h)
   - Alertas proativos ao CEO: "Senhor, a delegação para {agente} está sem atualização há {tempo}."
4. Informar CEO que a delegação foi registrada:
   - "Delegação registrada (ID: {id}), senhor. Monitorarei o progresso e lhe informarei sobre atualizações."
5. **(v2.0) Verificar protocolo Jarvis/Orion:**
   - Se demanda envolve `framework` → informar CEO que requer @aios-master (protocolo CR-002)
   - Se demanda cruza autoridades → respeitar boundaries definidas no protocolo

**Output do Step:** Delegação registrada, memória atualizada, monitoramento ativo

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-DELEGATE-001
    name: Delegação sem contexto
    description: |
      Delegação NUNCA pode ser feita sem pacote de contexto completo.
      O agente receptor deve receber: demanda clara, entregável esperado,
      critérios de aceite e prazo (ou estimativa).
    severity: BLOCK
    action: |
      Compilar contexto antes de delegar. Se dados insuficientes,
      solicitar ao CEO: "Senhor, preciso de mais detalhes sobre {aspecto} para delegar adequadamente."

  - id: VETO-DELEGATE-002
    name: Delegação para autoridade errada
    description: |
      Delegar para um agente que não tem autoridade sobre a ação solicitada.
      Exemplos: delegar git push para @dev (exclusivo @devops),
      delegar validação de story para @dev (exclusivo @po).
    severity: BLOCK
    action: |
      Redirecionar para o agente correto conforme authority boundaries.
      Informar CEO: "Senhor, essa operação é exclusiva de {agente correto}. Redirecionando."

  - id: VETO-DELEGATE-003
    name: Delegação sem classificação de demanda
    description: |
      Não delegar sem antes classificar a demanda em categoria e complexidade.
      Delegação "às cegas" é proibida.
    severity: BLOCK
    action: Executar Step 1 completamente antes de selecionar agente
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Agente selecionado tem autoridade para a ação delegada
    tipo: post-condition
    blocker: true
    validação: Verificar authority boundaries no agent-authority.md
    error_message: "Agente selecionado não tem autoridade — redirecionar"

  - [ ] Pacote de contexto contém todos os campos obrigatórios
    tipo: post-condition
    blocker: true
    validação: Verificar presença de demanda, entregável, critérios, prazo
    error_message: "Pacote de contexto incompleto — campos obrigatórios ausentes"

  - [ ] Delegação registrada no JarvisDelegationStore
    tipo: post-condition
    blocker: false
    validação: Verificar registro em .aios/jarvis/delegations/{delegationId}.jsonl
    error_message: "Falha ao registrar delegação — registrar manualmente"

  - [ ] Padrão de delegação capturado no JarvisBusinessMemory (v2.0)
    tipo: post-condition
    blocker: false
    validação: Verificar memory.query({ category: 'delegation' }) contém registro
    error_message: "Falha ao capturar padrão — capturar manualmente"
```

---

## Completion Criteria

- Demanda completamente compreendida e classificada
- Agente correto selecionado com justificativa
- Pacote de contexto completo preparado e entregue
- CEO informado (e aprovou, se necessário)
- Delegação registrada no JarvisDelegationStore com ID rastreável
- Padrão de delegação capturado na memória de negócio (v2.0)
- Monitoramento ativo via JarvisMonitor (v2.0)

---

## Metadata

```yaml
story: N/A
version: 2.0.0
dependencies:
  - delegation_routing (agent definition)
  - agent-authority.md
  - .aios-core/core/orchestration/jarvis-delegator.js (v2.0)
  - .aios-core/core/orchestration/jarvis-delegation-store.js (v2.0)
  - .aios-core/core/memory/jarvis-business-memory.js (v2.0)
  - .aios-core/core/orchestration/jarvis-monitor.js (v2.0)
  - .aios-core/development/data/jarvis-orion-protocol.yaml (v2.0)
tags:
  - jarvis
  - delegation
  - orchestration
  - routing
  - memory-integration
  - monitoring
updated_at: 2026-02-21
changelog:
  - version: 2.0.0
    date: 2026-02-21
    changes:
      - Integração com JarvisDelegator para delegação estruturada
      - Estimativa de complexidade data-driven via histórico
      - Registro automático no JarvisDelegationStore (JSONL append-only)
      - Captura de padrões na JarvisBusinessMemory
      - Monitoramento contínuo via JarvisMonitor
      - Respeito ao protocolo Jarvis/Orion para authority boundaries
  - version: 1.0.0
    date: 2026-02-21
    changes:
      - Versão inicial do delegate workflow
```
