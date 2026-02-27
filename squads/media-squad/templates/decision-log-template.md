# Decision Log Template

> Template para registro de decisoes estrategicas do media-head
> Squad: media-squad
> Created: 2026-02-21

---

## Template Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `{{DECISION_ID}}` | string | Yes | ID unico da decisao (DEC-XXXX) |
| `{{CAMPAIGN_ID}}` | string | Yes | ID da campanha relacionada |
| `{{DECISION_TYPE}}` | string | Yes | Tipo: launch / scale / pause / pivot / budget |
| `{{CONTEXT}}` | object | Yes | Dados que embasaram a decisao |
| `{{OUTCOME}}` | object | No | Resultado (preenchido apos execucao) |

---

<!-- BEGIN TEMPLATE -->

# Decision Log Entry: {{DECISION_ID}}

> Data: {{DECISION_DATE}}
> Autor: media-head
> Campanha: {{CAMPAIGN_ID}}
> Tipo: {{DECISION_TYPE}}

---

## Contexto

**Situacao:** {{SITUATION_SUMMARY}}

**Dados no momento da decisao:**

| Metrica | Valor | Target | Status |
|---------|-------|--------|--------|
{{#EACH METRICS}}
| {{NAME}} | {{VALUE}} | {{TARGET}} | {{STATUS}} |
{{/EACH}}

**Periodo analisado:** {{ANALYSIS_PERIOD}}

## Decisao

**Acao:** {{DECISION_ACTION}}

**Justificativa:** {{JUSTIFICATION}}

**Alternativas consideradas:**

| # | Alternativa | Motivo da Rejeicao |
|---|-------------|-------------------|
{{#EACH ALTERNATIVES}}
| {{INDEX}} | {{OPTION}} | {{REJECTION_REASON}} |
{{/EACH}}

## Impacto Esperado

| Metrica | Antes | Esperado | Prazo |
|---------|-------|----------|-------|
{{#EACH EXPECTED_IMPACT}}
| {{METRIC}} | {{BEFORE}} | {{EXPECTED}} | {{TIMEFRAME}} |
{{/EACH}}

## Condicoes de Reversao

**Reverter se:**
{{#EACH REVERSAL_CONDITIONS}}
- {{CONDITION}}
{{/EACH}}

**Plano de reversao:** {{REVERSAL_PLAN}}

## Resultado (preenchido pos-execucao)

**Status:** {{OUTCOME_STATUS}} (pending / success / partial / failed)

**Resultado real:**

| Metrica | Esperado | Real | Delta |
|---------|----------|------|-------|
{{#EACH ACTUAL_RESULTS}}
| {{METRIC}} | {{EXPECTED}} | {{ACTUAL}} | {{DELTA}}% |
{{/EACH}}

**Aprendizado:** {{LEARNING}}

**Tags de pattern:** {{PATTERN_TAGS}}

---

## Metadata

- **Decisao tomada em:** {{DECISION_DATE}}
- **Resultado registrado em:** {{OUTCOME_DATE}}
- **Confidence na decisao:** {{CONFIDENCE}}/10
- **Outcome score:** {{OUTCOME_SCORE}}/10

---

*Registrado automaticamente via log-strategic-decision task*

<!-- END TEMPLATE -->

---

## Usage

```bash
# Gerado pela task log-strategic-decision:
*log-decision

# Output salvo em: data/decision-log/DEC-XXXX.md
# Alimenta o aprendizado do media-head para decisoes futuras
```

---

*Template created by squad-creator*
