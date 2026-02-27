---
task: generate-image-concepts
responsavel: "@stefan-georgi"
responsavel_type: agent
atomic_layer: task
elicit: false
squad: squad-copy
phase: 3-production

pre-conditions:
  - condition: "Angles selected and approved"
    source: "suggest-angles.output.angles OR select-method.output"
    blocker: true
    validation: "angles array with selected angles for image format"
  - condition: "Offer context available"
    source: "fetch-offer-data.output.offer_context"
    blocker: true
    validation: "offer.yaml data with ICP, Big Idea, mechanism"
  - condition: "Platform specs defined"
    source: "decide-format.output.format_assignments OR trigger.platforms"
    blocker: true
    validation: "Target platforms (meta, tiktok) and placements"
  - condition: "Creative direction loaded"
    source: "config/creative-direction.md"
    blocker: true
    validation: "Creative profile rules (blackhat-dr, etc)"

post-conditions:
  - condition: "Visual concepts generated for each angle"
    validation: "image_concepts array with visual description per angle"
    blocker: true
  - condition: "Ad copy in 5 formats per concept"
    validation: "headlines(5), descriptions(3), primary_texts(5 styles)"
    blocker: true
  - condition: "Text overlay defined"
    validation: "texto_overlay specified for each visual concept"
    blocker: true
  - condition: "3 A/B combos recommended"
    validation: "test_combinations with 3 ready-to-use combos"
    blocker: true
  - condition: "Compliance validated"
    validation: "No prohibited claims per offer compliance rules"
    blocker: true

Entrada:
  - angles: "Angulos filtrados para formato imagem (do decide-format)"
  - offer_context: "Dados da oferta (creative_profile, mecanismo, publico, claims, geo, compliance)"
  - platforms: "Plataformas target (meta, tiktok, etc)"
  - method: "Metodo por angulo (modelagem, do-zero)"
  - quantity: "Quantidade de conceitos a gerar (padrao: 3 se nao informado)"
  - variations_per_concept: "Variacoes por conceito (padrao: 3. Se 0, gerar conceito unico sem variacoes)"
  - references: "Referencias desconstruidas relevantes (se metodo = modelagem)"
Saida:
  - image_concepts: "Conceitos visuais com texto overlay + ad copy robusto"
  - metadata: "Plataforma, variavel testada, formato de escrita"
Checklist:
  - "[ ] Receber angulos designados como imagem"
  - "[ ] Ler creative_profile da oferta (creative-direction.md)"
  - "[ ] Para cada angulo: definir conceito visual"
  - "[ ] Escrever texto overlay (max 50 palavras)"
  - "[ ] Respeitar quantidade solicitada (input quantity, padrao 3)"
  - "[ ] Gerar 5-10 variacoes por angulo (uma variavel por variacao)"
  - "[ ] Para cada variacao: gerar ad copy em 5 formatos de escrita"
  - "[ ] Adaptar tudo por geo da oferta E plataforma"
  - "[ ] Entregar para review-image-concept do @copy-chief"
---

# Generate Image Concepts — Conceitos Visuais + Ad Copy

## Objetivo

Gerar conceitos visuais completos para criativos de imagem. DIFERENTE de generate-scripts porque imagem = conceito visual + texto curto + ad copy FORTE. Em imagens, o ad copy (headlines, descriptions, primary text na plataforma) faz a diferenca — e primario, nao secundario.

## REGRA CRITICA: IDIOMA OBRIGATORIO

**TODO o output (conceitos visuais, texto overlay, headlines, descriptions, primary text, CTAs) DEVE ser escrito no idioma da oferta.**

O idioma vem do campo `offer_context.idioma` (ex: "fr" para frances, "es" para espanhol, "en" para ingles).

- Se `idioma: fr` → TUDO em frances. Nao portugues. Nao ingles. FRANCES.
- Se `idioma: es` → TUDO em espanhol.
- Se `idioma: en` → TUDO em ingles.

**Se os inputs chegarem em outro idioma, TRADUZA e REESCREVA no idioma correto da oferta.**

A UNICA excecao sao descricoes tecnicas de cena para API de geracao de imagem (`visual.scene`), que podem ser em ingles pois APIs de imagem esperam ingles.

## Por que agente (nao task pura)?

