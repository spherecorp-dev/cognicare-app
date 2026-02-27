/**
 * Squad Engine - Module Exports
 * Story 1.1: Squad Orchestrator Core
 * Story 1.7: Event Sourcing
 * Story 2.1: Gate Evaluator
 * Story 2.2: Idempotency Keys
 * Story 2.3: Circuit Breaker
 * Story 2.4: Error Handling (Retry + Compensations)
 * Story 3.2: Inter-Squad Communication
 * Story 3.3: Override System
 * Story 4.1: Queue-Based Execution
 * Story 1.3: Condition Engine
 */

const SquadOrchestrator = require('./squad-orchestrator');
const { validateSquadSchema } = require('./schemas/squad-schema');
const { validatePipelineSchema } = require('./schemas/pipeline-schema');
const { EventStore, InvalidEventError, StateRecoveryError, EVENT_TYPES } = require('./event-store');
const { GateEvaluator, GateEscalationError } = require('./gate-evaluator');
const { IdempotencyCache } = require('./idempotency-cache');
const { APICircuitBreaker, CircuitBreakerRegistry, CircuitBreakerOpenError } = require('./circuit-breaker');
const { RetryHandler, CompensationExecutor, RetryExhaustedError } = require('./retry-handler');
const { InterSquadTimeoutError, InterSquadRunError, OverrideValidationError } = require('./errors');
const { validateOverrides, ALLOWED_METHODS, ALLOWED_PLATFORMS } = require('./override-validator');
const { QueueManager } = require('./queue-manager');
const { QueueWorkerPool } = require('./queue-worker');
const { QueueLogger } = require('./queue-logger');
const queueConfig = require('./queue-config');
// Story 4.2: Redis State Cache
const { RedisStateAdapter } = require('./redis-state-adapter');
const { StateManager, StateCorruptionError, InvalidStateError } = require('./state-manager');
// Story 4.3: MongoDB Historical Storage
const mongoConfig = require('./mongo-config');
const { MongoRunArchive, FINAL_STATUSES: MONGO_FINAL_STATUSES } = require('./mongo-run-archive');
// Story 4.4: Parallel Execution
const { ParallelExecutor, MAX_PARALLEL_TASKS } = require('./parallel-executor');
// Story 1.3: Condition Engine
const { ConditionEngine, PreConditionError, PostConditionError } = require('./condition-engine');

module.exports = {
  SquadOrchestrator,
  validateSquadSchema,
  validatePipelineSchema,
  EventStore,
  InvalidEventError,
  StateRecoveryError,
  EVENT_TYPES,
  GateEvaluator,
  GateEscalationError,
  IdempotencyCache,
  APICircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  RetryHandler,
  CompensationExecutor,
  RetryExhaustedError,
  InterSquadTimeoutError,
  InterSquadRunError,
  OverrideValidationError,
  validateOverrides,
  ALLOWED_METHODS,
  ALLOWED_PLATFORMS,
  // Story 4.1: Queue-Based Execution
  QueueManager,
  QueueWorkerPool,
  QueueLogger,
  queueConfig,
  // Story 4.2: Redis State Cache
  RedisStateAdapter,
  StateManager,
  StateCorruptionError,
  InvalidStateError,
  // Story 4.3: MongoDB Historical Storage
  mongoConfig,
  MongoRunArchive,
  MONGO_FINAL_STATUSES,
  // Story 4.4: Parallel Execution
  ParallelExecutor,
  MAX_PARALLEL_TASKS,
  // Story 1.3: Condition Engine
  ConditionEngine,
  PreConditionError,
  PostConditionError,
};
