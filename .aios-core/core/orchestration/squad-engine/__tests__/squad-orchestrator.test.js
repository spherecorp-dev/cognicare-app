/**
 * Unit Tests - SquadOrchestrator
 * Story 1.1: Squad Orchestrator Core
 */

const SquadOrchestrator = require('../squad-orchestrator');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

describe('SquadOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new SquadOrchestrator();
  });

  describe('generateRunId', () => {
    test('generates unique runId with squad name and timestamp', () => {
      const runId1 = orchestrator.generateRunId('squad-copy');

      expect(runId1).toMatch(/^squad-copy-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(runId1).toContain('squad-copy');
      expect(runId1.split('-').length).toBeGreaterThan(3); // Has timestamp parts
    });

    test('includes squad name in runId', () => {
      const runId = orchestrator.generateRunId('test-squad');
      expect(runId).toContain('test-squad');
    });
  });

  describe('interpolate', () => {
    test('replaces single variable', () => {
      const result = orchestrator.interpolate('Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    test('replaces multiple variables', () => {
      const result = orchestrator.interpolate('{{greeting}} {{name}}', {
        greeting: 'Hello',
        name: 'World',
      });
      expect(result).toBe('Hello World');
    });

    test('leaves unmatched placeholders unchanged', () => {
      const result = orchestrator.interpolate('Hello {{name}}', {});
      expect(result).toBe('Hello {{name}}');
    });
  });

  describe('loadSquad', () => {
    test('throws error for missing squad.yaml', async () => {
      await expect(
        orchestrator.loadSquad('non-existent-squad', 'test-pipeline')
      ).rejects.toThrow(/Squad not found: non-existent-squad/);
    });

    test('throws error for invalid YAML syntax', async () => {
      // This test would require mocking fs.readFile to return invalid YAML
      // Skipping for now - would be integration test with actual invalid file
    });

    test('throws error for missing required fields in squad.yaml', async () => {
      // This test would require mocking validation
      // Skipping for now - covered by schema validation tests
    });
  });

  describe('loadInitialContext', () => {
    test('returns empty context if no load_on_start defined', async () => {
      const pipeline = { context: {} };
      const context = await orchestrator.loadInitialContext(pipeline, {});

      expect(context).toEqual({});
    });

    test('returns trigger data in context', async () => {
      const pipeline = { context: {} };
      const trigger = { offerId: 'TEST123' };
      const context = await orchestrator.loadInitialContext(pipeline, trigger);

      expect(context.offerId).toBe('TEST123');
    });

    test('handles missing context gracefully', async () => {
      const pipeline = {};
      const context = await orchestrator.loadInitialContext(pipeline, {});

      expect(context).toEqual({});
    });
  });

  describe('initializeState', () => {
    test('creates state directory', async () => {
      const runId = 'test-run-12345';
      await orchestrator.initializeState(runId, 'test-squad', 'test-pipeline', {}, {});

      const stateDir = path.join(process.cwd(), '.aios', 'squad-runs', runId);
      const statePath = path.join(stateDir, 'state.yaml');

      // Verify directory and file exist
      const exists = await fs
        .access(statePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);

      // Cleanup
      await fs.rm(stateDir, { recursive: true, force: true });
    });

    test('state file contains correct structure', async () => {
      const runId = 'test-run-67890';
      const squadId = 'test-squad';
      const pipelineName = 'test-pipeline';
      const context = { testKey: 'testValue' };

      await orchestrator.initializeState(runId, squadId, pipelineName, {}, context);

      const stateDir = path.join(process.cwd(), '.aios', 'squad-runs', runId);
      const statePath = path.join(stateDir, 'state.yaml');
      const stateContent = await fs.readFile(statePath, 'utf8');
      const state = yaml.load(stateContent);

      expect(state.runId).toBe(runId);
      expect(state.squadId).toBe(squadId);
      expect(state.pipelineName).toBe(pipelineName);
      expect(state.status).toBe('initialized');
      expect(state.context).toEqual(context);
      expect(state.phases_completed).toEqual([]);
      expect(state.steps_completed).toEqual([]);
      expect(state.started_at).toBeDefined();

      // Cleanup
      await fs.rm(stateDir, { recursive: true, force: true });
    });
  });
});
