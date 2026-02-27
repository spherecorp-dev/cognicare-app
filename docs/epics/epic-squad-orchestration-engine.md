# Epic: Squad Orchestration Engine — Brownfield Enhancement

**Project:** B2G Capital AIOS Framework
**Enhancement Type:** New Infrastructure Component
**Status:** Draft
**Version:** 1.0
**Created:** 2026-02-20
**Source PRD:** docs/prd/squad-orchestration-engine.md

---

## Epic Goal

Construir um motor de orquestração genérico que execute workflows de squads automaticamente, começando com squad-copy (Persuasion Engine) como caso de uso piloto, e escalando para suportar múltiplos squads e centenas de execuções simultâneas.

---

## Epic Description

### Existing System Context

**Current Relevant Functionality:**

B2G Capital AIOS é um framework de orquestração de agentes AI para desenvolvimento full-stack. Atualmente possui:
- Agentes especializados (@dev, @qa, @architect, @pm, @sm, etc.)
- Story Development Cycle (workflow para desenvolvimento de código)
- Dashboard Next.js para monitoramento
- Primitivas de orquestração (workflow-executor.js, master-orchestrator.js, session-state.js)

**Technology Stack:**
- Backend: Node.js 18+, JavaScript/TypeScript
- Frontend: Next.js 14+ (App Router)
- Database (MVP): File System (.aios/squad-runs/)
- Database (Produção): Redis + MongoDB + S3/Backblaze
- Infrastructure: Railway.app (MVP) → Vercel + Railway (Produção)
- External Dependencies: Claude Sonnet 4.5, DALL-E, Whisper API, Image Generation APIs

**Integration Points:**
- Coexistência com Story Development Cycle existente
- Reutilização de primitivas: SessionState, GateEvaluator, AgentInvoker, TerminalSpawner
- Integração com dashboard existente (novas rotas API)
- Integração com squad-copy v4.0.1 (primeiro caso de uso)

### Enhancement Details

**What's Being Added:**

Um **Motor de Orquestração de Squads** genérico que:

1. **Lê e Executa Playbooks YAML** — Carrega squad.yaml + pipeline.yaml e executa workflows automaticamente
2. **Validação de Pre/Post-Conditions** — Bloqueia execução se pré-condições não atendidas
3. **Suporte a 3 Tipos de Steps:**
   - `task_pura` — Execução mecânica sem julgamento
   - `agent_task` — Invoca agente LLM com prompt específico
   - `router` — Branching condicional
4. **Gates de Revisão** — APPROVED / REVISION_NEEDED / REJECTED com loops (max rounds)
5. **Pause/Resume** — Salva estado completo, retoma sem perda de dados
6. **Runtime Overrides** — Modificação de comportamento padrão (ex: forçar método, filtrar geos)
7. **Gatilhos Múltiplos** — Manual (dashboard), Webhook (n8n), Inter-squad
8. **Monitoramento em Tempo Real** — Dashboard com progresso ao vivo
9. **Event Sourcing** — Audit trail completo com replay capability
10. **Integrações Diretas** — DALL-E, Whisper, Meta Ad Library, TikTok Creative Center

**How It Integrates:**

```
Novo módulo: .aios-core/core/orchestration/squad-engine/
├── squad-orchestrator.js     (motor principal)
├── task-executor.js           (execução de tasks)
├── condition-engine.js        (pre/post-conditions)
├── gate-evaluator.js          (gates de revisão - expandir existente)
├── state-manager.js           (pause/resume)
├── event-store.js             (event sourcing)
├── router.js                  (branching lógico)
└── parallel-executor.js       (paralelização)

Dashboard: dashboard/src/app/
├── runs/                      (novas páginas)
├── api/runs/                  (novas rotas API)
├── api/webhooks/n8n/          (trigger externo)
└── components/pipeline/       (componentes de visualização)

Data: .aios/squad-runs/{runId}/
├── state.yaml                 (estado de execução)
├── events.jsonl               (event sourcing)
├── trigger.yaml               (trigger original)
├── logs/                      (logs de execução)
└── outputs/                   (artefatos gerados)
```