Requer julgamento criativo: que visual comunica o angulo? Como resumir em 50 palavras? Como o ad copy complementa a imagem? Adaptar tom por geo e plataforma.

## Contexto

Em criativos de imagem:
- A IMAGEM para o scroll (< 1 segundo)
- O TEXTO OVERLAY gera curiosidade (headline, CTA)
- O AD COPY na plataforma converte (primary text, headline, description)
- Os 3 precisam contar a MESMA historia de formas complementares

## Processo

### 1. Definir Conceito Visual

Para cada angulo, descrever:
- **Cena:** O que a imagem mostra (ex: mulher idosa sorrindo segurando pote de mel)
- **Mood:** Emocao transmitida (ex: esperanca, curiosidade, urgencia)
- **Estilo:** Fotografico, editorial, UGC-style, minimalista, bold
- **Cores dominantes:** Paleta de cores alinhada com mood
- **Composicao:** Onde fica o sujeito, onde fica o texto

### 2. Escrever Texto Overlay

Max 50 palavras no total. Distribuicao tipica:
- **Headline (5-10 palavras):** Impacto imediato, para o scroll
- **Subheadline (opcinal, 5-15 palavras):** Complementa o hook
- **Body (opcional, 10-20 palavras):** So se necessario
- **CTA (3-5 palavras):** Claro, visivel, urgente

**Regra:** Menos texto = melhor. O minimo necessario para gerar o clique.

### 3. Gerar Variacoes (5-10 por angulo)

Cada variacao testa UMA variavel:

| Variavel | Exemplo |
|----------|---------|
| **visual_style** | Mesmo texto, estilo fotografico vs ilustrado |
| **headline** | Mesmo visual, headlines diferentes |
| **cta** | Mesmo conceito, CTAs diferentes |
| **layout** | Texto esquerda vs centralizado vs bottom |
| **color_scheme** | Mesmo conceito, paletas diferentes (escuro vs claro) |
| **mood** | Mesmo angulo, mood urgente vs curioso vs editorial |

### 4. Gerar Ad Copy Robusto (CRITICO)

Para CADA variacao, gerar ad copy em **5 formatos de escrita** diferentes:

#### Formato 1: Story-style (narrativa curta)
```
(Exemplo FR)
Marie avait 67 ans quand elle a réalisé qu'elle oubliait le prénom de ses petits-enfants.
Jusqu'au jour où une voisine lui a parlé d'un rituel ancestral au miel...
Ce qu'elle a découvert a tout changé. {CTA}
```

#### Formato 2: List-style (beneficios/problemas em lista)
```
(Exemplo FR)
3 signes silencieux que votre cerveau perd la bataille :

1. Vous oubliez où vous avez posé vos clés (plus de 3 fois par semaine)
2. Vous perdez le fil de la conversation en plein milieu d'une phrase
3. Vous ne vous souvenez plus de ce que vous avez mangé hier

Si vous avez coché 2 ou plus... {CTA}
```

#### Formato 3: Question-style (pergunta provocadora)
```
(Exemplo FR)
Saviez-vous qu'une cuillère de miel avant de dormir peut faire plus pour votre mémoire que n'importe quel complément ?

Un neuroscientifique de Harvard explique pourquoi. {CTA}
```

#### Formato 4: Testimonial-style (depoimento curto)
```
(Exemplo FR)
"Après 2 semaines d'utilisation de la méthode, ma mémoire est redevenue comme il y a 20 ans. Mon médecin était stupéfait des résultats."
— Françoise, 71 ans, Lyon {CTA}
```

#### Formato 5: News-style (tom editorial/noticia)
```
(Exemplo FR)
NOUVELLE ÉTUDE : Un ingrédient naturel trouvé dans le miel pourrait restaurer la mémoire chez les adultes de 50 ans et plus

Des chercheurs d'Oxford ont découvert qu'un composé spécifique... {CTA}
```

**IMPORTANTE: Estes exemplos sao para geo FR. Adapte ao idioma da oferta (offer_context.idioma).**

