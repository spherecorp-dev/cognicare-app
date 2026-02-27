/**
 * State Manager - MongoDB Auto-Archive Integration Tests
 * Story 4.3 - Task 3: Auto-archive hook on completion
 */

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { StateManager } = require('../state-manager');

/**
 * Create mock MongoRunArchive with call tracking
 */
function createMockMongoArchive(options = {}) {
  const { shouldFail = false } = options;
  const archiveCalls = [];

  return {
    archiveCalls,
    async archive(runId, state, metadata) {
      archiveCalls.push({ runId, state, metadata });
      if (shouldFail) throw new Error('MongoDB down');
      return true;
    },
  };
}

/**
 * Create mock EventStore with call tracking
 */
function createMockEventStore() {
  const appendCalls = [];
  let eventsToReturn = [
    { type: 'run.started' },
    { type: 'phase.started' },
    { type: 'phase.completed' },
    { type: 'run.completed' },
  ];
  let shouldGetEventsFail = false;

  return {
    appendCalls,
    _setEvents(events) { eventsToReturn = events; },
    _setGetEventsFail(flag) { shouldGetEventsFail = flag; },

    append(runId, type, data) {
      appendCalls.push({ runId, type, data });
    },
    async getEvents() {
      if (shouldGetEventsFail) throw new Error('EventStore error');
      return eventsToReturn;
    },
    async replay() { return null; },
  };
}

/**
 * Create mock Redis adapter
 */
function createMockRedisAdapter() {
  const store = new Map();
  return {
    async get(key) {
      const val = store.get(`run:${key}`);
      return val ? JSON.parse(val) : null;
    },
    async set(key, value) {
      store.set(`run:${key}`, JSON.stringify(value));
    },
    async delete(key) {
      return store.delete(`run:${key}`);
    },
    incrementFsFallback() {},
  };
}

describe('StateManager - MongoDB Auto-Archive (Story 4.3)', () => {
  let stateManager;
  let mockMongoArchive;
  let mockEventStore;
  let mockRedisAdapter;
  let tmpDir;

  const baseState = {
    squadId: 'squad-copy',
    currentTask: 'generate_images',
    currentTaskIndex: 3,
    completedTasks: ['fetch_spy_data', 'analyze_competitors', 'create_strategy'],
    pendingTasks: ['generate_images', 'review_quality'],
    context: { offer: 'MEMFR02' },
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sm-mongo-test-'));
    mockMongoArchive = createMockMongoArchive();
    mockEventStore = createMockEventStore();
    mockRedisAdapter = createMockRedisAdapter();

    stateManager = new StateManager(tmpDir, {
      mongoArchive: mockMongoArchive,
      eventStore: mockEventStore,
      redisAdapter: mockRedisAdapter,
    });
  });

  afterEach(async () => {
    stateManager.destroy();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Auto-archive on completion', () => {
    test('should archive when status is completed', async () => {
      const state = { ...baseState, status: 'completed' };
      await stateManager.saveState('run-001', state);

      // Wait for async archive (fire-and-forget)
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls.length).toBe(1);
      expect(mockMongoArchive.archiveCalls[0].runId).toBe('run-001');
      expect(mockMongoArchive.archiveCalls[0].state.status).toBe('completed');
      expect(mockMongoArchive.archiveCalls[0].metadata.events_count).toBe(4);
    });

    test('should archive when status is failed', async () => {
      const state = { ...baseState, status: 'failed', error: { message: 'API error' } };
      await stateManager.saveState('run-002', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls.length).toBe(1);
      expect(mockMongoArchive.archiveCalls[0].runId).toBe('run-002');
    });

    test('should archive when status is aborted', async () => {
      const state = { ...baseState, status: 'aborted' };
      await stateManager.saveState('run-003', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls.length).toBe(1);
    });

    test('should NOT archive for non-final statuses', async () => {
      const state = { ...baseState, status: 'running' };
      await stateManager.saveState('run-004', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls.length).toBe(0);
    });

    test('should NOT archive for paused status', async () => {
      const state = { ...baseState, status: 'paused' };
      await stateManager.saveState('run-005', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls.length).toBe(0);
    });
  });

  describe('Events count', () => {
    test('should count events from EventStore', async () => {
      mockEventStore._setEvents([
        { type: 'run.started' },
        { type: 'phase.started' },
        { type: 'step.started' },
        { type: 'step.completed' },
        { type: 'phase.completed' },
        { type: 'run.completed' },
      ]);

      const state = { ...baseState, status: 'completed' };
      await stateManager.saveState('run-006', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls[0].metadata.events_count).toBe(6);
    });

    test('should default events_count to 0 if EventStore fails', async () => {
      mockEventStore._setGetEventsFail(true);

      const state = { ...baseState, status: 'completed' };
      await stateManager.saveState('run-007', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockMongoArchive.archiveCalls[0].metadata.events_count).toBe(0);
    });
  });

  describe('Emit run.archived event', () => {
    test('should emit run.archived event on successful archive', async () => {
      const state = { ...baseState, status: 'completed' };
      await stateManager.saveState('run-008', state);

      await new Promise(resolve => setTimeout(resolve, 100));

      const archivedEvent = mockEventStore.appendCalls.find(c => c.type === 'run.archived');
      expect(archivedEvent).toBeDefined();
      expect(archivedEvent.runId).toBe('run-008');
      expect(archivedEvent.data.target).toBe('mongodb');
    });
  });

  describe('Graceful degradation', () => {
    test('should not block saveState if MongoDB archive fails', async () => {
      const failingArchive = createMockMongoArchive({ shouldFail: true });
      const sm = new StateManager(tmpDir, {
        mongoArchive: failingArchive,
        redisAdapter: mockRedisAdapter,
      });

      const state = { ...baseState, status: 'completed' };
      // Should not throw
      await expect(sm.saveState('run-009', state)).resolves.not.toThrow();

      sm.destroy();
    });

    test('should work without mongoArchive configured', async () => {
      const smNoMongo = new StateManager(tmpDir, { redisAdapter: mockRedisAdapter });

      const state = { ...baseState, status: 'completed' };
      await expect(smNoMongo.saveState('run-010', state)).resolves.not.toThrow();

      smNoMongo.destroy();
    });
  });
});
