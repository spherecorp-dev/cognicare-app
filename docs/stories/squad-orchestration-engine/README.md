# Squad Orchestration Engine — Story Index

**Epic:** epic-squad-orchestration-engine.md
**PRD:** docs/prd/squad-orchestration-engine.md
**Execution Plan:** EPIC-SOE-EXECUTION.yaml
**Created:** 2026-02-20
**Total Stories:** 21 (across 4 phases)

---

## Epic Overview

Construir um motor de orquestração genérico que execute workflows de squads automaticamente, começando com squad-copy (Persuasion Engine) como caso de uso piloto, e escalando para suportar múltiplos squads e centenas de execuções simultâneas.

**Key Deliverables:**
- Core orchestration engine (playbook loading, task execution, conditions, state management)
- Dashboard com monitoramento em tempo real
- Event sourcing para audit trail completo
- Webhooks para integração com n8n
- APIs externas (DALL-E, Whisper, Spy Scraping)
- Queue-based execution para scale (100+ runs simultâneos)

---

## Story Status Legend

- ✅ **Done** — Story completed, merged, deployed
- 🚧 **In Progress** — Currently being implemented
- 📝 **Ready** — Story file created, ready for development
- 📋 **Draft** — Story defined in epic, file pending creation
- ⏸️ **Blocked** — Blocked by dependencies

---

## Fase 1: MVP — Core Engine (9 stories, 3-4 weeks)

**Goal:** Core engine, dashboard, event sourcing, n8n contracts

| ID | Title | File | Status | Executor | Effort |
|----|-------|------|--------|----------|--------|
| 1.1 | Squad Orchestrator Core — Carregamento e Validação de Playbooks | [1.1-squad-orchestrator-core.md](./1.1-squad-orchestrator-core.md) | ✅ Done | @dev | 2-3 days |
| 1.2 | Task Executor — Execução de Tasks Puras e Agent Tasks | [1.2-task-executor.md](./1.2-task-executor.md) | ✅ Done | @dev | 3-4 days |
| 1.3 | Condition Engine — Validação de Pre/Post-Conditions | [1.3-condition-engine.md](./1.3-condition-engine.md) | ✅ Done | @dev | 2-3 days |
| 1.4 | State Manager — Pause/Resume com File System | [1.4-state-manager.md](./1.4-state-manager.md) | ✅ Done | @dev | 2-3 days |
| 1.5 | Dashboard Backend — API Routes para Runs | [1.5-dashboard-backend.md](./1.5-dashboard-backend.md) | ✅ Done | @dev | 2-3 days |
| 1.6 | Dashboard Frontend — Pipeline Monitor UI | [1.6-dashboard-frontend.md](./1.6-dashboard-frontend.md) | ✅ Done | @ux-design-expert | 3-4 days |
| 1.7 | Event Sourcing — Audit Trail com events.jsonl | [1.7-event-sourcing.md](./1.7-event-sourcing.md) | ✅ Done | @dev | 2-3 days |
| 1.8 | E2E Testing — Squad-copy Completo | [1.8-e2e-testing.md](./1.8-e2e-testing.md) | ✅ Done | @dev | 3-4 days |
| 1.9 | n8n Integration Contracts — Webhook Input/Output | [1.9-n8n-integration-contracts.md](./1.9-n8n-integration-contracts.md) | ✅ Done | @dev | 2-3 days |

**Subtotal:** 9 stories, 22-28 days

---

## Fase 2: Robustez — Production-Grade Reliability (5 stories, 2-3 weeks)

**Goal:** Gates, idempotency, circuit breakers, retry, API integrations

| ID | Title | File | Status | Executor | Effort |
|----|-------|------|--------|----------|--------|
| 2.1 | Gate Evaluator — Review Gates com Loops | [2.1-gate-evaluator.md](./2.1-gate-evaluator.md) | ✅ Done | @dev | 2-3 days |
| 2.2 | Idempotency Keys — Evitar Execução Duplicada | [2.2-idempotency-keys.md](./2.2-idempotency-keys.md) | ✅ Done | @dev | 2 days |
| 2.3 | Circuit Breaker — Proteção de APIs Externas | [2.3-circuit-breaker.md](./2.3-circuit-breaker.md) | ✅ Done | @dev | 2 days |
| 2.4 | Error Handling — Retry Logic e Compensating Transactions | [2.4-error-handling.md](./2.4-error-handling.md) | ✅ Done | @dev | 3 days |
| 2.5 | External API Integrations — DALL-E, Whisper, Spy Scraping | [2.5-external-api-integrations.md](./2.5-external-api-integrations.md) | ✅ Done | @dev | 4-5 days |

**Subtotal:** 5 stories, 13-15 days

---

## Fase 3: Automação — Webhooks & Inter-Squad (3 stories, 1 week)

**Goal:** Webhooks, inter-squad communication, runtime overrides

| ID | Title | File | Status | Executor | Effort |
|----|-------|------|--------|----------|--------|
| 3.1 | Webhook API — Trigger Externo via n8n | [3.1-webhook-api.md](./3.1-webhook-api.md) | ✅ Done | @dev | 2 days |
| 3.2 | Inter-Squad Communication — Squad-to-Squad Calls | [3.2-inter-squad-communication.md](./3.2-inter-squad-communication.md) | ✅ Done | @dev | 2-3 days |
| 3.3 | Override System — Runtime Parameter Overrides | [3.3-override-system.md](./3.3-override-system.md) | ✅ Done | @dev | 2 days |