**Regras do ad copy:**
- Cada formato tem tom e abordagem diferentes
- Adaptar por geo da oferta (FR = formal/elegante, ES = caloroso/emocional, EN = direto/urgente)
- Adaptar por plataforma (Meta = mais texto aceito, TikTok = mais curto/casual)
- Respeitar creative_profile (blackhat-dr = NUNCA mencionar preco/produto)
- Headlines: min 5 por variacao (max 40 chars para Meta)
- Descriptions: min 3 por variacao (max 125 chars para Meta)
- Primary text: min 3 por variacao (3 linhas visiveis no Meta)

### 5. Adaptacao por Geo (da oferta) — OBRIGATORIO

**Consulte `offer_context.idioma` para determinar o geo. Todo o output DEVE estar nesse idioma.**

**FR (idioma: fr):**
- Headlines: elegantes, sem exclamacao excessiva, tom de descoberta
- Primary text: story-style e news-style funcionam melhor
- Evitar: hype, emojis excessivos, ton americano
- Usar "vous" sempre

**ES:**
- Headlines: emocionais, proximas, pessoais
- Primary text: testimonial-style e story-style funcionam melhor
- Emojis moderados OK
- Tom caloroso e familiar

**EN:**
- Headlines: diretas, numeros quando possivel, urgentes
- Primary text: list-style e question-style funcionam melhor
- Pode ser mais agressivo
- Dados e ROI

### 6. Formato de Entrega (JSON OBRIGATORIO)

CRITICO: Sua resposta DEVE ser um unico objeto JSON valido. NAO use markdown. NAO adicione texto fora do JSON.

Limite de escopo:
- Quantidade de conceitos: usar o valor do input `quantity` (padrao: 3 se nao informado). Gerar exatamente essa quantidade de conceitos.
- Variacoes por conceito: usar o valor do input `variations_per_concept` (padrao: 3). Se 0, omitir o array "variations" completamente — gerar apenas o conceito base.
- Ad copy: 5 headlines, 3 descriptions, 1 primary_text por formato (resumido)

```json
{
  "image_concepts": [
    {
      "id": "concept-1",
      "angle": "nome do angulo",
      "method": "modelagem | do-zero",
      "platforms": ["meta", "tiktok"],
      "geo": "FR",
      "visual": {
        "scene": "descricao da cena em 1-2 frases",
        "mood": "emocao principal",
        "style": "photographic | editorial | ugc-style | bold",
        "colors": "paleta de cores resumida",
        "composition": "layout descritivo"
      },
      "text_overlay": {
        "headline": "texto do headline (5-10 palavras)",
        "subheadline": "texto opcional",
        "cta": "texto do CTA (3-5 palavras)"
      },
      "variations": [
        {
          "id": "v1",
          "variable_tested": "headline | visual_style | cta | layout | color_scheme | mood",
          "change": "descricao da mudanca",
          "headline": "headline alterado (se variavel = headline)",
          "visual_change": "descricao visual (se variavel = visual)"
        }
      ],
      "ad_copy": {
        "headlines": ["headline 1", "headline 2", "headline 3", "headline 4", "headline 5"],
        "descriptions": ["desc 1", "desc 2", "desc 3"],
        "primary_texts": {
          "story_style": "texto completo story-style (max 3 frases)",
          "list_style": "texto completo list-style (max 3 items)",
          "question_style": "texto completo question-style",
          "testimonial_style": "texto completo testimonial-style",
          "news_style": "texto completo news-style"
        }
      }
    }
  ],
  "test_combinations": [
    {
      "name": "combo-1",
      "concept_id": "concept-1",
      "variation_id": "v1",
      "platform": "meta",
      "headline_index": 0,
      "primary_text_format": "story_style"
    }
  ],
  "metadata": {
    "total_concepts": "N (= quantity input)",
    "total_variations": "N * variacoes_por_conceito",
    "geo": "FR",
    "creative_profile": "blackhat-dr"
  }
}
```

## Validacao Pre-Entrega

- Conceito visual claro e descritivo (suficiente para gerar prompt de imagem)
- Texto overlay <= 50 palavras
- CTA presente em toda variacao
- Cada variacao altera APENAS uma variavel
- Ad copy nos 5 formatos de escrita
- Adaptacao geo aplicada (tom, vocabulario, estilo)
- Creative_profile respeitado (ex: blackhat-dr = sem preco/produto)
- Compliance checado (sem claims proibidos)

## Proximo Passo

Conceitos vao para `review-image-concept` do @copy-chief.
