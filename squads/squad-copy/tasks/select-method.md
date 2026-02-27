---
task: select-method
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 2-strategy

pre-conditions:
  - condition: "Angles suggested"
    source: "suggest-angles.output.angles"
    blocker: true
    validation: "Angles array with confidence scores"
  - condition: "Winners library available"
    source: "fetch-offer-data.output.performance"
    blocker: true
    validation: "Current winners + historical performance data"
  - condition: "Offer context loaded"
    source: "fetch-offer-data.output.offer_context"
    blocker: true
    validation: "Offer data for decision context"

post-conditions:
  - condition: "Method distribution defined"
    validation: "Percentage split: modelagem X%, variacao Y%, do-zero Z%"
    blocker: true
  - condition: "Angles assigned to methods"
    validation: "Each angle has method assignment with rationale"
    blocker: true
  - condition: "Decision based on data"
    validation: "Rationale references winner performance/fatigue data"
    blocker: true

Entrada:
  - angles: "Angulos sugeridos pelo @stefan-georgi"
  - winners_library: "Biblioteca de winners da oferta"
  - performance_history: "Historico de performance (current + winners.yaml)"
  - offer_context: "Dados da oferta"
Saida:
  - method_decision: "Distribuicao por metodo + assignments por angulo"
Checklist:
  - "[ ] Analisar winners atuais (ativos? fatigando?)"
  - "[ ] Analisar historico de performance"
  - "[ ] Decidir distribuicao modelagem/variacao/do-zero"
  - "[ ] Atribuir angulos a cada metodo"
  - "[ ] Justificar com dados"
  - "[ ] Entregar para decide-format"
---

# Select Method — Decisao Autonoma de Metodo de Producao

## Objetivo

Decidir automaticamente o mix de producao (modelagem vs variacao de winner vs do-zero) baseado em dados historicos de performance. Substitui a decisao manual do Copy humano com analise data-driven.

## Por que agente (nao task pura)?

Interpretar dados de performance para decidir estrategia requer julgamento: winners estao fatigando? Precisa de inovacao? O historico sugere que modelagem funciona melhor? Essas decisoes afetam diretamente o ROI.

## Contexto

**Padrao baseline:** 80% modelagem / 15% variacao / 5% do-zero
O padrao e ponto de partida — o @copy-chief AJUSTA baseado em dados reais.

## Processo

### 1. Diagnosticar Estado dos Winners

Analisar winners.yaml da oferta:

```yaml
winner_diagnostics:
  total_winners: 5
  active_winners: 3
  fatiguing_winners: 2          # ROAS ou CTR caindo > 10% em 7 dias
  dead_winners: 0               # Pausados por performance
  avg_winner_age_days: 21
  newest_winner_age_days: 5
  oldest_active_winner_days: 45
```

### 2. Diagnosticar Performance Geral

Analisar current.yaml:

```yaml
performance_diagnostics:
  overall_roas: 2.1
  roas_trend_7d: "declining"     # growing | stable | declining
  overall_ctr: 1.8%
  ctr_trend_7d: "stable"
  total_spend_30d: 15000
  conversion_rate: 2.3%
  best_performing_type: "modelagem"  # qual tipo de criativo performa melhor
  worst_performing_type: "do-zero"
```

### 3. Aplicar Logica de Decisao

| Cenario | Diagnostico | Mix Recomendado | Racional |
|---------|------------|-----------------|----------|
| **Saudavel** | Winners ativos, ROAS estavel, CTR ok | 80/15/5 (padrao) | Nao mexer no que funciona. Escalar. |
| **Fatigando** | Winners ativos mas ROAS/CTR caindo | 60/15/25 | Mais do-zero. Precisa de angulos frescos. |
| **Sem winners** | Nenhum winner ativo | 50/10/40 | Modo exploratorio. Testar muito. |
| **Muitos winners** | 5+ winners ativos e saudaveis | 50/40/10 | Multiplicar winners. Mais variacoes. |
| **Winner novo forte** | Winner recente com ROAS alto | 40/50/10 | Variar ao maximo o winner novo. |
| **Estagnado** | ROAS estavel mas sem crescimento | 60/10/30 | Precisa de breakthrough. Mais do-zero + modelagem de refs novas. |
| **Oferta nova** | Sem historico | 70/0/30 | Nao tem winner pra variar. Modelagem + exploracao. |

