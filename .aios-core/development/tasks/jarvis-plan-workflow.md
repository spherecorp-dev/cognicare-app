# Jarvis Plan Workflow — Criar Plano Estratégico de Execução

## Purpose

Criar planos estratégicos de execução completos para objetivos definidos pelo CEO. O plano deve conter fases, delegações de agentes, timeline, riscos e marcos de verificação. Nenhum plano pode ser entregue sem timeline e delegações definidas.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisPlan()
id: jarvis-plan-workflow
version: 1.0.0
responsável: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: interactive
atomic_layer: Organism

**Entrada:**
- campo: objective
  tipo: string
  origem: User Input (CEO)
  obrigatório: true
  validação: "Objetivo estratégico — descrição clara do que se deseja alcançar"

- campo: constraints
  tipo: object
  origem: User Input
  obrigatório: false
  validação: "Restrições: prazo máximo, orçamento, recursos limitados"

- campo: granularity
  tipo: string
  origem: User Input
  obrigatório: false
  validação: "high-level|detailed — default: high-level"

**Saída:**
- campo: execution_plan
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: plan_summary
  tipo: markdown
  destino: Console Output
  persistido: false
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Objetivo claramente definido pelo CEO
    tipo: pre-condition
    blocker: true
    validação: |
      Objetivo deve responder: O que deve ser alcançado? Por que importa?
    error_message: "Senhor, preciso de um objetivo mais claro. O que exatamente deseja alcançar?"

  - [ ] Contexto do projeto acessível para análise de recursos
    tipo: pre-condition
    blocker: false
    validação: |
      Acesso a project-status.yaml e/ou stories para mapear estado atual
    error_message: "Sem contexto completo do projeto — plano será baseado apenas no input do CEO."