**Success Criteria:**

- ✅ MVP rodando squad-copy de ponta a ponta com trigger manual via dashboard
- ✅ Dashboard mostra progresso em tempo real com controles de pause/resume
- ✅ Event Sourcing implementado (audit trail completo)
- ✅ Webhooks funcionais (n8n trigger → squad execution → callback)
- ✅ Escalando para 100+ runs simultâneos com Redis + Queue

---

## Progress Tracking

**Overall Progress:** 4/21 stories completed (19%)

### Phase 1: MVP — Core Engine
**Progress:** 5/9 stories (56% complete)
- ✅ Story 1.1: Squad Orchestrator Core (Done)
- ✅ Story 1.2: Task Executor (Done)
- ✅ Story 1.3: Condition Engine (Done)
- ✅ Story 1.4: State Manager (Done)
- 🚀 Story 1.5: Dashboard Backend (Approved for Staging - 3 tech debt items)
- ⏳ Story 1.6: Dashboard Frontend (Next)
- 🔲 Story 1.7: Event Sourcing
- 🔲 Story 1.8: E2E Testing
- 🔲 Story 1.9: n8n Integration Contracts

### Phase 2: Robustez (0/5) | Phase 3: Automação (0/3) | Phase 4: Scale (0/4)

---

## Stories

Esta epic contém **21 stories** organizadas em **4 fases sequenciais**:

### Fase 1: MVP — Core Engine (Stories 1.1 - 1.9)

**Duration:** 3-4 semanas
**Deliverable:** Core engine, dashboard, event sourcing, n8n contracts

#### Story 1.1: Squad Orchestrator Core — Carregamento e Validação de Playbooks

**Description:** Carrega playbooks YAML (squad.yaml + pipeline.yaml) e valida estrutura antes de execução.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[code_review, pattern_validation, yaml_schema_validation]`

**Quality Gates:**
- Pre-Commit: YAML schema validation, playbook integrity check
- Pre-PR: Integration test with squad-copy playbook

**Focus:** Validação robusta de playbooks, context loading, runId generation

**Estimated Effort:** 2-3 dias

---

#### Story 1.2: Task Executor — Execução de Tasks Puras e Agent Tasks

**Description:** Executa tasks puras (JavaScript) e agent tasks (invocação de LLM) conforme playbook.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[code_review, agent_integration_test, output_validation]`

**Quality Gates:**
- Pre-Commit: Task execution tests, agent invocation mocking
- Pre-PR: E2E test with real task files

**Focus:** Interpolação de variáveis `{{context.field}}`, output acumulado, event emission

**Estimated Effort:** 3-4 dias

---

#### Story 1.3: Condition Engine — Validação de Pre/Post-Conditions ✅ DONE

**Description:** Valida pre-conditions ANTES e post-conditions DEPOIS de cada task, bloqueando execução se blocker=true.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[validation_logic_review, error_handling_check]`

**Quality Gates:**
- Pre-Commit: Condition validation tests, blocker logic ✅
- Pre-PR: Integration with TaskExecutor ✅

**Focus:** Blocker enforcement, context resolution, error messages

**Estimated Effort:** 2-3 dias

**Completion Status:**
- **Completed:** 2026-02-20
- **QA Gate:** CONCERNS (approved with 2 follow-ups)
- **Files Created:** condition-engine.js, 26 unit tests, 5 integration tests
- **Files Modified:** task-executor.js (added pre/post-condition validation)
- **Follow-ups:** [F-1771637897623] String coercion (Medium), [F-1771637897624] Input validation (Low)

---

#### Story 1.4: State Manager — Pause/Resume com File System

**Description:** Implementa pause/resume de execuções com salvamento de estado completo em File System.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[state_integrity_check, recovery_testing]`

**Quality Gates:**
- Pre-Commit: State save/load tests, graceful pause validation
- Pre-PR: Resume integration test

