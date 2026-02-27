# Squad Orchestration Engine — Brownfield Enhancement PRD

**Project:** B2G Capital AIOS Framework
**Enhancement Type:** New Infrastructure Component
**Status:** Draft
**Version:** 1.1
**Date:** 2026-02-20
**Author:** @pm (Morgan)
**Last Updated:** 2026-02-20 (Integration Architecture added)

---

## 1. Intro Project Analysis and Context

### 1.1 Existing Project Overview

**Analysis Source:** Architecture designed by @architect (Aria) on 2026-02-20

**Current Project State:**

B2G Capital AIOS é um framework de orquestração de agentes AI para desenvolvimento full-stack. Atualmente possui:
- Agentes especializados (@dev, @qa, @architect, @pm, @sm, etc.)
- Story Development Cycle (workflow para desenvolvimento de código)
- Dashboard Next.js para monitoramento
- Primitivas de orquestração (workflow-executor.js, master-orchestrator.js, session-state.js)

**Gap Identificado:**

O código atual é voltado para **story development cycle** (desenvolvimento de código). Não existe um **squad execution engine** genérico que possa:
- Rodar qualquer squad baseado em playbook YAML
- Executar workflows de negócio (não apenas desenvolvimento)
- Orquestrar processos automatizados (ex: squad-copy — pipeline de criação de ads)

### 1.2 Available Documentation Analysis

**Available Documentation:**
- ✅ Tech Stack Documentation (Node.js, Next.js, Railway)
- ✅ Source Tree/Architecture (.aios-core/ structure)
- ✅ Coding Standards (JavaScript/TypeScript patterns)
- ✅ API Documentation (existing routes in dashboard/src/app/api/)
- ✅ Squad Architecture (squad-copy v4.0.1 como caso de uso real)
- ⚠️ External API Documentation (parcial)
- ❌ UX/UI Guidelines formais
- ⚠️ Technical Debt Documentation (implícito)

**Documentation Note:** Arquitetura completa foi projetada por @architect (Aria), incluindo:
- Componentes principais (SquadOrchestrator, TaskExecutor, ConditionEngine, etc.)
- Padrões arquiteturais (Event Sourcing, Idempotency, Circuit Breaker)
- Estratégia de deployment (Railway MVP → Produção separada)

### 1.3 Enhancement Scope Definition

**Enhancement Type:**
- ✅ **New Feature Addition** (Infrastructure Component)
- ✅ **Integration with New Systems** (Squads, APIs externas)
- ✅ **Performance/Scalability Improvements** (Design para 1000+ runs/dia)

**Enhancement Description:**

Criar um **Motor de Orquestração de Squads** genérico que:
1. Lê playbooks YAML (squad.yaml + pipeline.yaml) e executa workflows automaticamente
2. Suporta gatilhos externos (API, webhooks, n8n)
3. Implementa gates de revisão (GO/NO-GO decisions)
4. Permite pause/resume de execuções
5. Aceita overrides de runtime (ex: "só variações, só geo FR")
6. É genérico — roda qualquer squad com playbook, não apenas squad-copy

**Impact Assessment:**
- ✅ **Significant Impact** — novo módulo de orquestração (.aios-core/core/orchestration/squad-engine/)
- ✅ **Moderate Impact** — integração com dashboard existente (novas rotas API)
- ⚠️ **Minimal Impact** — não quebra story development cycle existente (coexistência)

### 1.4 Goals and Background Context

**Goals:**
- Automatizar execução de workflows de squads de ponta a ponta (zero intervenção humana opcional)
- Permitir que squad-copy (Persuasion Engine) rode 100% autônomo
- Habilitar integração inter-squad (ex: squad-trafego → squad-copy)
- Fornecer visibilidade em tempo real de execuções (dashboard)
- Estabelecer fundação para camada Jarvis futura (meta-orquestrador)

**Background Context:**

O AIOS atualmente orquestra **desenvolvimento de código** (Story Development Cycle). Com a criação do **squad-copy v4.0.1** (Persuasion Engine), surge a necessidade de orquestrar **workflows de negócio** automatizados:

- **squad-copy:** Pipeline de 5 fases (Intelligence → Strategy → Production → Review → Delivery) para gerar ads automaticamente
- **Próximo:** squad-trafego (vai consumir outputs do squad-copy)
- **Futuro:** Múltiplos squads orquestrados por camada Jarvis

O Motor de Orquestração é a infraestrutura core que permite essa visão. Caso de uso inicial: **rodar squad-copy de ponta a ponta**, com gatilhos externos (n8n quando oferta é criada) e monitoramento em tempo real.

### 1.5 Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial PRD | 2026-02-20 | 1.0 | Created based on @architect design | @pm (Morgan) |
| Integration Architecture | 2026-02-20 | 1.1 | Added section 3.6 (Integration Architecture), FR14-FR18 (integrations), Story 1.9 (n8n contracts), Story 2.5 (External APIs). Total stories: 19→21. Duration: 6-8→8-10 weeks. | @pm (Morgan) |

---

## 2. Requirements

### 2.1 Functional Requirements

**FR1:** O motor DEVE carregar playbooks YAML (squad.yaml + pipeline.yaml) e executar fases sequencialmente conforme definidas.

**FR2:** O motor DEVE validar pre-conditions ANTES de executar cada task e post-conditions DEPOIS, bloqueando execução se blocker=true.

**FR3:** O motor DEVE suportar 3 tipos de steps:
- `task_pura` — Execução mecânica sem julgamento
- `agent_task` — Invoca agente LLM com prompt específico
- `router` — Branching condicional (ex: if format=imagem goto generate_image_concepts)

**FR4:** O motor DEVE implementar gates de revisão com verdicts:
- `APPROVED` — Continuar para próximo step
- `REVISION_NEEDED` — Loop de revisão (max rounds configurável)
- `REJECTED` — Descartar ou escalar

**FR5:** O motor DEVE permitir pause/resume de execuções:
- Salvar estado completo (fase, step, context acumulado)
- Retomar de onde parou sem perda de dados

**FR6:** O motor DEVE aceitar overrides de runtime que modificam comportamento padrão:
- Override de método (ex: forçar `variacao_de_winner`)
- Override de geos/platforms
- Skip de fases (ex: pular spy se usar cache)

**FR7:** O motor DEVE ser genérico — aceitar qualquer squad com playbook válido, não apenas squad-copy.

**FR8:** O motor DEVE receber gatilhos de 3 fontes:
- Manual (dashboard UI)
- Webhook (n8n, API externa)
- Inter-squad (squad A chama squad B)

**FR9:** O motor DEVE emitir eventos de progresso em tempo real para dashboard:
- `phase.started`, `phase.completed`
- `step.started`, `step.completed`
- `state.updated`

**FR10:** O motor DEVE empacotar outputs ao final de execução conforme definido no playbook (ex: creative_packages, platform_target).

**FR11:** O dashboard DEVE exibir visualização de pipeline em tempo real:
- Fases com status (completed/running/pending/failed)
- Step atual com detalhes
- Context snapshot (dados acumulados)
- Controles de pause/resume/abort

**FR12:** O motor DEVE implementar Event Sourcing para audit trail:
- Todos os eventos salvos em `events.jsonl` (append-only)
- Replay possível para reconstruir estado de qualquer ponto

**FR13:** O motor DEVE implementar Idempotency Keys para tasks:
- Hash de (runId, step, input) como chave
- Cachear resultado para evitar execução duplicada em retries

