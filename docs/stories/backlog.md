# Story Backlog

---

## Follow-ups (F)
### F-1771637897623 - 🟡 Medium
**Title:** [MNT-001] Consider type validation before String coercion in equality validation  
**Description:** ConditionEngine uses String(value) in == validation which may have unexpected behavior with objects/arrays. Consider adding type validation or documenting expected behavior.  
**Related Story:** Story 1.3  
**Created By:** @qa on 2026-02-21  
**Estimated Effort:** 1-2 hours  
**Tags:** maintainability, validation, type-safety  
**Status:** Pending


### F-1771637897624 - 🟢 Low
**Title:** [TEST-001] Add input schema validation for conditions array
**Description:** Add schema validation in validate() to handle malformed condition objects or document input contract expectations.
**Related Story:** Story 1.3
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 1 hour
**Tags:** testing, validation, input-validation
**Status:** Pending

### F-1771637897700 - 🟢 Low
**Title:** [TEST-008] Add behavioral test for AC3 method override (select-method bypass)
**Description:** Current test only verifies `context.overrides.method` is accessible. When `select-method` task is implemented, add test asserting direct return (agent decision bypass) when `context.overrides.method` is set.
**Related Story:** Story 3.3
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 1 hour
**Tags:** testing, override-system, method-bypass
**Status:** Pending

### F-1771637897701 - 🟢 Low
**Title:** [TEST-009] Add integration tests for AC4 geo/platform filter consumption
**Description:** Current AC4 test asserts data structure only (plain JS object, no execution). When spy-scraping and delivery tasks are implemented, add integration tests verifying tasks actually filter by `context.overrides.geos` and `context.overrides.platforms`.
**Related Story:** Story 3.3
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 1-2 hours
**Tags:** testing, override-system, geo-filter, platform-filter
**Status:** Pending

### F-1771637897702 - 🟢 Low
**Title:** [DOC-001] Document context.overrides propagation contract for step execution loop
**Description:** `state.trigger.overrides` is stored at trigger time, but propagation to `context.overrides` in the step execution loop is implicit. Document that the step execution loop MUST map `state.trigger.overrides` → `context.overrides` before calling TaskExecutor.
**Related Story:** Story 3.3
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** documentation, override-system, architecture-contract
**Status:** Pending

---

## Tech Debt (D)
### D-1740153600001 - 🟢 Low
**Title:** [CODE-001] Extract shared STATUS_ICONS map to avoid duplication
**Description:** `STATUS_ICONS` map is duplicated between PipelineVisualizer.tsx (line 22) and StepDetails.tsx (line 25). Extract to a shared constant in `types/run.ts` or `lib/constants.ts`.
**Related Story:** Story 1.6
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** code-quality, duplication, components
**Status:** Pending

### D-1740153600002 - 🟢 Low
**Title:** [CODE-002] Extract shared formatDuration utility
**Description:** `formatDuration` helper is duplicated across 3 files with minor variations: StepDetails.tsx, runs/page.tsx, runs/[runId]/page.tsx. Extract to `lib/format.ts` shared utility.
**Related Story:** Story 1.6
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** code-quality, duplication, utilities
**Status:** Pending

### D-1740153600004 - 🟢 Low
**Title:** [PERF-001] Optimize duplo lookup no cache hit path do TaskExecutor
**Description:** No fluxo de cache hit (task-executor.js:102-109), `get()` move a entry no LRU e depois `getMetadata()` faz outro lookup no Map. Poderia ser otimizado com um único acesso que retornasse tanto o resultado quanto o metadata, evitando dois traversals do Map.
**Related Story:** Story 2.2
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** performance, cache, optimization
**Status:** Pending

### D-1740153600005 - 🟢 Low
**Title:** [PERF-002] Eliminar geração duplicada de idempotency key no cache-miss flow
**Description:** No fluxo de cache miss do TaskExecutor, a idempotency key é gerada 2x via SHA256: uma vez no check (task-executor.js:101) e outra no store (task-executor.js:152). Poderia ser gerada uma vez e reutilizada via variável local fora do bloco condicional.
**Related Story:** Story 2.2
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 15 min
**Tags:** performance, cache, sha256
**Status:** Pending

### D-1740153600006 - 🟡 Medium
**Title:** [TEST-003] Fix 17 pre-existing retry-handler test failures (compensation + event emission)
**Description:** retry-handler.test.js has 17 failing tests across 3 categories: (1) Event emission — step.retry and step.retry_exhausted events not emitted by RetryHandler, (2) CompensationExecutor — LIFO execution, force_execute, error continuation not implemented, (3) RetryHandler integration — retryHandler usage with step config. Tests were written for planned functionality (Story 2.4 Phase 2).
**Related Story:** Story 2.4
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 3-4 hours
**Tags:** testing, retry-handler, compensation, events
**Status:** Pending

