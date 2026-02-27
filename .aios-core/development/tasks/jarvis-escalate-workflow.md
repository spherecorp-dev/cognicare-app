# Jarvis Escalate Workflow — Escalar Problemas para Atencao do CEO

## Purpose

Identificar, avaliar e escalar problemas que requerem atencao imediata do CEO. A escalacao deve incluir avaliacao de severidade, impacto quantificado e opcoes de acao propostas. Escalar sem severidade avaliada ou sem opcoes de resolucao e proibido.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisEscalate()
id: jarvis-escalate-workflow
version: 1.0.0
responsavel: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: autonomous
atomic_layer: Organism

**Entrada:**
- campo: issue
  tipo: string
  origem: User Input ou Deteccao Automatica
  obrigatorio: true
  validacao: "Descricao do problema a ser escalado"

- campo: source
  tipo: string
  origem: System
  obrigatorio: false
  validacao: "manual|monitoring|qa-gate|agent-report — indica como o problema foi detectado"

- campo: affected_items
  tipo: array
  origem: System ou User Input
  obrigatorio: false
  validacao: "Lista de stories, projetos ou agentes afetados"

**Saida:**
- campo: escalation_report
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: escalation_record
  tipo: object
  destino: .aios/logs/jarvis-escalations/
  persistido: true
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Problema identificado com descricao minima
    tipo: pre-condition
    blocker: true
    validacao: |
      Issue deve conter descricao do problema — nao pode ser vazio
    error_message: "Sem descricao do problema. O que exatamente precisa ser escalado?"

  - [ ] Problema nao e trivial (merece escalacao)
    tipo: pre-condition
    blocker: false
    validacao: |
      Verificar se o problema pode ser resolvido pelo agente responsavel sem intervencao do CEO.
      Se sim, redirecionar em vez de escalar.
    error_message: "Este problema pode ser resolvido diretamente por {agente}. Deseja que eu delegue em vez de escalar?"
