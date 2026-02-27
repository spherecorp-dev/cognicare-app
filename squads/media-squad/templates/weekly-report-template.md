# Weekly Report Template

> Template para report semanal consolidado de campanhas Meta Ads
> Squad: media-squad
> Created: 2026-02-21

---

## Template Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `{{WEEK_START}}` | date | Yes | Data inicio da semana |
| `{{WEEK_END}}` | date | Yes | Data fim da semana |
| `{{TOTAL_SPEND}}` | number | Yes | Gasto total da semana |
| `{{TOTAL_REVENUE}}` | number | Yes | Receita total da semana |
| `{{ROAS}}` | number | Yes | Return on Ad Spend |
| `{{CPA}}` | number | Yes | Custo por aquisicao medio |
| `{{CAMPAIGNS}}` | array | Yes | Lista de campanhas com metricas |
| `{{TRENDS}}` | array | No | Tendencias identificadas |
| `{{RECOMMENDATIONS}}` | array | No | Recomendacoes para proxima semana |

---

<!-- BEGIN TEMPLATE -->

# Report Semanal — Meta Ads

> Periodo: {{WEEK_START}} a {{WEEK_END}}
> Gerado em: {{GENERATED_AT}}
> Por: media-analyst

---

## Resumo Executivo

| Metrica | Valor | vs Semana Anterior | Target |
|---------|-------|--------------------|--------|
| Spend | R$ {{TOTAL_SPEND}} | {{SPEND_DELTA}}% | R$ {{BUDGET_TARGET}} |
| Revenue | R$ {{TOTAL_REVENUE}} | {{REVENUE_DELTA}}% | — |
| ROAS | {{ROAS}}x | {{ROAS_DELTA}}% | {{ROAS_TARGET}}x |
| CPA | R$ {{CPA}} | {{CPA_DELTA}}% | R$ {{CPA_TARGET}} |
| CTR | {{CTR}}% | {{CTR_DELTA}}% | {{CTR_TARGET}}% |
| CPM | R$ {{CPM}} | {{CPM_DELTA}}% | — |
| Conversoes | {{CONVERSIONS}} | {{CONV_DELTA}}% | — |

## Performance por Campanha

### Winners

| Campanha | Spend | Revenue | ROAS | CPA | Status |
|----------|-------|---------|------|-----|--------|
{{#EACH WINNERS}}
| {{NAME}} | R$ {{SPEND}} | R$ {{REVENUE}} | {{ROAS}}x | R$ {{CPA}} | SCALE |
{{/EACH}}

### Losers

| Campanha | Spend | Revenue | ROAS | CPA | Acao |
|----------|-------|---------|------|-----|------|
{{#EACH LOSERS}}
| {{NAME}} | R$ {{SPEND}} | R$ {{REVENUE}} | {{ROAS}}x | R$ {{CPA}} | {{ACTION}} |
{{/EACH}}

### Em Teste

| Campanha | Spend | Dados | Decisao Prevista |
|----------|-------|-------|------------------|
{{#EACH TESTING}}
| {{NAME}} | R$ {{SPEND}} | {{DATA_POINTS}} conversoes | {{EXPECTED_DECISION}} |
{{/EACH}}

## Top Criativos

| # | Creative | CTR | ROAS | Spend | Observacao |
|---|----------|-----|------|-------|------------|
{{#EACH TOP_CREATIVES}}
| {{INDEX}} | {{NAME}} | {{CTR}}% | {{ROAS}}x | R$ {{SPEND}} | {{NOTE}} |
{{/EACH}}

## Tendencias

{{#EACH TRENDS}}
- **{{DIRECTION}}** {{METRIC}}: {{DESCRIPTION}}
{{/EACH}}

## Tracking & Atribuicao

| Metrica | Meta | RedTrack | Discrepancia |
|---------|------|----------|--------------|
| Clicks | {{META_CLICKS}} | {{RT_CLICKS}} | {{CLICK_DISC}}% |
| Conversoes | {{META_CONV}} | {{RT_CONV}} | {{CONV_DISC}}% |
| Revenue | R$ {{META_REV}} | R$ {{RT_REV}} | {{REV_DISC}}% |

## Saude da Conta

- Business Manager: {{BM_STATUS}}
- Ad Account: {{ACCOUNT_STATUS}}
- Policy Violations: {{VIOLATIONS}}

## Recomendacoes para Proxima Semana

{{#EACH RECOMMENDATIONS}}
{{INDEX}}. **[{{PRIORITY}}]** {{ACTION}}
{{/EACH}}

## Budget Proxima Semana

| Campanha | Budget Proposto | Justificativa |
|----------|----------------|---------------|
{{#EACH BUDGET_PLAN}}
| {{NAME}} | R$ {{BUDGET}} | {{REASON}} |
{{/EACH}}

**Budget Total Proposto:** R$ {{NEXT_WEEK_BUDGET}}

---

*Gerado automaticamente pelo media-analyst via weekly-reporting workflow*

<!-- END TEMPLATE -->

---

## Usage

```bash
# Gerado pelo workflow weekly-reporting:
*weekly-report

# Ou manualmente:
*generate-report --template weekly-report-template
```

---

*Template created by squad-creator*
