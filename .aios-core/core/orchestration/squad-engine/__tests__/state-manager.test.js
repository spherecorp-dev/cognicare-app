/**
 * State Manager - Unit Tests
 * Story 1.4 - AC7: 18+ unit tests
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { StateManager, StateCorruptionError, InvalidStateError } = require('../state-manager');
const { EventStore } = require('../event-store');

describe('StateManager', () => {
  let stateManager;
  let testStateDir;

  beforeEach(async () => {
    // Cria diretório temporário para testes
    testStateDir = path.join(__dirname, '.test-state');
    stateManager = new StateManager(testStateDir);
    await fs.mkdir(testStateDir, { recursive: true });
  });

  afterEach(async () => {
    // Remove diretório temporário
    try {
      await fs.rm(testStateDir, { recursive: true, force: true });
    } catch (error) {
      // Ignora erros de remoção
    }
  });

  describe('constructor', () => {
    test('should initialize with default state directory', () => {
      const sm = new StateManager();
      expect(sm.stateDir).toBe('.aios-core/.state');
    });

    test('should initialize with custom state directory', () => {
      const sm = new StateManager('/custom/path');
      expect(sm.stateDir).toBe('/custom/path');
    });
  });

  describe('computeChecksum', () => {
    test('should compute SHA256 checksum correctly', () => {
      const data = 'test data';
      const checksum = stateManager.computeChecksum(data);
      expect(checksum).toHaveLength(64); // SHA256 hex = 64 chars
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should produce consistent checksums for same data', () => {
      const data = 'consistent data';
      const checksum1 = stateManager.computeChecksum(data);
      const checksum2 = stateManager.computeChecksum(data);
      expect(checksum1).toBe(checksum2);
    });

    test('should produce different checksums for different data', () => {
      const checksum1 = stateManager.computeChecksum('data1');
      const checksum2 = stateManager.computeChecksum('data2');
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('pause', () => {
    test('should throw InvalidStateError if required fields are missing', async () => {
      const runId = 'test-run-001';
      const invalidState = {
        squadId: 'test-squad',
        // Missing: currentTask, currentTaskIndex, completedTasks, pendingTasks, context
      };

      await expect(stateManager.pause(runId, invalidState))
        .rejects
        .toThrow(InvalidStateError);
    });

    test('should save state with status "paused"', async () => {
      const runId = 'test-run-002';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: ['task-2', 'task-3'],
        context: { offerId: 'TEST01' }
      };

      await stateManager.pause(runId, state);

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const savedContent = await fs.readFile(stateFile, 'utf8');
      const savedState = yaml.load(savedContent);

      expect(savedState.status).toBe('paused');
    });

    test('should add timestamp if not provided', async () => {
      const runId = 'test-run-003';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: ['task-2'],
        context: {}
      };

      await stateManager.pause(runId, state);

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const savedContent = await fs.readFile(stateFile, 'utf8');
      const savedState = yaml.load(savedContent);

      expect(savedState.timestamp).toBeDefined();
      expect(typeof savedState.timestamp).toBe('number');
    });

    test('should preserve timestamp if provided', async () => {
      const runId = 'test-run-004';
      const customTimestamp = 1234567890;
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: customTimestamp
      };

      await stateManager.pause(runId, state);

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const savedContent = await fs.readFile(stateFile, 'utf8');
      const savedState = yaml.load(savedContent);

      expect(savedState.timestamp).toBe(customTimestamp);
    });
  });

  describe('saveState', () => {
    test('should create state directory if not exists', async () => {
      const sm = new StateManager(path.join(testStateDir, 'new-dir'));
      const runId = 'test-run-005';
      const state = { data: 'test' };

      await sm.saveState(runId, state);

      const stateFile = path.join(testStateDir, 'new-dir', `${runId}.state.yaml`);
      await expect(fs.access(stateFile)).resolves.not.toThrow();
    });

    test('should save state with checksum', async () => {
      const runId = 'test-run-006';
      const state = { data: 'test-data', value: 123 };

      await stateManager.saveState(runId, state);

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      const savedContent = await fs.readFile(stateFile, 'utf8');
      const savedState = yaml.load(savedContent);

      expect(savedState.checksum).toBeDefined();
      expect(savedState.checksum).toHaveLength(64);
    });
  });

  describe('loadState', () => {
    test('should throw error if state file does not exist', async () => {
      const runId = 'non-existent-run';

      await expect(stateManager.loadState(runId))
        .rejects
        .toThrow('Estado não encontrado para runId: non-existent-run');
    });

    test('should load and validate state correctly', async () => {
      const runId = 'test-run-007';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: ['task-2'],
        context: { key: 'value' },
        timestamp: Date.now(),
        status: 'paused'
      };

      await stateManager.saveState(runId, state);
      const loadedState = await stateManager.loadState(runId);

      expect(loadedState.squadId).toBe(state.squadId);
      expect(loadedState.currentTask).toBe(state.currentTask);
      expect(loadedState.checksum).toBeUndefined(); // checksum removed before return
    });

    test('should throw StateCorruptionError if checksum is invalid', async () => {
      const runId = 'test-run-008';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused'
      };

      await stateManager.saveState(runId, state);

      // Corrompe o arquivo (altera dados sem atualizar checksum)
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      let content = await fs.readFile(stateFile, 'utf8');
      content = content.replace('task-1', 'task-corrupted');
      await fs.writeFile(stateFile, content, 'utf8');

      await expect(stateManager.loadState(runId))
        .rejects
        .toThrow(StateCorruptionError);
    });
  });

  describe('resume', () => {
    test('should throw error if state file does not exist', async () => {
      const runId = 'non-existent-run';

      await expect(stateManager.resume(runId))
        .rejects
        .toThrow('Estado não encontrado');
    });

    test('should throw InvalidStateError if status is not "paused"', async () => {
      const runId = 'test-run-009';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'running' // NOT paused
      };

      await stateManager.saveState(runId, state);

      await expect(stateManager.resume(runId))
        .rejects
        .toThrow(InvalidStateError);
      await expect(stateManager.resume(runId))
        .rejects
        .toThrow('não está pausada');
    });

    test('should return validated state if paused', async () => {
      const runId = 'test-run-010';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: ['task-2'],
        context: { resumeKey: 'value' },
        timestamp: Date.now(),
        status: 'paused'
      };

      await stateManager.saveState(runId, state);
      const resumedState = await stateManager.resume(runId);

      expect(resumedState.squadId).toBe(state.squadId);
      expect(resumedState.status).toBe('paused');
      expect(resumedState.context.resumeKey).toBe('value');
    });
  });

  describe('validateState', () => {
    test('should throw InvalidStateError if required fields are missing', async () => {
      const incompleteState = {
        squadId: 'test-squad',
        // Missing other required fields
        checksum: 'dummy-checksum'
      };
      const stateYaml = yaml.dump(incompleteState);

      await expect(stateManager.validateState(incompleteState, stateYaml))
        .rejects
        .toThrow(InvalidStateError);
    });

    test('should throw StateCorruptionError if checksum does not match', async () => {
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused',
        checksum: 'invalid-checksum'
      };
      const stateYaml = yaml.dump(state);

      await expect(stateManager.validateState(state, stateYaml))
        .rejects
        .toThrow(StateCorruptionError);
    });
  });

  describe('clearState', () => {
    test('should remove state file', async () => {
      const runId = 'test-run-011';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused'
      };

      await stateManager.saveState(runId, state);

      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      await expect(fs.access(stateFile)).resolves.not.toThrow();

      await stateManager.clearState(runId);

      await expect(fs.access(stateFile)).rejects.toThrow();
    });

    test('should not throw if state file does not exist', async () => {
      const runId = 'non-existent-run';
      await expect(stateManager.clearState(runId)).resolves.not.toThrow();
    });
  });

  describe('listPausedExecutions', () => {
    test('should return empty array if state directory does not exist', async () => {
      const sm = new StateManager(path.join(testStateDir, 'non-existent'));
      const paused = await sm.listPausedExecutions();
      expect(paused).toEqual([]);
    });

    test('should return list of paused runIds', async () => {
      const runIds = ['run-001', 'run-002', 'run-003'];
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused'
      };

      for (const runId of runIds) {
        await stateManager.saveState(runId, state);
      }

      const paused = await stateManager.listPausedExecutions();
      expect(paused).toHaveLength(3);
      expect(paused).toContain('run-001');
      expect(paused).toContain('run-002');
      expect(paused).toContain('run-003');
    });

    test('should filter only .state.yaml files', async () => {
      const runId = 'run-004';
      const state = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused'
      };

      await stateManager.saveState(runId, state);

      // Cria arquivo que não é .state.yaml
      await fs.writeFile(
        path.join(testStateDir, 'other-file.txt'),
        'not a state file',
        'utf8'
      );

      const paused = await stateManager.listPausedExecutions();
      expect(paused).toHaveLength(1);
      expect(paused[0]).toBe('run-004');
    });
  });

  describe('State Recovery via EventStore (Story 1.7 AC6)', () => {
    let eventStore;
    let smWithRecovery;
    let testEventsDir;

    beforeEach(async () => {
      testEventsDir = path.join(__dirname, '.test-events');
      eventStore = new EventStore(testEventsDir);
      smWithRecovery = new StateManager(testStateDir, { eventStore });
      await fs.mkdir(testEventsDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(testEventsDir, { recursive: true, force: true });
      } catch {
        // Ignora
      }
    });

    test('should recover from missing state.yaml via EventStore replay', async () => {
      const runId = 'run-recovery-001';

      // Cria eventos mas NÃO cria state.yaml
      eventStore.append(runId, 'run.started', { squadId: 'squad-copy', playbook: 'pipeline' });
      eventStore.append(runId, 'phase.started', { phaseName: 'intelligence', phaseIndex: 0 });
      eventStore.append(runId, 'step.started', { stepId: 'fetch-data' });
      eventStore.append(runId, 'step.completed', { stepId: 'fetch-data', output: { data: 'test' } });
      eventStore.append(runId, 'phase.completed', { phaseName: 'intelligence' });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 5000 });

      const state = await smWithRecovery.loadState(runId);

      expect(state.status).toBe('completed');
      expect(state.squadId).toBe('squad-copy');
      expect(state.phases_completed).toContain('intelligence');
      expect(state.steps_completed).toContain('fetch-data');
    });

    test('should recover from corrupted state.yaml (invalid YAML)', async () => {
      const runId = 'run-recovery-002';

      // Cria eventos
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 100 });

      // Cria state.yaml corrompido (YAML inválido)
      await fs.mkdir(testStateDir, { recursive: true });
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      await fs.writeFile(stateFile, ':::INVALID YAML{{{{', 'utf8');

      const state = await smWithRecovery.loadState(runId);

      expect(state.status).toBe('completed');
      expect(state.squadId).toBe('test');
    });

    test('should recover from corrupted state.yaml (checksum mismatch)', async () => {
      const runId = 'run-recovery-003';

      // Cria eventos
      eventStore.append(runId, 'run.started', { squadId: 'test-squad' });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 200 });

      // Cria state.yaml com checksum válido, depois corrompe
      const validState = {
        squadId: 'test-squad',
        currentTask: 'task-1',
        currentTaskIndex: 0,
        completedTasks: [],
        pendingTasks: [],
        context: {},
        timestamp: Date.now(),
        status: 'paused',
      };
      await smWithRecovery.saveState(runId, validState);

      // Corrompe o arquivo (altera dados sem atualizar checksum)
      const stateFile = path.join(testStateDir, `${runId}.state.yaml`);
      let content = await fs.readFile(stateFile, 'utf8');
      content = content.replace('task-1', 'task-corrupted');
      await fs.writeFile(stateFile, content, 'utf8');

      const state = await smWithRecovery.loadState(runId);

      // Deve ter recuperado via replay
      expect(state.status).toBe('completed');
      expect(state.squadId).toBe('test-squad');
    });

    test('should log state.recovered event after recovery', async () => {
      const runId = 'run-recovery-004';

      // Cria eventos
      eventStore.append(runId, 'run.started', { squadId: 'test' });
      eventStore.append(runId, 'run.completed', { status: 'completed', total_duration_ms: 50 });

      // loadState sem state.yaml → recovery
      await smWithRecovery.loadState(runId);

      // Verifica que state.recovered foi logado
      const events = await eventStore.getEvents(runId, { eventType: 'state.recovered' });
      expect(events).toHaveLength(1);
      expect(events[0].data.method).toBe('event_replay');
    });

    test('should throw error if both state.yaml and events.jsonl are unavailable', async () => {
      const runId = 'run-recovery-005';

      // Nem state.yaml nem events.jsonl existem
      await expect(smWithRecovery.loadState(runId))
        .rejects
        .toThrow('Recovery falhou');
    });

    test('should throw normal error without EventStore (backward compat)', async () => {
      // StateManager SEM eventStore (comportamento original)
      const smNoRecovery = new StateManager(testStateDir);
      const runId = 'run-no-recovery';

      await expect(smNoRecovery.loadState(runId))
        .rejects
        .toThrow('Estado não encontrado');
    });
  });
});