```

---

## SEQUENTIAL Task Execution

### Step 1: Compreender o Objetivo

**Objetivo:** Entender profundamente o que o CEO quer alcançar, por que, e com quais restrições.

**Ações:**
1. Analisar o objetivo fornecido e decompor:
   - **O quê:** Entregável final desejado
   - **Por quê:** Valor de negócio ou motivação estratégica
   - **Para quem:** Beneficiários (clientes, time, empresa)
   - **Quando:** Prazo desejado ou deadline
   - **Métricas de sucesso:** Como saberemos que foi alcançado?
2. Classificar o tipo de objetivo:
   - **Produto:** Lançar feature, produto ou melhoria
   - **Técnico:** Migração, refatoração, infraestrutura
   - **Operacional:** Processo, workflow, governança
   - **Estratégico:** Novo mercado, pivô, expansão
3. Estimar escopo e complexidade:
   - **Pequeno:** 1-2 agentes, 1-2 semanas
   - **Médio:** 3-4 agentes, 2-4 semanas
   - **Grande:** 5+ agentes, 1+ mês
4. Se objetivo for vago, solicitar refinamento:
   - "Senhor, quando diz '{objetivo}', qual seria o critério de sucesso específico?"
   - "Há alguma restrição de prazo ou recurso que devo considerar?"

**Output do Step:** Objetivo decomposto com tipo, escopo e critérios de sucesso

---

### Step 2: Analisar Recursos e Dependências

**Objetivo:** Mapear o que está disponível e o que precisa ser criado/resolvido para executar.

**Ações:**
1. Inventário de recursos disponíveis:
   - Agentes disponíveis e suas cargas atuais (verificar `*monitor` data)
   - Infraestrutura existente (verificar project-status)
   - Artefatos reutilizáveis (stories existentes, PRDs, arquitetura)
2. Mapear dependências:
   - **Internas:** Stories ou epics que precisam ser concluídos primeiro
   - **Externas:** APIs de terceiros, aprovações, fornecedores
   - **Técnicas:** Ferramentas ou configurações necessárias
3. Identificar gaps:
   - Falta algum agente especializado para este objetivo?
   - Há conhecimento técnico faltante que requer pesquisa?
   - Infraestrutura precisa ser provisionada?
4. Mapear riscos iniciais:
   - O que pode dar errado?
   - Qual a probabilidade e impacto de cada risco?
   - Existe plano B se o risco se materializar?

**Output do Step:** Mapa de recursos, dependências e riscos identificados

---

### Step 3: Definir Fases de Execução

**Objetivo:** Estruturar o plano em fases sequenciais com entregáveis claros.

**Ações:**
1. Decompor o objetivo em fases lógicas:
   - **Fase 0 — Preparação:** Pesquisa, PRD, arquitetura (se necessário)
   - **Fase 1 — Fundação:** Infraestrutura base, schemas, configurações
   - **Fase 2 — Implementação Core:** Features principais, lógica de negócio
   - **Fase 3 — Integração:** Conexão entre componentes, APIs externas
   - **Fase 4 — Validação:** Testes, QA gates, revisão
   - **Fase 5 — Entrega:** Deploy, documentação, handoff
2. Para cada fase, definir:
   - **Objetivo da fase:** O que é alcançado ao final
   - **Entregáveis:** Artefatos concretos produzidos
   - **Critério de conclusão:** Como saber que a fase terminou
   - **Dependências:** Fases anteriores que devem estar concluídas
3. Pular fases desnecessárias (ex: objetivo simples pode pular Fase 0)
4. Adicionar marcos de verificação (checkpoints):
   - Pontos onde Jarvis verifica progresso com o CEO
   - Decisões que precisam de aprovação antes de prosseguir

**Output do Step:** Fases definidas com entregáveis e critérios de conclusão

---

### Step 4: Atribuir Agentes às Fases

**Objetivo:** Mapear qual agente é responsável por cada fase e entregável.

**Ações:**
1. Para cada fase, atribuir agente primário e suporte:
   ```markdown
   **Fase 0 — Preparação:**
   - Primário: @pm (Morgan) — PRD e requisitos
   - Suporte: @architect (Aria) — viabilidade técnica
   - Suporte: @analyst (Atlas) — pesquisa de mercado (se necessário)

   **Fase 1 — Fundação:**
   - Primário: @architect (Aria) — arquitetura e design
   - Suporte: @data-engineer (Dara) — schema de dados

   **Fase 2 — Implementação:**
   - Primário: @sm (River) — criação de stories
   - Primário: @dev (Dex) — implementação
   - Suporte: @ux-design-expert (Uma) — UI/UX (se frontend)

   **Fase 3 — Integração:**
   - Primário: @dev (Dex) — integração técnica
   - Suporte: @devops (Gage) — CI/CD e infra

   **Fase 4 — Validação:**
   - Primário: @qa (Quinn) — QA gates
   - Suporte: @po (Pax) — validação de stories

   **Fase 5 — Entrega:**
   - Primário: @devops (Gage) — deploy e release
   - Monitoramento: @jarvis — acompanhamento pós-entrega
   ```
2. Verificar authority boundaries — cada agente tem autoridade para sua tarefa atribuída
3. Identificar gargalos potenciais — agente atribuído a muitas fases simultâneas
4. Definir handoff points entre agentes

**Output do Step:** Matriz de atribuição de agentes por fase

---

### Step 5: Definir Timeline

**Objetivo:** Estimar duração de cada fase e definir timeline completa.

**Ações:**
1. Estimar duração de cada fase com base em:
   - Complexidade dos entregáveis
   - Disponibilidade dos agentes
   - Dependências e tempo de espera
   - Histórico de entregas similares (se disponível)
2. Definir timeline:
   ```markdown
   | Fase | Duração Estimada | Início | Término | Agente |
   |------|------------------|--------|---------|--------|
   | 0    | 2-3 dias         | D+0    | D+3     | @pm    |
   | 1    | 3-5 dias         | D+3    | D+8     | @architect |
   | 2    | 1-2 semanas      | D+8    | D+22    | @dev   |
   | 3    | 3-5 dias         | D+22   | D+27    | @dev   |
   | 4    | 2-3 dias         | D+27   | D+30    | @qa    |
   | 5    | 1-2 dias         | D+30   | D+32    | @devops|
   ```
3. Identificar fases que podem ser paralelas (ex: UI e API simultâneos)
4. Adicionar buffer para riscos identificados (10-20% do total)
5. Calcular total: "Estimativa total: {X} dias úteis (com buffer de {Y}%)"

**Output do Step:** Timeline completa com estimativas e buffer

---

### Step 6: Apresentar para Aprovação do CEO

**Objetivo:** Entregar o plano formatado para revisão e aprovação do CEO.

**Ações:**
1. Compilar plano completo:
   ```markdown
   Senhor, aqui está o plano estratégico para: **{objetivo}**

   **Resumo Executivo:**
   - Objetivo: {entregável final}
   - Escopo: {tipo} | Complexidade: {nível}
   - Timeline estimada: {total} dias úteis
   - Agentes envolvidos: {lista}

   **Fases de Execução:**
   {detalhamento de cada fase com agentes e entregáveis}

   **Timeline:**
   {tabela com datas estimadas}

   **Riscos Identificados:**
   - {risco 1}: Probabilidade {X}, Impacto {Y} — Mitigação: {ação}
   - {risco 2}: Probabilidade {X}, Impacto {Y} — Mitigação: {ação}

   **Marcos de Verificação:**
   - Checkpoint 1 (D+{N}): {o que verificar}
   - Checkpoint 2 (D+{N}): {o que verificar}

   **Próximo passo imediato:** {primeira ação concreta se CEO aprovar}

   Deseja aprovar, ajustar ou redesenhar, senhor?
   ```
2. Se CEO aprovar → iniciar Fase 0 via `*delegate`
3. Se CEO ajustar → incorporar ajustes e re-apresentar
4. Se CEO rejeitar → solicitar nova direção e redesenhar

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-PLAN-001
    name: Plano sem timeline
    description: |
      Plano de execução NUNCA pode ser apresentado sem timeline estimada.
      Mesmo que imprecisa, uma estimativa de duração por fase é obrigatória.
      "Não sei quanto tempo leva" não é aceitável — estimar com range (ex: 2-4 semanas).
    severity: BLOCK
    action: |
      Estimar timeline por fase antes de apresentar.
      Se incerteza for alta, usar ranges amplos e documentar: "Estimativa sujeita a validação após Fase 0."

  - id: VETO-PLAN-002
    name: Plano sem delegações definidas
    description: |
      Plano sem atribuição de agentes a cada fase é um plano incompleto.
      Cada fase DEVE ter pelo menos 1 agente primário atribuído.
    severity: BLOCK
    action: Atribuir agentes a cada fase antes de apresentar

  - id: VETO-PLAN-003
    name: Plano sem critérios de conclusão
    description: |
      Cada fase deve ter critério claro de conclusão.
      Sem definição de "feito", é impossível monitorar progresso.
    severity: BLOCK
    action: Definir critério de conclusão para cada fase
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Plano contém todas as fases necessárias com entregáveis
    tipo: post-condition
    blocker: true
    validação: Cada fase tem objetivo, entregáveis e critério de conclusão
    error_message: "Plano com fases incompletas — adicionar entregáveis e critérios"

  - [ ] Timeline estimada para cada fase e total
    tipo: post-condition
    blocker: true
    validação: Cada fase tem duração estimada; total calculado com buffer
    error_message: "Timeline ausente ou incompleta"

  - [ ] Agentes atribuídos a cada fase respeitando authority boundaries
    tipo: post-condition
    blocker: true
    validação: Cada fase tem agente primário; autoridades verificadas
    error_message: "Atribuição de agentes incompleta ou com conflito de autoridade"

  - [ ] Riscos identificados com mitigação proposta
    tipo: post-condition
    blocker: false
    validação: Pelo menos 1 risco documentado com mitigação
    error_message: "Nenhum risco identificado — improvável. Revisar análise."
```

---

## Completion Criteria

- Objetivo decomposto e compreendido
- Recursos e dependências mapeados
- Fases definidas com entregáveis e critérios de conclusão
- Agentes atribuídos a cada fase
- Timeline estimada com buffer
- Riscos documentados com mitigação
- Plano apresentado ao CEO para aprovação

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - .aios/project-status.yaml
  - delegation_routing (agent definition)
  - agent-authority.md
tags:
  - jarvis
  - planning
  - strategy
  - execution-plan
  - timeline
updated_at: 2026-02-21
```
