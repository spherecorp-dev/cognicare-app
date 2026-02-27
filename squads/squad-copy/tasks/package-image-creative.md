---
task: package-image-creative
responsavel: null
responsavel_type: task_pura
atomic_layer: task
elicit: false
squad: squad-copy
phase: 5-delivery

pre-conditions:
  - condition: "Approved images generated"
    source: "review-generated-image.output.approved_images"
    blocker: true
    validation: "Images array with APPROVED status"
  - condition: "Ad copy available"
    source: "generate-image-concepts.output.image_concepts"
    blocker: true
    validation: "Copy for each creative (headlines, descriptions, primary texts)"
  - condition: "Platform specs defined"
    source: "decide-format.output.format_assignments"
    blocker: true
    validation: "Target platforms and placements"
  - condition: "Offer context available"
    source: "fetch-offer-data.output.offer_context"
    blocker: true
    validation: "Offer metadata for package"

post-conditions:
  - condition: "Packages created per platform"
    validation: "Flat structure: batches/{timestamp}/meta/, batches/{timestamp}/tiktok/"
    blocker: true
  - condition: "All images organized with naming pattern"
    validation: "Files named: {WRITER}-IMG-{OFFER}-{NN}H{VV}-{PLACEMENT}-{SIZE}.png"
    blocker: true
  - condition: "1:1 creative-to-ad mapping"
    validation: "Each creative has exactly 1 assigned copy combo (headline + description + primary text + CTA)"
    blocker: true
  - condition: "Creative registry updated"
    validation: "creative-registry.yaml updated with all new IDs, no duplicates"
    blocker: true
  - condition: "Consolidated copy docs created"
    validation: "META-AD-COPY.md, TIKTOK-AD-COPY.md with ALL creatives (1 combo each)"
    blocker: true
  - condition: "batch-specs.yaml generated"
    validation: "Metadata file with batch summary and creative inventory"
    blocker: true
  - condition: "BATCH-README.md created"
    validation: "Index file for batch overview"
    blocker: false
  - condition: "Ready for handoff"
    validation: "status: ready_for_traffic in batch-specs"
    blocker: true

Entrada:
  - approved_images: "Imagens aprovadas pelo @copy-chief (com overlay)"
  - ad_copy: "Ad copy completo (headlines, descriptions, primary texts em 5 formatos)"
  - platform_specs: "Specs da plataforma target"
  - offer_context: "Dados da oferta"
Saida:
  - creative_packages: "Pacotes prontos para upload na plataforma"
Checklist:
  - "[ ] Receber imagens aprovadas"
  - "[ ] Organizar ad copy por plataforma"
  - "[ ] Gerar pacote por criativo"
  - "[ ] Incluir metadata (oferta, angulo, variacao, compliance)"
  - "[ ] Organizar por plataforma e placement"
  - "[ ] Entregar para handoff"
---

# Package Image Creative — Empacotamento para Handoff

## Objetivo

Empacotar imagem aprovada + ad copy + specs em um pacote pronto para upload na plataforma de ads. O gestor de trafego recebe tudo organizado e so precisa subir.

## Por que task pura?

E organizacao mecanica — pegar arquivos aprovados e estruturar em pastas com metadata. Zero julgamento.

## Processo

### 1. Estrutura Flat por Plataforma

Organização simplificada — todas as imagens em uma pasta, um doc consolidado com todas as copys:

```
batches/{timestamp}-batch/
├── meta/
│   ├── images/
│   │   ├── {WRITER}-IMG-{OFFER}-{NN}H{VV}-feed-1080x1350.png
│   │   ├── {WRITER}-IMG-{OFFER}-{NN}H{VV}-stories-1080x1920.png
│   │   └── ... (todas as imagens do batch)
│   ├── META-AD-COPY.md              # UM DOC com todos os criativos (1 combo cada)
│   └── batch-specs.yaml              # Metadata consolidado
├── tiktok/
│   ├── images/
│   ├── TIKTOK-AD-COPY.md
│   └── batch-specs.yaml
└── BATCH-README.md
```

**Naming Convention:**
```
{WRITER}-IMG-{OFFER}-{NN}H{VV}-{PLACEMENT}-{SIZE}.png
```

| Componente | Descricao | Exemplo |
|-----------|-----------|---------|
| `{WRITER}` | Sigla do copywriter (3 letras) | `STE` (Stefan Georgi) |
| `IMG` | Fixo — tipo de criativo | `IMG` |
| `{OFFER}` | ID da oferta | `MEMFR02` |
| `{NN}` | Numero do conceito (2 digitos, sequencial por oferta) | `01`, `02`, `08` |
| `H` | Separador conceito/variacao | `H` |
| `{VV}` | Variacao (`00` = base, `01`+ = variantes) | `00`, `01`, `05` |
| `{PLACEMENT}` | Tipo de placement | `feed`, `stories` |
| `{SIZE}` | Dimensoes | `1080x1350`, `1080x1920` |

**Exemplos:**
- `STE-IMG-MEMFR02-01H00-feed-1080x1350.png` — Conceito 1, base, feed
- `STE-IMG-MEMFR02-01H03-stories-1080x1920.png` — Conceito 1, variacao 3, stories
- `STE-IMG-MEMFR02-08H05-feed-1080x1350.png` — Conceito 8, variacao 5, feed

**Regra de sequencia:** Numeracao NUNCA repete por oferta. Se batch 1 usa conceitos 01-08, batch 2 comeca em 09. Controlado via `creative-registry.yaml`.

### 1b. Creative Registry (Controle Sequencial)

