# Creative Direction — squad-copy

> Como fazer criativos nesta squad. Cada oferta define qual perfil de criativo usa no seu `offer.yaml` (campo `creative_profile`).
> Os agentes devem ler este arquivo + o perfil da oferta ANTES de gerar/revisar qualquer criativo.

---

## Como Funciona

1. Este arquivo define **perfis de criativo** (modos de operacao)
2. Cada oferta no `offer.yaml` declara `creative_profile: blackhat-dr` (ou outro)
3. Os agentes leem o perfil e seguem as regras correspondentes
4. Regras especificas da oferta (compliance, angulos) ficam em `data/offers/{ID}/`

---

## Perfis de Criativo

### `blackhat-dr` — DR Blackhat / Curiosidade / Long VSL

> Para: infoprodutos de saude, ofertas com VSL longa, nichos competitivos.
> Exemplos: MEMFR02 (Método do Mel)

**Principio:** Criativos NUNCA parecem venda. So curiosidade. A venda acontece na VSL.

**Regras:**
1. **NUNCA citar preco** — Jamais. Nem hint.
2. **NUNCA citar o entregavel** — Nao falar que e guia, webapp, livro, curso.
3. **NUNCA parecer um ad** — Deve parecer conteudo organico, noticia, descoberta.
4. **SO curiosidade** — O viewer clica porque PRECISA saber, nao porque quer comprar.
5. **VSL revela a venda so no pitch** — O criativo nao pode estragar isso.

**Padroes de Hook:**
- Pattern interrupt — quebra o scroll com algo inesperado
- Curiosity gap — lacuna que so fecha com o clique
- Controversy — desafia o senso comum
- Forbidden knowledge — "Eles nao querem que voce saiba"
- Relatability — "Voce tambem faz isso?" + revelacao

**Formatos que funcionam:**
- UGC — pessoa real falando pra camera
- Talking head estilo story/reels — informal, autentico
- Estilo noticia/reportagem — parece editorial
- Reaction/discovery — reagindo a algo surpreendente
- Antes/depois emocional (nao medico)

**Formatos proibidos:**
- Ad polished de marca
- Product showcase
- Promo com preco/desconto
- Depoimento generico sem hook

**Relacao criativo ↔ VSL:**
```
CRIATIVO (ad)                VSL (pagina de venda)
────────────────             ────────────────────
Curiosidade pura             Conteudo + venda
Nao revela nada              Revela gradualmente
Parece organico              Parece documentario
0% venda                     Venda so no pitch
Objetivo: CLIQUE             Objetivo: CONVERSAO
```

O criativo e a PORTA. A VSL e a SALA. Se revelar o que tem na sala, ninguem entra.

---

### `low-ticket` — Low Ticket / Impulso / Oferta Direta

> Para: produtos baratos, impulso, checkout rapido. Nao precisa de VSL longa.
> Exemplos: (nenhum ativo ainda)

**Principio:** Criativo pode mostrar mais do produto. A decisao de compra e rapida — preco baixo reduz a barreira.

**Regras:**
1. Preco PODE aparecer (e ate ajuda — "$9.99", "menos de 10€")
2. Produto PODE ser mostrado visualmente
3. Urgencia e escassez funcionam bem ("ultimas unidades", "so hoje")
4. Hook ainda precisa ser forte — competicao pelo scroll e igual
5. CTA direto: "Compre agora", "Garanta o seu"

**Padroes de Hook:**
- Price anchor — "Isso custa menos que um cafe"
- Visual impact — produto em acao
- Social proof rapido — "50.000 vendidos"
- Unboxing / reveal
- Antes/depois visual (se aplicavel)

**Formatos que funcionam:**
- Product showcase com storytelling
- UGC de unboxing/review
- Carousel com beneficios
- Video curto (15-30s) direto ao ponto

---

### `saas-demo` — SaaS / Software / Demo-Driven

> Para: SaaS, ferramentas, software. A venda e pela demonstracao de valor.
> Exemplos: (nenhum ativo ainda)

**Principio:** Mostrar o produto em acao. O viewer precisa VER o que faz, nao apenas ouvir promessas.

**Regras:**
1. Demo e screencast sao os formatos principais
2. Foco em DOR → SOLUCAO (antes era dificil → agora e facil)
3. Pode mostrar o produto, interface, resultados
4. Preco pode aparecer se for competitivo
5. Social proof tecnico: "usado por X empresas", integrações, reviews

**Padroes de Hook:**
- Pain point — "Cansado de fazer X manualmente?"
- Speed/efficiency — "Faca em 5 minutos o que levava 3 horas"
- Comparison — "Antes vs depois de usar [produto]"
- Authority — "A ferramenta que [empresa conhecida] usa"

**Formatos que funcionam:**
- Screen recording com narração
- Side-by-side (antes/depois da ferramenta)
- Talking head + screen demo
- Carousel de features
- Testimonial de usuario real mostrando resultados

---

### `whitehat-brand` — Whitehat / Branding / Awareness

> Para: ofertas que precisam de brand safety, plataformas restritas, publico premium.
> Exemplos: (nenhum ativo ainda)

**Principio:** Tom profissional, transparente. Pode falar do produto, da marca, dos valores. Zero controversia.

**Regras:**
1. Tom profissional e confiavel
2. Pode mostrar produto, marca, equipe
3. Claims devem ser 100% verificaveis
4. Sem urgencia artificial ou escassez falsa
5. Foco em confianca e credibilidade

---

## Tom por Geo (aplicavel a TODOS os perfis)

| Geo | Tom | Notas |
|-----|-----|-------|
| FR | Formal, elegante, logico. | Evitar hype americano. Argumentacao > emocao. Estilo reportagem/educativo. |
| ES | Caloroso, emocional, proximo. | Familia, comunidade, transformacao. Pode ser mais emotivo. |
| EN | Direto, urgente, resultados. | Numeros, ROI, velocidade. Pode ser mais agressivo. |

Adaptacao cultural = NUNCA traducao literal.

---

## Instrucoes para Agentes

### @stefan-georgi
- Ler este arquivo + `offer.yaml` da oferta (campo `creative_profile`)
- Seguir as regras do perfil indicado
- Ler `compliance/rules.md` da oferta para restricoes
- Se basear nas referencias da oferta (`assets/criativos/`, deconstrucoes)
- Quando em duvida sobre o perfil: perguntar ao humano

### @copy-chief
- No review, verificar se o criativo segue o perfil correto da oferta
- Para `blackhat-dr`: REJEITAR se menciona preco, entregavel, ou parece ad
- Para `low-ticket`: OK mostrar preco e produto, mas hook ainda precisa ser forte
- Para `saas-demo`: demo precisa ser clara, nao so promessa
- Verificar compliance + tom do geo

---

## Como Adicionar Novo Perfil

1. Adicionar secao neste arquivo com id, principio, regras, hooks, formatos
2. Usar o id no campo `creative_profile` do `offer.yaml`
3. Os agentes vao ler automaticamente

---

*Squad squad-copy — Creative Direction v2*
*Atualizado em 2026-02-20*
