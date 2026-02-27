# Jarvis Brief Workflow — Gerar Briefing Executivo para o CEO

## Purpose

Gerar briefings executivos concisos e acionáveis para o CEO, consolidando status de projetos, bloqueios identificados, entregas recentes e próximos passos recomendados. O briefing deve conter dados específicos — nunca frases vagas como "as coisas estão indo bem".

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisBrief()
id: jarvis-brief-workflow
version: 2.0.0
responsável: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: autonomous
atomic_layer: Organism

**Entrada:**
- campo: scope
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "daily|weekly|project {name} — default: daily"

- campo: project_name
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "Nome do projeto, se scope=project"

**Saída:**
- campo: briefing
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: briefing_log
  tipo: markdown
  destino: .aios/logs/jarvis-briefings/
  persistido: true

**Integrações (v2.0):**
- JarvisBusinessMemory: .aios-core/core/memory/jarvis-business-memory.js
- JarvisDelegationStore: .aios-core/core/orchestration/jarvis-delegation-store.js
- SessionState: .aios-core/core/orchestration/session-state.js (namespace jarvis:)
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Acesso ao status do projeto disponível (project-status.yaml ou equivalente)
    tipo: pre-condition
    blocker: true
    validação: |
      Verificar existência de .aios/project-status.yaml ou docs/stories/ com stories ativas
    error_message: "Sem dados de status do projeto. Impossível gerar briefing sem dados concretos."

  - [ ] Pelo menos um projeto ou story ativa no sistema
    tipo: pre-condition
    blocker: false
    validação: |
      Verificar se existem stories com status != Done ou projetos em andamento
    error_message: "Nenhum projeto ativo encontrado. Briefing será limitado a status geral."
```

---

## SEQUENTIAL Task Execution

### Step 1: Escanear Status dos Projetos + Memória de Negócio

**Objetivo:** Coletar dados concretos sobre o estado atual e enriquecê-los com contexto histórico da memória de negócio.

**Ações:**
1. Ler `.aios/project-status.yaml` para status consolidado do projeto
2. Escanear `docs/stories/` para identificar stories em andamento (status: InProgress, InReview, Ready)
3. Verificar stories bloqueadas ou paradas (sem atualização recente)
4. Coletar métricas relevantes:
   - Stories completas vs. pendentes por epic
   - Stories em progresso e seus responsáveis
   - Tempo médio por story (se disponível)
5. Verificar `docs/stories/backlog.md` para itens de tech debt acumulados
6. **(v2.0) Consultar JarvisBusinessMemory:**
   - `memory.summarize(timeRange)` — padrões capturados no período do briefing
   - `memory.query({ category: 'decision', unresolved: true })` — decisões pendentes de follow-up
   - `memory.getRelevant(currentContext)` — padrões relevantes ao contexto atual
7. **(v2.0) Consultar JarvisDelegationStore:**
   - `store.getActiveDelegations()` — delegações ainda em andamento
   - `store.getDelegationHistory({ after: lastBriefingDate })` — delegações desde o último briefing
   - Para delegações completadas, incluir outcome e duração

**Output do Step:** Dados brutos de status com métricas concretas + contexto histórico da memória

---

### Step 2: Identificar Bloqueios e Riscos

**Objetivo:** Detectar bloqueios ativos, riscos iminentes e dependências não resolvidas.

**Ações:**
1. Identificar stories paradas (status InProgress sem commits recentes)
2. Verificar dependências entre stories — alguma dependência não entregue?
3. Analisar tech debt acumulado — volume e criticidade
4. Verificar se há QA gates pendentes ou falhando
5. Mapear riscos por categoria:
   - **Bloqueio ativo:** Story travada, aguardando decisão ou recurso
   - **Risco iminente:** Dependência próxima de se tornar bloqueio
   - **Atenção:** Item que precisa de decisão do CEO em breve
6. Para cada bloqueio, identificar causa raiz e agente responsável

**Output do Step:** Lista de bloqueios com causa, impacto e agente responsável

---

### Step 3: Compilar Briefing Executivo

**Objetivo:** Consolidar dados em formato executivo conciso e acionável.

**Ações:**
1. Organizar o briefing nas seguintes seções obrigatórias:
   - **Em Andamento:** Lista de projetos/stories ativos com % de progresso e responsável
   - **Entregas Recentes:** O que foi concluído desde o último briefing
   - **Requer Atenção:** Bloqueios, riscos e decisões pendentes
   - **Próximos Passos Recomendados:** Ações sugeridas com prioridade (numeradas)
2. Cada item DEVE conter dados específicos:
   - Nome da story/projeto
   - Percentual de progresso ou status concreto
   - Agente responsável
   - Data ou referência temporal
3. Formatar recomendações como ações acionáveis (verbo + objeto + contexto)
4. Aplicar tom Jarvis: formal-acessível, direto, sem rodeios

**Formato de saída:**
```markdown
Senhor, aqui está seu briefing [diário|semanal|do projeto {name}]:

**Em andamento:**
- {Story/Projeto}: {status concreto} — {agente}, {progresso}

**Delegações ativas:** (v2.0 — do JarvisDelegationStore)
- {Delegação}: delegada a {agente} em {data} — status: {status}

**Entregas recentes:**
- {Story/Projeto}: concluída em {data} por {agente}

**Padrões observados:** (v2.0 — do JarvisBusinessMemory, se houver)
- {Padrão}: {descrição} — Relevância: {contexto}

**Requer atenção:**
- {Issue}: {causa} — Impacto: {descrição}. Sugestão: {ação}

**Decisões pendentes de follow-up:** (v2.0 — se houver)
- {Decisão}: tomada em {data} — aguardando: {o que falta}

**Próximos passos recomendados:**
1. {Ação acionável} (prioridade: {alta|média})
2. {Ação acionável} (prioridade: {alta|média})

Algo mais em que posso ser útil, senhor?
```

---

### Step 4: Apresentar ao CEO

**Objetivo:** Entregar o briefing e aguardar instruções.

**Ações:**
1. Apresentar briefing formatado ao CEO
2. Destacar itens que requerem decisão imediata (se houver)
3. Oferecer opções de aprofundamento: "Deseja que eu detalhe algum item, senhor?"
4. Se CEO solicitar ação sobre algum item, rotear para o comando apropriado:
   - Bloqueio → `*escalate`
   - Delegação → `*delegate`
   - Priorização → `*prioritize`
5. Registrar briefing em log para referência futura

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-BRIEF-001
    name: Briefing sem dados específicos
    description: |
      Briefing NÃO pode conter frases vagas como "as coisas estão indo bem",
      "progresso satisfatório" ou "sem novidades relevantes" sem dados concretos.
      Cada afirmação deve ser acompanhada de dado específico (%, nome, data, agente).
    severity: BLOCK
    action: |
      Se não houver dados suficientes para um item, declarar explicitamente:
      "Dados insuficientes para {item} — recomendo solicitar status a {agente}"

  - id: VETO-BRIEF-002
    name: Briefing sem seção de próximos passos
    description: |
      Todo briefing DEVE conter recomendações acionáveis. Briefing puramente
      informativo sem sugerir próximos passos é proibido.
    severity: BLOCK
    action: Adicionar pelo menos 1 recomendação acionável antes de apresentar
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Briefing contém todas as seções obrigatórias (em andamento, atenção, próximos passos)
    tipo: post-condition
    blocker: true
    validação: Verificar presença de todas as seções no output
    error_message: "Briefing incompleto — seções obrigatórias ausentes"

  - [ ] Cada item do briefing contém dados específicos (não vagos)
    tipo: post-condition
    blocker: true
    validação: Nenhuma frase vaga sem dados de suporte
    error_message: "Briefing contém afirmações vagas — adicionar dados concretos"
```

---

## Completion Criteria

- Todas as seções do briefing preenchidas com dados concretos
- Bloqueios identificados com causa raiz e sugestão de ação
- Pelo menos 1 recomendação acionável nos próximos passos
- Tom Jarvis aplicado (formal-acessível, direto)
- CEO informado e aguardando instruções

---

## Metadata

```yaml
story: N/A
version: 2.0.0
dependencies:
  - .aios/project-status.yaml
  - docs/stories/ (stories ativas)
  - docs/stories/backlog.md
  - .aios-core/core/memory/jarvis-business-memory.js (v2.0)
  - .aios-core/core/orchestration/jarvis-delegation-store.js (v2.0)
  - .aios-core/core/orchestration/session-state.js (v2.0 — namespace jarvis:)
tags:
  - jarvis
  - briefing
  - executive
  - ceo
  - memory-integration
updated_at: 2026-02-21
changelog:
  - version: 2.0.0
    date: 2026-02-21
    changes:
      - Integração com JarvisBusinessMemory para padrões e decisões históricas
      - Integração com JarvisDelegationStore para delegações ativas e histórico
      - Novas seções no briefing: Delegações ativas, Padrões observados, Decisões pendentes
      - SessionState com namespace jarvis: para contexto entre sessões
  - version: 1.0.0
    date: 2026-02-21
    changes:
      - Versão inicial do brief workflow
```