Cada oferta mantém um arquivo `creative-registry.yaml` em:
```
data/offers/{offer_id}/assets/criativos/creative-registry.yaml
```

O registry rastreia:
- Proximo conceito disponivel (next_concept)
- Todos os IDs ja usados por batch
- Copywriter responsavel por cada conceito

**REGRA CRITICA:** Antes de gerar novos IDs, SEMPRE consultar o registry. Nunca reusar numeros.

### 2. Ad Copy Consolidado por Plataforma — Mapeamento 1:1

**Regra fundamental:** Cada criativo = 1 imagem + 1 combo de copy = 1 anuncio.
Nao existe Mix & Match. O gestor de trafego sobe cada criativo como um anuncio individual.

Usar templates:
- `templates/META-AD-COPY-template.md` — Estrutura para Meta
- `templates/TIKTOK-AD-COPY-template.md` — Estrutura para TikTok

Cada doc contém TODOS os criativos do batch, cada um com seu combo atribuido:

```markdown
# Meta Ad Copy — Batch {timestamp}
**Offer:** {OFFER_ID} — {Nome da Oferta}
**Geo:** {fr|es|en}
**Total Anuncios:** {count} (1 criativo = 1 anuncio)

---

## Conceito {NN} — {Nome do Angulo}

**UMP:** {perspectiva} | **Hook:** {tipo} | **Confianca:** {nivel}

### {WRITER}-IMG-{OFFER}-{NN}H00 — Base
**Imagens:**
- {WRITER}-IMG-{OFFER}-{NN}H00-feed-1080x1350.png
- {WRITER}-IMG-{OFFER}-{NN}H00-stories-1080x1920.png
**Copy Style:** {story|list|question|testimonial|news}
- **Headline:** {texto}
- **Description:** {texto}
- **Primary Text:** {texto}
- **CTA:** {botao}

### {WRITER}-IMG-{OFFER}-{NN}H01 — {nome_variacao}
**Imagens:**
- {WRITER}-IMG-{OFFER}-{NN}H01-feed-1080x1350.png
- {WRITER}-IMG-{OFFER}-{NN}H01-stories-1080x1920.png
**Copy Style:** {story|list|question|testimonial|news}
- **Headline:** {texto}
- **Description:** {texto}
- **Primary Text:** {texto}
- **CTA:** {botao}

[... demais variacoes ...]

---

[... proximo conceito ...]
```

**Distribuicao de copy por variacao:**

| Variacao | Copy Style Padrao |
|----------|------------------|
| H00 (base) | Combo 1 — geralmente story/curiosite |
| H01 | Combo 2 — geralmente list/discovery |
| H02 | Combo 3 — geralmente news/autorite |
| H03 | Question-style |
| H04 | Testimonial-style |
| H05 | Formato adicional (news/list alternativo) |

Cada combo inclui headline + description + primary text + CTA completos. Nao ha lacunas.

### 3. Batch Specs (Consolidado)

```yaml
batch:
  id: "{timestamp}-batch-{num}"
  offer: "MEMFR02"
  offer_name: "La Methode Ancestrale au Miel"
  geo: fr
  platform: meta
  writer: STE  # Sigla do copywriter
  created_at: "{timestamp}"
  pipeline_version: "1.0.0"

creatives:
  - id: STE-IMG-MEMFR02-01H00
    concept: 1
    angle: "La Toxine Invisible"
    variation: base
    copy_style: story
    images:
      - STE-IMG-MEMFR02-01H00-feed-1080x1350.png
      - STE-IMG-MEMFR02-01H00-stories-1080x1920.png
    compliance: approved

  - id: STE-IMG-MEMFR02-01H01
    concept: 1
    angle: "La Toxine Invisible"
    variation: warm_natural
    copy_style: list
    images:
      - STE-IMG-MEMFR02-01H01-feed-1080x1350.png
      - STE-IMG-MEMFR02-01H01-stories-1080x1920.png
    compliance: approved

stats:
  total_ads: 48          # 1 criativo = 1 anuncio
  total_images: 96       # 48 x 2 placements
  total_concepts: 8
  variations_per_concept: 6
  registry_range: "01H00-08H05"  # Range usado neste batch
```

### 4. Organização Final (Flat Structure)

```
data/offers/{offer_id}/assets/criativos/
├── creative-registry.yaml              # Controle sequencial (NUNCA deletar)
└── batches/
    ├── 2026-02-21-batch-001/
    │   ├── BATCH-README.md              # Indice do batch completo
    │   ├── meta/
    │   │   ├── images/
    │   │   │   ├── STE-IMG-MEMFR02-01H00-feed-1080x1350.png
    │   │   │   ├── STE-IMG-MEMFR02-01H00-stories-1080x1920.png
    │   │   │   ├── STE-IMG-MEMFR02-01H01-feed-1080x1350.png
    │   │   │   └── ... (todas as imagens)
    │   │   ├── META-AD-COPY.md          # 1 combo por criativo = 1 anuncio
    │   │   └── batch-specs.yaml         # Metadata consolidado
    │   └── tiktok/
    │       ├── images/
    │       ├── TIKTOK-AD-COPY.md
    │       └── batch-specs.yaml
    └── 2026-02-21-batch-002/
        └── ...
```

**Vantagens:**
- 1 criativo = 1 anuncio (zero ambiguidade para o gestor de trafego)
- Naming sequencial por oferta (nunca repete)
- Registry impede conflitos entre batches
- Upload direto no Ads Manager — cada linha do doc = 1 ad

## Proximo Passo

Pacotes vao para `handoff` — entrega ao gestor de trafego para upload e inicio de campanhas.