```

---

## SEQUENTIAL Task Execution

### Step 1: Identificar e Documentar o Problema

**Objetivo:** Capturar todos os fatos sobre o problema antes de avaliar severidade.

**Acoes:**
1. Documentar o problema com fatos objetivos:
   - **O que aconteceu:** Descricao factual do problema
   - **Quando:** Data/hora de deteccao ou inicio
   - **Onde:** Projeto, story, sistema ou agente afetado
   - **Como foi detectado:** Monitoramento, QA gate, relato de agente, observacao do CEO
   - **Quem detectou:** Agente ou sistema que identificou
2. Classificar a origem do problema:
   - **Tecnica:** Bug, falha de sistema, limitacao de infraestrutura
   - **Processo:** Workflow quebrado, dependencia circular, deadlock de recursos
   - **Pessoas:** Agente sobrecarregado, skill gap, conflito de prioridades
   - **Externa:** API de terceiro, fornecedor, fator externo fora de controle
   - **Decisao:** Precisa de decisao estrategica que so o CEO pode tomar
3. Verificar se e realmente novo ou recorrencia:
   - Consultar `.aios/logs/jarvis-escalations/` para precedentes
   - Se recorrente, adicionar contexto: "Este problema ja ocorreu em {data}. Resolucao anterior: {acao}"
4. Coletar evidencias concretas:
   - Logs, mensagens de erro, screenshots
   - Metricas que comprovam o impacto
   - Timeline de eventos que levaram ao problema

**Output do Step:** Problema documentado com fatos, evidencias e classificacao

---

### Step 2: Avaliar Severidade e Impacto

**Objetivo:** Quantificar a gravidade do problema para fundamentar a urgencia da escalacao.

**Acoes:**
1. Avaliar severidade usando matriz padrao:
   ```markdown
   **Severidade:**
   - CRITICA: Bloqueia toda a operacao ou compromete entrega principal
   - ALTA: Bloqueia multiplos itens ou atrasa milestone significativo
   - MEDIA: Atrasa entregas pontuais mas nao compromete projeto
   - BAIXA: Inconveniencia que pode ser resolvida no fluxo normal
   ```
2. Avaliar impacto quantificado:
   - **Itens afetados:** Quantas stories, projetos ou agentes sao impactados
   - **Timeline:** Quanto atraso o problema causa (horas, dias, semanas)
   - **Cascata:** O problema gera efeito cascata em outros itens?
   - **Custo de inacao:** O que acontece se nao resolvermos agora?
3. Avaliar urgencia:
   - **Imediata:** Acao necessaria agora — cada hora conta
   - **Hoje:** Precisa ser resolvido ate o fim do dia
   - **Esta semana:** Importante mas tolera alguns dias
   - **Proximo ciclo:** Pode ser planejado para o proximo sprint
4. Calcular score de escalacao:
   ```
   Escalation Score = Severidade (1-4) x Impacto (1-4) x Urgencia (1-4)
   ```
   - Score >= 32: Escalacao CRITICA — interromper CEO imediatamente
   - Score 16-31: Escalacao ALTA — informar CEO na proxima interacao
   - Score 8-15: Escalacao MEDIA — incluir no proximo briefing
   - Score < 8: NAO ESCALAR — resolver via delegacao normal
5. Se score < 8, reconsiderar escalacao:
   - "Senhor, este problema pode ser resolvido sem sua intervencao. Recomendo delegar para {agente}."

**Output do Step:** Severidade, impacto e urgencia avaliados com score de escalacao

---

### Step 3: Compilar Opcoes de Resolucao

**Objetivo:** Nunca apresentar um problema ao CEO sem opcoes de acao propostas.

**Acoes:**
1. Gerar minimo 2 opcoes de resolucao:
   - **Opcao A — Acao direta:** Resolver o problema da forma mais rapida
   - **Opcao B — Acao segura:** Resolver minimizando risco, mesmo que mais lento
   - **Opcao C — Workaround (se aplicavel):** Contornar o problema temporariamente
2. Para cada opcao, definir:
   - **Descricao:** O que seria feito
   - **Quem executa:** Agente responsavel pela resolucao
   - **Timeline:** Quanto tempo para resolver
   - **Risco:** O que pode dar errado com esta opcao
   - **Custo:** Esforco necessario (horas/dias de trabalho)
3. Classificar opcoes por criterio principal:
   - Se urgencia IMEDIATA → priorizar velocidade de resolucao
   - Se severidade CRITICA → priorizar confiabilidade da resolucao
   - Se impacto em cascata → priorizar minimizar dano colateral
4. Identificar recomendacao de Jarvis:
   - Qual opcao Jarvis recomenda e por que
   - Qual trade-off esta sendo aceito

**Output do Step:** Opcoes de resolucao com recomendacao de Jarvis

---

### Step 4: Apresentar Escalacao ao CEO

**Objetivo:** Comunicar o problema de forma clara, urgente e acionavel.

**Acoes:**
1. Formatar escalacao com senso de urgencia proporcional a severidade:

   **Para escalacao CRITICA:**
   ```markdown
   Senhor, atencao imediata requerida.

   **PROBLEMA CRITICO:** {descricao em 1 linha}

   **Impacto:** {quantificado — N stories bloqueadas, M dias de atraso}
   **Detectado:** {quando} | **Origem:** {classificacao}
   **Custo de inacao:** {o que acontece se nao agir}

   **Opcoes de resolucao:**

   **Opcao A: {nome}** [RECOMENDADA]
   - Acao: {descricao}
   - Executor: {agente}
   - Tempo: {estimativa}
   - Risco: {risco}

   **Opcao B: {nome}**
   - Acao: {descricao}
   - Executor: {agente}
   - Tempo: {estimativa}
   - Risco: {risco}

   **Recomendacao de Jarvis:** Opcao {X} — {justificativa em 1 linha}

   Preciso de sua decisao agora, senhor. Qual opcao deseja seguir?
   ```

   **Para escalacao ALTA/MEDIA:**
   ```markdown
   Senhor, preciso alerta-lo sobre uma situacao:

   **Problema:** {descricao}
   **Severidade:** {nivel} | **Impacto:** {quantificado}
   **Opcoes:** {resumo das opcoes}
   **Recomendacao:** {opcao recomendada com justificativa}

   Posso prosseguir com a opcao recomendada, senhor?
   ```

2. Aguardar decisao do CEO
3. Apos decisao, executar acao escolhida:
   - Rotear para `*delegate` com contexto de urgencia
   - Marcar escalacao como "Em resolucao"
4. Agendar follow-up para verificar resolucao

**Output do Step:** Escalacao apresentada, decisao do CEO obtida

---

### Step 5: Registrar e Monitorar Resolucao

**Objetivo:** Manter registro da escalacao e acompanhar ate resolucao.

**Acoes:**
1. Registrar em `.aios/logs/jarvis-escalations/`:
   ```markdown
   ## Escalacao #{numero_sequencial}
   - **Data:** {timestamp ISO 8601}
   - **Problema:** {descricao}
   - **Severidade:** {nivel} | Score: {score}
   - **Impacto:** {quantificado}
   - **Opcao escolhida:** {opcao selecionada pelo CEO}
   - **Agente designado:** {quem vai resolver}
   - **Status:** Em Resolucao
   - **Follow-up:** {data estimada de verificacao}
   ```
2. Se problema veio de deteccao automatica (monitoring), atualizar alertas
3. Agendar verificacao de resolucao:
   - Urgencia IMEDIATA: verificar em 1-2 horas
   - Urgencia HOJE: verificar no fim do dia
   - Urgencia SEMANA: verificar em 2-3 dias
4. Quando resolvido, atualizar registro:
   - Status: Resolvido
   - Resolucao: {como foi resolvido}
   - Tempo de resolucao: {duracao}
   - Licoes aprendidas: {o que fazer diferente para prevenir}
5. Informar CEO sobre resolucao:
   - "Senhor, a escalacao #{numero} foi resolvida. {resumo da resolucao}."

**Output do Step:** Escalacao registrada e monitoramento agendado

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-ESCALATE-001
    name: Escalacao sem avaliacao de severidade
    description: |
      Escalar um problema sem avaliar severidade e impacto e irresponsavel.
      O CEO precisa saber a gravidade para tomar decisao informada.
      Escalacao sem score de severidade e PROIBIDA.
    severity: BLOCK
    action: |
      Completar avaliacao de severidade (Step 2) antes de apresentar ao CEO.
      Cada escalacao deve ter: severidade, impacto quantificado e urgencia.

  - id: VETO-ESCALATE-002
    name: Escalacao sem opcoes de resolucao propostas
    description: |
      Apresentar problema ao CEO sem propor opcoes de acao e transferir
      o problema em vez de ajudar. Jarvis DEVE sempre propor pelo menos
      2 opcoes de resolucao com trade-offs.
    severity: BLOCK
    action: |
      Compilar minimo 2 opcoes de resolucao antes de escalar.
      Se nao houver opcoes claras, a primeira opcao deve ser:
      "Investigacao aprofundada por {agente} para identificar solucoes."

  - id: VETO-ESCALATE-003
    name: Escalacao de problema trivial
    description: |
      Problemas que podem ser resolvidos pelo agente responsavel sem
      intervencao do CEO nao devem ser escalados. Jarvis deve filtrar
      e resolver via delegacao normal.
    severity: BLOCK
    action: |
      Se score de escalacao < 8, redirecionar para *delegate.
      Informar CEO apenas no proximo briefing como item resolvido.
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Problema documentado com fatos e evidencias
    tipo: post-condition
    blocker: true
    validacao: Descricao factual com quando, onde, como, quem
    error_message: "Problema sem documentacao adequada — completar fatos"

  - [ ] Severidade e impacto avaliados com score
    tipo: post-condition
    blocker: true
    validacao: Score de escalacao calculado; severidade, impacto e urgencia definidos
    error_message: "Avaliacao de severidade incompleta — calcular score"

  - [ ] Minimo 2 opcoes de resolucao apresentadas
    tipo: post-condition
    blocker: true
    validacao: Pelo menos 2 opcoes com descricao, executor, timeline e risco
    error_message: "Opcoes de resolucao insuficientes — adicionar alternativas"

  - [ ] Escalacao registrada no log
    tipo: post-condition
    blocker: false
    validacao: Registro salvo em .aios/logs/jarvis-escalations/
    error_message: "Falha ao registrar escalacao — registrar manualmente"

  - [ ] Follow-up agendado
    tipo: post-condition
    blocker: false
    validacao: Data de verificacao de resolucao definida
    error_message: "Follow-up nao agendado — definir data de verificacao"
```

---

## Completion Criteria

- Problema completamente documentado com fatos e evidencias
- Severidade avaliada com score de escalacao calculado
- Impacto quantificado (itens afetados, dias de atraso, efeito cascata)
- Minimo 2 opcoes de resolucao propostas com trade-offs
- Recomendacao de Jarvis fundamentada
- CEO informado com urgencia proporcional a severidade
- Decisao do CEO registrada
- Follow-up agendado para verificacao de resolucao

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - .aios/logs/jarvis-escalations/ (log de escalacoes)
  - delegation_routing (agent definition)
  - agent-authority.md
tags:
  - jarvis
  - escalation
  - urgency
  - ceo-attention
  - incident-management
updated_at: 2026-02-21
```
