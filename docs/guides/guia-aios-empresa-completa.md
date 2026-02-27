# Guia Completo: AIOS Para Empresa Inteira

> Documento de referencia gerado a partir de sessao de consultoria com @aios-master (Orion).
> Data: 2026-02-15

---

## Indice

1. [Como Funcionam Squads no AIOS](#1-como-funcionam-squads-no-aios)
2. [Estrutura Para Empresa Inteira](#2-estrutura-para-empresa-inteira)
3. [Roadmap: Da Ideia ao Sistema Empresarial](#3-roadmap-da-ideia-ao-sistema-empresarial)
4. [Automacao de Campanhas Facebook (Tempo Real)](#4-automacao-de-campanhas-facebook-tempo-real)
5. [Stack Tecnica Completa](#5-stack-tecnica-completa)
6. [Sequencia de Implementacao](#6-sequencia-de-implementacao)

---

## 1. Como Funcionam Squads no AIOS

### O Que e Uma Squad

Uma **Squad** e um pacote modular de agentes + tasks + templates + workflows organizados em torno de um dominio especifico. Funciona como um "time de especialistas" empacotado.

### Estrutura de Arquivos

```
squads/minha-squad/
├── squad.yaml              # Manifesto (OBRIGATORIO - define tudo)
├── README.md               # Documentacao
├── config/                 # Configuracoes do dominio
│   ├── coding-standards.md
│   ├── tech-stack.md
│   └── source-tree.md
├── agents/                 # Agentes especialistas (MD)
├── tasks/                  # Tasks executaveis (MD) - PRIMARIO!
├── workflows/              # Fluxos multi-step
├── checklists/             # Validacoes de qualidade
├── templates/              # Templates de output
├── tools/                  # Ferramentas customizadas
├── scripts/                # Scripts utilitarios
└── data/                   # Dados estaticos e knowledge base
```

### Filosofia: Task-First

O AIOS segue **Task-First** — tasks definem O QUE fazer, agentes definem QUEM executa. Cada agente vem com infraestrutura operacional completa: command_loader, tasks, templates e checklists.

### squad.yaml (Manifesto)

```yaml
name: minha-squad
version: 1.0.0
description: "Descricao do dominio"
author: "Sua Empresa"
license: MIT
slashPrefix: minha  # Para /minha-* commands

aios:
  minVersion: "2.1.0"
  type: squad

components:
  tasks:
    - tarefa-1.md
    - tarefa-2.md
  agents:
    - agente-1.md
    - agente-2.md
  workflows:
    - fluxo-principal.yaml
  templates:
    - template-output.md

config:
  extends: extend  # Herda regras do core (nao substitui)

dependencies: []  # Pode depender de outras squads
```

### Como Criar Uma Squad

**Opcao A: Design-First (Recomendado)**
```
@squad-creator
*design-squad --docs ./docs/departments/marketing.md
```
O designer analisa o documento, recomenda agentes/tasks com scores de confianca, gera um blueprint para aprovacao, e depois:
```
*create-squad marketing-creatives --from-design
```

**Opcao B: Criacao Direta**
```
@squad-creator
*create-squad minha-squad
```

### Processo de Criacao de Agente (7 Fases)

Cada agente passa por um processo rigoroso:

1. **Contexto** — Identificar squad e tipo de agente
2. **Research** — Pesquisa obrigatoria (min. 5 fontes, 500+ linhas)
3. **Extracao** — Framework do agente + Voice DNA (vocabulario, tom, metaforas)
4. **Criacao** — Template de 6 niveis (identidade, operacional, voz, qualidade, credibilidade, integracao)
5. **Validacao** — Quality gate (score >= 7.0/10)
6. **Infraestrutura** — Tasks, templates, checklists gerados automaticamente
7. **Handoff** — Resumo e proximos passos

> Filosofia: "Se o processo de criacao PERMITE criar agente incompleto, agente incompleto vai ser criado." Por isso as quality gates sao obrigatorias.

### Distribuicao de Squads

| Nivel | Local | Descricao | Comando |
|-------|-------|-----------|---------|
| Local | `./squads/` | Privado, do projeto | `*create-squad` |
| Publico | GitHub (SynkraAI/aios-squads) | Comunidade, gratuito | `*publish-squad` |
| Marketplace | api.synkra.dev/squads | Premium, licenciado | `*sync-squad-synkra` |

---

## 2. Estrutura Para Empresa Inteira

### Hierarquia Organizacional

```
Empresa (Projeto AIOS)
│
├── Squad: Marketing & Criativos
│   ├── @copywriter ........... legendas, headlines, CTAs
│   ├── @visual-director ...... briefs de imagem, prompts AI
│   ├── @vsl-analyst .......... analise de VSL, hooks, scripts
│   └── @media-buyer .......... campanhas, segmentacao, metricas
│
├── Squad: Financeiro
│   ├── @financial-analyst .... relatorios, projecoes
│   ├── @billing-manager ...... cobrancas, inadimplencia
│   └── @accountant ........... DRE, fluxo de caixa
│
├── Squad: RH / People
│   ├── @recruiter ............ triagem, entrevistas
│   ├── @people-ops ........... onboarding, cultura
│   └── @performance-coach .... avaliacoes, feedbacks
│
├── Squad: Vendas / Comercial
│   ├── @sales-strategist ..... funil, ofertas, scripts
│   ├── @crm-analyst .......... pipeline, metricas
│   └── @closer ............... objecoes, follow-up
│
├── Squad: Operacoes / Produto
│   ├── @product-manager ...... roadmap, priorizacao
│   └── @support-analyst ...... tickets, FAQs, escalation
│
└── (Agentes Core do AIOS — ja existem)
    ├── @architect, @dev, @qa, @pm, @po, @sm
    └── @devops, @data-engineer, @analyst
```

### Dados & Memoria Compartilhada

O **Entity Registry** impede duplicacao entre squads:

```
Regra: REUSE > ADAPT > CREATE

Se o @copywriter ja criou uma persona de publico-alvo,
o @media-buyer REUTILIZA ao inves de criar outra.
```

Para dados persistentes:
- **Supabase** com RLS (Row Level Security) por squad/departamento
- **Documentos compartilhados** em `docs/shared/`
- **Data files** em cada squad (`squads/marketing/data/`)

---

## 3. Roadmap: Da Ideia ao Sistema Empresarial

### Fase 1: Documentacao Base (ANTES de criar qualquer squad)

O AIOS e **document-driven**. Quanto melhor a documentacao, melhores os agentes.

| Documento | Conteudo | Para que |
|-----------|----------|----------|
| `docs/company-brief.md` | Visao, missao, produtos, publico, modelo de negocio | Contexto geral para todos os agentes |
| `docs/departments/marketing.md` | Processos, ferramentas, metricas, fluxos criativos | Input para o squad de marketing |
| `docs/departments/finance.md` | Processos financeiros, relatorios, ferramentas | Input para o squad financeiro |
| `docs/departments/hr.md` | Processos de RH, cultura, KPIs | Input para o squad de RH |
| `docs/integrations.md` | CRMs, APIs, acessos, ferramentas que voces usam | Para configurar MCPs |

> Dica: Nao precisa ser perfeito. Um briefing de 1-2 paginas por departamento ja funciona.

### Fase 2: Configurar Integracoes (MCP Servers)

O `@devops` gerencia a instalacao de MCPs:

| Ferramenta | Para que |
|------------|----------|
| Supabase MCP | Banco de dados, metricas |
| EXA MCP | Pesquisa web, analise competitiva |
| Apify MCP | Scraping, dados de redes sociais |
| Playwright MCP | Automacao de browser, screenshots |
| ClickUp MCP | Gestao de projetos |
| n8n MCP | Automacao, schedulers, webhooks |
| Custom MCP (API) | CRM, ERP, ferramentas internas |

### Fase 3: Criar Squads (um por departamento)

```
@squad-creator
*design-squad --docs ./docs/departments/marketing.md
```

Repetir para cada departamento. O designer:
1. Analisa o documento
2. Extrai entidades, workflows, integracoes
3. Recomenda agentes com scores de confianca
4. Gera blueprint para aprovacao
5. `*create-squad {nome} --from-design`

### Fase 4: Criar Agentes dentro de cada Squad

Cada agente passa pelas 7 fases (research-driven). Sai com Voice DNA, tasks executaveis, templates de output e checklists de qualidade.

### Fase 5: Workflows Cross-Squad

Workflows conectam agentes de squads diferentes:

```
Exemplo: "Lancamento de Nova Oferta"

@sales-strategist  → Define oferta, publico, angulos
       ↓
@copywriter        → Cria copies (legendas, headlines)
       ↓
@visual-director   → Cria briefs de imagem
       ↓
@vsl-analyst       → Analisa/sugere estrutura de VSL
       ↓
@media-buyer       → Monta estrutura de campanha
       ↓
@financial-analyst → Projeta ROI, break-even
       ↓
@product-manager   → Aprova e agenda lancamento
```

### Fase 6: Dados & Memoria

- Entity Registry para evitar duplicacao
- Supabase com RLS por departamento
- Dados compartilhados em `docs/shared/`

### Resumo da Ordem

```
1. Documentar (company-brief + um doc por departamento)
2. Integrar (MCPs para CRM, banco, ferramentas)
3. Design Squads (*design-squad por departamento)
4. Criar Agentes (dentro de cada squad, research-driven)
5. Montar Workflows (cross-squad para processos da empresa)
6. Conectar Dados (Entity Registry + Supabase/memoria)
7. Validar (*validate-squad para cada squad)
```

> **Comece pequeno:** Faca o squad de Marketing/Criativos primeiro, valide o processo, e replique para os outros departamentos.

---

## 4. Automacao de Campanhas Facebook (Tempo Real)

### O Problema

AIOS e **event-driven** — orquestra quando chamado. Para monitoramento em tempo real, precisa de uma **camada de automacao** que dispare o AIOS periodicamente.

### Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────────┐
│          CAMADA 1: SCHEDULER (n8n)                  │
│  "O despertador que acorda os agentes"              │
│                                                     │
│  Cron: a cada 6h → puxa dados Facebook API          │
│  Webhook: Facebook notifica mudanca                 │
│  Threshold: CPA subiu 30% → trigger imediato        │
└────────────────────┬────────────────────────────────┘
                     │ dispara
                     ▼
┌─────────────────────────────────────────────────────┐
│          CAMADA 2: AIOS (Cerebro)                   │
│  "Os agentes analisam, decidem e criam"             │
│                                                     │
│  @campaign-analyst → Analisa metricas               │
│  @copywriter → Gera novas copies                    │
│  @visual-director → Cria briefs de imagem           │
│  @media-buyer → Decide acao (pausar, escalar, etc)  │
└────────────────────┬────────────────────────────────┘
                     │ executa
                     ▼
┌─────────────────────────────────────────────────────┐
│          CAMADA 3: APIs EXTERNAS (Bracos)           │
│  "Executa as acoes no mundo real"                   │
│                                                     │
│  Facebook Marketing API → sobe/pausa anuncios       │
│  AI Image Gen (DALL-E/Flux) → gera criativos        │
│  Google Drive/Notion → salva relatorios             │
│  Slack/WhatsApp → notifica o time                   │
└─────────────────────────────────────────────────────┘
```

### Cenario Real: "CPA subiu, precisa de criativos novos"

```
HORA 0:00 — n8n puxa dados da Facebook Marketing API
    │
    ▼
n8n detecta: "Campanha X — CPA subiu 40% nas ultimas 12h"
    │
    ▼ trigger AIOS workflow: campaign-alert
    │
┌───┴──────────────────────────────────────────────┐
│  AIOS Workflow: campaign-rescue                  │
│                                                  │
│  Step 1: @campaign-analyst                       │
│    → Recebe dados raw da API                     │
│    → Analisa: CTR caiu, frequencia alta,         │
│      criativo saturado                           │
│    → Output: diagnosis.json                      │
│              {                                   │
│                problem: "creative_fatigue",      │
│                affected_adsets: ["AS-01","AS-03"]│
│                confidence: 0.87,                 │
│                recommendation: "new_creatives"   │
│              }                                   │
│                                                  │
│  Step 2: @media-buyer (decisao)                  │
│    → Le diagnosis.json                           │
│    → Decide: pausar ad sets saturados,           │
│      manter os que performam, criar novos        │
│    → Output: action-plan.json                    │
│                                                  │
│  Step 3: @copywriter                             │
│    → Recebe contexto (oferta, publico, angulos)  │
│    → Gera 5 variacoes de copy                    │
│    → Output: new-copies.json                     │
│                                                  │
│  Step 4: @visual-director                        │
│    → Cria prompts para geracao de imagem         │
│    → Gera via API (DALL-E/Flux)                  │
│    → Output: creative-assets/                    │
│                                                  │
│  Step 5: @media-buyer (execucao)                 │
│    → Monta payload da Facebook API               │
│    → Pausa ad sets saturados                     │
│    → Cria novos ads com copies + criativos       │
│    → Output: deployment-report.json              │
│                                                  │
│  Step 6: Notificacao                             │
│    → Slack: "Campanha X: 2 ads pausados,         │
│      3 novos criativos subidos. CPA esperado:    │
│      R$12 → R$8. Proxima analise em 6h."        │
└──────────────────────────────────────────────────┘
    │
    ▼
HORA 6:00 — n8n puxa dados novamente → loop reinicia
```

### n8n Como Scheduler

O AIOS ja tem um MCP de n8n definido em `.aios-core/infrastructure/tools/mcp/n8n.yaml`:

| Funcao | Descricao |
|--------|-----------|
| `execute_workflow` | Roda workflow do n8n |
| `create_workflow` | Cria workflows programaticamente |
| `credentials` | Gerencia credenciais (Facebook, etc) |
| `loop execution` | Loops com condicoes |
| `wait_for_completion` | Espera resultado |

**Configuracao do n8n workflow:**

```
n8n Workflow: "Facebook Campaign Monitor"

Trigger: Schedule (a cada 6 horas)
    ↓
Node: Facebook Marketing API
  → GET /act_{ad_account_id}/insights
  → Campos: cpa, ctr, cpm, spend, frequency, impressions
    ↓
Node: Condition
  → SE cpa_atual > cpa_target * 1.3 (subiu 30%+)
  → OU frequency > 3.0 (criativo saturado)
  → OU ctr < 0.8% (engajamento morreu)
    ↓
Node: AIOS Trigger
  → Chama: campaign-rescue workflow
  → Passa: campaign_data, diagnosis_context
    ↓
Node: Wait for AIOS Response
    ↓
Node: Facebook Marketing API
  → POST /act_{ad_account_id}/ads (cria novos ads)
  → POST /ad_id (pausa ads saturados)
    ↓
Node: Slack Notification
  → Envia resumo para canal #campaigns
```

### Niveis de Automacao

| Nivel | Como funciona | Risco |
|-------|--------------|-------|
| **Assistido** | n8n alerta, AIOS sugere, humano aprova e sobe | Zero |
| **Semi-auto** | AIOS cria criativos e pausa ads, humano aprova novos antes de subir | Baixo |
| **Full-auto** | Tudo automatico com guardrails (budget limits, frequency caps, approval acima de X valor) | Medio |

**Recomendacao:** Comece no **Semi-auto** com guardrails:

```
Guardrails obrigatorios:
├── Budget diario maximo por campanha
├── Maximo de ads criados por ciclo (ex: 3)
├── Nunca pausar campanha com ROAS > target
├── Notificacao obrigatoria antes de gastar > R$X
└── Kill switch manual no Slack ("!pause all")
```

---

## 5. Stack Tecnica Completa

### Infraestrutura Necessaria

| Componente | Funcao |
|------------|--------|
| **n8n** | Scheduler + API connector + webhooks |
| **Supabase** | Banco de dados (metricas, historico, criativos) |
| **Facebook Marketing API** | Token de acesso do Business Manager |
| **AI Image API** | DALL-E / Flux / Midjourney para criativos |
| **Slack/Zapier** | Notificacoes e kill switch |

### Squad: fb-campaigns (Estrutura)

```
squads/fb-campaigns/
├── squad.yaml
├── agents/
│   ├── campaign-analyst.md ...... Le dados, diagnostica, gera insights
│   ├── copywriter.md ........... Gera copies, headlines, CTAs
│   ├── visual-director.md ...... Cria briefs/prompts para imagens AI
│   └── media-buyer.md .......... Decide acoes, monta campanhas
├── tasks/
│   ├── analyze-campaign.md
│   ├── generate-copies.md
│   ├── create-visual-brief.md
│   ├── deploy-ads.md
│   └── daily-report.md
├── workflows/
│   ├── campaign-rescue.yaml .... Loop: analise → criacao → deploy
│   ├── creative-sprint.yaml .... Copy → visual → variacoes
│   └── daily-report.yaml ....... Relatorio diario de campanhas
├── templates/
│   ├── copy-output.md
│   ├── visual-brief.md
│   └── campaign-report.md
├── data/
│   ├── offer-catalog.md ........ Ofertas ativas, angulos, publicos
│   ├── creative-library.md ..... Banco de copies/criativos winners
│   └── performance-history.md .. Historico de metricas para benchmark
└── config/
    └── thresholds.yaml ......... Limites de CPA, CTR, frequency, etc
```

### MCPs Necessarios

| MCP | Para que | Status no AIOS |
|-----|----------|----------------|
| n8n | Scheduler, automacao | Definido (precisa instalar) |
| Supabase | Banco de dados | Disponivel |
| EXA | Pesquisa web, analise | Disponivel |
| Apify | Scraping redes sociais | Disponivel |
| Playwright | Automacao browser | Disponivel |
| Facebook Marketing API | Custom MCP (criar) | Nao existe ainda |

---

## 6. Sequencia de Implementacao

### Para o Squad de Campanhas Facebook

```
1. Configurar Facebook Marketing API (token, permissions)
2. Instalar e configurar n8n (self-hosted ou cloud)
3. Criar squad fb-campaigns com @squad-creator
4. Criar os 4 agentes (analyst, copy, visual, buyer)
5. Montar workflow campaign-rescue no AIOS
6. Configurar n8n workflow com schedule + triggers
7. Criar tabelas no Supabase (metricas, criativos)
8. Testar em modo Assistido (so alertas)
9. Gradualmente subir para Semi-auto
```

### Para a Empresa Inteira

```
1.  Documentar: company-brief.md + um doc por departamento
2.  Integrar: MCPs para CRM, banco, ferramentas
3.  Squad Marketing: Primeiro squad (validar processo)
4.  Squad Vendas: Segundo squad (replicar)
5.  Squad Financeiro: Terceiro
6.  Squad RH: Quarto
7.  Squad Operacoes: Quinto
8.  Workflows Cross-Squad: Conectar tudo
9.  Dados Compartilhados: Entity Registry + Supabase
10. Validar tudo: *validate-squad para cada squad
```

---

## Comandos Rapidos de Referencia

### @squad-creator
```
*design-squad --docs {arquivo}    # Design a partir de documento
*create-squad {nome}              # Criar nova squad
*create-squad {nome} --from-design # Criar a partir de blueprint
*validate-squad {nome}            # Validar estrutura
*analyze-squad {nome}             # Analisar e sugerir melhorias
*extend-squad {nome}              # Adicionar componentes
*list-squads                      # Listar squads locais
```

### @aios-master (Orion)
```
*create agent {nome}              # Criar agente
*create task {nome}               # Criar task
*workflow {nome}                  # Iniciar workflow
*plan                             # Criar plano de execucao
*ids check {intent}               # Verificar reuso antes de criar
*kb                               # Ativar Knowledge Base
```

### @devops (Gage)
```
*add-mcp {nome}                   # Adicionar MCP server
*push                             # Git push (exclusivo do @devops)
```

---

## Proximos Passos Sugeridos

1. **Agora:** Criar `docs/company-brief.md` com visao geral da empresa
2. **Depois:** Criar `docs/departments/marketing.md` com processos do marketing
3. **Entao:** `@squad-creator *design-squad --docs ./docs/departments/marketing.md`
4. **Iterar:** Validar, ajustar, replicar para outros departamentos

---

*Documento gerado por @aios-master (Orion) em 2026-02-15*
*Synkra AIOS v2.1*
