# Jarvis Report Workflow — Gerar Relatorio Executivo

## Purpose

Gerar relatorios executivos completos com status consolidado, metricas, riscos e recomendacoes acionaveis. O relatorio pode ser executivo (conciso) ou detalhado, e deve sempre conter recomendacoes — relatorio puramente informativo sem acoes sugeridas e proibido.

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: jarvisReport()
id: jarvis-report-workflow
version: 1.0.0
responsavel: Jarvis (Chief of Staff AI)
responsavel_type: Agente
orchestrator: '@jarvis'
mode: autonomous
atomic_layer: Organism

**Entrada:**
- campo: type
  tipo: string
  origem: User Input
  obrigatorio: false
  validacao: "executive|detailed — default: executive"

- campo: scope
  tipo: string
  origem: User Input
  obrigatorio: false
  validacao: "all|{project-name}|{epic-id}|{date-range} — default: all"

- campo: audience
  tipo: string
  origem: User Input
  obrigatorio: false
  validacao: "ceo|team|stakeholders — default: ceo"

**Saida:**
- campo: report
  tipo: markdown
  destino: Console Output
  persistido: false

- campo: report_file
  tipo: markdown
  destino: .aios/logs/jarvis-reports/
  persistido: true
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Dados de projetos acessiveis para compilacao
    tipo: pre-condition
    blocker: true
    validacao: |
      Verificar existencia de project-status.yaml, stories, ou delegation-history
    error_message: "Sem dados suficientes para gerar relatorio. Fontes de dados nao encontradas."

  - [ ] Scope definido (explicito ou default)
    tipo: pre-condition
    blocker: false
    validacao: |
      Se scope nao fornecido, usar 'all' como default
    error_message: "Scope nao especificado — gerando relatorio geral."
