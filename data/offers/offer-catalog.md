# Offer Catalog — B2G Capital

> Indice central de ofertas. Recurso compartilhado por todas as squads.
> Cada oferta tem sua pasta em `data/offers/{ID}-{nome}/`.
> Para cadastrar nova oferta: `cp -r data/offers/_template/ data/offers/XX01-nome/`

---

## Ofertas

| ID | Nome | Vertical | Geos | Status | Pasta |
|----|------|----------|------|--------|-------|
| MEMFR02 | La Méthode Ancestrale au Miel | infoproduto/saude/memoria | fr | ativo | `MEMFR02/` |
| WAGGO | Waggo.ai — Nutrição Inteligente para Pets | saas/pet/nutricao | en, pt-br | em_teste | `WAGGO/` |

---

## Estrutura por Oferta

```
{ID}-{nome}/
├── offer.yaml              ← Dados da oferta (ID, mecanismo, publico, preco, funnel)
├── assets/                 ← Tudo que "é" a oferta
│   ├── vsl-scripts/        ← Scripts de VSL (versoes)
│   ├── criativos/          ← Criativos finais (imagens, videos aprovados)
│   ├── entregaveis/        ← Material entregue ao trafego
│   └── copy/               ← Copy de pagina, headlines, descriptions usadas
├── performance/            ← Performance da oferta
│   ├── current.yaml        ← Snapshot atual (ROAS, CPA, CTR)
│   ├── winners.yaml        ← Winners ativos com metricas
│   └── history/            ← Historico semanal/mensal
├── compliance/             ← Regras especificas desta oferta
│   └── rules.md            ← Palavras proibidas, claims, geo-rules
└── tests/                  ← Historico de testes A/B e otimizacoes
    └── ab-tests.yaml       ← Registro de testes, variantes, resultados
```

## Quem Usa

| Squad / Setor | Leitura | Escrita |
|---------------|---------|---------|
| squad-copy | offer.yaml, compliance, assets | assets/criativos, assets/entregaveis |
| trafego | offer.yaml, performance, assets | performance/current, performance/winners |
| analise | offer.yaml, performance, tests | performance/*, tests/* |
| CRO | offer.yaml, assets/copy, tests | tests/*, assets/copy |
| funil | offer.yaml, assets/vsl-scripts | assets/copy |

---

*Atualizado em 2026-02-26*
