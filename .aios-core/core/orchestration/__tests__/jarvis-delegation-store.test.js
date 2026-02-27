/**
 * Jarvis Delegation Store - Unit Tests
 *
 * Comprehensive tests for append-only event log, replay, index management,
 * and delegation-specific query methods.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const {
  JarvisDelegationStore,
  InvalidDelegationError,
  DelegationStateError,
  DELEGATION_EVENTS,
  TERMINAL_STATES,
  generateDelegationId,
} = require('../jarvis-delegation-store');

describe('JarvisDelegationStore', () => {
  let store;
  let tmpDir;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `jarvis-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    store = new JarvisDelegationStore(tmpDir);
  });

  afterEach(() => {
    try {
      fsSync.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignora erros de remoção
    }
  });

  // ===========================================================================
  // 1. Constructor & Initialization
  // ===========================================================================

  describe('constructor', () => {
    test('should create instance with default storeDir', () => {
      const defaultStore = new JarvisDelegationStore();
      expect(defaultStore.storeDir).toBe('.aios/jarvis/delegations');
    });

    test('should create instance with custom storeDir', () => {
      expect(store.storeDir).toBe(tmpDir);
    });
  });

  describe('getEventsFilePath', () => {
    test('should return correct path for delegation events file', () => {
      const filePath = store.getEventsFilePath('del-abc123-xyz');
      expect(filePath).toBe(path.join(tmpDir, 'del-abc123-xyz.jsonl'));
    });
  });

  describe('getIndexFilePath', () => {
    test('should return correct path for index file', () => {
      const filePath = store.getIndexFilePath();
      expect(filePath).toBe(path.join(tmpDir, 'index.json'));
    });
  });

  // ===========================================================================
  // 2. append() — Core Operation
  // ===========================================================================

  describe('append', () => {
    test('should append event to JSONL file', () => {
      const delegationId = 'del-test-001';

      store.append(delegationId, 'delegation.created', { task: 'review PR' });

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());

      expect(event.event).toBe('delegation.created');
      expect(event.delegationId).toBe(delegationId);
      expect(event.data.task).toBe('review PR');
    });

    test('should create directory if not exists', () => {
      const delegationId = 'del-test-002';

      // tmpDir does not exist yet (beforeEach only sets the path)
      expect(fsSync.existsSync(tmpDir)).toBe(false);

      store.append(delegationId, 'delegation.created', {});

      expect(fsSync.existsSync(tmpDir)).toBe(true);
      const eventsFile = store.getEventsFilePath(delegationId);
      expect(fsSync.existsSync(eventsFile)).toBe(true);
    });

    test('should throw InvalidDelegationError when delegationId is missing', () => {
      expect(() => store.append(null, 'delegation.created', {}))
        .toThrow(InvalidDelegationError);
      expect(() => store.append('', 'delegation.created', {}))
        .toThrow(InvalidDelegationError);
      expect(() => store.append(undefined, 'delegation.created', {}))
        .toThrow(InvalidDelegationError);
    });

    test('should throw InvalidDelegationError when eventType is missing', () => {
      expect(() => store.append('del-001', null, {}))
        .toThrow(InvalidDelegationError);
      expect(() => store.append('del-001', '', {}))
        .toThrow(InvalidDelegationError);
      expect(() => store.append('del-001', undefined, {}))
        .toThrow(InvalidDelegationError);
    });

    test('should throw InvalidDelegationError for invalid eventType', () => {
      expect(() => store.append('del-001', 'invalid.event', {}))
        .toThrow(InvalidDelegationError);
      expect(() => store.append('del-001', 'run.started', {}))
        .toThrow(InvalidDelegationError);
    });

    test('should write valid JSON per line', () => {
      const delegationId = 'del-test-jsonl';

      store.append(delegationId, 'delegation.created', { task: 'task1' });
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.completed', { outcome: 'success' });

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }

      expect(JSON.parse(lines[0]).event).toBe('delegation.created');
      expect(JSON.parse(lines[1]).event).toBe('delegation.in_progress');
      expect(JSON.parse(lines[2]).event).toBe('delegation.completed');
    });

    test('should include timestamp in ISO format', () => {
      const delegationId = 'del-test-ts';
      const before = new Date().toISOString();

      store.append(delegationId, 'delegation.created', {});

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());
      const after = new Date().toISOString();

      expect(event.timestamp).toBeDefined();
      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
      // Validate ISO 8601 format
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    });

    test('should default data to empty object when not provided', () => {
      const delegationId = 'del-test-default-data';

      store.append(delegationId, 'delegation.created');

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const event = JSON.parse(content.trim());

      expect(event.data).toEqual({});
    });

    test('should append multiple events without overwriting', () => {
      const delegationId = 'del-test-multi';

      store.append(delegationId, 'delegation.created', { task: 'build feature' });
      store.append(delegationId, 'delegation.accepted', {});
      store.append(delegationId, 'delegation.in_progress', {});

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = fsSync.readFileSync(eventsFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
    });
  });

  // ===========================================================================
  // 3. getEvents() — Reading
  // ===========================================================================

  describe('getEvents', () => {
    test('should return all events for a delegation', async () => {
      const delegationId = 'del-get-001';

      store.append(delegationId, 'delegation.created', { task: 'build' });
      store.append(delegationId, 'delegation.in_progress', {});

      const events = await store.getEvents(delegationId);

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('delegation.created');
      expect(events[1].event).toBe('delegation.in_progress');
    });

    test('should return empty array for non-existent delegation', async () => {
      const events = await store.getEvents('del-nonexistent');
      expect(events).toEqual([]);
    });

    test('should filter by eventType', async () => {
      const delegationId = 'del-get-filter';

      store.append(delegationId, 'delegation.created', { task: 'task1' });
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.feedback', { outcome: 'good' });
      store.append(delegationId, 'delegation.feedback', { outcome: 'excellent' });

      const events = await store.getEvents(delegationId, { eventType: 'delegation.feedback' });

      expect(events).toHaveLength(2);
      expect(events[0].data.outcome).toBe('good');
      expect(events[1].data.outcome).toBe('excellent');
    });

    test('should filter by after timestamp', async () => {
      const delegationId = 'del-get-after';

      store.append(delegationId, 'delegation.created', { task: 'build' });

      const afterTimestamp = new Date().toISOString();
      await new Promise(r => setTimeout(r, 10));

      store.append(delegationId, 'delegation.in_progress', {});

      const events = await store.getEvents(delegationId, { after: afterTimestamp });

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('delegation.in_progress');
    });

    test('should limit results (takes last N events)', async () => {
      const delegationId = 'del-get-limit';

      store.append(delegationId, 'delegation.created', {});
      store.append(delegationId, 'delegation.accepted', {});
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.completed', { outcome: 'done' });

      const events = await store.getEvents(delegationId, { limit: 2 });

      expect(events).toHaveLength(2);
      // limit takes last N events (slice(-limit))
      expect(events[0].event).toBe('delegation.in_progress');
      expect(events[1].event).toBe('delegation.completed');
    });

    test('should handle malformed JSON lines gracefully', async () => {
      const delegationId = 'del-get-corrupt';
      fsSync.mkdirSync(tmpDir, { recursive: true });

      const eventsFile = store.getEventsFilePath(delegationId);
      const content = [
        JSON.stringify({ event: 'delegation.created', timestamp: new Date().toISOString(), delegationId, data: { task: 'test' } }),
        'THIS IS NOT VALID JSON',
        '{ broken json without closing',
        JSON.stringify({ event: 'delegation.in_progress', timestamp: new Date().toISOString(), delegationId, data: {} }),
      ].join('\n') + '\n';

      await fs.writeFile(eventsFile, content, 'utf8');

      const events = await store.getEvents(delegationId);

      expect(events).toHaveLength(2); // Malformed lines ignored
      expect(events[0].event).toBe('delegation.created');
      expect(events[1].event).toBe('delegation.in_progress');
    });
  });

  // ===========================================================================
  // 4. replay() — State Reconstruction
  // ===========================================================================

  describe('replay', () => {
    test('should return empty state for no events', async () => {
      const state = await store.replay('del-nonexistent');

      expect(state.delegationId).toBe('del-nonexistent');
      expect(state.delegatedTo).toBeNull();
      expect(state.delegatedBy).toBeNull();
      expect(state.task).toBeNull();
      expect(state.businessContext).toBeNull();
      expect(state.priority).toBeNull();
      expect(state.status).toBe('unknown');
      expect(state.created_at).toBeNull();
      expect(state.completed_at).toBeNull();
      expect(state.duration_ms).toBeNull();
      expect(state.outcome).toBeNull();
      expect(state.feedback).toBeNull();
      expect(state.events_count).toBe(0);
    });

    test('should reconstruct state from delegation.created', async () => {
      const delegationId = 'del-replay-created';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'implement login feature',
        businessContext: 'user onboarding flow',
        priority: 'high',
      });

      const state = await store.replay(delegationId);

      expect(state.status).toBe('created');
      expect(state.delegatedTo).toBe('@dev');
      expect(state.delegatedBy).toBe('jarvis');
      expect(state.task).toBe('implement login feature');
      expect(state.businessContext).toBe('user onboarding flow');
      expect(state.priority).toBe('high');
      expect(state.created_at).toBeDefined();
      expect(state.events_count).toBe(1);
    });

    test('should track status through delegation.in_progress', async () => {
      const delegationId = 'del-replay-progress';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'fix bug',
        priority: 'medium',
      });
      store.append(delegationId, 'delegation.accepted', {});
      store.append(delegationId, 'delegation.in_progress', {});

      const state = await store.replay(delegationId);

      expect(state.status).toBe('in_progress');
      expect(state.events_count).toBe(3);
    });

    test('should track status through delegation.completed with outcome and duration', async () => {
      const delegationId = 'del-replay-completed';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'deploy service',
        priority: 'critical',
      });
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.completed', {
        outcome: 'Service deployed successfully to production',
        duration_ms: 45000,
      });

      const state = await store.replay(delegationId);

      expect(state.status).toBe('completed');
      expect(state.outcome).toBe('Service deployed successfully to production');
      expect(state.duration_ms).toBe(45000);
      expect(state.completed_at).toBeDefined();
      expect(state.events_count).toBe(3);
    });

    test('should track status through delegation.failed', async () => {
      const delegationId = 'del-replay-failed';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'migrate database',
        priority: 'high',
      });
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.failed', {
        outcome: 'Migration failed: connection timeout',
      });

      const state = await store.replay(delegationId);

      expect(state.status).toBe('failed');
      expect(state.outcome).toBe('Migration failed: connection timeout');
      expect(state.events_count).toBe(3);
    });

    test('should track status through delegation.escalated', async () => {
      const delegationId = 'del-replay-escalated';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'resolve production incident',
        priority: 'critical',
      });
      store.append(delegationId, 'delegation.escalated', {
        escalatedTo: '@architect',
        reason: 'requires architectural decision',
      });

      const state = await store.replay(delegationId);

      expect(state.status).toBe('escalated');
      expect(state.events_count).toBe(2);
    });

    test('should track status through delegation.cancelled', async () => {
      const delegationId = 'del-replay-cancelled';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@qa',
        delegatedBy: 'jarvis',
        task: 'run regression tests',
        priority: 'low',
      });
      store.append(delegationId, 'delegation.cancelled', {
        reason: 'requirements changed',
      });

      const state = await store.replay(delegationId);

      expect(state.status).toBe('cancelled');
      expect(state.events_count).toBe(2);
    });

    test('should handle delegation.feedback', async () => {
      const delegationId = 'del-replay-feedback';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'implement feature X',
        priority: 'medium',
      });
      store.append(delegationId, 'delegation.completed', {
        outcome: 'Feature implemented',
        duration_ms: 60000,
      });
      store.append(delegationId, 'delegation.feedback', {
        outcome: 'Great work, exceeded expectations',
      });

      const state = await store.replay(delegationId);

      expect(state.feedback).toBe('Great work, exceeded expectations');
      expect(state.status).toBe('completed'); // feedback does not change status
      expect(state.events_count).toBe(3);
    });

    test('should count events correctly', async () => {
      const delegationId = 'del-replay-count';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'build',
        priority: 'medium',
      });
      store.append(delegationId, 'delegation.accepted', {});
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.completed', { outcome: 'done', duration_ms: 1000 });
      store.append(delegationId, 'delegation.feedback', { outcome: 'good job' });

      const state = await store.replay(delegationId);

      expect(state.events_count).toBe(5);
    });

    test('should ignore unknown event types gracefully', async () => {
      const delegationId = 'del-replay-unknown';

      // Manually write an event with unknown type into the JSONL file
      fsSync.mkdirSync(tmpDir, { recursive: true });
      const eventsFile = store.getEventsFilePath(delegationId);

      const events = [
        JSON.stringify({ event: 'delegation.created', timestamp: new Date().toISOString(), delegationId, data: { delegatedTo: '@dev', delegatedBy: 'jarvis', task: 'test', priority: 'low' } }),
        JSON.stringify({ event: 'delegation.unknown_type', timestamp: new Date().toISOString(), delegationId, data: { foo: 'bar' } }),
        JSON.stringify({ event: 'delegation.in_progress', timestamp: new Date().toISOString(), delegationId, data: {} }),
      ];
      fsSync.writeFileSync(eventsFile, events.join('\n') + '\n', 'utf8');

      const state = await store.replay(delegationId);

      expect(state.status).toBe('in_progress');
      expect(state.delegatedTo).toBe('@dev');
      expect(state.events_count).toBe(3);
    });

    test('should reconstruct complete delegation lifecycle', async () => {
      const delegationId = 'del-replay-full';

      store.append(delegationId, 'delegation.created', {
        delegatedTo: '@dev',
        delegatedBy: 'jarvis',
        task: 'implement full feature',
        businessContext: 'Q1 deliverable',
        priority: 'high',
      });
      store.append(delegationId, 'delegation.accepted', {});
      store.append(delegationId, 'delegation.in_progress', {});
      store.append(delegationId, 'delegation.completed', {
        outcome: 'Feature shipped to production',
        duration_ms: 120000,
      });
      store.append(delegationId, 'delegation.feedback', {
        outcome: 'CEO approved, users love it',
      });

      const state = await store.replay(delegationId);

      expect(state.delegationId).toBe(delegationId);
      expect(state.delegatedTo).toBe('@dev');
      expect(state.delegatedBy).toBe('jarvis');
      expect(state.task).toBe('implement full feature');
      expect(state.businessContext).toBe('Q1 deliverable');
      expect(state.priority).toBe('high');
      expect(state.status).toBe('completed');
      expect(state.outcome).toBe('Feature shipped to production');
      expect(state.duration_ms).toBe(120000);
      expect(state.feedback).toBe('CEO approved, users love it');
      expect(state.created_at).toBeDefined();
      expect(state.completed_at).toBeDefined();
      expect(state.events_count).toBe(5);
    });
  });

  // ===========================================================================
  // 5. createDelegation()
  // ===========================================================================

  describe('createDelegation', () => {
    test('should create delegation with generated ID', () => {
      const delegationId = store.createDelegation(
        'implement login',
        '@dev',
        'user onboarding flow',
        'high',
      );

      expect(delegationId).toBeDefined();
      expect(typeof delegationId).toBe('string');
      expect(delegationId.length).toBeGreaterThan(0);
    });

    test('should append delegation.created event', async () => {
      const delegationId = store.createDelegation(
        'build API',
        '@dev',
        'backend service',
        'medium',
      );

      const events = await store.getEvents(delegationId);

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('delegation.created');
      expect(events[0].data.task).toBe('build API');
      expect(events[0].data.delegatedTo).toBe('@dev');
      expect(events[0].data.delegatedBy).toBe('jarvis');
      expect(events[0].data.businessContext).toBe('backend service');
      expect(events[0].data.priority).toBe('medium');
    });

    test('should update index synchronously', () => {
      const delegationId = store.createDelegation(
        'deploy service',
        '@devops',
        'production release',
        'critical',
      );

      const indexFile = store.getIndexFilePath();
      expect(fsSync.existsSync(indexFile)).toBe(true);

      const index = JSON.parse(fsSync.readFileSync(indexFile, 'utf8'));
      expect(index.delegations[delegationId]).toBeDefined();
      expect(index.delegations[delegationId].status).toBe('created');
      expect(index.delegations[delegationId].delegatedTo).toBe('@devops');
      expect(index.delegations[delegationId].task).toBe('deploy service');
      expect(index.delegations[delegationId].priority).toBe('critical');
      expect(index.delegations[delegationId].createdAt).toBeDefined();
      expect(index.delegations[delegationId].completedAt).toBeNull();
    });

    test('should throw InvalidDelegationError when task is missing', () => {
      expect(() => store.createDelegation(null, '@dev', 'context'))
        .toThrow(InvalidDelegationError);
      expect(() => store.createDelegation('', '@dev', 'context'))
        .toThrow(InvalidDelegationError);
      expect(() => store.createDelegation(undefined, '@dev', 'context'))
        .toThrow(InvalidDelegationError);
    });

    test('should throw InvalidDelegationError when delegatedTo is missing', () => {
      expect(() => store.createDelegation('task', null, 'context'))
        .toThrow(InvalidDelegationError);
      expect(() => store.createDelegation('task', '', 'context'))
        .toThrow(InvalidDelegationError);
      expect(() => store.createDelegation('task', undefined, 'context'))
        .toThrow(InvalidDelegationError);
    });

    test('should set delegatedBy to jarvis', async () => {
      const delegationId = store.createDelegation(
        'review code',
        '@qa',
        'quality assurance',
      );

      const events = await store.getEvents(delegationId);
      expect(events[0].data.delegatedBy).toBe('jarvis');
    });

    test('should return delegationId matching del-{base36}-{random} pattern', () => {
      const delegationId = store.createDelegation(
        'some task',
        '@dev',
        'some context',
      );

      // Pattern: del-{base36timestamp}-{random6chars}
      expect(delegationId).toMatch(/^del-[a-z0-9]+-[a-z0-9]+$/);
    });

    test('should use default priority of medium', async () => {
      const delegationId = store.createDelegation(
        'default priority task',
        '@dev',
        'context',
      );

      const events = await store.getEvents(delegationId);
      expect(events[0].data.priority).toBe('medium');
    });

    test('should pass metadata through to the event', async () => {
      const delegationId = store.createDelegation(
        'metadata task',
        '@dev',
        'context',
        'high',
        { storyId: 'STORY-42', epic: 'EPIC-5' },
      );

      const events = await store.getEvents(delegationId);
      expect(events[0].data.metadata).toEqual({ storyId: 'STORY-42', epic: 'EPIC-5' });
    });
  });

  // ===========================================================================
  // 6. updateStatus()
  // ===========================================================================

  describe('updateStatus', () => {
    test('should update status and append event', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'accepted', {});

      const events = await store.getEvents(delegationId);
      expect(events).toHaveLength(2);
      expect(events[1].event).toBe('delegation.accepted');
    });

    test('should update index with new status', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'in_progress', {});

      const index = JSON.parse(await fs.readFile(store.getIndexFilePath(), 'utf8'));
      expect(index.delegations[delegationId].status).toBe('in_progress');
    });

    test('should set completedAt for terminal states (completed)', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'completed', { outcome: 'done', duration_ms: 5000 });

      const index = JSON.parse(await fs.readFile(store.getIndexFilePath(), 'utf8'));
      expect(index.delegations[delegationId].completedAt).toBeDefined();
      expect(index.delegations[delegationId].duration_ms).toBe(5000);
    });

    test('should set completedAt for terminal states (failed)', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'failed', { outcome: 'error occurred' });

      const index = JSON.parse(await fs.readFile(store.getIndexFilePath(), 'utf8'));
      expect(index.delegations[delegationId].completedAt).toBeDefined();
      expect(index.delegations[delegationId].status).toBe('failed');
    });

    test('should set completedAt for terminal states (cancelled)', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'cancelled', {});

      const index = JSON.parse(await fs.readFile(store.getIndexFilePath(), 'utf8'));
      expect(index.delegations[delegationId].completedAt).toBeDefined();
      expect(index.delegations[delegationId].status).toBe('cancelled');
    });

    test('should save duration_ms for completed status', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await store.updateStatus(delegationId, 'completed', { duration_ms: 30000 });

      const index = JSON.parse(await fs.readFile(store.getIndexFilePath(), 'utf8'));
      expect(index.delegations[delegationId].duration_ms).toBe(30000);
    });

    test('should reject invalid status', async () => {
      const delegationId = store.createDelegation('task', '@dev', 'context');

      await expect(store.updateStatus(delegationId, 'invalid_status', {}))
        .rejects.toThrow(InvalidDelegationError);
      await expect(store.updateStatus(delegationId, 'running', {}))
        .rejects.toThrow(InvalidDelegationError);
    });
  });

  // ===========================================================================
  // 7. getDelegation()
  // ===========================================================================

  describe('getDelegation', () => {
    test('should return full state via replay', async () => {
      const delegationId = store.createDelegation('build feature', '@dev', 'Q1 goals', 'high');

      await store.updateStatus(delegationId, 'in_progress', {});

      const state = await store.getDelegation(delegationId);

      expect(state.delegationId).toBe(delegationId);
      expect(state.status).toBe('in_progress');
      expect(state.task).toBe('build feature');
      expect(state.delegatedTo).toBe('@dev');
      expect(state.delegatedBy).toBe('jarvis');
      expect(state.priority).toBe('high');
      expect(state.events_count).toBe(2);
    });

    test('should return unknown state for non-existent delegation', async () => {
      const state = await store.getDelegation('del-doesnotexist');

      expect(state.status).toBe('unknown');
      expect(state.events_count).toBe(0);
    });
  });

  // ===========================================================================
  // 8. getActiveDelegations()
  // ===========================================================================

  describe('getActiveDelegations', () => {
    test('should return only non-terminal delegations', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@qa', 'ctx');
      const del3 = store.createDelegation('task3', '@dev', 'ctx');
      const del4 = store.createDelegation('task4', '@architect', 'ctx');

      await store.updateStatus(del2, 'completed', { outcome: 'done' });
      await store.updateStatus(del3, 'failed', { outcome: 'error' });
      await store.updateStatus(del4, 'in_progress', {});

      const active = await store.getActiveDelegations();

      const activeIds = active.map(d => d.delegationId);
      expect(activeIds).toContain(del1); // created (active)
      expect(activeIds).not.toContain(del2); // completed (terminal)
      expect(activeIds).not.toContain(del3); // failed (terminal)
      expect(activeIds).toContain(del4); // in_progress (active)
    });

    test('should exclude completed, failed, cancelled delegations', async () => {
      const del1 = store.createDelegation('complete-task', '@dev', 'ctx');
      const del2 = store.createDelegation('fail-task', '@dev', 'ctx');
      const del3 = store.createDelegation('cancel-task', '@dev', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done' });
      await store.updateStatus(del2, 'failed', { outcome: 'error' });
      await store.updateStatus(del3, 'cancelled', {});

      const active = await store.getActiveDelegations();

      expect(active).toHaveLength(0);
    });

    test('should include created, accepted, in_progress, escalated delegations', async () => {
      const del1 = store.createDelegation('created-task', '@dev', 'ctx');
      const del2 = store.createDelegation('accepted-task', '@dev', 'ctx');
      const del3 = store.createDelegation('progress-task', '@dev', 'ctx');
      const del4 = store.createDelegation('escalated-task', '@dev', 'ctx');

      await store.updateStatus(del2, 'accepted', {});
      await store.updateStatus(del3, 'in_progress', {});
      await store.updateStatus(del4, 'escalated', {});

      const active = await store.getActiveDelegations();

      expect(active).toHaveLength(4);
      const activeIds = active.map(d => d.delegationId);
      expect(activeIds).toContain(del1);
      expect(activeIds).toContain(del2);
      expect(activeIds).toContain(del3);
      expect(activeIds).toContain(del4);
    });

    test('should return empty array when no delegations exist', async () => {
      const active = await store.getActiveDelegations();
      expect(active).toEqual([]);
    });
  });

  // ===========================================================================
  // 9. getAgentPerformance()
  // ===========================================================================

  describe('getAgentPerformance', () => {
    test('should calculate correct metrics', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@dev', 'ctx');
      const del3 = store.createDelegation('task3', '@dev', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done', duration_ms: 10000 });
      await store.updateStatus(del2, 'completed', { outcome: 'done', duration_ms: 20000 });
      await store.updateStatus(del3, 'failed', { outcome: 'error' });

      const perf = await store.getAgentPerformance('@dev');

      expect(perf.totalDelegations).toBe(3);
      expect(perf.completed).toBe(2);
      expect(perf.failed).toBe(1);
      expect(perf.avgDuration_ms).toBe(15000); // (10000 + 20000) / 2
      expect(perf.successRate).toBeCloseTo(0.67, 1); // 2 / 3 = 0.666... rounded
    });

    test('should return null avgDuration when no completed delegations', async () => {
      store.createDelegation('task1', '@qa', 'ctx');

      const perf = await store.getAgentPerformance('@qa');

      expect(perf.totalDelegations).toBe(1);
      expect(perf.completed).toBe(0);
      expect(perf.avgDuration_ms).toBeNull();
    });

    test('should return null successRate when no terminal delegations', async () => {
      store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@dev', 'ctx');
      await store.updateStatus(del2, 'in_progress', {});

      const perf = await store.getAgentPerformance('@dev');

      expect(perf.totalDelegations).toBe(2);
      expect(perf.completed).toBe(0);
      expect(perf.failed).toBe(0);
      expect(perf.successRate).toBeNull();
    });

    test('should calculate successRate correctly (100%)', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@dev', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done', duration_ms: 5000 });
      await store.updateStatus(del2, 'completed', { outcome: 'done', duration_ms: 8000 });

      const perf = await store.getAgentPerformance('@dev');

      expect(perf.successRate).toBe(1);
    });

    test('should calculate successRate correctly (0%)', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@dev', 'ctx');

      await store.updateStatus(del1, 'failed', { outcome: 'error' });
      await store.updateStatus(del2, 'failed', { outcome: 'error' });

      const perf = await store.getAgentPerformance('@dev');

      expect(perf.successRate).toBe(0);
    });

    test('should only consider delegations for the specified agent', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@qa', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done', duration_ms: 5000 });
      await store.updateStatus(del2, 'failed', { outcome: 'error' });

      const devPerf = await store.getAgentPerformance('@dev');
      expect(devPerf.totalDelegations).toBe(1);
      expect(devPerf.completed).toBe(1);
      expect(devPerf.failed).toBe(0);
      expect(devPerf.successRate).toBe(1);

      const qaPerf = await store.getAgentPerformance('@qa');
      expect(qaPerf.totalDelegations).toBe(1);
      expect(qaPerf.completed).toBe(0);
      expect(qaPerf.failed).toBe(1);
      expect(qaPerf.successRate).toBe(0);
    });

    test('should return zero metrics for unknown agent', async () => {
      store.createDelegation('task1', '@dev', 'ctx');

      const perf = await store.getAgentPerformance('@unknown');

      expect(perf.totalDelegations).toBe(0);
      expect(perf.completed).toBe(0);
      expect(perf.failed).toBe(0);
      expect(perf.avgDuration_ms).toBeNull();
      expect(perf.successRate).toBeNull();
    });
  });

  // ===========================================================================
  // 10. getDelegationHistory()
  // ===========================================================================

  describe('getDelegationHistory', () => {
    test('should return all delegations from index', async () => {
      store.createDelegation('task1', '@dev', 'ctx');
      store.createDelegation('task2', '@qa', 'ctx');
      store.createDelegation('task3', '@architect', 'ctx');

      const history = await store.getDelegationHistory();

      expect(history).toHaveLength(3);
    });

    test('should filter by agentId', async () => {
      store.createDelegation('task1', '@dev', 'ctx');
      store.createDelegation('task2', '@qa', 'ctx');
      store.createDelegation('task3', '@dev', 'ctx');

      const history = await store.getDelegationHistory({ agentId: '@dev' });

      expect(history).toHaveLength(2);
      history.forEach(d => expect(d.delegatedTo).toBe('@dev'));
    });

    test('should filter by status', async () => {
      const del1 = store.createDelegation('task1', '@dev', 'ctx');
      const del2 = store.createDelegation('task2', '@dev', 'ctx');
      store.createDelegation('task3', '@dev', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done' });
      await store.updateStatus(del2, 'completed', { outcome: 'done' });

      const history = await store.getDelegationHistory({ status: 'completed' });

      expect(history).toHaveLength(2);
      history.forEach(d => expect(d.status).toBe('completed'));
    });

    test('should filter by after timestamp', async () => {
      store.createDelegation('old-task', '@dev', 'ctx');

      const afterTimestamp = new Date().toISOString();
      await new Promise(r => setTimeout(r, 10));

      store.createDelegation('new-task', '@dev', 'ctx');

      const history = await store.getDelegationHistory({ after: afterTimestamp });

      expect(history).toHaveLength(1);
      expect(history[0].task).toBe('new-task');
    });

    test('should filter by before timestamp', async () => {
      store.createDelegation('old-task', '@dev', 'ctx');

      await new Promise(r => setTimeout(r, 10));
      const beforeTimestamp = new Date().toISOString();
      await new Promise(r => setTimeout(r, 10));

      store.createDelegation('new-task', '@dev', 'ctx');

      const history = await store.getDelegationHistory({ before: beforeTimestamp });

      expect(history).toHaveLength(1);
      expect(history[0].task).toBe('old-task');
    });

    test('should limit results', async () => {
      store.createDelegation('task1', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 5));
      store.createDelegation('task2', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 5));
      store.createDelegation('task3', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 5));
      store.createDelegation('task4', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 5));
      store.createDelegation('task5', '@dev', 'ctx');

      const history = await store.getDelegationHistory({ limit: 3 });

      expect(history).toHaveLength(3);
    });

    test('should sort by createdAt descending (most recent first)', async () => {
      store.createDelegation('first', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 10));
      store.createDelegation('second', '@dev', 'ctx');
      await new Promise(r => setTimeout(r, 10));
      store.createDelegation('third', '@dev', 'ctx');

      const history = await store.getDelegationHistory();

      expect(history).toHaveLength(3);
      expect(history[0].task).toBe('third');
      expect(history[1].task).toBe('second');
      expect(history[2].task).toBe('first');
    });

    test('should return empty array when no delegations exist', async () => {
      const history = await store.getDelegationHistory();
      expect(history).toEqual([]);
    });

    test('should combine multiple filters', async () => {
      const del1 = store.createDelegation('dev-task1', '@dev', 'ctx');
      store.createDelegation('qa-task1', '@qa', 'ctx');
      const del3 = store.createDelegation('dev-task2', '@dev', 'ctx');

      await store.updateStatus(del1, 'completed', { outcome: 'done' });
      await store.updateStatus(del3, 'completed', { outcome: 'done' });

      const history = await store.getDelegationHistory({
        agentId: '@dev',
        status: 'completed',
      });

      expect(history).toHaveLength(2);
      history.forEach(d => {
        expect(d.delegatedTo).toBe('@dev');
        expect(d.status).toBe('completed');
      });
    });
  });

  // ===========================================================================
  // 11. Index Management
  // ===========================================================================

  describe('Index Management', () => {
    test('_loadIndex should return empty structure when no file exists', async () => {
      const index = await store._loadIndex();

      expect(index).toEqual({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });
    });

    test('_loadIndexSync should return empty structure when no file exists', () => {
      const index = store._loadIndexSync();

      expect(index).toEqual({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });
    });

    test('_saveIndex should write valid JSON', async () => {
      const index = {
        version: '1.0',
        lastUpdated: null,
        delegations: {
          'del-test-001': {
            delegatedTo: '@dev',
            task: 'test task',
            status: 'created',
          },
        },
      };

      await store._saveIndex(index);

      const indexFile = store.getIndexFilePath();
      const content = await fs.readFile(indexFile, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0');
      expect(parsed.lastUpdated).toBeDefined();
      expect(parsed.delegations['del-test-001'].task).toBe('test task');
    });

    test('_saveIndex should set lastUpdated timestamp', async () => {
      const before = new Date().toISOString();

      await store._saveIndex({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });

      const after = new Date().toISOString();
      const indexFile = store.getIndexFilePath();
      const content = await fs.readFile(indexFile, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.lastUpdated >= before).toBe(true);
      expect(parsed.lastUpdated <= after).toBe(true);
    });

    test('_saveIndex should create directory if not exists', async () => {
      const nestedDir = path.join(tmpDir, 'nested', 'deep');
      const nestedStore = new JarvisDelegationStore(nestedDir);

      await nestedStore._saveIndex({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });

      expect(fsSync.existsSync(nestedDir)).toBe(true);
    });

    test('_updateIndex should merge fields correctly', async () => {
      // First, create initial index entry
      await store._updateIndex('del-merge-001', {
        delegatedTo: '@dev',
        task: 'original task',
        status: 'created',
      });

      // Then update with partial fields
      await store._updateIndex('del-merge-001', {
        status: 'in_progress',
      });

      const index = await store._loadIndex();

      expect(index.delegations['del-merge-001'].delegatedTo).toBe('@dev');
      expect(index.delegations['del-merge-001'].task).toBe('original task');
      expect(index.delegations['del-merge-001'].status).toBe('in_progress');
    });

    test('_updateIndexSync should merge fields correctly', () => {
      store._updateIndexSync('del-sync-001', {
        delegatedTo: '@qa',
        task: 'sync task',
        status: 'created',
      });

      store._updateIndexSync('del-sync-001', {
        status: 'completed',
        completedAt: '2026-01-01T00:00:00.000Z',
      });

      const index = store._loadIndexSync();

      expect(index.delegations['del-sync-001'].delegatedTo).toBe('@qa');
      expect(index.delegations['del-sync-001'].task).toBe('sync task');
      expect(index.delegations['del-sync-001'].status).toBe('completed');
      expect(index.delegations['del-sync-001'].completedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    test('_updateIndex should create entry for new delegationId', async () => {
      await store._updateIndex('del-new-001', {
        delegatedTo: '@dev',
        status: 'created',
      });

      const index = await store._loadIndex();
      expect(index.delegations['del-new-001']).toBeDefined();
      expect(index.delegations['del-new-001'].delegatedTo).toBe('@dev');
    });

    test('_loadIndex should handle corrupted index file gracefully', async () => {
      fsSync.mkdirSync(tmpDir, { recursive: true });
      const indexFile = store.getIndexFilePath();
      await fs.writeFile(indexFile, 'NOT VALID JSON!!!', 'utf8');

      const index = await store._loadIndex();

      expect(index).toEqual({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });
    });

    test('_loadIndexSync should handle corrupted index file gracefully', () => {
      fsSync.mkdirSync(tmpDir, { recursive: true });
      const indexFile = store.getIndexFilePath();
      fsSync.writeFileSync(indexFile, 'NOT VALID JSON!!!', 'utf8');

      const index = store._loadIndexSync();

      expect(index).toEqual({
        version: '1.0',
        lastUpdated: null,
        delegations: {},
      });
    });
  });

  // ===========================================================================
  // Exports & Constants
  // ===========================================================================

  describe('exports and constants', () => {
    test('should export all expected symbols', () => {
      expect(JarvisDelegationStore).toBeDefined();
      expect(InvalidDelegationError).toBeDefined();
      expect(DelegationStateError).toBeDefined();
      expect(DELEGATION_EVENTS).toBeDefined();
      expect(TERMINAL_STATES).toBeDefined();
      expect(generateDelegationId).toBeDefined();
    });

    test('DELEGATION_EVENTS should contain all 8 event types', () => {
      expect(DELEGATION_EVENTS).toHaveLength(8);
      expect(DELEGATION_EVENTS).toContain('delegation.created');
      expect(DELEGATION_EVENTS).toContain('delegation.accepted');
      expect(DELEGATION_EVENTS).toContain('delegation.in_progress');
      expect(DELEGATION_EVENTS).toContain('delegation.completed');
      expect(DELEGATION_EVENTS).toContain('delegation.failed');
      expect(DELEGATION_EVENTS).toContain('delegation.escalated');
      expect(DELEGATION_EVENTS).toContain('delegation.cancelled');
      expect(DELEGATION_EVENTS).toContain('delegation.feedback');
    });

    test('TERMINAL_STATES should contain completed, failed, cancelled', () => {
      expect(TERMINAL_STATES).toEqual(['completed', 'failed', 'cancelled']);
    });

    test('generateDelegationId should produce unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateDelegationId());
      }
      expect(ids.size).toBe(100);
    });

    test('generateDelegationId should match expected pattern', () => {
      const id = generateDelegationId();
      expect(id).toMatch(/^del-[a-z0-9]+-[a-z0-9]+$/);
    });

    test('InvalidDelegationError should have correct name', () => {
      const error = new InvalidDelegationError('test message');
      expect(error.name).toBe('InvalidDelegationError');
      expect(error.message).toBe('test message');
      expect(error).toBeInstanceOf(Error);
    });

    test('DelegationStateError should have correct name', () => {
      const error = new DelegationStateError('state error');
      expect(error.name).toBe('DelegationStateError');
      expect(error.message).toBe('state error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