**Focus:** Graceful pause (espera task completar), state.yaml integrity, resume validation

**Estimated Effort:** 2-3 dias

---

#### Story 1.5: Dashboard Backend — API Routes para Runs

**Description:** Endpoints REST para criar, listar, controlar runs (POST /api/runs, GET /api/runs/{runId}/state, etc.).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[api_contract_review, error_response_validation]`

**Quality Gates:**
- Pre-Commit: API endpoint tests, payload validation
- Pre-PR: API contract documentation, error handling

**Focus:** Next.js API routes, error handling (404, 400), polling optimization

**Estimated Effort:** 2-3 dias

---

#### Story 1.6: Dashboard Frontend — Pipeline Monitor UI

**Description:** Visualização de progresso de execução em tempo real com controles de pause/resume/abort.

**Executor Assignment:**
- **executor:** `@ux-design-expert`
- **quality_gate:** `@dev`
- **quality_gate_tools:** `[component_validation, accessibility_check, design_review]`

**Quality Gates:**
- Pre-Commit: Component tests, polling logic, UI responsiveness
- Pre-PR: E2E test with live run, accessibility validation

**Focus:** PipelineVisualizer (diagrama de fases), StepDetails, polling a cada 2s, outputs display

**Estimated Effort:** 3-4 dias

---

#### Story 1.7: Event Sourcing — Audit Trail com events.jsonl

**Description:** Histórico completo de eventos de execução em append-only log para audit trail e replay.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[event_schema_validation, replay_testing]`

**Quality Gates:**
- Pre-Commit: Event store tests, replay logic validation
- Pre-PR: Full replay test with corrupted state.yaml

**Focus:** EventStore append-only, replay capability, dashboard timeline integration

**Estimated Effort:** 2-3 dias

---

#### Story 1.8: E2E Testing — Squad-copy Completo

**Description:** Test suite E2E que valida squad-copy de ponta a ponta com mocks de APIs externas.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[test_coverage_review, e2e_validation]`

**Quality Gates:**
- Pre-Commit: Test suite execution, coverage > 80%
- Pre-PR: CI integration, all tests passing

**Focus:** Cypress/Playwright, API mocking (nock), pause/resume testing, error handling

**Estimated Effort:** 3-4 dias

---

#### Story 1.9: n8n Integration Contracts — Webhook Input/Output

**Description:** Contratos claros de webhook para triggerar motor e receber callbacks (POST /api/webhooks/n8n).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[webhook_contract_review, auth_validation]`

**Quality Gates:**
- Pre-Commit: Webhook validation tests, API key auth, rate limiting
- Pre-PR: Callback retry logic, integration test with mock n8n

**Focus:** API key validation, callback registration, retry com exponential backoff

**Estimated Effort:** 2-3 dias

---

### Fase 2: Robustez — Production-Grade Reliability (Stories 2.1 - 2.5)

**Duration:** 2-3 semanas
**Deliverable:** Gates, idempotency, circuit breakers, retry, API integrations

#### Story 2.1: Gate Evaluator — Review Gates com Loops

**Description:** Implementa gates de revisão com verdicts (APPROVED/REVISION_NEEDED/REJECTED) e loops (max rounds).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[gate_logic_review, loop_validation]`

**Quality Gates:**
- Pre-Commit: Gate evaluation tests, max rounds enforcement
- Pre-PR: Integration with pipeline, escalation logic

**Focus:** Review loops, context.review_rounds, escalation, dashboard timeline

**Estimated Effort:** 2-3 dias

---

#### Story 2.2: Idempotency Keys — Evitar Execução Duplicada

**Description:** Cachear resultados de tasks com idempotency keys (hash de runId+step+input) para evitar execução duplicada em retries.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[cache_strategy_review, idempotency_testing]`

**Quality Gates:**
- Pre-Commit: Idempotency key generation tests, cache hit/miss logic
- Pre-PR: Integration with TaskExecutor, TTL validation