### D-1740153600007 - 🟢 Low
**Title:** [TEST-004] Fix 4 squad-copy integration test path resolution failures
**Description:** squad-copy.test.js has 4 failing tests because tests reference squad files at `.aios-core/squads/squad-copy/` but actual files are at `squads/squad-copy/` (project root). Fix path resolution in SquadOrchestrator or update test fixtures.
**Related Story:** Story 1.1
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 1 hour
**Tags:** testing, integration, path-resolution
**Status:** Absorbed → Story 3.2 (AC7)

### D-1740153600008 - 🟢 Low
**Title:** [TEST-005] Fix 3 task-execution integration test failures (missing task files)
**Description:** task-execution.test.js references task files fetch-offer-data.md and interpret-offer-data.md that no longer exist after squad-copy task reorganization. Update tests to use current task filenames or create mock task files.
**Related Story:** Story 1.2
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** testing, integration, task-execution
**Status:** Absorbed → Story 3.2 (AC7)

### D-1740153600009 - 🟡 Medium
**Title:** [TEST-006] Add AC3 content policy sanitize+retry flow test
**Description:** ImageGeneratorClient.generate() handles 400 content_policy_violation by sanitizing prompt and retrying 1x (client.js:90-95), but no test exercises this path end-to-end. Mock fetchFn to return 400 on first call, success on second. Verify sanitizePrompt was called and retry occurred.
**Related Story:** Story 2.5
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** testing, image-generation, content-policy
**Status:** Pending

### D-1740153600010 - 🟡 Medium
**Title:** [TEST-007] Add AC5 WhisperClient timeout escalation multiplier verification
**Description:** WhisperClient uses timeoutMultipliers [1, 1.5, 2] for retry attempts (60s → 90s → 120s) but no test verifies the actual timeout values passed to fetchFn across retries. Verify via AbortController signal that timeout increases across attempts.
**Related Story:** Story 2.5
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** testing, whisper, timeout-escalation
**Status:** Pending

### D-1740153600011 - 🟢 Low
**Title:** [CODE-003] Extract ConfigError to shared integrations module
**Description:** ConfigError class is defined in dall-e.js but imported by all integration modules (midjourney, nanobanana, flux, whisper, meta, tiktok). Creates unnecessary coupling to DALL-E provider. Extract to integrations/errors.js.
**Related Story:** Story 2.5
**Created By:** @devops on 2026-02-21
**Estimated Effort:** 30 min
**Tags:** code-quality, coupling, refactoring
**Status:** Pending

### D-1771637897703 - 🟡 Medium
**Title:** [CODE-004] Unify override validation logic (DRY — CommonJS + TypeScript)
**Description:** Override validation exists in two independent implementations: `override-validator.js` (CommonJS) and `webhook-validator.ts` (TypeScript). Both define ALLOWED_METHODS, ALLOWED_PLATFORMS, and ISO_639_1_PATTERN separately. If values change, both files need updating. Consider extracting shared constants to a JSON file importable from both contexts, or add a parity test asserting both implementations accept/reject the same inputs.
**Related Story:** Story 3.3
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 1-2 hours
**Tags:** code-quality, duplication, override-system, dry
**Status:** Pending

### D-1740153600003 - 🟢 Low
**Title:** [TEST-002] Add hook-level tests for React Query hooks
**Description:** 5 hooks (useRuns, useRunState, useRunControl, useRunOutputs, useRunLogs) lack unit tests. Component tests provide coverage but hooks are not tested in isolation. Add tests using @testing-library/react renderHook.
**Related Story:** Story 1.6
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 2-3 hours
**Tags:** testing, hooks, react-query
**Status:** Pending

---

## Enhancements (E)
### E-1740153600001 - 🟡 Medium
**Title:** [UX-001] Add toast notifications for control action feedback
**Description:** AC5 requests "success/error feedback after" control actions. Currently pause/resume/abort actions invalidate queries but provide no visual toast/notification to the user. Add sonner or similar toast library for success/error feedback on control mutations.
**Related Story:** Story 1.6
**Created By:** @qa on 2026-02-21
**Estimated Effort:** 1-2 hours
**Tags:** ux, feedback, controls, toast
**Status:** Pending

