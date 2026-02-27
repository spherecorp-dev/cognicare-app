# Ad Performance Classification Rules

## Overview

Regras para classificar ads como WINNER, LOSER ou TESTING pelo media-analyst.

## Classification Categories

### WINNER ✅
Ad que está performando acima do target e deve ser escalado.

**Critérios:**
- ✅ Mínimo 2 conversões
- ✅ CPA ≤ target_cpa
- ✅ Gasto ≥ 2x target_cpa (dados suficientes)
- ✅ Ativo há pelo menos 24h

**Ações recomendadas:**
- Scale budget (+20-50%)
- Duplicate para novas audiences
- Manter ativo

### LOSER ❌
Ad que está performando abaixo do target e deve ser pausado.

**Critérios:**
- ❌ CPA > 2x target_cpa
- ❌ Gasto > 2x target_cpa (dados suficientes)
- ❌ Ativo há pelo menos 24h
- ❌ Tendência negativa (CPA crescente)

**Ações recomendadas:**
- Pausar imediatamente
- Arquivar dados para análise
- Não reativar (criar novo ad se necessário)

### TESTING 🧪
Ad ainda em fase de aprendizado, aguardar mais dados.

**Critérios:**
- 🧪 Menos de 2 conversões
- 🧪 Gasto < 2x target_cpa
- 🧪 Ativo há menos de 24h
- 🧪 Sem sinais claros de winner ou loser

**Ações recomendadas:**
- Manter ativo
- Monitorar de perto
- Reavaliar após 24-48h ou 2x target_cpa gasto

## Advanced Rules

### Learning Phase (Meta)
- **Duration:** ~50 conversions per adset
- **During learning:** Performance may be unstable
- **Rule:** Wait for exit of learning phase before final classification

### Statistical Significance
- **Minimum conversions:** 2 (basic)
- **Confidence level:** 80% (recommended: 95%)
- **Sample size:** Depends on conversion rate

### Time-based Evaluation

#### First 24h
- **Focus:** CTR, Cost per click
- **Threshold:** If CTR < 0.5% after 24h → consider pausing
- **Budget:** Don't exceed 2x target_cpa in first 24h

#### 24-48h
- **Focus:** Conversions, CPA
- **Classification:** Apply standard WINNER/LOSER rules
- **Budget:** Scale winners by 20%

#### 48h+
- **Focus:** Sustained performance
- **Classification:** Reevaluate daily
- **Budget:** Aggressive scaling for consistent winners

## Creative Profile Adjustments

### Blackhat DR
- **More aggressive:** Pause losers faster (CPA > 1.8x target)
- **Faster scaling:** Increase winners by 50% daily
- **Higher turnover:** Expect 60-80% losers

### Whitehat
- **More patience:** Wait for CPA > 2.5x target before pausing
- **Conservative scaling:** Increase winners by 20% daily
- **Lower turnover:** Expect 40-60% losers

### SaaS
- **Longer evaluation:** Consider LTV, not just CPA
- **Lead quality:** Check conversion rate to SQL/customer
- **Scaling:** Gradual, focus on consistency

## Edge Cases

### High Spend, No Conversions
- **Criteria:** Spend > 3x target_cpa, 0 conversions
- **Action:** Pause immediately, investigate tracking

### Intermittent Conversions
- **Criteria:** 1 conversion every 2-3 days, CPA variable
- **Action:** Keep testing until 5 conversions or 5x target_cpa spend

### Sudden Performance Drop
- **Criteria:** Winner becomes loser within 24h
- **Action:** Investigate (creative fatigue? audience saturation?)
- **Fix:** Reduce budget -50%, monitor 24h, then decide

## Automation Rules

### Auto-Pause (Losers)
```yaml
trigger:
  - cpa > 2x target_cpa
  - spend > 2x target_cpa
  - active_hours > 24
action: pause_ad
notification: send_alert_to_slack
```

### Auto-Scale (Winners)
```yaml
trigger:
  - conversions >= 2
  - cpa <= target_cpa
  - active_hours > 24
  - current_budget < max_budget
action: increase_budget_by_20_percent
notification: log_to_decision_log
```

### Auto-Archive (Paused > 7 days)
```yaml
trigger:
  - status = paused
  - paused_days > 7
action: archive_ad_data
notification: none
```

## Reporting

### Daily Classification Report
- Total ads: X
- Winners: X (XX%)
- Losers: X (XX%)
- Testing: X (XX%)
- Actions taken: X pauses, X scales

### Weekly Trend Analysis
- Winner retention rate
- Average time to classify
- Classification accuracy (winners that stayed winners)