**Focus:** LRU cache (max 1000 entries), TTL 24h, cache persistence (Redis in Fase 4)

**Estimated Effort:** 2 dias

---

#### Story 2.3: Circuit Breaker — Proteção de APIs Externas

**Description:** Circuit breaker para APIs externas (DALL-E, Whisper) com estados CLOSED/OPEN/HALF_OPEN.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[circuit_breaker_review, failure_handling_validation]`

**Quality Gates:**
- Pre-Commit: Circuit breaker state machine tests, threshold validation
- Pre-PR: Integration with API clients, dashboard status display

**Focus:** 5 falhas consecutivas → OPEN, timeout 60s, HALF_OPEN retry

**Estimated Effort:** 2 dias

---

#### Story 2.4: Error Handling — Retry Logic e Compensating Transactions

**Description:** Retry automático para erros transientes (rate limits, timeouts) e compensating transactions para rollback.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[error_handling_review, retry_strategy_validation]`

**Quality Gates:**
- Pre-Commit: Retry logic tests, exponential backoff validation, compensating transaction tests
- Pre-PR: Integration with TaskExecutor, structured logging

**Focus:** Exponential backoff (2s, 4s, 8s), compensating transactions em ordem reversa, logs estruturados

**Estimated Effort:** 3 dias

---

#### Story 2.5: External API Integrations — DALL-E, Whisper, Spy Scraping

**Description:** Integrações diretas com APIs externas críticas (Image Generators, Whisper, Spy Scraping).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[api_integration_review, error_handling_validation, security_scan]`

**Quality Gates:**
- Pre-Commit: API client tests (mocked), retry logic, circuit breaker integration
- Pre-PR: Integration tests with real APIs (limited), fallback validation
- Pre-Deployment: Full security scan, API key rotation check

**Focus:** ImageGeneratorClient (DALL-E, MidJourney, NanoBanana, Flux), WhisperClient, Spy Scraping (Meta Ad Library, TikTok Creative Center)

**Estimated Effort:** 4-5 dias

---

### Fase 3: Automação — Webhooks & Inter-Squad (Stories 3.1 - 3.3)

**Duration:** 1 semana
**Deliverable:** Webhooks, inter-squad communication, runtime overrides

#### Story 3.1: Webhook API — Trigger Externo via n8n

**Description:** Endpoint webhook para triggerar squad-copy automaticamente quando n8n detecta evento (oferta criada).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[webhook_security_review, rate_limiting_validation]`

**Quality Gates:**
- Pre-Commit: Webhook validation tests, API key auth, rate limiting (100 req/min)
- Pre-PR: Integration test with mock n8n, callback registration

**Focus:** POST /api/webhooks/n8n, payload validation, async execution, callback registration

**Estimated Effort:** 2 dias

---

#### Story 3.2: Inter-Squad Communication — Squad-to-Squad Calls

**Description:** Permite que squad-trafego chame squad-copy programaticamente e aguarde outputs.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[inter_squad_protocol_review, timeout_handling_validation]`

**Quality Gates:**
- Pre-Commit: Inter-squad call tests, waitForCompletion timeout validation
- Pre-PR: Integration test with two squads, dashboard relationship display

**Focus:** trigger.type = "inter_squad", trigger.caller, waitForCompletion(), getOutputs()

**Estimated Effort:** 2-3 dias

---

#### Story 3.3: Override System — Runtime Parameter Overrides

**Description:** Aceita overrides ao triggerar run para modificar comportamento padrão (ex: forçar método, filtrar geos).

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[override_validation_review, backward_compatibility_check]`

**Quality Gates:**
- Pre-Commit: Override validation tests, context.overrides propagation
- Pre-PR: Integration test with squad-copy overrides, dashboard display

**Focus:** trigger.overrides: { method, geos, platforms, skip_phases }, validação de valores válidos

**Estimated Effort:** 2 dias

---

### Fase 4: Scale — Queue, Redis, MongoDB (Stories 4.1 - 4.4)

