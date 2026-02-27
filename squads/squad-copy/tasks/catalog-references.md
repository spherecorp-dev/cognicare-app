---
task: catalog-references
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 1-intelligence
Entrada:
  - references: "Referencias brutas salvas pelo Copy (links, screenshots, textos)"
Saida:
  - cataloged: "Referencias estruturadas com metadata"
Checklist:
  - "[ ] Receber referencias brutas do Copy"
  - "[ ] Estruturar cada referencia com metadata padrao"
  - "[ ] Categorizar por formato, tipo, nicho, plataforma"
  - "[ ] Entregar catalogo para task deconstruct-references"
---

# Catalog References — Catalogacao de Referencias

## Objetivo

Estruturar e categorizar referencias salvas pelo Copy humano. Catalogar = ficha tecnica. NAO e desconstruir (autopsia criativa vem depois).

## Por que task pura?

E organizacao. Preencher campos estruturados a partir de material bruto. Sem julgamento criativo.

## Metadata por Referencia

| Campo | Descricao |
|-------|-----------|
| formato | VSL, UGC, imagem, carrossel, podcast, etc |
| tipo_conteudo | testemunhal, educacional, controversia, autoridade, etc |
| mecanismo | como a solucao e apresentada |
| nicho | saude, financas, ecommerce, etc |
| plataforma_origem | Meta, TikTok, YouTube, Reddit, organico |
| spend_estimado | baixo / medio / alto (baseado em indicios) |
| estilo_edicao | UGC, cinematografico, breaking news, podcast, etc |
| geo | fr, es, en, outro |

## Formato de Saida

```markdown
### Referencia {N}
**Fonte:** {link ou descricao}
**Formato:** {formato}
**Tipo:** {tipo_conteudo}
**Mecanismo:** {mecanismo}
**Nicho:** {nicho}
**Plataforma:** {plataforma_origem}
**Spend estimado:** {nivel}
**Estilo edicao:** {estilo}
**Geo:** {geo}
```

## Importante

- Catalogar NAO e desconstruir
- Catalogar = ficha tecnica (dados sobre o material)
- Desconstruir = autopsia criativa (Hook/Mechanism/Proof/CTA — vem na proxima task)

## Proximo Passo

Catalogo entregue para `deconstruct-references`.