**FR14:** O motor DEVE integrar com n8n para trigger e handoff:
- Receber trigger via webhook: `POST /api/webhooks/n8n`
- Validar API key no header Authorization
- Registrar callback URL para notificar completion
- Notificar n8n via callback webhook quando run completa

**FR15:** O motor DEVE integrar diretamente com APIs de geração de imagem:
- DALL-E (OpenAI)
- MidJourney (via proxy ou API oficial)
- NanoBanana (custom)
- Flux (Replicate ou similar)
- Implementar retry logic e circuit breaker por API

**FR16:** O motor DEVE integrar diretamente com Whisper API para transcrição:
- Enviar arquivos de vídeo/audio
- Receber transcrição com timestamps
- Suportar múltiplos idiomas (FR, ES, EN)

**FR17:** O motor DEVE integrar diretamente com APIs de spy scraping:
- Meta Ad Library API (download de ads)
- TikTok Creative Center API (download de videos)
- Salvar raw media em file system local

**FR18:** n8n DEVE preparar dados de oferta ANTES de triggerar motor:
- Fetch oferta de Notion API
- Download compliance/performance de Google Drive
- Salvar em `data/offers/{ID}/` (file system local do motor)

### 2.2 Non-Functional Requirements

**NFR1: Performance**
- Pipeline completo do squad-copy DEVE completar em **<30 minutos** (target: 25min)
- Dashboard DEVE atualizar estado em **<2 segundos** após mudança
- Motor DEVE suportar **10+ runs simultâneos** (MVP) escalando para **100+ runs** (produção)

**NFR2: Confiabilidade**
- Success rate de **95%+** para pipelines (excluindo falhas de APIs externas)
- Auto-recovery de erros transientes (rate limits, timeouts) via **retry com exponential backoff**
- Circuit Breaker para APIs externas — após 3 falhas consecutivas, abrir circuito por 2min

**NFR3: Auditabilidade**
- **100% dos eventos** registrados em Event Store (events.jsonl)
- Logs estruturados com timestamp, runId, task, error (se aplicável)
- Métricas de execução: duration, steps executed, angles generated, success rate

**NFR4: Escalabilidade**
- Arquitetura DEVE permitir evolução de single-process (MVP) → queue-based (Produção) → distributed (Scale)
- Estado DEVE ser portável entre File System → Redis → MongoDB sem breaking changes

**NFR5: Segurança**
- API keys para webhooks externos (n8n)
- Rate limiting: max 100 requests/min por API key
- Sandboxing de tasks puras em child_process isolado
- Validação de YAML playbooks — rejeitar path traversal, eval(), dynamic code execution

**NFR6: Observabilidade**
- Dashboard com métricas agregadas: avg pipeline duration, success rate, tasks executed (24h)
- Alertas via Slack quando pipeline falha após 3 tentativas
- Health check endpoint: `/api/health` (200 OK se motor disponível)

**NFR7: Usabilidade**
- Dashboard responsivo (funciona em desktop e tablet)
- Controles de pause/resume com confirmação
- Visualização clara de erros com next steps sugeridos

### 2.3 Compatibility Requirements

**CR1: Coexistência com Story Development Cycle**
- Motor de orquestração de squads DEVE coexistir com story development cycle existente
- Não modificar workflows existentes (brownfield-discovery.yaml, story-development-cycle.yaml)
- Compartilhar primitivas onde possível (SessionState, GateEvaluator, AgentInvoker)

**CR2: Integração com Dashboard Existente**
- Novas rotas API DEVEM seguir padrão Next.js existente (`/app/api/runs/`)
- Componentes React DEVEM usar design system do dashboard (Tailwind, shadcn/ui se aplicável)
- Autenticação DEVE usar mecanismo existente (ou API keys para MVP)

**CR3: Compatibilidade com Squad-copy v4.0.1**
- Motor DEVE executar squad-copy/workflows/creative-pipeline.yaml sem modificações
- Pre/post-conditions já implementadas em 8 tasks críticas DEVEM ser validadas corretamente
- Outputs DEVEM seguir estrutura flat definida (batches/{timestamp}-batch/)

**CR4: Preparação para Expansão Futura**
- Arquitetura DEVE permitir adição de rotas inter-squad (squad-trafego → squad-copy)
- Arquitetura DEVE permitir camada Jarvis futura (meta-orquestrador)
- Não hard-code lógica específica de squad-copy — tudo via playbook YAML

---

## 3. Technical Constraints and Integration Requirements

### 3.1 Existing Technology Stack

**Languages:** JavaScript/TypeScript (Node.js 18+)
**Backend Framework:** Node.js (Express implícito, ou Next.js API routes)
**Frontend Framework:** Next.js 14+ (App Router)
**Database (MVP):** File System (.aios/squad-runs/{runId}/)
**Database (Produção):** Redis (state cache) + MongoDB (histórico) + S3/Backblaze (artifacts)
**Infrastructure:** Railway.app (MVP monolito) → Vercel (frontend) + Railway (backend) em produção
**External Dependencies:**
- LLM APIs (Claude Sonnet 4.5 para agents)
- Image Generation APIs (DALL-E, MidJourney, NanoBanana — squad-copy)
- Whisper API (transcrição — squad-copy)

### 3.2 Integration Approach

**Backend Integration Strategy:**

1. **Novo módulo:** `.aios-core/core/orchestration/squad-engine/`
   - `squad-orchestrator.js` — Motor principal
   - `task-executor.js` — Execução de tasks
   - `condition-engine.js` — Pre/post-conditions
   - `gate-evaluator.js` — Gates de revisão (expandir existente)
   - `state-manager.js` — Pause/resume
   - `event-store.js` — Event Sourcing
   - `router.js` — Branching lógico
   - `parallel-executor.js` — Paralelização

2. **Reutilizar existentes:**
   - `session-state.js` → Adaptar para squad runs
   - `gate-evaluator.js` → Expandir com novos verdicts
   - `agent-invoker.js` → Reutilizar para agent tasks
   - `terminal-spawner.js` → Para tasks que rodam scripts

**Frontend Integration Strategy:**

1. **Novas páginas:**
   - `/dashboard/runs` — Lista de execuções
   - `/dashboard/runs/[runId]` — Detalhes de execução
   - `/dashboard/pipeline` — Monitoring em tempo real

2. **Novos componentes:**
   - `PipelineMonitor.tsx` — Visualização de fases
   - `PipelineVisualizer.tsx` — Diagrama de progresso
   - `StepDetails.tsx` — Detalhes de step atual
   - `Controls.tsx` — Pause/Resume/Abort

3. **API Routes:**
   - `POST /api/runs` — Criar nova execução
   - `GET /api/runs` — Listar execuções
   - `GET /api/runs/[runId]/state` — Estado atual
   - `POST /api/runs/[runId]/control` — Pause/Resume/Abort
   - `POST /api/webhooks/n8n` — Trigger externo

**Testing Integration Strategy:**

1. **Unit Tests:** Jest para cada módulo (squad-orchestrator, task-executor, etc.)
2. **Integration Tests:** Rodar squad-copy completo com mock offer
3. **E2E Tests:** Cypress para dashboard + API (trigger → monitoring → completion)
4. **Mocks:** APIs externas (DALL-E, Whisper) mockadas com nock

### 3.3 Code Organization and Standards

**File Structure Approach:**

