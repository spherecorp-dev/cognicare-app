---
task: interpret-offer-data
responsavel: "@copy-chief"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence

pre-conditions:
  - condition: "Raw offer data fetched"
    source: "fetch-offer-data.output"
    blocker: true
    validation: "offer_context, performance, compliance, assets_inventory loaded"
  - condition: "Offer.yaml valid"
    source: "data/offers/{ID}/offer.yaml"
    blocker: true
    validation: "ICP, mechanism, Big Idea, geos, creative_profile present"

post-conditions:
  - condition: "Strategic analysis provided"
    validation: "Interpretation with context and nuance"
    blocker: true
  - condition: "Actionable recommendations generated"
    validation: "Next steps or strategy guidance"
    blocker: true
  - condition: "Winners context interpreted"
    validation: "What's working and why (not just raw data)"
    blocker: false
  - condition: "Geo-specific insights"
    validation: "Cultural considerations per target geo"
    blocker: false

Entrada:
  - raw_data: "Dados brutos de performance (ROAS, CPA, CTR, spend, winners)"
Saida:
  - analysis: "Analise contextualizada com interpretacao"
  - recommendation: "Recomendacao (problema e criativo, LP, ou oferta?)"
  - actionable_insights: "Insights acionaveis pro copywriter"
Checklist:
  - "[ ] Receber dados brutos da task fetch-offer-data"
  - "[ ] Interpretar ROAS no contexto da oferta (geo vem da oferta)"
  - "[ ] Interpretar CTR vs conversao (onde o funil quebra?)"
  - "[ ] Cruzar com historico de winners similares"
  - "[ ] Identificar se problema e criativo, LP ou oferta"
  - "[ ] Gerar recomendacao acionavel"
---

# Interpret Offer Data — Interpretacao de Dados de Performance

## Objetivo

Transformar dados brutos de performance em insights acionaveis. NAO e apenas reportar numeros — e interpretar COM CONTEXTO o que os dados significam para decisoes criativas.

## Por que agente (nao task pura)?

Interpretar dados requer julgamento. "ROAS negativo" sozinho nao diz nada. O @copy-chief interpreta:
- ROAS negativo + CTR alto = problema pode ser LP, nao criativo
- ROAS negativo + CTR baixo = hook nao funciona pra esse geo
- Oferta similar a X que funcionou com hooks de medo no FR = pattern validado

## Processo

### 1. Receber Dados Brutos

Da task `fetch-offer-data`:
- ROAS por criativo/angulo
- CPA vs target
- CTR por formato/hook
- Spend total e por criativo
- Lista de winners atuais

### 2. Interpretar com Contexto

Para cada metrica, responder:
- **O que o numero diz?** (fato)
- **O que isso significa?** (interpretacao)
- **O que fazer?** (recomendacao)

### 3. Formato de Entrega

```markdown
## Analise: {oferta} — {geo}

### Resumo
- Status: {escalando | testando | parado | novo}
- ROAS geral: {valor} ({tendencia})
- Winners ativos: {quantidade}

### Interpretacao
{Analise contextualizada — onde o funil quebra, o que funciona, o que nao}

### Recomendacoes para Criativos
1. {recomendacao acionavel 1}
2. {recomendacao acionavel 2}
3. {recomendacao acionavel 3}

### Sinais de Atencao
- {sinal que requer observacao}
```

## Exemplos de Interpretacao

| Cenario | Interpretacao | Recomendacao |
|---------|--------------|--------------|
| ROAS negativo + CTR alto | Problema pode ser LP, nao criativo | Manter angulo, testar com outra LP |
| CTR baixo em todos os hooks | Hooks nao ressoam com publico | Testar novos angulos/hooks radicalmente diferentes |
| Winner estabilizou | Fadiga criativa comecando | Gerar variacoes do winner (novo avatar, edicao, hook visual) |
| Oferta similar funcionou com medo no FR | Pattern validado nesse geo | Priorizar hooks de medo pra essa oferta no FR |

## Importante

- Interpretar, nao inventar. Se nao ha dados suficientes, dizer.
- Separar claramente FATO de INTERPRETACAO de RECOMENDACAO.
- Copy Chief humano pode validar/ajustar a interpretacao.