**Duration:** 2 semanas
**Deliverable:** Queue-based execution, Redis cache, MongoDB history, paralelização

#### Story 4.1: Queue-Based Execution — BullMQ Integration

**Description:** Queue-based execution para múltiplos runs simultâneos com workers (max 10 concurrent).

**Executor Assignment:**
- **executor:** `@devops`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[infrastructure_review, queue_strategy_validation, scalability_testing]`

**Quality Gates:**
- Pre-Commit: Queue integration tests, worker processing validation, DLQ logic
- Pre-PR: Load test with 20 concurrent runs
- Pre-Deployment: Redis cluster health check, failover testing

**Focus:** BullMQ + Redis, priority support, Dead Letter Queue, dashboard queue status

**Estimated Effort:** 3-4 dias

---

#### Story 4.2: Redis State Cache — Fast Pause/Resume

**Description:** Estado ativo em Redis para pause/resume rápido (<100ms) com fallback para File System.

**Executor Assignment:**
- **executor:** `@devops`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[cache_strategy_review, failover_testing]`

**Quality Gates:**
- Pre-Commit: Redis integration tests, dual write validation, fallback logic
- Pre-PR: Performance test (pause/resume latency), Redis unavailable scenario
- Pre-Deployment: Redis cluster configuration, TTL validation

**Focus:** Dual write (Redis + File System), fallback graceful degradation, TTL 24h, metrics

**Estimated Effort:** 2-3 dias

---

#### Story 4.3: MongoDB Historical Storage — Queryable Run History

**Description:** Histórico de runs em MongoDB para queries ricas e analytics dashboard.

**Executor Assignment:**
- **executor:** `@data-engineer`
- **quality_gate:** `@dev`
- **quality_gate_tools:** `[schema_validation, query_optimization, index_review]`

**Quality Gates:**
- Pre-Commit: MongoDB schema tests, index validation, query performance
- Pre-PR: Analytics dashboard integration, data retention policy

**Focus:** Collection squad_runs, indexes (squadId, status, started_at), dashboard /analytics, retention 90d

**Estimated Effort:** 2-3 dias

---

#### Story 4.4: Paralelização de Steps — Parallel Groups

**Description:** Executa steps independentes em paralelo (Promise.all) para reduzir tempo total de pipeline.

**Executor Assignment:**
- **executor:** `@dev`
- **quality_gate:** `@architect`
- **quality_gate_tools:** `[parallelization_review, race_condition_testing]`

**Quality Gates:**
- Pre-Commit: Parallel execution tests, fail_fast validation, cancellation logic
- Pre-PR: Integration with pipeline, dashboard parallel group visualization

**Focus:** type: parallel_group, wait_for_all, fail_fast, dashboard visualization

**Estimated Effort:** 2-3 dias

---

## Compatibility Requirements

### CR1: Coexistência com Story Development Cycle

- ✅ Motor de orquestração de squads DEVE coexistir com story development cycle existente
- ✅ Não modificar workflows existentes (brownfield-discovery.yaml, story-development-cycle.yaml)
- ✅ Compartilhar primitivas onde possível (SessionState, GateEvaluator, AgentInvoker)

**Verification:** E2E test rodando squad-copy enquanto story dev cycle roda em paralelo, sem conflitos.

### CR2: Integração com Dashboard Existente

- ✅ Novas rotas API DEVEM seguir padrão Next.js existente (`/app/api/runs/`)
- ✅ Componentes React DEVEM usar design system do dashboard (Tailwind, shadcn/ui se aplicável)
- ✅ Autenticação DEVE usar mecanismo existente (ou API keys para MVP)

**Verification:** Dashboard integration tests, design system consistency check.

### CR3: Compatibilidade com Squad-copy v4.0.1

- ✅ Motor DEVE executar squad-copy/workflows/creative-pipeline.yaml sem modificações
- ✅ Pre/post-conditions já implementadas em 8 tasks críticas DEVEM ser validadas corretamente
- ✅ Outputs DEVEM seguir estrutura flat definida (batches/{timestamp}-batch/)