**Subtotal:** 3 stories, 6-7 days

---

## Fase 4: Scale — Queue, Redis, MongoDB (4 stories, 2 weeks)

**Goal:** Queue-based execution, Redis cache, MongoDB history, parallelization

| ID | Title | File | Status | Executor | Effort |
|----|-------|------|--------|----------|--------|
| 4.1 | Queue-Based Execution — BullMQ Integration | [4.1-queue-based-execution.md](./4.1-queue-based-execution.md) | ✅ Done | @devops | 3-4 days |
| 4.2 | Redis State Cache — Fast Pause/Resume | [4.2-redis-state-cache.md](./4.2-redis-state-cache.md) | ✅ Done | @devops | 2-3 days |
| 4.3 | MongoDB Historical Storage — Queryable Run History | [4.3-mongodb-historical-storage.md](./4.3-mongodb-historical-storage.md) | ✅ Done | @data-engineer | 2-3 days |
| 4.4 | Paralelização de Steps — Parallel Groups | [4.4-parallelization.md](./4.4-parallelization.md) | ✅ Done | @dev | 2-3 days |

**Subtotal:** 4 stories, 9-13 days

---

## Total Epic Summary

| Metric | Value |
|--------|-------|
| **Total Stories** | 21 |
| **Total Phases** | 4 |
| **Total Estimated Effort** | 50-63 days |
| **Total Duration** | 8-10 weeks (with parallelization) |
| **Stories Completed** | 21 (Stories 1.1-1.9, 2.1-2.5, 3.1-3.3, 4.1-4.4) ✅ |
| **Stories Ready** | 0 |
| **Stories Created** | 21 (all stories created) |
| **Stories Pending Creation** | 0 |

---

## Dependencies Graph

```
Phase 1 (MVP)
  1.1 → 1.2 → 1.3 → 1.4
                    ↓
             1.5 → 1.6
                    ↓
        1.7 (depends on all above)
                    ↓
        1.8 (E2E testing - depends on all above)
                    ↓
        1.9 (n8n contracts - depends on 1.1-1.8)

Phase 2 (Robustez) — depends on Phase 1 complete
  2.1 → 2.2 → 2.3 → 2.4 → 2.5

Phase 3 (Automação) — depends on Phase 1+2 complete
  3.1 → 3.2 → 3.3

Phase 4 (Scale) — depends on Phase 1+2+3 complete
  4.1 (Queue) → 4.2 (Redis)
              ↘
                4.3 (MongoDB)
              ↗
  4.4 (Parallel) → depends on 4.1, 4.2
```

---

## Executor Assignments

| Executor | Stories | Total Effort |
|----------|---------|--------------|
| **@dev** | 15 (1.1-1.5, 1.7-1.9, 2.1-2.5, 3.1-3.3, 4.4) | 39-49 days |
| **@ux-design-expert** | 1 (1.6) | 3-4 days |
| **@devops** | 2 (4.1, 4.2) | 5-7 days |
| **@data-engineer** | 1 (4.3) | 2-3 days |

---

## Quality Gate Assignments

| Quality Gate | Stories | Focus Areas |
|--------------|---------|-------------|
| **@architect** | 16 | Architecture review, pattern validation, integration strategy |
| **@dev** | 3 | Code review, component validation (1.6, 4.3) |
| **@pm** | 0 | — |

---

## Next Steps

### For Story Manager (@sm - River)

1. **All 21 story files created** — Phase 1-4 complete
2. **Coordinate with @po** for Phase 4 story validation before development starts
3. **Ensure executor assignments match** EPIC-SOE-EXECUTION.yaml
4. **Update this README** as stories progress (📝 Ready → 🚧 In Progress → ✅ Done)

### For Product Owner (@po - Pax)

1. **Validate Story 1.1** against PRD requirements
2. **Review epic structure** and story breakdown
3. **Confirm GO/NO-GO** for each phase before development starts

### For Architect (@architect - Aria)

1. **Review technical approach** in Story 1.1
2. **Validate integration strategy** with existing AIOS framework
3. **Confirm quality gate tools** are appropriate for each story

### For Development (@dev - Dex)

1. **Begin Story 1.1** after PO/Architect validation
2. **Follow TDD approach** — write tests first, then implementation
3. **Update File List** in story as files are created/modified
4. **Mark checkboxes** in Acceptance Criteria as completed

---

## References

- **Epic:** [docs/epics/epic-squad-orchestration-engine.md](../../epics/epic-squad-orchestration-engine.md)
- **PRD:** [docs/prd/squad-orchestration-engine.md](../../prd/squad-orchestration-engine.md)
- **Execution Plan:** [EPIC-SOE-EXECUTION.yaml](../../../EPIC-SOE-EXECUTION.yaml)
- **Source Task:** .aios-core/development/tasks/brownfield-create-epic.md
- **Executor Assignment Module:** .aios-core/core/orchestration/executor-assignment.js

---

**Created:** 2026-02-20
**Author:** @pm (Morgan)
**Last Updated:** 2026-02-21 (Phase 4 stories validated by @po — all 21 stories created, 4 Ready for dev)
**Status:** Phase 1+2+3+4 COMPLETE. All 21/21 stories Done ✅. Epic 100% complete.