```
.aios-core/
  core/
    orchestration/
      squad-engine/          # NOVO
        squad-orchestrator.js
        task-executor.js
        condition-engine.js
        gate-evaluator.js
        state-manager.js
        event-store.js
        router.js
        parallel-executor.js
        index.js

dashboard/
  src/
    app/
      runs/                  # NOVO
        page.tsx
        [runId]/
          page.tsx
      api/
        runs/                # NOVO
          route.ts
          [runId]/
            state/route.ts
            control/route.ts
        webhooks/            # NOVO
          n8n/route.ts
    components/
      pipeline/              # NOVO
        PipelineMonitor.tsx
        PipelineVisualizer.tsx
        StepDetails.tsx
        Controls.tsx

.aios/
  squad-runs/                # NOVO
    {run_id}/
      state.yaml
      events.jsonl
      trigger.yaml
      logs/
      outputs/
```

**Naming Conventions:**
- Classes: PascalCase (`SquadOrchestrator`)
- Files: kebab-case (`squad-orchestrator.js`)
- Variables: camelCase (`currentPhase`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

**Coding Standards:**
- ESLint + Prettier (seguir config existente)
- JSDoc para funções públicas
- Error handling: try/catch com mensagens descritivas
- Logging: structured logs com winston ou console estruturado

**Documentation Standards:**
- README.md em cada módulo novo
- Inline comments para lógica complexa
- API routes documentadas com exemplos de request/response

### 3.4 Deployment and Operations

**Build Process Integration:**
- Adicionar scripts em `package.json`: `npm run test:squad-engine`
- CI/CD (se existir): rodar testes do squad-engine antes de deploy

**Deployment Strategy:**

**MVP (Fase 1-2):**
- Railway.app — deploy monolítico (Next.js + Squad Engine integrado)
- `railway.toml` com build/deploy commands
- Volume persistido: `/app/.aios` (para state/logs)

**Produção (Fase 3-4):**
- Vercel: Next.js dashboard (frontend)
- Railway: Squad Engine (backend Node.js com Express)
- Redis: Upstash ou Railway Add-on (state cache)
- MongoDB: MongoDB Atlas (histórico)
- S3/Backblaze: Artifacts (outputs de squads)

**Monitoring and Logging:**
- Logs estruturados salvos em `.aios/squad-runs/{runId}/logs/`
- Métricas agregadas em dashboard (`/api/metrics`)
- Alertas via Slack webhook quando pipeline falha

**Configuration Management:**
- `.aios-core/config.yaml` — Configurações globais
- `.env` — Secrets (API keys)
- Playbooks YAML — Configurações específicas de squad

### 3.5 Risk Assessment and Mitigation

**Technical Risks:**

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **APIs externas instáveis** (DALL-E, Whisper) | Alto | Média | Circuit Breaker + retry exponential backoff + fallback |
| **State corruption** (pause/resume) | Alto | Baixa | Event Sourcing para replay + validação rigorosa de state.yaml |
| **Performance degradation** (muitos runs simultâneos) | Médio | Média | Queue-based execution (Fase 4) + resource quotas |
| **Timeout em pipelines longos** | Médio | Média | Checkpoint intermediário + resume automático |

**Integration Risks:**

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Conflito com story dev cycle** | Alto | Baixa | Coexistência via namespaces separados (squad-runs/ vs stories/) |
| **Dashboard lento** (polling frequente) | Médio | Média | WebSocket em Fase 3 + cache de estado |
| **Breaking changes em playbooks** | Médio | Baixa | Versionamento de playbooks + validação de schema |

**Deployment Risks:**

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **File System overflow** (muitos runs) | Médio | Alta | Data lifecycle cleanup (runs >30d, snapshots >90d) |
| **Railway downtime** | Alto | Baixa | Failover para Render ou self-hosted em VPS |

**Mitigation Strategies:**

1. **MVP defensivo:** File System + retry logic robusto antes de Redis/MongoDB
2. **Testing rigoroso:** E2E com squad-copy completo antes de produção
3. **Rollback plan:** Manter story dev cycle intocado — rollback = desativar squad engine
4. **Graceful degradation:** Se API externa falha, continuar com outputs parciais + notificar

### 3.6 Integration Architecture — External Systems

O motor adota **arquitetura híbrida** para integrações, balanceando performance (APIs diretas) com flexibilidade (n8n para orquestração periférica).

#### 3.6.1 Integration Strategy

**🔴 Motor Direto (Critical Path - Baixa Latência):**

Integrações síncronas para steps críticos do pipeline:

1. **Geradores de Imagem:**
   - DALL-E (OpenAI API)
   - MidJourney (proxy/API oficial)
   - NanoBanana (custom endpoint)
   - Flux (Replicate)
   - **Razão:** Tasks de geração precisam de retry logic específico e circuit breaker por API

2. **Whisper API (Transcrição):**
   - OpenAI Whisper API
   - Suporte multi-idioma (FR, ES, EN)
   - **Razão:** Parte do critical path do spy scraping

3. **Spy Scraping:**
   - Meta Ad Library API
   - TikTok Creative Center API
   - **Razão:** Download de raw media é I/O intensivo, precisa de controle de concorrência

**🟡 Via n8n (Peripheral - Alta Flexibilidade):**

Integrações assíncronas para orquestração de suporte:

1. **Notion API:**
   - Fetch dados de ofertas
   - Atualizar status de campaigns
   - **Razão:** Mudanças de estrutura Notion não devem requerer código no motor

2. **Google Drive:**
   - Download de assets (compliance docs, performance data)
   - Upload de outputs finais (batch de criativos)
   - **Razão:** Storage layer pode mudar (Drive → S3) sem tocar motor

3. **Notificações:**
   - Slack webhooks
   - Email (SendGrid)
   - **Razão:** Canais de notificação são configuráveis via n8n

#### 3.6.2 End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: TRIGGER (n8n detecta evento)                        │
│  - Notion: Nova oferta criada                               │
│  - Evento: Database item created (MEMFR02)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: n8n PREPARA CONTEXTO                                │
│  • Fetch Notion: Oferta MEMFR02 (nome, ICP, mecanismo, etc)│
│  • Download Drive: compliance/rules.md, performance.yaml    │
│  • Write local: data/offers/MEMFR02/ (motor file system)   │
│  • Gera: offer.yaml estruturado                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: n8n TRIGGERA MOTOR                                  │
│  POST /api/webhooks/n8n                                     │
│  {                                                           │
│    event: "offer.created",                                  │
│    payload: {                                                │
│      offerId: "MEMFR02",                                    │
│      platforms: ["meta", "tiktok"],                         │
│      callback_url: "https://n8n.../webhook/completion"     │
│    }                                                         │
│  }                                                           │
│  Authorization: Bearer {n8n_api_key}                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: MOTOR EXECUTA PIPELINE (squad-copy)                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FASE 1: Intelligence                                  │  │
│  │  • fetch-offer-data → lê data/offers/MEMFR02/        │  │
│  │  • interpret-offer-data → @copy-chief analisa        │  │
│  │  • spy-scrape → Meta Ad Library API (DIRETO)         │  │
│  │              → TikTok Creative Center API (DIRETO)   │  │
│  │  • spy-transcribe → Whisper API (DIRETO)             │  │
│  │  • catalog + deconstruct → processing local          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FASE 2: Strategy                                      │  │
│  │  • suggest-angles → @stefan-georgi sugere            │  │
│  │  • select-method → @copy-chief decide mix            │  │
│  │  • decide-format → imagem ou video                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FASE 3: Production (branch imagem)                    │  │
│  │  • generate-image-concepts → @stefan-georgi cria     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FASE 4: Review                                        │  │
│  │  • review-image-concept → @copy-chief aprova         │  │
│  │  • generate-image-prompts → formata para APIs        │  │
│  │  • generate-images-api → DALL-E API (DIRETO)         │  │
│  │                       → MidJourney API (DIRETO)      │  │
│  │  • review-generated-image → @copy-chief valida       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ FASE 5: Delivery                                      │  │
│  │  • package-image-creative → salva em outputs/        │  │
│  │    .aios/squad-runs/{runId}/outputs/                 │  │
│  │      batches/2026-02-20-batch/                        │  │
│  │        meta/images/ (12 images)                       │  │
│  │        meta/META-AD-COPY.md                           │  │
│  │        meta/batch-specs.yaml                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  STATUS: completed                                           │
│  DURATION: 24min 35s                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: MOTOR NOTIFICA n8n (callback)                       │
│  POST https://n8n.../webhook/completion                     │
│  {                                                           │
│    runId: "squad-copy-2026-02-20-15-30-00",                │
│    status: "completed",                                     │
│    squadId: "squad-copy",                                   │
│    duration_ms: 1475000,                                    │
│    outputs_path: ".aios/squad-runs/{runId}/outputs/"       │
│  }                                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: n8n FAZ HANDOFF                                     │
│  • Read local: .aios/squad-runs/{runId}/outputs/           │
│  • Upload Drive: Pasta "MEMFR02/2026-02-20-batch/"         │
│    - 12 imagens + copy + specs                             │
│  • Update Notion: Status = "Criativos Prontos"             │
│  • Notify Slack: "✅ MEMFR02: 12 criativos Meta prontos!"  │
└─────────────────────────────────────────────────────────────┘
```

#### 3.6.3 API Integration Details

**Geradores de Imagem (Integração Direta):**

```javascript
// .aios-core/core/integrations/image-generators/
class ImageGeneratorClient {
  async generate(provider, prompt, options) {
    const client = this.getClient(provider); // DALL-E, MidJourney, etc.

    // Circuit breaker por provider
    return await this.circuitBreakers[provider].call(async () => {
      return await client.generate(prompt, options);
    });
  }
}
```

**Whisper API (Integração Direta):**

```javascript
// .aios-core/core/integrations/whisper/
class WhisperClient {
  async transcribe(audioFile, language = 'auto') {
    return await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData(audioFile, language)
    });
  }
}
```

**n8n Webhook Contract (Input):**

```typescript
// POST /api/webhooks/n8n
interface N8nTriggerPayload {
  event: 'offer.created' | 'manual_trigger';
  payload: {
    offerId: string;                    // ex: "MEMFR02"
    platforms?: string[];               // ex: ["meta", "tiktok"]
    callback_url?: string;              // ex: "https://n8n.../webhook/completion"
    overrides?: {                       // opcional
      method?: 'modelagem' | 'variacao' | 'do-zero';
      geos?: string[];
      skip_phases?: string[];
    };
  };
}
```

**n8n Callback Contract (Output):**

```typescript
// POST {callback_url}
interface MotorCompletionCallback {
  runId: string;
  status: 'completed' | 'failed' | 'aborted';
  squadId: string;
  trigger: {...};
  started_at: string;               // ISO timestamp
  completed_at: string;
  duration_ms: number;
  outputs_path: string;             // ".aios/squad-runs/{runId}/outputs/"
  error?: {                         // se status=failed
    phase: string;
    step: string;
    message: string;
  };
}
```

#### 3.6.4 API Keys & Authentication

**Storage:**
```bash
# .env (motor)
OPENAI_API_KEY=sk-...           # DALL-E + Whisper
MIDJOURNEY_API_KEY=mj-...
NANOBANANA_API_KEY=nb-...
N8N_WEBHOOK_SECRET=n8n-...      # Para validar triggers de n8n
```

**Validation:**
- n8n → motor: Bearer token validado contra `N8N_WEBHOOK_SECRET`
- motor → APIs externas: API keys específicas por provider
- motor → n8n callback: Sem auth (n8n valida source IP se necessário)

#### 3.6.5 Error Handling por Integração

| Integração | Error | Retry Strategy | Fallback |
|------------|-------|----------------|----------|
| **DALL-E** | Rate limit (429) | 3x exponential backoff (2s, 4s, 8s) | Skip conceito, continuar |
| **DALL-E** | Content policy (400) | Sanitize prompt, retry 1x | Skip conceito |
| **Whisper** | Timeout (>60s) | Retry 2x com timeout maior | Skip transcription, usar só visual |
| **Meta API** | Auth error (401) | Fail imediatamente | Block pipeline, notify user |
| **n8n callback** | Connection error | Retry 3x com backoff | Log warning, não bloqueia completion |
| **Google Drive** | Upload fail | n8n retry (fora do motor) | Outputs ficam em file system local |

---

## 4. Epic and Story Structure

### 4.1 Epic Approach

**Epic Structure Decision:** **Single Epic com 4 fases sequenciais**

**Rationale:**

O Motor de Orquestração é um **componente de infraestrutura coeso** com dependências claras entre fases:
- Fase 1 (MVP) → fundação necessária para Fase 2 (Robustez)
- Fase 2 → pré-requisito para Fase 3 (Automação com webhooks)
- Fase 3 → base para Fase 4 (Scale com queue)

Quebrar em múltiplos épicos criaria overhead de coordenação desnecessário. Um épico único com 4 fases permite:
- **Iteração incremental** — cada fase entrega valor agregado
- **Visibilidade clara** — stakeholders veem progresso contínuo
- **Flexibilidade** — pode pausar após MVP se prioridades mudarem

**Confirmação necessária:** Esta estrutura minimiza risco ao sistema existente, pois cada fase é testada antes de prosseguir. O MVP (Fase 1) não modifica nenhum código existente do story dev cycle — apenas adiciona novo módulo.

---

## 5. Epic 1: Squad Orchestration Engine

**Epic Goal:**

Construir um motor de orquestração genérico que execute workflows de squads automaticamente, começando com squad-copy (Persuasion Engine) como caso de uso piloto, e escalando para suportar múltiplos squads e centenas de execuções simultâneas.

**Integration Requirements:**

1. **Coexistência com AIOS existente:** Não quebrar story development cycle
2. **Integração com squad-copy v4.0.1:** Rodar creative-pipeline.yaml sem modificações
3. **Fundação para expansão futura:** Rotas inter-squad + camada Jarvis

**Success Criteria:**

- ✅ MVP rodando squad-copy de ponta a ponta com trigger manual via dashboard
- ✅ Dashboard mostra progresso em tempo real com controles de pause/resume
- ✅ Event Sourcing implementado (audit trail completo)
- ✅ Webhooks funcionais (n8n trigger → squad execution → callback)
- ✅ Escalando para 100+ runs simultâneos com Redis + Queue

---

### 5.1 Story 1.1: Squad Orchestrator Core — Carregamento e Validação de Playbooks

**As a** AIOS framework developer,
**I want** o motor carregar playbooks YAML (squad.yaml + pipeline.yaml) e validar estrutura,
**so that** posso garantir que apenas playbooks válidos sejam executados.

**Acceptance Criteria:**

1. `SquadOrchestrator` carrega `squad.yaml` de qualquer squad em `squads/{name}/`
2. Valida schema do squad.yaml (name, version, components, workflows)
3. Carrega `workflows/{pipeline}.yaml` referenciado em squad.yaml
4. Valida schema do pipeline.yaml (phases, steps, trigger, context)
5. Rejeita playbooks com errors de syntax YAML ou campos obrigatórios faltando
6. Carrega contexto inicial definido em `pipeline.context.load_on_start` (ex: offer.yaml, compliance/rules.md)
7. Cria `runId` único para execução (formato: `{squad}-{timestamp}`)
8. Inicializa estado em `.aios/squad-runs/{runId}/state.yaml`

**Integration Verification:**

- **IV1:** Execução com squad-copy/squad.yaml carrega creative-pipeline.yaml sem erros
- **IV2:** Validação rejeita pipeline.yaml com step faltando `on_success`
- **IV3:** Context loading carrega offer.yaml corretamente de `data/offers/{ID}/`

**Dependencies:** None (primeiro story da fase)

**Estimated Effort:** 2-3 dias

---

### 5.2 Story 1.2: Task Executor — Execução de Tasks Puras e Agent Tasks

**As a** Squad Orchestration Engine,
**I want** executar tasks puras e agent tasks conforme definidas no playbook,
**so that** posso processar steps de um pipeline.

**Acceptance Criteria:**

1. `TaskExecutor.executeTask()` carrega task file de `squads/{name}/tasks/{task}.md`
2. Para `task_pura`: executa função JavaScript mapeada ou script
3. Para `agent_task`: invoca `AgentInvoker` com agente especificado + task + input
4. Passa input definido no step (com interpolação de variáveis `{{context.field}}`)
5. Retorna output estruturado conforme task file
6. Salva output no context acumulado do run
7. Emite evento `step.completed` com duration e output

**Integration Verification:**

- **IV1:** Task pura `fetch-offer-data` carrega offer.yaml e retorna offer_context
- **IV2:** Agent task `interpret-offer-data` invoca @copy-chief e retorna analysis
- **IV3:** Output de step N está disponível para step N+1 via `{{stepN.output}}`

**Dependencies:** Story 1.1 (precisa de playbook carregado)

**Estimated Effort:** 3-4 dias

---

### 5.3 Story 1.3: Condition Engine — Validação de Pre/Post-Conditions

**As a** Squad Orchestration Engine,
**I want** validar pre-conditions ANTES e post-conditions DEPOIS de cada task,
**so that** posso garantir integridade de execução e bloquear steps inválidos.

**Acceptance Criteria:**

1. `ConditionEngine.validate()` recebe array de conditions + context
2. Para cada condition, resolve `source` no context (ex: `fetch-offer-data.output.offer_context`)
3. Valida `validation` (ex: "offer_context presente", "angles >= 3")
4. Retorna `{ all: boolean, blockersFailed: boolean, failures: [...] }`
5. Se `blocker=true` e condition falha, `TaskExecutor` lança `PreConditionError` e para execução
6. Post-conditions validadas após task execution — se falhar, rollback (opcional) ou marcar como falha
7. Registra conditions failed em event log

**Integration Verification:**

- **IV1:** Pre-condition "Offer data fetched" bloqueia `interpret-offer-data` se `fetch-offer-data` não rodou
- **IV2:** Post-condition "At least 3 angles suggested" bloqueia se `suggest-angles` retorna 0-2 angles
- **IV3:** Non-blocker conditions falham mas não param execução (apenas warning)

**Dependencies:** Story 1.2 (precisa de TaskExecutor funcionando)

**Estimated Effort:** 2-3 dias

---

### 5.4 Story 1.4: State Manager — Pause/Resume com File System

**As a** AIOS user,
**I want** pausar uma execução de squad e retomá-la depois,
**so that** posso interromper pipelines longos sem perder progresso.

**Acceptance Criteria:**

1. `StateManager.save()` salva estado completo em `.aios/squad-runs/{runId}/state.yaml`
2. Estado inclui: status, current_phase, current_step, context acumulado, phases completadas
3. `StateManager.pause()` muda status para `paused` e salva timestamp
4. `StateManager.resume()` carrega estado, muda status para `running`, continua de onde parou
5. Dashboard endpoint `POST /api/runs/{runId}/control` aceita `{action: "pause" | "resume" | "abort"}`
6. Pause durante task execution espera task atual completar antes de pausar (graceful)
7. Resume valida que state.yaml está íntegro antes de retomar

**Integration Verification:**

- **IV1:** Pausar durante `spy-scrape` espera scrape completar, salva estado, para antes de `spy-transcribe`
- **IV2:** Resume carrega state.yaml, continua em `spy-transcribe` com spy_manifest do context
- **IV3:** Abort limpa recursos (processos child) e marca run como `aborted`

**Dependencies:** Story 1.1, 1.2, 1.3 (precisa de orquestração funcionando)

**Estimated Effort:** 2-3 dias

---

### 5.5 Story 1.5: Dashboard Backend — API Routes para Runs

**As a** Dashboard frontend,
**I want** endpoints REST para criar, listar, controlar runs,
**so that** posso exibir informações e permitir controle de execuções.

**Acceptance Criteria:**

1. `POST /api/runs` cria nova execução: `{ squadId, trigger: { offer, platforms } }` → `{ runId }`
2. `GET /api/runs` lista todas execuções (paginado, últimos 50)
3. `GET /api/runs/{runId}/state` retorna estado atual (polling a cada 2s no frontend)
4. `POST /api/runs/{runId}/control` aceita `{ action: "pause" | "resume" | "abort" }`
5. `GET /api/runs/{runId}/logs` retorna logs de execução (últimas 100 linhas)
6. `GET /api/runs/{runId}/outputs` retorna artefatos gerados (creative_packages, etc.)
7. Endpoints retornam 404 se runId não existe, 400 se payload inválido

**Integration Verification:**

- **IV1:** `POST /api/runs` com squad-copy trigger inicia execução e retorna runId válido
- **IV2:** Polling `GET /api/runs/{runId}/state` mostra progresso em tempo real (phase muda)
- **IV3:** `POST control` com pause para execução gracefully

**Dependencies:** Story 1.1, 1.2, 1.3, 1.4 (backend completo funcionando)

**Estimated Effort:** 2-3 dias

---

### 5.6 Story 1.6: Dashboard Frontend — Pipeline Monitor UI

**As a** AIOS user,
**I want** visualizar progresso de execução de squad em tempo real,
**so that** posso monitorar e controlar pipelines ativamente.

**Acceptance Criteria:**

1. Página `/dashboard/runs` lista execuções com status (running, paused, completed, failed)
2. Página `/dashboard/runs/{runId}` mostra detalhes de execução:
   - `PipelineVisualizer`: diagrama de fases (Verde=completed, Amarelo=running, Cinza=pending, Vermelho=failed)
   - `StepDetails`: step atual com input/output
   - `ContextSnapshot`: dados acumulados (colapsável)
3. Controles de pause/resume/abort funcionais (com confirmação)
4. Polling a cada 2s para atualizar estado (usando `useQuery` com `refetchInterval`)
5. Exibe outputs finais quando run completa (link para downloads se aplicável)
6. Mostra erros com stack trace se run falha

**Integration Verification:**

- **IV1:** Dashboard atualiza em tempo real quando squad-copy muda de fase
- **IV2:** Botão pause para execução e muda status visual para "Paused"
- **IV3:** Outputs de batch de criativos exibidos ao final com link para pasta

**Dependencies:** Story 1.5 (API routes prontas)

**Estimated Effort:** 3-4 dias

---

### 5.7 Story 1.7: Event Sourcing — Audit Trail com events.jsonl

**As a** AIOS administrator,
**I want** histórico completo de eventos de execução,
**so that** posso auditar, debugar e reconstruir estado de qualquer run.

**Acceptance Criteria:**

1. `EventStore` implementado em `event-store.js`
2. Todos os eventos salvos em `.aios/squad-runs/{runId}/events.jsonl` (append-only)
3. Eventos incluem: `run.started`, `phase.started`, `step.completed`, `gate.evaluated`, `run.paused`, `run.completed`
4. Cada evento tem: `{ event, timestamp, data: {...} }`
5. `EventStore.replay(runId)` reconstrui estado lendo todos os eventos
6. Dashboard exibe timeline de eventos na página de detalhes do run
7. Replay funciona mesmo se state.yaml corrompido (recovery)

**Integration Verification:**

- **IV1:** Execução de squad-copy gera events.jsonl com 50+ eventos
- **IV2:** Replay reconstroi estado corretamente após pause/resume
- **IV3:** Dashboard timeline mostra eventos em ordem cronológica

**Dependencies:** Story 1.1-1.6 (MVP completo)

**Estimated Effort:** 2-3 dias

---

### 5.8 Story 1.8: E2E Testing — Squad-copy Completo

**As a** QA engineer,
**I want** test suite E2E que valida squad-copy de ponta a ponta,
**so that** posso garantir que MVP funciona antes de produção.

**Acceptance Criteria:**

1. Test suite com Cypress ou Playwright
2. Mock de APIs externas (DALL-E, Whisper) com nock ou MSW
3. Test flow completo:
   - Trigger run via `POST /api/runs`
   - Poll estado até completion
   - Validar outputs gerados (batch files)
4. Test de pause/resume no meio do pipeline
5. Test de abort e cleanup
6. Test de error handling (API externa falha → retry → fallback)
7. CI integrado (rodar testes antes de deploy)

**Integration Verification:**

- **IV1:** Test E2E com mock offer completa em <5min
- **IV2:** Test de pause/resume valida que state é preservado
- **IV3:** Test de error handling confirma retry logic funciona

**Dependencies:** Story 1.1-1.7 (MVP completo)

**Estimated Effort:** 3-4 dias

---

### 5.9 Story 1.9: n8n Integration Contracts — Webhook Input/Output

**As a** n8n workflow,
**I want** contratos claros de webhook para triggerar motor e receber callbacks,
**so that** posso orquestrar ofertas de ponta a ponta (Notion → Motor → Drive).

**Acceptance Criteria:**

1. `POST /api/webhooks/n8n` implementado conforme contract (seção 3.6.3)
2. Validação de API key no header `Authorization: Bearer {token}`
3. Rate limiting: max 100 requests/min por API key
4. Registro de callback URL no run state para notificação posterior
5. Callback implementado: `POST {callback_url}` ao final de execução
6. Callback inclui: runId, status, duration, outputs_path, error (se failed)
7. Retry de callback: 3x com exponential backoff se connection error
8. Logs de webhooks salvos em `.aios/webhooks/log.jsonl`

**Integration Verification:**

- **IV1:** n8n envia trigger → motor valida API key → cria run
- **IV2:** Motor completa → callback notifica n8n com runId e outputs_path
- **IV3:** Callback falha → motor retenta 3x, depois log warning

**Dependencies:** Story 1.1-1.8 (MVP completo)

**Estimated Effort:** 2-3 dias

**Implementation Notes:**

**Webhook endpoint:**
```javascript
// dashboard/src/app/api/webhooks/n8n/route.ts
export async function POST(req: Request) {
  // 1. Validate API key
  const apiKey = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!isValidN8nApiKey(apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse payload
  const { event, payload } = await req.json();

  // 3. Trigger squad run
  const runId = await startSquadRun('squad-copy', {
    trigger: {
      type: 'webhook',
      source: 'n8n',
      offer: payload.offerId,
      platforms: payload.platforms,
      callback_url: payload.callback_url,
      overrides: payload.overrides,
    }
  });

  return NextResponse.json({ success: true, runId });
}
```

---

### 5.10 Story 2.1: Gate Evaluator — Review Gates com Loops

**As a** Squad Orchestration Engine,
**I want** implementar gates de revisão com loops (max rounds),
**so that** posso executar cycles de review-fix até aprovação ou max rounds.

**Acceptance Criteria:**

1. `GateEvaluator.evaluateReviewGate()` processa verdicts:
   - `APPROVED` → continuar para `on_verdict.APPROVED`
   - `REVISION_NEEDED` → loop para `on_verdict.REVISION_NEEDED` se `rounds < max_rounds`
   - `REJECTED` → ir para `on_verdict.REJECTED` ou descartar
2. Incrementar `context.review_rounds` a cada loop
3. Se `rounds >= max_rounds`, escalar (criar evento `gate.escalated`)
4. Registrar todos os verdicts em event log
5. Dashboard mostra review loops em timeline

**Integration Verification:**

- **IV1:** `review-image-concept` com REVISION_NEEDED loopa para `image_revision_loop`, max 2x
- **IV2:** Após 2 rounds, escala e notifica usuário
- **IV3:** APPROVED pula loop e vai direto para `generate_image_prompts`

**Dependencies:** Story 1.1-1.8 (MVP completo — Fase 2 começa aqui)

**Estimated Effort:** 2-3 dias

---

### 5.10 Story 2.2: Idempotency Keys — Evitar Execução Duplicada

**As a** Squad Orchestration Engine,
**I want** cachear resultados de tasks com idempotency keys,
**so that** retries não executem tasks 2x (ex: gerar mesma imagem 2x na API).

**Acceptance Criteria:**

1. `TaskExecutor` gera hash de `(runId, step.id, input)` como idempotency key
2. Antes de executar task, checa cache: `resultCache.get(key)`
3. Se hit, retorna resultado cacheado (skip execution)
4. Se miss, executa task, salva resultado em cache com TTL 24h
5. Cache usa LRU (max 1000 entries) em memória (MVP) ou Redis (produção)
6. Log quando task é skipped por cache hit

**Integration Verification:**

- **IV1:** Retry de `generate-images-api` com mesmo input retorna cached result
- **IV2:** Cache persiste entre pause/resume (salvo em state ou Redis)
- **IV3:** TTL expira após 24h e força re-execução

**Dependencies:** Story 1.1-1.8 (MVP), Story 2.1 (gates)

**Estimated Effort:** 2 dias

---

### 5.11 Story 2.3: Circuit Breaker — Proteção de APIs Externas

**As a** Squad Orchestration Engine,
**I want** circuit breaker para APIs externas (DALL-E, Whisper),
**so that** não desperdice retries quando API está down.

**Acceptance Criteria:**

1. `APICircuitBreaker` class com estados: CLOSED | OPEN | HALF_OPEN
2. Threshold de falhas: 5 consecutivas → abrir circuito
3. Timeout: circuito aberto por 60s, depois tenta HALF_OPEN
4. Se HALF_OPEN e sucesso → reset para CLOSED
5. Se HALF_OPEN e falha → volta para OPEN
6. `CircuitBreakerOpenError` lançado quando circuito aberto (não tenta API)
7. Dashboard mostra status de circuit breakers (DALL-E, Whisper, etc.)

**Integration Verification:**

- **IV1:** 5 falhas consecutivas de DALL-E abrem circuito
- **IV2:** Circuito aberto por 60s, depois tenta HALF_OPEN
- **IV3:** Dashboard exibe "DALL-E circuit: OPEN" em vermelho

**Dependencies:** Story 1.1-1.8, Story 2.1, 2.2

**Estimated Effort:** 2 dias

---

### 5.12 Story 2.4: Error Handling — Retry Logic e Compensating Transactions

**As a** Squad Orchestration Engine,
**I want** retry automático para erros transientes e compensating transactions para rollback,
**so that** posso recuperar de falhas sem intervenção manual.

**Acceptance Criteria:**

1. Retry com exponential backoff para erros transientes:
   - Rate limit (429) → retry 3x: 2s, 4s, 8s
   - Timeout → retry 2x: 5s, 10s
2. Erros não-transientes (400, 401) → falha imediatamente
3. Compensating transactions definidas em playbook:
   - `on_failure.compensate: cleanup-downloaded-videos`
   - Executadas em ordem reversa se fase falha
4. Logs estruturados de retry attempts e compensações
5. Dashboard mostra retries na timeline

**Integration Verification:**

- **IV1:** Rate limit 429 de DALL-E retenta 3x com backoff
- **IV2:** Falha em `spy-scrape` executa `cleanup-downloaded-videos` para limpar
- **IV3:** Logs mostram retry attempts e final outcome

**Dependencies:** Story 1.1-1.8, Story 2.1, 2.2, 2.3

**Estimated Effort:** 3 dias

---

### 5.13 Story 2.5: External API Integrations — DALL-E, Whisper, Spy Scraping

**As a** Squad Orchestration Engine,
**I want** integrações diretas com APIs externas críticas,
**so that** tasks de squad-copy possam gerar imagens, transcrever vídeos e fazer spy scraping.

**Acceptance Criteria:**

1. **Image Generators Integration:**
   - `ImageGeneratorClient` com suporte para DALL-E, MidJourney, NanoBanana, Flux
   - Circuit breaker por provider (threshold: 5 falhas, timeout: 60s)
   - Retry com exponential backoff (3x: 2s, 4s, 8s) para rate limits
   - Content policy handling: sanitize prompt e retry 1x

2. **Whisper API Integration:**
   - `WhisperClient` para transcrição de áudio/vídeo
   - Suporte multi-idioma (FR, ES, EN, auto-detect)
   - Timeout de 60s por arquivo
   - Retry 2x com timeout maior se timeout

3. **Spy Scraping Integration:**
   - Meta Ad Library API client (download de ads)
   - TikTok Creative Center API client (download de vídeos)
   - Concurrency control: max 5 downloads simultâneos
   - Save raw media em `.aios/squad-runs/{runId}/spy-downloads/`

4. **Configuration:**
   - API keys em `.env` (OPENAI_API_KEY, MIDJOURNEY_API_KEY, etc.)
   - Provider selection configurável em playbook ou runtime override
   - Fallback entre providers (ex: DALL-E falha → try MidJourney)

5. **Error Handling:**
   - Logs estruturados em `.aios/squad-runs/{runId}/logs/api-errors.jsonl`
   - Circuit breaker status visível em dashboard
   - Graceful degradation: skip conceito se API falha após retries

**Integration Verification:**

- **IV1:** Task `generate-images-api` chama DALL-E e retorna imagens geradas
- **IV2:** Rate limit 429 retenta 3x com backoff, depois skip conceito
- **IV3:** Circuit breaker abre após 5 falhas, bloqueia novas chamadas por 60s
- **IV4:** Whisper API transcreve vídeo spy em FR, retorna texto com timestamps
- **IV5:** Meta Ad Library download 10 ads, salva em spy-downloads/

**Dependencies:** Story 1.1-1.9, Story 2.1, 2.2, 2.3, 2.4 (Fase 1+2 completas)

**Estimated Effort:** 4-5 dias

**Implementation Notes:**

**Image Generator Client:**
```javascript
// .aios-core/core/integrations/image-generators/client.js
class ImageGeneratorClient {
  constructor() {
    this.providers = {
      'dall-e': new DallEProvider(),
      'midjourney': new MidjourneyProvider(),
      'nanobanana': new NanoBananaProvider(),
      'flux': new FluxProvider(),
    };

    this.circuitBreakers = {};
    Object.keys(this.providers).forEach(name => {
      this.circuitBreakers[name] = new CircuitBreaker(name, {
        threshold: 5,
        timeout: 60000,
      });
    });
  }

  async generate(provider, prompt, options = {}) {
    const client = this.providers[provider];
    if (!client) throw new Error(`Unknown provider: ${provider}`);

    return await this.circuitBreakers[provider].call(async () => {
      return await retryWithBackoff(
        () => client.generate(prompt, options),
        { maxRetries: 3, baseDelay: 2000 }
      );
    });
  }
}
```

**Whisper Client:**
```javascript
// .aios-core/core/integrations/whisper/client.js
class WhisperClient {
  async transcribe(audioFilePath, options = {}) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');
    if (options.language) formData.append('language', options.language);

    return await retryWithBackoff(async () => {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
        timeout: 60000, // 60s timeout
      });

      if (!response.ok) throw new Error(`Whisper API error: ${response.statusText}`);
      return await response.json();
    }, { maxRetries: 2, baseDelay: 5000 });
  }
}
```

---

### 5.14 Story 3.1: Webhook API — Trigger Externo via n8n

**As a** n8n workflow,
**I want** endpoint webhook para triggerar squad-copy automaticamente,
**so that** posso iniciar pipeline quando oferta é criada.

**Acceptance Criteria:**

1. `POST /api/webhooks/n8n` aceita payload: `{ event, payload: { offerId } }`
2. Valida API key no header `Authorization: Bearer {key}`
3. Se `event=offer.created`, trigger squad-copy com `{ offer: offerId }`
4. Retorna `{ success: true, runId }` imediatamente (async)
5. Registra callback webhook URL (se fornecido) para notificar quando run completa
6. Rate limiting: max 100 requests/min por API key
7. Logs de webhooks em `.aios/webhooks/log.jsonl`

**Integration Verification:**

- **IV1:** n8n envia webhook → squad-copy inicia automaticamente
- **IV2:** Callback webhook notificado quando run completa
- **IV3:** Rate limiting bloqueia após 100 requests/min

**Dependencies:** Story 1.1-2.4 (Fase 1+2 completas — Fase 3 começa aqui)

**Estimated Effort:** 2 dias

---

### 5.14 Story 3.2: Inter-Squad Communication — Squad-to-Squad Calls

**As a** squad-trafego,
**I want** chamar squad-copy programaticamente e aguardar outputs,
**so that** posso consumir criativos gerados automaticamente.

**Acceptance Criteria:**

1. `SquadOrchestrator.executeSquad()` aceita `trigger.type = "inter_squad"`
2. `trigger.caller` identifica squad chamador (ex: "squad-trafego")
3. `waitForCompletion()` method aguarda run completar (com timeout)
4. `getOutputs()` retorna outputs estruturados do run
5. Logs mostram caller e relationship entre runs
6. Dashboard exibe inter-squad calls em timeline

**Integration Verification:**

- **IV1:** squad-trafego chama squad-copy, aguarda completion, recebe creative_packages
- **IV2:** Timeout após 30min se squad-copy não completa
- **IV3:** Dashboard mostra "Caller: squad-trafego" no run de squad-copy

**Dependencies:** Story 1.1-2.4, Story 3.1

**Estimated Effort:** 2-3 dias

---

### 5.15 Story 3.3: Override System — Runtime Parameter Overrides

**As a** AIOS user,
**I want** passar overrides ao triggerar run,
**so that** posso modificar comportamento padrão (ex: "só variações, só geo FR").

**Acceptance Criteria:**

1. Trigger aceita campo `overrides: { method, geos, platforms, skip_phases }`
2. Overrides são passados para tasks via context
3. Tasks checam `context.overrides.{field}` antes de usar defaults
4. Exemplo: `select-method` checa `overrides.method` — se presente, retorna direto sem agente decidir
5. Dashboard mostra overrides aplicados na página de detalhes do run
6. Validação: overrides devem ser valores válidos (ex: method deve ser modelagem|variacao|do-zero)

**Integration Verification:**

- **IV1:** Trigger com `{ overrides: { method: "variacao_de_winner" } }` força método sem agente decidir
- **IV2:** Override `{ geos: ["fr"] }` filtra apenas geo FR no pipeline
- **IV3:** Override `{ skip_phases: ["intelligence"] }` pula spy e usa cache

**Dependencies:** Story 1.1-2.4, Story 3.1, 3.2

**Estimated Effort:** 2 dias

---

### 5.16 Story 4.1: Queue-Based Execution — BullMQ Integration

**As a** AIOS framework,
**I want** queue-based execution para múltiplos runs simultâneos,
**so that** posso escalar para 100+ runs sem bloquear.

**Acceptance Criteria:**

1. Integração com BullMQ (Redis-backed queue)
2. `POST /api/runs` enfileira job em vez de executar direto
3. Workers (max 10 concurrent) processam jobs da fila
4. Dashboard mostra queue size e worker status
5. Priority support: runs urgentes podem ter priority alta
6. Failed jobs vão para Dead Letter Queue (DLQ) após 3 retries
7. Logs de queue operations em `.aios/queue/log.jsonl`

**Integration Verification:**

- **IV1:** 20 runs simultâneos enfileirados, processados em paralelo por workers
- **IV2:** Dashboard mostra "Queue: 15 pending, 5 running"
- **IV3:** Failed job vai para DLQ após 3 retries

**Dependencies:** Story 1.1-3.3 (Fases 1-3 completas — Fase 4 começa aqui)

**Estimated Effort:** 3-4 dias

---

### 5.17 Story 4.2: Redis State Cache — Fast Pause/Resume

**As a** Squad Orchestration Engine,
**I want** estado ativo em Redis para pause/resume rápido,
**so that** posso suportar 100+ runs sem latência de File System.

**Acceptance Criteria:**

1. `StateManager` usa Redis para estado ativo (key: `run:{runId}`)
2. File System mantido para backup e histórico
3. `save()` escreve em Redis + File System (dual write)
4. `load()` lê de Redis primeiro, fallback para File System se miss
5. TTL de 24h em Redis (após completion, estado vai só para File System)
6. Redis cluster (Upstash ou Railway) para alta disponibilidade
7. Metrics: `redis_hits`, `redis_misses`, `redis_latency`

**Integration Verification:**

- **IV1:** Pause/resume com Redis completa em <100ms (vs ~1s com File System)
- **IV2:** Redis unavailable → fallback para File System sem erro
- **IV3:** 100 runs simultâneos com Redis mantém latência <200ms

**Dependencies:** Story 1.1-3.3, Story 4.1

**Estimated Effort:** 2-3 dias

---

### 5.18 Story 4.3: MongoDB Historical Storage — Queryable Run History

**As a** AIOS administrator,
**I want** histórico de runs em MongoDB para queries ricas,
**so that** posso analisar performance e gerar relatórios.

**Acceptance Criteria:**

1. Runs completados salvos em MongoDB collection `squad_runs`
2. Schema: `{ runId, squadId, trigger, status, started_at, completed_at, duration_ms, outputs, events_summary }`
3. Indexes: `squadId`, `status`, `started_at`
4. Dashboard `/dashboard/analytics` com queries agregadas:
   - Avg duration por squad
   - Success rate (24h, 7d, 30d)
   - Top failing tasks
5. API endpoint `GET /api/analytics` retorna métricas
6. Data retention: 90 dias (depois archive ou delete)

**Integration Verification:**

- **IV1:** Run completado salvo em MongoDB com todos os campos
- **IV2:** Dashboard analytics mostra avg duration de squad-copy: 25min
- **IV3:** Query de top failing tasks retorna lista ordenada

**Dependencies:** Story 1.1-3.3, Story 4.1, 4.2

**Estimated Effort:** 2-3 dias

---

### 5.19 Story 4.4: Paralelização de Steps — Parallel Groups

**As a** Squad orchestrator,
**I want** executar steps independentes em paralelo,
**so that** posso reduzir tempo total de pipeline.

**Acceptance Criteria:**

1. Playbook suporta `type: parallel_group` com array de tasks
2. `ParallelExecutor` executa tasks em `Promise.all()`
3. `wait_for_all: true` aguarda todas completarem antes de prosseguir
4. Se uma task falha, cancela outras (ou continua se `fail_fast: false`)
5. Logs mostram parallel execution com timestamps
6. Dashboard visualiza steps paralelos como grupo

**Integration Verification:**

- **IV1:** Gerar ad-copy para FR, ES, EN em paralelo reduz tempo de 9min → 3min
- **IV2:** Falha em FR cancela ES e EN se `fail_fast: true`
- **IV3:** Dashboard mostra "Parallel group (3 tasks)" em execução

**Dependencies:** Story 1.1-3.3, Story 4.1, 4.2, 4.3

**Estimated Effort:** 2-3 dias

---

## 6. Roadmap Summary

| Fase | Stories | Duration | Deliverable |
|------|---------|----------|-------------|
| **Fase 1: MVP** | 1.1 - 1.9 | 3-4 semanas | Core engine, dashboard, event sourcing, n8n contracts |
| **Fase 2: Robustez** | 2.1 - 2.5 | 2-3 semanas | Gates, idempotency, circuit breakers, retry, API integrations |
| **Fase 3: Automação** | 3.1 - 3.3 | 1 semana | Webhooks, inter-squad, overrides |
| **Fase 4: Scale** | 4.1 - 4.4 | 2 semanas | Queue, Redis, MongoDB, paralelização |

**Total Stories:** 21 (9 MVP + 5 Robustez + 3 Automação + 4 Scale)

**Total Estimated Duration:** 8-10 semanas

**Phased Rollout:**
- ✅ **Fase 1:** MVP em produção (Railway monolito)
- ✅ **Fase 2:** Robustez validada com squad-copy real
- ✅ **Fase 3:** Automação com n8n integration
- ✅ **Fase 4:** Scale para 100+ runs simultâneos

---

## 7. Success Metrics

**Technical Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Pipeline Success Rate** | ≥95% | Runs completed / total runs |
| **Avg Pipeline Duration** | <30min | squad-copy end-to-end |
| **Dashboard Latency** | <2s | State update → UI refresh |
| **Concurrent Runs** | 100+ | Phase 4 (queue-based) |
| **Event Store Replay** | 100% | Successful state reconstruction |

**Business Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Manual Intervention** | 0% | squad-copy runs without human input |
| **Time to Market** | -50% | From offer created → ads live |
| **Developer Productivity** | +200% | Stories per sprint (reusable engine) |

---

## 8. Next Steps

1. **@po (Pax):** Review and validate PRD
2. **@architect (Aria):** Review technical constraints and architecture integration
3. **@pm (Morgan):** Create epic in project management system
4. **@sm (River):** Break epic into detailed stories with sub-tasks
5. **@dev (Dex):** Estimate effort and begin Fase 1 (MVP)

**Ready for handoff to @po for validation.**

— Morgan, planejando o futuro 📊
