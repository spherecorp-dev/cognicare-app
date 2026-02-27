---
task: build-variation-brief
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 5-delivery
Entrada:
  - creative_id: "ID do winner existente"
  - variation_type: "Tipo de variacao (avatar, edicao, hook visual, etc)"
Saida:
  - brief: "Brief de variacao (mesma copy, nova embalagem)"
Checklist:
  - "[ ] Receber creative_id do winner"
  - "[ ] Identificar tipo de variacao"
  - "[ ] Manter copy original intacta"
  - "[ ] Definir o que muda (elemento visual apenas)"
  - "[ ] Entregar brief pro editor"
---

# Build Variation Brief — Brief de Variacao de Winner

## Objetivo

Criar brief para variar um criativo winner existente. Mantem a MESMA COPY, muda apenas o elemento visual. E o path de "variacao de winner" (15% da producao).

## Por que task pura?

Segue template. A decisao criativa (qual winner variar e como) ja foi feita pelo Copy humano na Fase 2.

## Contexto

Variacao de winner e a segunda forma mais comum de producao (15%). O criativo ja provou que funciona — agora se testa se a mesma copy com embalagem diferente performa igual ou melhor.

## O que pode variar

- **Avatar/presenter:** trocar a pessoa que aparece
- **Tipo de edicao:** de UGC pra cinematografico, de podcast pra breaking news
- **Hook visual:** mesmo hook textual, visual diferente (cenario, cor, movimento)
- **Formato:** de VSL pra imagem, de vertical pra quadrado
- **Estilo grafico:** de clean pra bold, de dark pra light

## O que NAO pode mudar

- Copy (texto/script)
- Angulo
- Mecanismo
- CTA

## Formato de Saida

```markdown
## Brief de Variacao — Winner: {creative_id}

**Winner original:** {descricao breve}
**ROAS original:** {valor}
**Tipo de variacao:** {o que muda}

### O que mantem (NAO mexer)
- Copy: {referencia ao script original}
- Angulo: {angulo}
- CTA: {cta}

### O que muda
- {elemento_1}: de {original} para {novo}
- {elemento_2}: de {original} para {novo}

### Notas pro Editor
- {nota_1}
- {nota_2}
```

## Importante

- A copy e SAGRADA — nao mexer
- Variacao e teste de embalagem, nao de mensagem
- Se o teste mostrar que a variacao funciona, gerar mais variacoes
