/**
 * E2E Test: API Route Integration
 * Story 1.8 AC9: Dashboard API routes for runs management
 *
 * Tests the API route handlers directly (unit-style integration)
 * since we can't easily spin up a Next.js server in Jest.
 * Validates the EventStore integration that powers the API.
 */

const {
  getMockPipeline,
  createTempDirs,
  cleanupTempDirs,
  setupTaskMocks,
  restoreTaskMocks,
  executeFullRun,
} = require('./helpers');
const { EventStore } = require('../../.aios-core/core/orchestration/squad-engine/event-store');

describe('E2E: API Route Integration — Events Endpoint', () => {
  let tempDirs;

  beforeEach(async () => {
    tempDirs = await createTempDirs();
    setupTaskMocks();
  });

  afterEach(async () => {
    restoreTaskMocks();
    await cleanupTempDirs(tempDirs.tmpDir);
  });

  test('getEvents returns all events for a completed run', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-api-events-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    // Simulate GET /api/runs/{runId}/events
    const eventStore = new EventStore(tempDirs.runsDir);
    const events = await eventStore.getEvents(runId);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].event).toBe('run.started');
    expect(events[events.length - 1].event).toBe('run.completed');
  }, 30000);

  test('getEvents with type filter returns only matching events', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-api-filter-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const eventStore = new EventStore(tempDirs.runsDir);

    // Filter by step.completed only
    const stepEvents = await eventStore.getEvents(runId, { eventType: 'step.completed' });
    expect(stepEvents).toHaveLength(4);
    stepEvents.forEach((e) => {
      expect(e.event).toBe('step.completed');
    });
  }, 30000);

  test('getEvents with after cursor returns events after timestamp', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-api-cursor-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const eventStore = new EventStore(tempDirs.runsDir);
    const allEvents = await eventStore.getEvents(runId);

    // Use the timestamp of the 3rd event as cursor
    const cursor = allEvents[2].timestamp;
    const afterEvents = await eventStore.getEvents(runId, { after: cursor });

    expect(afterEvents.length).toBeLessThan(allEvents.length);
    afterEvents.forEach((e) => {
      expect(e.timestamp > cursor).toBe(true);
    });
  }, 30000);

  test('getEvents with limit returns capped results', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-api-limit-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const eventStore = new EventStore(tempDirs.runsDir);
    const limitedEvents = await eventStore.getEvents(runId, { limit: 5 });

    expect(limitedEvents.length).toBeLessThanOrEqual(5);
  }, 30000);

  test('getEvents for non-existent runId returns empty array', async () => {
    const eventStore = new EventStore(tempDirs.runsDir);
    const events = await eventStore.getEvents('non-existent-run');

    expect(events).toEqual([]);
  }, 30000);

  test('events pagination: hasMore detection simulation', async () => {
    const pipeline = getMockPipeline();
    const runId = 'e2e-api-pagination-001';

    await executeFullRun({
      pipeline,
      runId,
      runsDir: tempDirs.runsDir,
      stateDir: tempDirs.stateDir,
    });

    const eventStore = new EventStore(tempDirs.runsDir);
    const allEvents = await eventStore.getEvents(runId);

    // Simulate pagination logic from dashboard route
    const limit = 5;
    const hasMore = allEvents.length > limit;
    const paginatedEvents = hasMore ? allEvents.slice(allEvents.length - limit) : allEvents;
    const nextCursor = hasMore && paginatedEvents.length > 0 ? paginatedEvents[0].timestamp : null;

    expect(hasMore).toBe(true); // Full run has 14 events, limit=5
    expect(paginatedEvents).toHaveLength(5);
    expect(nextCursor).toBeDefined();
    expect(typeof nextCursor).toBe('string');
  }, 30000);
});
