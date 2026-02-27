/**
 * Event Store - Unit Tests
 * Story 1.7 - Event Sourcing
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { EventStore, InvalidEventError, StateRecoveryError, EVENT_TYPES } = require('../event-store');

describe('EventStore', () => {
  let eventStore;
  let testRunsDir;

  beforeEach(async () => {
    testRunsDir = path.join(__dirname, '.test-runs');
    eventStore = new EventStore(testRunsDir);
    await fs.mkdir(testRunsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testRunsDir, { recursive: true, force: true });
    } catch {
      // Ignora erros de remoção
    }
  });

  describe('constructor', () => {
    test('should initialize with default runs directory', () => {
      const es = new EventStore();
      expect(es.runsDir).toBe('.aios/squad-runs');
    });

    test('should initialize with custom runs directory', () => {
      const es = new EventStore('/custom/runs');
      expect(es.runsDir).toBe('/custom/runs');
    });
  });

  describe('getEventsFilePath', () => {
    test('should return correct events.jsonl path', () => {
      const filePath = eventStore.getEventsFilePath('run-123');
      expect(filePath).toBe(path.join(testRunsDir, 'run-123', 'events.jsonl'));
    });
  });

  describe('EVENT_TYPES', () => {
    test('should contain all 22 event types (12 base + 4 inter_squad + 2 queue + 4 parallel)', () => {
      expect(EVENT_TYPES).toHaveLength(22);
      expect(EVENT_TYPES).toContain('run.started');
      expect(EVENT_TYPES).toContain('phase.started');
      expect(EVENT_TYPES).toContain('phase.completed');
      expect(EVENT_TYPES).toContain('step.started');
      expect(EVENT_TYPES).toContain('step.completed');
      expect(EVENT_TYPES).toContain('gate.evaluated');
      expect(EVENT_TYPES).toContain('run.paused');
      expect(EVENT_TYPES).toContain('run.resumed');
      expect(EVENT_TYPES).toContain('run.completed');
      expect(EVENT_TYPES).toContain('run.failed');
      expect(EVENT_TYPES).toContain('run.aborted');
      expect(EVENT_TYPES).toContain('state.recovered');
      // Story 3.2: Inter-squad communication events
      expect(EVENT_TYPES).toContain('inter_squad.call');
      expect(EVENT_TYPES).toContain('inter_squad.completed');
      expect(EVENT_TYPES).toContain('inter_squad.timeout');
      expect(EVENT_TYPES).toContain('inter_squad.error');
      // Story 4.1: Queue-based execution events
      expect(EVENT_TYPES).toContain('run.queued');
      expect(EVENT_TYPES).toContain('run.dequeued');
      // Story 4.4: Parallel execution events
      expect(EVENT_TYPES).toContain('parallel_group.started');
      expect(EVENT_TYPES).toContain('parallel_group.completed');
      expect(EVENT_TYPES).toContain('step.failed');
      expect(EVENT_TYPES).toContain('step.aborted');
    });
  });

  describe('append', () => {
    test('should write valid JSONL to events file (AC2)', async () => {
      const runId = 'run-append-001';
      const runDir = path.join(testRunsDir, runId);
      await fs.mkdir(runDir, { recursive: true });

      eventStore.append(runId, 'run.started', { squadId: 'squad-copy' });

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = await fs.readFile(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());

      expect(event.event).toBe('run.started');
      expect(event.runId).toBe(runId);
      expect(event.data.squadId).toBe('squad-copy');
      expect(event.timestamp).toBeDefined();
    });

    test('should auto-create directory if not exists', async () => {
      const runId = 'run-append-002';

      eventStore.append(runId, 'run.started', { squadId: 'test' });

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = await fs.readFile(eventsFile, 'utf8');
      expect(content.trim()).toBeTruthy();
    });

    test('should append multiple events without overwriting (AC2)', async () => {
      const runId = 'run-append-003';

      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'phase.started', { phaseName: 'intelligence' });
      eventStore.append(runId, 'step.started', { stepId: 'fetch-data' });

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = await fs.readFile(eventsFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]).event).toBe('run.started');
      expect(JSON.parse(lines[1]).event).toBe('phase.started');
      expect(JSON.parse(lines[2]).event).toBe('step.started');
    });

    test('should auto-generate ISO 8601 timestamp (AC4)', () => {
      const runId = 'run-append-004';
      const before = new Date().toISOString();

      eventStore.append(runId, 'run.started', {});

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());
      const after = new Date().toISOString();

      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
    });

    test('should include all required fields in event schema (AC4)', () => {
      const runId = 'run-append-005';

      eventStore.append(runId, 'step.completed', { stepId: 's1', output: { result: 42 } });

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());

      expect(event).toHaveProperty('event');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('runId');
      expect(event).toHaveProperty('data');
    });

    test('should throw InvalidEventError if runId is missing', () => {
      expect(() => eventStore.append(null, 'run.started', {}))
        .toThrow(InvalidEventError);
    });

    test('should throw InvalidEventError if eventType is missing', () => {
      expect(() => eventStore.append('run-001', null, {}))
        .toThrow(InvalidEventError);
    });

    test('should default data to empty object', () => {
      const runId = 'run-append-006';

      eventStore.append(runId, 'run.started');

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());

      expect(event.data).toEqual({});
    });

    test('should handle 100 appends without corruption', async () => {
      const runId = 'run-append-100';

      for (let i = 0; i < 100; i++) {
        eventStore.append(runId, 'step.completed', { stepId: `step-${i}`, index: i });
      }

      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = await fs.readFile(eventsFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(100);

      // Validate all lines are valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });

  describe('getEvents', () => {
    test('should return empty array if events file does not exist', async () => {
      const events = await eventStore.getEvents('non-existent-run');
      expect(events).toEqual([]);
    });

    test('should read and parse events correctly', async () => {
      const runId = 'run-get-001';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'phase.started', { phaseName: 'intelligence' });

      const events = await eventStore.getEvents(runId);

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('run.started');
      expect(events[1].event).toBe('phase.started');
    });

    test('should filter by eventType', async () => {
      const runId = 'run-get-002';
      eventStore.append(runId, 'run.started', {});
      eventStore.append(runId, 'phase.started', { phaseName: 'p1' });
      eventStore.append(runId, 'phase.completed', { phaseName: 'p1' });
      eventStore.append(runId, 'phase.started', { phaseName: 'p2' });

      const events = await eventStore.getEvents(runId, { eventType: 'phase.started' });

      expect(events).toHaveLength(2);
      expect(events[0].data.phaseName).toBe('p1');
      expect(events[1].data.phaseName).toBe('p2');
    });

    test('should filter by after timestamp', async () => {
      const runId = 'run-get-003';
      eventStore.append(runId, 'run.started', {});

      // Captura timestamp entre primeiro e segundo evento
      const afterTimestamp = new Date().toISOString();

      // Pequeno delay para garantir timestamps diferentes
      await new Promise(r => setTimeout(r, 10));

      eventStore.append(runId, 'phase.started', { phaseName: 'p1' });

      const events = await eventStore.getEvents(runId, { after: afterTimestamp });

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('phase.started');
    });

    test('should limit results', async () => {
      const runId = 'run-get-004';
      eventStore.append(runId, 'run.started', {});
      eventStore.append(runId, 'phase.started', {});
      eventStore.append(runId, 'step.started', {});
      eventStore.append(runId, 'step.completed', {});
      eventStore.append(runId, 'phase.completed', {});

      const events = await eventStore.getEvents(runId, { limit: 2 });

      expect(events).toHaveLength(2);
      // Limit takes last N events
      expect(events[0].event).toBe('step.completed');
      expect(events[1].event).toBe('phase.completed');
    });

    test('should handle corrupted lines gracefully', async () => {
      const runId = 'run-get-005';
      const runDir = path.join(testRunsDir, runId);
      await fs.mkdir(runDir, { recursive: true });

      // Escreve manualmente com uma linha corrupta
      const eventsFile = eventStore.getEventsFilePath(runId);
      const content = [
        JSON.stringify({ event: 'run.started', timestamp: new Date().toISOString(), runId, data: {} }),
        'THIS IS NOT VALID JSON',
        JSON.stringify({ event: 'phase.started', timestamp: new Date().toISOString(), runId, data: { phaseName: 'p1' } }),
      ].join('\n') + '\n';

      await fs.writeFile(eventsFile, content, 'utf8');

      const events = await eventStore.getEvents(runId);

      expect(events).toHaveLength(2); // Linha corrupta ignorada
      expect(events[0].event).toBe('run.started');
      expect(events[1].event).toBe('phase.started');
    });
  });

  describe('replay', () => {
    test('should return default state for empty events', async () => {
      const state = await eventStore.replay('non-existent-run');

      expect(state.runId).toBe('non-existent-run');
      expect(state.status).toBe('unknown');
      expect(state.squadId).toBeNull();
      expect(state.current_phase).toBeNull();
      expect(state.context).toEqual({});
      expect(state.phases_completed).toEqual([]);
      expect(state.steps_completed).toEqual([]);
    });

    test('should reconstruct state from run.started event', async () => {
      const runId = 'run-replay-001';
      eventStore.append(runId, 'run.started', {
        squadId: 'squad-copy',
        playbook: 'creative-pipeline',
        trigger: { type: 'manual', offerId: 'OFFER01' },
      });

      const state = await eventStore.replay(runId);

      expect(state.status).toBe('running');
      expect(state.squadId).toBe('squad-copy');
      expect(state.pipelineName).toBe('creative-pipeline');
      expect(state.trigger.type).toBe('manual');
      expect(state.started_at).toBeDefined();
    });

    test('should track phase started and completed', async () => {
      const runId = 'run-replay-002';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'phase.started', { phaseName: 'intelligence', phaseIndex: 0 });
      eventStore.append(runId, 'phase.completed', { phaseName: 'intelligence', status: 'completed', duration_ms: 5000 });

      const state = await eventStore.replay(runId);

      expect(state.phases_completed).toContain('intelligence');
      expect(state.current_phase).toBeNull(); // Phase completed, no current
    });

    test('should track step started and completed with output', async () => {
      const runId = 'run-replay-003';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'step.started', { stepId: 'fetch-data', stepType: 'task_pura' });
      eventStore.append(runId, 'step.completed', {
        stepId: 'fetch-data',
        status: 'completed',
        output: { data: [1, 2, 3] },
        duration_ms: 150,
      });

      const state = await eventStore.replay(runId);

      expect(state.steps_completed).toContain('fetch-data');
      expect(state.context['fetch-data']).toEqual({ output: { data: [1, 2, 3] } });
      expect(state.current_step).toBeNull();
    });

    test('should handle pause and resume events', async () => {
      const runId = 'run-replay-004';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.paused', { reason: 'user-request', current_step: 'step-2' });

      let state = await eventStore.replay(runId);
      expect(state.status).toBe('paused');
      expect(state.paused_at).toBeDefined();

      eventStore.append(runId, 'run.resumed', { resumed_at_step: 'step-2' });

      state = await eventStore.replay(runId);
      expect(state.status).toBe('running');
      expect(state.current_step).toBe('step-2');
    });

    test('should handle run.completed event', async () => {
      const runId = 'run-replay-005';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.completed', {
        status: 'completed',
        total_duration_ms: 25000,
        outputs_count: 4,
      });

      const state = await eventStore.replay(runId);

      expect(state.status).toBe('completed');
      expect(state.completed_at).toBeDefined();
      expect(state.total_duration_ms).toBe(25000);
    });

    test('should handle run.failed event', async () => {
      const runId = 'run-replay-006';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.failed', {
        error: 'API call failed',
        failed_step: 'generate-image',
        stack: 'Error: API call failed\n  at ...',
      });

      const state = await eventStore.replay(runId);

      expect(state.status).toBe('failed');
      expect(state.error).toBe('API call failed');
      expect(state.failed_step).toBe('generate-image');
    });

    test('should handle run.aborted event', async () => {
      const runId = 'run-replay-007';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.aborted', { reason: 'user-cancel', aborted_at_step: 'step-3' });

      const state = await eventStore.replay(runId);

      expect(state.status).toBe('aborted');
      expect(state.aborted_at).toBeDefined();
    });

    test('should reconstruct complete run state (AC5)', async () => {
      const runId = 'run-replay-full';

      // Simula run completo
      eventStore.append(runId, 'run.started', { squadId: 'squad-copy', playbook: 'pipeline', trigger: { type: 'manual' } });
      eventStore.append(runId, 'phase.started', { phaseName: 'intelligence', phaseIndex: 0 });
      eventStore.append(runId, 'step.started', { stepId: 'fetch-data', stepType: 'task_pura' });
      eventStore.append(runId, 'step.completed', { stepId: 'fetch-data', status: 'completed', output: { offer: 'data' }, duration_ms: 100 });
      eventStore.append(runId, 'step.started', { stepId: 'analyze', stepType: 'task_pura' });
      eventStore.append(runId, 'step.completed', { stepId: 'analyze', status: 'completed', output: { analysis: 'done' }, duration_ms: 200 });
      eventStore.append(runId, 'phase.completed', { phaseName: 'intelligence', status: 'completed', duration_ms: 300 });
      eventStore.append(runId, 'phase.started', { phaseName: 'production', phaseIndex: 1 });
      eventStore.append(runId, 'step.started', { stepId: 'generate', stepType: 'task_pura' });
      eventStore.append(runId, 'step.completed', { stepId: 'generate', status: 'completed', output: { creative: 'content' }, duration_ms: 500 });
      eventStore.append(runId, 'phase.completed', { phaseName: 'production', status: 'completed', duration_ms: 500 });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 800, outputs_count: 3 });

      const state = await eventStore.replay(runId);

      expect(state.runId).toBe(runId);
      expect(state.squadId).toBe('squad-copy');
      expect(state.status).toBe('completed');
      expect(state.phases_completed).toEqual(['intelligence', 'production']);
      expect(state.steps_completed).toEqual(['fetch-data', 'analyze', 'generate']);
      expect(state.context['fetch-data'].output).toEqual({ offer: 'data' });
      expect(state.context['analyze'].output).toEqual({ analysis: 'done' });
      expect(state.context['generate'].output).toEqual({ creative: 'content' });
      expect(state.total_duration_ms).toBe(800);
      expect(state.started_at).toBeDefined();
      expect(state.completed_at).toBeDefined();
    });

    test('should not duplicate phases in phases_completed', async () => {
      const runId = 'run-replay-dedup';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'phase.completed', { phaseName: 'intelligence' });
      eventStore.append(runId, 'phase.completed', { phaseName: 'intelligence' }); // duplicate

      const state = await eventStore.replay(runId);

      expect(state.phases_completed).toHaveLength(1);
    });

    test('should not duplicate steps in steps_completed', async () => {
      const runId = 'run-replay-dedup-steps';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'step.completed', { stepId: 'fetch', output: 'v1' });
      eventStore.append(runId, 'step.completed', { stepId: 'fetch', output: 'v2' }); // duplicate

      const state = await eventStore.replay(runId);

      expect(state.steps_completed).toHaveLength(1);
    });

    test('should ignore unknown event types gracefully', async () => {
      const runId = 'run-replay-unknown';
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'custom.unknown.event', { some: 'data' });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 100 });

      const state = await eventStore.replay(runId);

      expect(state.status).toBe('completed');
    });
  });
});