**Verification:** Full squad-copy pipeline execution test with real offer (mocked APIs).

### CR4: Preparação para Expansão Futura

- ✅ Arquitetura DEVE permitir adição de rotas inter-squad (squad-trafego → squad-copy)
- ✅ Arquitetura DEVE permitir camada Jarvis futura (meta-orquestrador)
- ✅ Não hard-code lógica específica de squad-copy — tudo via playbook YAML

**Verification:** Architecture review, playbook extensibility validation.

---

## Risk Mitigation

### Primary Risk: APIs externas instáveis (DALL-E, Whisper)

**Mitigation:**
- Circuit Breaker (Story 2.3) — após 3-5 falhas consecutivas, abrir circuito por 60s
- Retry com exponential backoff (Story 2.4) — 3x: 2s, 4s, 8s para rate limits
- Fallback — skip conceito se API falha após retries, continuar pipeline

**Rollback Plan:** Desativar geração de imagens via API, usar apenas mock images para testing

### Secondary Risk: State corruption (pause/resume)

**Mitigation:**
- Event Sourcing (Story 1.7) — replay de events.jsonl reconstroi estado
- Dual write Redis + File System (Story 4.2) — fallback se Redis corrompe
- Validação rigorosa de state.yaml antes de resume

**Rollback Plan:** Deletar state.yaml corrompido, replay de events.jsonl

### Tertiary Risk: Performance degradation (muitos runs simultâneos)

**Mitigation:**
- Queue-based execution (Story 4.1) — max 10 workers concurrent
- Resource quotas — limit de runs simultâneos por usuário
- Redis cache (Story 4.2) — latência <100ms para pause/resume

**Rollback Plan:** Reduzir max workers de 10 → 5, habilitar queue priority

---

## Quality Assurance Strategy

### Proactive Quality Validation

**CodeRabbit Validation:**
- **Story 1.x (MVP):** Pre-commit reviews com foco em code patterns, error handling, test coverage
- **Story 2.x (Robustez):** Validação de retry logic, circuit breaker state machine, API integration security
- **Story 3.x (Automação):** Webhook security validation, inter-squad protocol review
- **Story 4.x (Scale):** Infrastructure review, scalability testing, query optimization

**Specialized Expertise:**
- **@architect:** Valida arquitetura de orquestração, patterns de resilience, extensibilidade
- **@dev:** Valida código de integração, error handling, testes unitários
- **@devops:** Valida infraestrutura (Redis, BullMQ, MongoDB), deployment strategy
- **@data-engineer:** Valida MongoDB schema, indexes, queries (Story 4.3)
- **@ux-design-expert:** Valida dashboard UI/UX, acessibilidade (Story 1.6)

**Quality Gates Aligned with Risk:**
- **LOW RISK (Stories 1.1-1.4, 2.1-2.2):** Pre-Commit validation only
- **MEDIUM RISK (Stories 1.5-1.9, 2.3-2.4, 3.1-3.3):** Pre-Commit + Pre-PR validation
- **HIGH RISK (Stories 2.5, 4.1-4.4):** Pre-Commit + Pre-PR + Pre-Deployment validation

### Regression Prevention

- **Integration Tests:** Cada story inclui integration tests que validam compatibility com stories anteriores
- **E2E Test Suite (Story 1.8):** Roda full squad-copy pipeline após cada story para detectar regressões
- **Performance Testing:** Load tests rodados em Fase 4 para validar que performance não degrada com scale
- **Monitoring Alerts:** Dashboard mostra métricas de performance (avg duration, success rate) — alertas via Slack se degradação

---

## Definition of Done