```

---

## SEQUENTIAL Task Execution

### Step 1: Definir Escopo e Periodo do Relatorio

**Objetivo:** Delimitar exatamente o que o relatorio cobrira.

**Acoes:**
1. Determinar escopo com base no input do CEO:
   - `all` → Todos os projetos e atividades
   - `{project-name}` → Apenas o projeto especificado
   - `{epic-id}` → Apenas o epic e suas stories
   - `{date-range}` → Atividades no periodo
2. Determinar tipo de relatorio:
   - **Executive:** 1-2 paginas, alto nivel, foco em decisoes
   - **Detailed:** 3-5 paginas, aprofundado, foco em execucao
3. Definir periodo coberto:
   - Se nao especificado: desde o ultimo relatorio ou ultima semana
   - Registrar periodo para referencia: "Periodo: {data inicio} a {data fim}"
4. Definir secoes do relatorio com base no tipo:
   - **Executive:** Resumo, Status, Riscos, Recomendacoes
   - **Detailed:** Resumo, Status por Projeto, Metricas, Entregas, Bloqueios, Tech Debt, Riscos, Recomendacoes, Proximos Passos

**Output do Step:** Escopo, periodo e estrutura do relatorio definidos

---

### Step 2: Coletar Dados dos Agentes e Projetos

**Objetivo:** Reunir todas as informacoes necessarias das diversas fontes.

**Acoes:**
1. Coletar status dos projetos:
   - Ler `.aios/project-status.yaml` para visao consolidada
   - Escanear `docs/stories/` para stories com status atual
   - Contar: stories concluidas, em progresso, bloqueadas, pendentes
2. Coletar historico de delegacoes:
   - Ler `data/jarvis-delegation-history.md` para delegacoes no periodo
   - Contar: delegacoes feitas, concluidas, pendentes
3. Coletar metricas de qualidade:
   - QA gates executados e resultados (PASS/FAIL/CONCERNS)
   - Tech debt registrado em `docs/stories/backlog.md`
   - Itens de tech debt novos vs. resolvidos no periodo
4. Coletar metricas de entrega:
   - Stories concluidas no periodo
   - Commits no periodo (via git log se acessivel)
   - PRs criados e mergeados
5. Coletar dados de bloqueios e riscos ativos:
   - Bloqueios atuais com tempo de exposicao
   - Riscos identificados e status de mitigacao
6. Para relatorio detalhado, coletar por projeto/agente:
   - Status individual de cada projeto
   - Carga de trabalho por agente

**Output do Step:** Dataset completo para compilacao do relatorio

---

### Step 3: Compilar Metricas e Indicadores

**Objetivo:** Transformar dados brutos em metricas e indicadores executivos.

**Acoes:**
1. Calcular metricas de progresso:
   - **Velocity:** Stories concluidas por semana
   - **Throughput:** % de stories concluidas vs. total do epic
   - **Cycle Time:** Tempo medio de Ready a Done por story
   - **WIP (Work in Progress):** Stories em InProgress simultaneamente
2. Calcular metricas de qualidade:
   - **QA Pass Rate:** % de QA gates aprovados na primeira tentativa
   - **Debt Ratio:** Tech debt novo vs. resolvido
   - **Blocker Duration:** Tempo medio de resolucao de bloqueios
3. Calcular metricas de delegacao (se dados disponiveis):
   - **Delegation Efficiency:** % de delegacoes concluidas no prazo
   - **Agent Utilization:** Carga por agente
4. Gerar tendencias quando ha dados historicos:
   - Velocity subindo/descendo/estavel
   - Tech debt acumulando/diminuindo
5. Formatar metricas:
   ```markdown
   **Metricas do Periodo:**
   | Metrica | Valor | Tendencia |
   |---------|-------|-----------|
   | Velocity | {N} stories/semana | {subindo/descendo} |
   | Throughput | {X}% do epic | — |
   | QA Pass Rate | {Y}% | {subindo/descendo} |
   | Bloqueios Ativos | {Z} | {novo/recorrente} |
   ```

**Output do Step:** Metricas calculadas e formatadas

---

### Step 4: Redigir Relatorio

**Objetivo:** Compilar o relatorio final em formato executivo ou detalhado.

**Acoes:**
1. **Relatorio Executive:**
   ```markdown
   # Relatorio Executivo — {scope}
   **Periodo:** {data inicio} a {data fim}
   **Gerado por:** Jarvis | **Data:** {hoje}

   ## Resumo Executivo
   {2-3 paragrafos com visao geral do periodo: progresso, destaques, preocupacoes}

   ## Status Geral
   - **Progresso:** {X}% do epic/projeto concluido
   - **Stories:** {N} concluidas | {M} em progresso | {K} bloqueadas
   - **Saude:** {Verde|Amarelo|Vermelho} — {justificativa em 1 linha}

   ## Riscos e Bloqueios
   - {Risco/Bloqueio 1}: {impacto} — Status: {ativo|mitigado|resolvido}
   - {Risco/Bloqueio 2}: {impacto} — Status: {ativo|mitigado|resolvido}

   ## Recomendacoes
   1. {Acao acionavel 1} — Prioridade: {alta|media}
   2. {Acao acionavel 2} — Prioridade: {alta|media}
   3. {Acao acionavel 3} — Prioridade: {alta|media}
   ```

2. **Relatorio Detailed** — adicionar secoes:
   ```markdown
   ## Status por Projeto
   {detalhamento de cada projeto}

   ## Metricas de Performance
   {tabela de metricas com tendencias}

   ## Entregas do Periodo
   {lista detalhada de entregaveis completados}

   ## Tech Debt
   - Novos: {N} itens
   - Resolvidos: {M} itens
   - Acumulado: {K} itens (criticidade: {distribuicao})

   ## Proximos Passos
   {roadmap das proximas 1-2 semanas}
   ```

**Output do Step:** Relatorio redigido e formatado

---

### Step 5: Finalizar com Recomendacoes Acionaveis

**Objetivo:** Garantir que o relatorio termina com acoes concretas para o CEO.

**Acoes:**
1. Revisar secao de recomendacoes:
   - Cada recomendacao deve ser acionavel (verbo + objeto + contexto)
   - Prioridade atribuida a cada recomendacao
   - Responsavel sugerido (qual agente executaria)
2. Categorizar recomendacoes:
   - **Imediatas:** Acoes para os proximos 1-3 dias
   - **Curto prazo:** Acoes para a proxima semana
   - **Estrategicas:** Acoes para o proximo mes
3. Ligar recomendacoes a dados do relatorio:
   - "Com base no QA Pass Rate de {X}%, recomendo {acao}"
   - "Dado o bloqueio em {item} ha {N} dias, sugiro {acao}"
4. Apresentar ao CEO:
   - "Senhor, relatorio {tipo} do periodo {periodo} esta pronto."
   - Destacar recomendacoes que requerem decisao do CEO
   - Oferecer aprofundamento: "Deseja que eu detalhe alguma secao, senhor?"
5. Salvar relatorio em `.aios/logs/jarvis-reports/` com timestamp

---

## Veto Conditions

```yaml
veto_conditions:
  - id: VETO-REPORT-001
    name: Relatorio sem recomendacoes acionaveis
    description: |
      Relatorio puramente informativo sem recomendacoes e proibido.
      Todo relatorio DEVE conter pelo menos 2 recomendacoes acionaveis
      com prioridade e responsavel sugerido.
    severity: BLOCK
    action: |
      Adicionar secao de recomendacoes antes de apresentar.
      Cada recomendacao deve ser: verbo + objeto + contexto + prioridade.

  - id: VETO-REPORT-002
    name: Relatorio sem metricas concretas
    description: |
      Relatorio sem numeros, percentuais ou metricas concretas nao agrega valor.
      Afirmacoes como "bom progresso" devem ser acompanhadas de dados.
    severity: BLOCK
    action: |
      Quantificar cada afirmacao. Se dados indisponiveis, declarar:
      "Metrica indisponivel — recomendo implementar tracking para {aspecto}."

  - id: VETO-REPORT-003
    name: Relatorio sem periodo definido
    description: |
      Relatorio sem periodo claro e ambiguo. Deve ter data de inicio e fim.
    severity: BLOCK
    action: Definir periodo antes de compilar dados
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Relatorio contem todas as secoes obrigatorias para o tipo selecionado
    tipo: post-condition
    blocker: true
    validacao: Verificar presenca de resumo, status, riscos e recomendacoes
    error_message: "Relatorio com secoes faltando — completar antes de apresentar"

  - [ ] Pelo menos 2 recomendacoes acionaveis presentes
    tipo: post-condition
    blocker: true
    validacao: Secao de recomendacoes com minimo 2 itens acionaveis
    error_message: "Recomendacoes insuficientes — adicionar acoes concretas"

  - [ ] Metricas incluidas com dados concretos
    tipo: post-condition
    blocker: true
    validacao: Pelo menos 3 metricas quantificadas no relatorio
    error_message: "Relatorio sem metricas concretas — adicionar dados"

  - [ ] Relatorio salvo em log para referencia futura
    tipo: post-condition
    blocker: false
    validacao: Arquivo salvo em .aios/logs/jarvis-reports/
    error_message: "Falha ao salvar relatorio — salvar manualmente"
```

---

## Completion Criteria

- Escopo e periodo claramente definidos
- Dados coletados de todas as fontes disponiveis
- Metricas calculadas e formatadas
- Relatorio redigido no formato correto (executive ou detailed)
- Minimo 2 recomendacoes acionaveis com prioridade
- CEO informado e relatorio entregue
- Relatorio salvo em log

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - .aios/project-status.yaml
  - docs/stories/ (stories ativas)
  - docs/stories/backlog.md
  - data/jarvis-delegation-history.md
tags:
  - jarvis
  - report
  - executive
  - metrics
  - recommendations
updated_at: 2026-02-21
```