### 4. Atribuir Angulos

Para cada metodo, selecionar angulos especificos:

**Modelagem:**
- Angulos com confianca ALTA (baseados em winners/patterns comprovados)
- Referenciar spy references ou winners especificos como base

**Variacao de winner:**
- Selecionar winners ESPECIFICOS para variar
- Definir tipo de variacao (hook_swap, format_change, visual_change)
- Copy e SAGRADO — so mudar embalagem

**Do-zero:**
- Angulos com confianca BAIXA ou MEDIA (exploratorios)
- Angulos cross-niche (adaptar pattern de outro nicho)
- Angulos que testam hipotese nova

### 5. Formato de Saida

```yaml
method_decision:
  offer_id: "MEMFR02"
  generated_at: "{timestamp}"

  diagnostics:
    scenario: "fatigando"
    winner_health: "2/3 winners mostrando fadiga (CTR -15% em 7d)"
    roas_trend: "declining (-0.3 em 14d)"
    recommendation: "Aumentar do-zero e variacoes. Angulos frescos necessarios."

  distribution:
    modelagem:
      percentage: 60
      rationale: "Ainda funciona, mas diversificar base de referencias (usar spy novas)"
    variacao_de_winner:
      percentage: 15
      rationale: "Variar MEMFR02-W3 (melhor ROAS) em novos formatos antes de morrer"
    do_zero:
      percentage: 25
      rationale: "Winners fatigando. Precisa de angulos completamente novos."

  assignments:
    modelagem:
      angles: [1, 3, 5, 7, 8]
      references:
        - "spy-ref-12 (Meta, FR, hook curiosity)"
        - "spy-ref-34 (TikTok, EN, mecanismo natural)"
      note: "Priorizar refs do ultimo spy run"

    variacao_de_winner:
      winners:
        - winner_id: "MEMFR02-W3"
          current_roas: 2.8
          variation_types: [hook_swap, format_change]
          note: "Trocar hook (3 opcoes) + converter pra carrossel"
        - winner_id: "MEMFR02-W7"
          current_roas: 1.9
          variation_types: [visual_change]
          note: "Trocar avatar/presenter, manter copy"

    do_zero:
      angles: [2, 6]
      note: "Angulo 2: controversia (nao testado no FR). Angulo 6: cross-niche de beauty."

  total_creatives_estimated: 35
  breakdown:
    modelagem: "5 angulos x 5 variacoes = ~25"
    variacao: "2 winners x 3 variacoes = ~6"
    do_zero: "2 angulos x 2 variacoes = ~4"
```

## Importante

- A decisao e DATA-DRIVEN — justificar cada escolha com numeros
- O padrao 80/15/5 e BASELINE, nao dogma — adaptar ao cenario real
- Se nao ha dados suficientes (oferta nova), ser conservador (mais modelagem)
- Registrar a decisao para aprendizado futuro (qual mix performou melhor?)
- O copy humano pode opcionalmente overridar a decisao

### Output JSON Schema (OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

```json
{
  "method_decision": [
    {
      "angle_id": 1,
      "angle_name": "Nome do angulo",
      "method": "modelagem|variacao_de_winner|do_zero",
      "confidence": "alta|media|baixa",
      "rationale": "Justificativa data-driven para o metodo escolhido",
      "reference": "spy-ref-XX ou winner-XX usado como base (se modelagem/variacao)",
      "variation_type": "hook_swap|format_change|visual_change (se variacao)"
    }
  ],
  "diagnostics": {
    "scenario": "saudavel|fatigando|sem_winners|muitos_winners|winner_novo_forte|estagnado|oferta_nova",
    "winner_health": "Resumo do estado dos winners",
    "roas_trend": "growing|stable|declining",
    "recommendation": "Resumo da recomendacao"
  },
  "distribution": {
    "modelagem": { "percentage": 60, "rationale": "Justificativa" },
    "variacao_de_winner": { "percentage": 15, "rationale": "Justificativa" },
    "do_zero": { "percentage": 25, "rationale": "Justificativa" }
  },
  "summary": {
    "total_modelagem": 5,
    "total_variacao": 2,
    "total_do_zero": 2,
    "total_creatives_estimated": 35
  }
}
```

## Proximo Passo

method_decision vai para `decide-format` (@copy-chief) que define imagem vs video por angulo.