- ✅ **Fase 1 (MVP):** Core engine rodando squad-copy de ponta a ponta, dashboard funcional, event sourcing implementado
- ✅ **Fase 2 (Robustez):** Gates de revisão, idempotency, circuit breakers, retry logic, APIs externas integradas
- ✅ **Fase 3 (Automação):** Webhooks n8n funcionais, inter-squad communication, runtime overrides
- ✅ **Fase 4 (Scale):** Queue-based execution, Redis cache, MongoDB histórico, paralelização de steps
- ✅ **All Stories:** Acceptance criteria met, tests passing (unit + integration + E2E), CodeRabbit validation passed
- ✅ **Existing Functionality:** Story development cycle continua funcionando sem regressões
- ✅ **Integration Points:** Dashboard integrado, squad-copy executando sem modificações
- ✅ **Documentation:** README em cada novo módulo, API contracts documentados, playbook examples

---

## Roadmap Summary

| Fase | Stories | Duration | Key Deliverables |
|------|---------|----------|------------------|
| **Fase 1: MVP** | 1.1 - 1.9 (9 stories) | 3-4 semanas | Core engine, dashboard, event sourcing, n8n contracts |
| **Fase 2: Robustez** | 2.1 - 2.5 (5 stories) | 2-3 semanas | Gates, idempotency, circuit breakers, retry, API integrations |
| **Fase 3: Automação** | 3.1 - 3.3 (3 stories) | 1 semana | Webhooks, inter-squad, overrides |
| **Fase 4: Scale** | 4.1 - 4.4 (4 stories) | 2 semanas | Queue, Redis, MongoDB, paralelização |

**Total Stories:** 21
**Total Estimated Duration:** 8-10 semanas
**Total Estimated Effort:** ~50-60 dias de desenvolvimento

**Phased Rollout:**
- ✅ **Fase 1 (Semana 1-4):** MVP em Railway monolito, trigger manual via dashboard
- ✅ **Fase 2 (Semana 5-7):** Robustez validada com squad-copy real (APIs mockadas)
- ✅ **Fase 3 (Semana 8):** Automação com n8n integration, webhooks funcionais
- ✅ **Fase 4 (Semana 9-10):** Scale para 100+ runs simultâneos, Redis + Queue em produção

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement | Phase |
|--------|--------|-------------|-------|
| **Pipeline Success Rate** | ≥95% | Runs completed / total runs | Fase 2+ |
| **Avg Pipeline Duration** | <30min | squad-copy end-to-end | Fase 1+ |
| **Dashboard Latency** | <2s | State update → UI refresh | Fase 1 |
| **Concurrent Runs** | 100+ | Simultaneous executions | Fase 4 |
| **Event Store Replay** | 100% | Successful state reconstruction | Fase 1 |
| **Circuit Breaker Protection** | <5 failed API calls before open | Circuit breaker triggers | Fase 2 |
| **Idempotency Cache Hit Rate** | >80% | Cache hits / total tasks | Fase 2+ |

### Business Metrics

| Metric | Target | Measurement | Phase |
|--------|--------|-------------|-------|
| **Manual Intervention** | 0% | squad-copy runs without human input | Fase 3+ |
| **Time to Market** | -50% | From offer created → ads live (with n8n) | Fase 3+ |
| **Developer Productivity** | +200% | Reusable engine vs custom scripts | Fase 4 |
| **Squad Reusability** | 3+ squads | Number of squads using engine | Post-Epic |

---

## Next Steps

1. **@po (Pax):** Validate epic structure, confirm story breakdown aligns with PRD
2. **@architect (Aria):** Review technical approach, confirm integration strategy
3. **@pm (Morgan):** Create EPIC-SOE-EXECUTION.yaml execution plan
4. **@sm (River):** Create detailed story files (21 stories) in docs/stories/squad-orchestration-engine/
5. **@dev (Dex):** Begin Fase 1 Story 1.1 (Squad Orchestrator Core) after epic validation

**Ready for handoff to @po (Pax) for validation.**

---

**Epic Created By:** @pm (Morgan)
**Creation Date:** 2026-02-20
**Source:** brownfield-create-epic task execution
**PRD Version:** 1.1 (includes Integration Architecture)

---

*Planejando o futuro da orquestração de squads* 📊
