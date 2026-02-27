---
task: fetch-offer-data
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - offer_id: "ID da oferta (ex: GP01)"
Saida:
  - offer_context: "Dados da oferta (offer.yaml)"
  - performance: "Performance atual + winners (performance/)"
  - compliance: "Regras especificas da oferta (compliance/rules.md) — FONTE DE VERDADE para geo + plataforma"
  - assets_inventory: "Inventario de assets disponiveis"
  - test_history: "Historico de testes A/B (tests/)"
Checklist:
  - "[ ] Receber offer_id"
  - "[ ] Localizar pasta em data/offers/{ID}-{nome}/ (raiz do projeto)"
  - "[ ] Carregar offer.yaml (contexto)"
  - "[ ] Carregar performance/current.yaml (metricas)"
  - "[ ] Carregar performance/winners.yaml (winners)"
  - "[ ] Carregar compliance/rules.md (regras)"
  - "[ ] Inventariar assets/"
  - "[ ] Carregar tests/ab-tests.yaml (historico)"
  - "[ ] Montar output consolidado"
  - "[ ] Entregar dados para @copy-chief interpretar"
---

# Fetch Offer Data — Consulta de Dados da Oferta

## Objetivo

Puxar dados completos de uma oferta: contexto + performance + compliance + assets + historico de testes. Consulta mecanica, sem interpretacao — os dados vao para o @copy-chief interpretar.

## Por que task pura (nao agente)?

E uma consulta. Nao requer julgamento — apenas buscar e estruturar dados. "Qual e o ROAS?" nao precisa de agente. "O que esse ROAS significa?" precisa (e e o @copy-chief).

## Fonte de Dados (COMPARTILHADA)

> Offers vivem em `data/offers/` na raiz do projeto — recurso compartilhado por todas as squads.

```
data/offers/{ID}-{nome}/
├── offer.yaml              ← Dados da oferta (ID, mecanismo, publico, preco, funnel)
├── assets/                 ← Tudo que "é" a oferta
│   ├── vsl-scripts/        ← Scripts de VSL
│   ├── criativos/          ← Criativos finais
│   ├── entregaveis/        ← Material entregue ao trafego
│   └── copy/               ← Copy de pagina, headlines, descriptions
├── performance/            ← Performance da oferta
│   ├── current.yaml        ← Snapshot atual (ROAS, CPA, CTR)
│   ├── winners.yaml        ← Winners ativos com metricas
│   └── history/            ← Historico semanal/mensal
├── compliance/             ← Regras especificas desta oferta
│   └── rules.md            ← Palavras proibidas, claims, geo-rules
└── tests/                  ← Historico de testes A/B
    └── ab-tests.yaml       ← Testes, variantes, resultados
```

## Execucao

1. Receber `offer_id` (ex: GP01)
2. Localizar pasta: `data/offers/GP01-*/` (raiz do projeto)
3. Ler `offer.yaml` → contexto da oferta
4. Ler `performance/current.yaml` → metricas atuais
5. Ler `performance/winners.yaml` → winners
6. Ler `compliance/rules.md` → regras especificas
7. Inventariar `assets/` (vsl-scripts, criativos, entregaveis, copy)
8. Ler `tests/ab-tests.yaml` → historico de testes
9. Montar output consolidado

## Formato de Saida

```markdown
## Oferta: {nome} ({id}) — {data}

### Contexto
| Campo | Valor |
|-------|-------|
| Vertical | {vertical} |
| Status | {status} |
| Geos | {geos} |
| Produto | {descricao} |
| Promessa | {promessa} |
| Mecanismo | {mecanismo} |
| Diferencial | {diferencial} |
| Publico | {demografico} / {psicografico} |
| Awareness | {awareness_level} |
| Preco | {front_end} |
| Funnel | {tipo} |

### Angulos
| Validados | Saturados | Em Teste |
|-----------|-----------|----------|
| {lista}   | {lista}   | {lista}  |

### Performance Atual
| Metrica | Valor | Target |
|---------|-------|--------|
| ROAS | {valor} | {target} |
| CPA | {valor} | {target} |
| CTR | {valor} | — |
| CVR | {valor} | — |
| Spend total | {valor} | — |
| Winners ativos | {count} | — |

### Winners
| ID | Angulo | Hook | Formato | ROAS | CTR | Status |
|----|--------|------|---------|------|-----|--------|
| {id} | {angulo} | {hook} | {fmt} | {val} | {val} | {status} |

### Assets
| Tipo | Quantidade | Arquivos |
|------|-----------|----------|
| VSL Scripts | {n} | {lista} |
| Criativos | {n} | {lista} |
| Entregaveis | {n} | {lista} |
| Copy | {n} | {lista} |

### Compliance (FONTE DE VERDADE — da oferta)
- Palavras proibidas: {lista}
- Claims proibidos: {lista}
- Regras por geo: {resumo das secoes por geo}
- Regras por plataforma: {resumo das secoes por plataforma}

### Testes A/B
| ID | Tipo | Resultado | Lift | Aprendizado |
|----|------|-----------|------|-------------|
| {id} | {tipo} | {resultado} | {lift}% | {aprendizado} |
```

## Proximo Passo

Dados entregues para `interpret-offer-data` do @copy-chief.
