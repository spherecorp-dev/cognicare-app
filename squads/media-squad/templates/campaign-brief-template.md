# Campaign Brief Template

> Template para brief estrategico de campanha Meta Ads
> Squad: media-squad
> Created: 2026-02-21

---

## Template Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `{{CAMPAIGN_NAME}}` | string | Yes | Nome da campanha |
| `{{OFFER_ID}}` | string | Yes | ID da oferta |
| `{{BUDGET}}` | number | Yes | Budget total |
| `{{OBJECTIVE}}` | string | Yes | Objetivo da campanha |
| `{{TARGET_CPA}}` | number | Yes | CPA target |
| `{{TARGET_ROAS}}` | number | Yes | ROAS target |
| `{{STRUCTURE}}` | object | Yes | Estrutura da campanha |
| `{{FUNNEL}}` | object | Yes | Estrategia de funnel |

---

<!-- BEGIN TEMPLATE -->

# Campaign Brief: {{CAMPAIGN_NAME}}

> Criado em: {{CREATED_AT}}
> Oferta: {{OFFER_ID}}
> Status: {{STATUS}}
> Autor: media-head

---

## 1. Objetivo

**Objetivo principal:** {{OBJECTIVE}}

| Metrica | Target | Limite |
|---------|--------|--------|
| CPA | R$ {{TARGET_CPA}} | R$ {{MAX_CPA}} |
| ROAS | {{TARGET_ROAS}}x | {{MIN_ROAS}}x |
| Budget diario | R$ {{DAILY_BUDGET}} | R$ {{MAX_DAILY}} |
| Duracao teste | {{TEST_DAYS}} dias | — |

## 2. Contexto

**Historico da oferta:**
{{OFFER_HISTORY}}

**Competidores/referencia:**
{{COMPETITOR_CONTEXT}}

**Sazonalidade:**
{{SEASONALITY_NOTES}}

## 3. Estrutura da Campanha

**Tipo:** {{STRUCTURE_TYPE}} (CBO / ABO)

| Adset | Publico | Budget | Bidding |
|-------|---------|--------|---------|
{{#EACH ADSETS}}
| {{NAME}} | {{AUDIENCE}} | R$ {{BUDGET}} | {{BID_STRATEGY}} |
{{/EACH}}

**Ads por adset:** {{ADS_PER_ADSET}}
**Placements:** {{PLACEMENTS}}

## 4. Estrategia de Bidding

- **Tipo:** {{BID_TYPE}} (Cost Cap / Lowest Cost / Bid Cap)
- **Valor:** R$ {{BID_VALUE}} (se aplicavel)
- **Justificativa:** {{BID_JUSTIFICATION}}

## 5. Funnel & Oferta

- **Landing Page:** {{LP_URL}}
- **Angulo:** {{OFFER_ANGLE}}
- **Tipo de funil:** {{FUNNEL_TYPE}}
- **Copy framework:** {{COPY_FRAMEWORK}}

## 6. Criativos

| # | Tipo | Formato | Copy Angle | Status |
|---|------|---------|------------|--------|
{{#EACH CREATIVES}}
| {{INDEX}} | {{TYPE}} | {{FORMAT}} | {{ANGLE}} | {{STATUS}} |
{{/EACH}}

## 7. Tracking

- **RedTrack Campaign:** {{RT_CAMPAIGN_ID}}
- **Pixel:** {{PIXEL_ID}}
- **Eventos:** {{CONVERSION_EVENTS}}
- **Postback:** {{POSTBACK_STATUS}}

## 8. Plano de Contingencia

**Trigger de ativacao:** {{CONTINGENCY_TRIGGER}}

| Cenario | Acao | Responsavel |
|---------|------|-------------|
| CPA > {{MAX_CPA}} apos {{TEST_DAYS}} dias | {{ACTION_HIGH_CPA}} | media-buyer |
| ROAS < {{MIN_ROAS}} apos 48h | {{ACTION_LOW_ROAS}} | media-buyer |
| Criativo rejeitado | {{ACTION_REJECTED}} | media-buyer |
| Conta restrita | {{ACTION_RESTRICTED}} | media-engineer |

## 9. Timeline

| Fase | Data | Responsavel | Status |
|------|------|-------------|--------|
| Estrategia | {{DATE_STRATEGY}} | media-head | {{STATUS_STRATEGY}} |
| Tracking | {{DATE_TRACKING}} | media-engineer | {{STATUS_TRACKING}} |
| Criativos | {{DATE_CREATIVES}} | media-buyer | {{STATUS_CREATIVES}} |
| Lancamento | {{DATE_LAUNCH}} | media-buyer | {{STATUS_LAUNCH}} |
| Review | {{DATE_REVIEW}} | media-analyst | {{STATUS_REVIEW}} |

## 10. Aprovacoes

| Role | Agent | Aprovado | Data |
|------|-------|----------|------|
| Estrategia | media-head | [ ] | |
| Tracking Ready | media-engineer | [ ] | |
| Criativos Ready | media-buyer | [ ] | |
| GO Final | media-head | [ ] | |

---

*Brief gerado via campaign-launch workflow*

<!-- END TEMPLATE -->

---

## Usage

```bash
# Gerado pelo workflow campaign-launch:
*launch-campaign

# Ou manualmente:
*generate-brief --template campaign-brief-template --offer OFFER_ID
```

---

*Template created by squad-creator*
