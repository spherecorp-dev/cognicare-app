# Jarvis Monitor Workflow — Monitorar Execução e Detectar Bloqueios

## Purpose

Monitorar o progresso de todas as delegações e projetos ativos, detectar bloqueios e itens parados, gerar alertas proativos e reportar ao CEO com ações recomendadas. O monitoramento deve ser baseado em dados concretos, nunca em suposições.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisMonitor()
id: jarvis-monitor-workflow
version: 1.0.0
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
  validação: "all|{project-name}|{agent-name} — default: all"

- campo: depth
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "summary|detailed — default: summary"

**Saída:**
- campo: monitoring_dashboard
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: alerts
  tipo: array
  destino: Console Output
  persistido: false
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Dados de status do projeto acessíveis
    tipo: pre-condition
    blocker: true
    validação: |
      Verificar existência de project-status.yaml, stories ativas ou delegation-history
    error_message: "Sem dados para monitorar. Nenhuma fonte de status encontrada."

  - [ ] Pelo menos uma delegação ou projeto ativo no sistema
    tipo: pre-condition
    blocker: false
    validação: |
      Verificar se há delegações abertas ou stories em progresso
    error_message: "Nenhum item ativo para monitorar — sistema em repouso."
```

---

## SEQUENTIAL Task Execution

### Step 1: Verificar Todas as Delegações Ativas

**Objetivo:** Obter snapshot atualizado de todas as delegações e projetos em andamento.

**Ações:**
1. Consultar `data/jarvis-delegation-history.md` para delegações abertas (Status != Concluída)
2. Escanear `docs/stories/` para stories com status InProgress ou InReview:
   - Identificar story, agente responsável, data de início
   - Verificar última modificação do arquivo da story
3. Verificar `.aios/project-status.yaml` para status consolidado
4. Para cada item ativo, registrar:
   ```yaml
   item:
     id: "{story-id ou delegação-id}"
     type: "story|delegation|task"
     responsible: "{agente}"
     status: "{current status}"
     started: "{data de início}"
     last_update: "{última modificação}"
     expected_completion: "{deadline ou estimativa}"
   ```
5. Filtrar por scope (se especificado):
   - `all` → todos os itens
   - `{project-name}` → apenas stories/delegações do projeto
   - `{agent-name}` → apenas itens atribuídos ao agente

**Output do Step:** Lista completa de itens ativos com metadados

---

### Step 2: Identificar Itens Parados e Estagnados

**Objetivo:** Detectar itens que pararam de progredir ou estão atrasados.

**Ações:**
1. Para cada item ativo, calcular tempo desde última atualização:
   - Usar timestamp de última modificação do arquivo da story
   - Comparar com data esperada de conclusão (se definida)
2. Classificar itens por estado de saúde:
   - **Saudável (verde):** Progresso recente (< 24h desde última atualização)
   - **Atenção (amarelo):** Sem atualização em 1-3 dias
   - **Parado (vermelho):** Sem atualização em 3+ dias ou prazo ultrapassado
3. Verificar padrões de estagnação:
   - Story em InProgress há mais de X dias sem commits
   - Delegação sem resposta do agente
   - QA gate pendente sem revisão
4. Para cada item amarelo ou vermelho, buscar possível causa:
   - Dependência não resolvida?
   - Agente sobrecarregado (muitos itens atribuídos)?
   - Falta de clareza na demanda?
   - Bloqueio externo (API, fornecedor, decisão pendente)?

**Output do Step:** Itens classificados por saúde com causas prováveis para itens parados

---

### Step 3: Detectar Bloqueios e Dependências

**Objetivo:** Identificar bloqueios formais e dependências que impedem progresso.

**Ações:**
1. Analisar dependências entre stories:
   - Story A depende de Story B que ainda não foi concluída?
   - Cadeia de dependências com item bloqueado na base?
2. Identificar bloqueios por tipo:
   - **Bloqueio técnico:** Bug, falha de integração, limitação de infraestrutura
   - **Bloqueio de decisão:** Aguarda decisão do CEO ou stakeholder
   - **Bloqueio de recurso:** Agente indisponível, ferramenta sem acesso
   - **Bloqueio externo:** API de terceiro, fornecedor, aprovação externa
3. Avaliar impacto de cada bloqueio:
   - Quantos itens downstream são afetados?
   - Qual o impacto no timeline geral do projeto?
   - Existe workaround possível?
4. Priorizar bloqueios por impacto:
   - **Crítico:** Bloqueia 3+ itens ou compromete deadline do projeto
   - **Alto:** Bloqueia 1-2 itens com impacto significativo
   - **Médio:** Atrasa mas não bloqueia outros itens
   - **Baixo:** Inconveniência sem impacto material

**Output do Step:** Lista de bloqueios priorizados com impacto e sugestão de resolução

---

### Step 4: Gerar Alertas Proativos

**Objetivo:** Criar alertas acionáveis para itens que requerem atenção.

**Ações:**
1. Gerar alertas por severidade:
   ```markdown
   **ALERTA CRÍTICO:** {item} bloqueado há {N} dias — impacta {M} entregas downstream
   **ALERTA ALTO:** {item} sem atualização há {N} dias — prazo em risco
   **ATENÇÃO:** {item} progredindo lentamente — monitorar nos próximos 2 dias
   ```
2. Para cada alerta, incluir:
   - O que está acontecendo (fato, não opinião)
   - Há quanto tempo (dados concretos)
   - Qual o impacto (itens afetados)
   - Ação sugerida (específica e acionável)
3. Detectar alertas preditivos (riscos iminentes):
   - Prazo se aproximando com progresso insuficiente
   - Agente com muitos itens simultâneos (risco de sobrecarga)
   - Dependência que pode se tornar bloqueio em breve
4. Priorizar alertas: críticos primeiro, depois altos, depois atenção

**Output do Step:** Lista de alertas formatados por severidade

---

### Step 5: Reportar ao CEO

**Objetivo:** Apresentar dashboard de monitoramento conciso e acionável.

**Ações:**
1. Compilar dashboard no formato:
   ```markdown
   Senhor, aqui está o monitoramento [geral|do projeto {name}|do agente {name}]:

   **Dashboard de Progresso:**
   | Item | Agente | Status | Saúde | Última Atualização |
   |------|--------|--------|-------|--------------------|
   | {id} | {agent}| {status}| {cor} | {data}            |

   **Alertas ({N} total):**
   - [CRITICO] {alerta} — Ação: {sugestão}
   - [ALTO] {alerta} — Ação: {sugestão}
   - [ATENCAO] {alerta} — Ação: {sugestão}

   **Bloqueios Ativos ({N}):**
   - {bloqueio}: {causa} → Sugestão: {resolução}

   **Resumo:**
   - {X} itens saudáveis, {Y} requerem atenção, {Z} parados
   - Próximas entregas esperadas: {lista}

   Deseja que eu tome alguma ação sobre os alertas, senhor?
   ```
2. Se houver alertas críticos, destacar no início
3. Oferecer ações imediatas:
   - "Desejo escalar o bloqueio em {item}?" → `*escalate`
   - "Desejo realocar {item} para outro agente?" → `*delegate`
   - "Desejo repriorizar o backlog?" → `*prioritize`
4. Registrar monitoramento para trending futuro

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-MONITOR-001
    name: Relatório de monitoramento sem dados concretos
    description: |
      O relatório de monitoramento NUNCA pode conter frases como
      "tudo progredindo normalmente" sem dados de suporte.
      Cada item deve ter status, data de última atualização e classificação de saúde.
    severity: BLOCK
    action: |
      Se não houver dados suficientes para um item, declarar:
      "Dados insuficientes para {item} — status desconhecido. Recomendo solicitar update a {agente}."

  - id: VETO-MONITOR-002
    name: Alertas sem ação sugerida
    description: |
      Alertas sem sugestão de ação são inúteis. Cada alerta DEVE
      ser acompanhado de pelo menos 1 ação recomendada.
    severity: BLOCK
    action: Adicionar ação recomendada antes de apresentar cada alerta
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Dashboard contém todos os itens ativos com status e saúde
    tipo: post-condition
    blocker: true
    validação: Todos os itens ativos listados com dados completos
    error_message: "Dashboard incompleto — itens ativos ausentes"

  - [ ] Bloqueios identificados com causa e sugestão de resolução
    tipo: post-condition
    blocker: true
    validação: Cada bloqueio tem causa, impacto e ação sugerida
    error_message: "Bloqueios sem análise — completar causa e sugestão"

  - [ ] CEO informado com opções de ação
    tipo: post-condition
    blocker: false
    validação: Relatório apresentado com ofertas de ação
    error_message: "Relatório apresentado sem opções de ação"
```

---

## Completion Criteria

- Todos os itens ativos verificados e classificados
- Itens parados identificados com causa provável
- Bloqueios detectados e priorizados por impacto
- Alertas gerados com ações recomendadas
- Dashboard apresentado ao CEO em formato conciso e acionável

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - .aios/project-status.yaml
  - docs/stories/ (stories ativas)
  - data/jarvis-delegation-history.md
tags:
  - jarvis
  - monitoring
  - blockers
  - alerts
  - dashboard
updated_at: 2026-02-21
```
