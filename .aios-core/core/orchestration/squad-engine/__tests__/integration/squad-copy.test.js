/**
 * Integration Tests - SquadOrchestrator with squad-copy
 * Story 1.1: Squad Orchestrator Core
 */

const SquadOrchestrator = require('../../squad-orchestrator');
const fs = require('fs').promises;
const path = require('path');

describe('SquadOrchestrator Integration - squad-copy', () => {
  let orchestrator;
  const originalCwd = process.cwd();

  beforeAll(() => {
    // Integration tests need project root as CWD for squad file resolution
    process.chdir(path.resolve(__dirname, '../../../../../..'));
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    orchestrator = new SquadOrchestrator();
  });

  afterEach(async () => {
    // Cleanup - remove test run state directories
    const runsDir = path.join(process.cwd(), '.aios', 'squad-runs');
    try {
      const runs = await fs.readdir(runsDir);
      for (const run of runs) {
        if (run.startsWith('squad-copy-')) {
          await fs.rm(path.join(runsDir, run), { recursive: true, force: true });
        }
      }
    } catch (error) {
      // Directory might not exist - ignore
    }
  });

  test('loads squad-copy playbook end-to-end', async () => {
    const run = await orchestrator.loadSquad('squad-copy', 'creative-pipeline');

    // Verify run structure
    expect(run.runId).toBeDefined();
    expect(run.runId).toMatch(/^squad-copy-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    expect(run.squadId).toBe('squad-copy');
    expect(run.pipelineName).toBe('creative-pipeline');
    expect(run.pipeline).toBeDefined();
    expect(run.phases).toBeDefined();
    expect(Array.isArray(run.phases)).toBe(true);

    // Verify pipeline has expected phases (from creative-pipeline.yaml)
    // Note: Actual number depends on creative-pipeline.yaml structure
    expect(run.phases.length).toBeGreaterThan(0);

    // Verify state file created
    const statePath = path.join(
      process.cwd(),
      '.aios',
      'squad-runs',
      run.runId,
      'state.yaml'
    );
    const stateExists = await fs
      .access(statePath)
      .then(() => true)
      .catch(() => false);
    expect(stateExists).toBe(true);
  });

  test('validates pipeline has required structure', async () => {
    const run = await orchestrator.loadSquad('squad-copy', 'creative-pipeline');

    // Each phase should have required fields
    run.phases.forEach((phase) => {
      expect(phase.name).toBeDefined();
      expect(phase.steps).toBeDefined();
      expect(Array.isArray(phase.steps)).toBe(true);

      // Each step should have required fields
      phase.steps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.type).toBeDefined();

        // Flow control depends on step type
        const isRouter = step.type === 'router';
        const isOutput = step.type === 'output';

        if (isRouter) {
          expect(step.conditions).toBeDefined();
        } else if (!isOutput) {
          // Regular steps need flow control
          expect(step.on_success || step.on_verdict).toBeDefined();
        }
      });
    });
  });

  test('initializes state with correct structure', async () => {
    const run = await orchestrator.loadSquad('squad-copy', 'creative-pipeline');

    const yaml = require('js-yaml');
    const statePath = path.join(
      process.cwd(),
      '.aios',
      'squad-runs',
      run.runId,
      'state.yaml'
    );
    const stateContent = await fs.readFile(statePath, 'utf8');
    const state = yaml.load(stateContent);

    expect(state.runId).toBe(run.runId);
    expect(state.squadId).toBe('squad-copy');
    expect(state.pipelineName).toBe('creative-pipeline');
    expect(state.status).toBe('initialized');
    expect(state.current_phase).toBeNull();
    expect(state.current_step).toBeNull();
    expect(state.phases_completed).toEqual([]);
    expect(state.steps_completed).toEqual([]);
    expect(state.started_at).toBeDefined();
    expect(state.updated_at).toBeDefined();
  });

  test('rejects non-existent squad', async () => {
    await expect(
      orchestrator.loadSquad('non-existent-squad', 'test-pipeline')
    ).rejects.toThrow(/Squad not found: non-existent-squad/);
  });

  test('rejects non-existent pipeline', async () => {
    await expect(
      orchestrator.loadSquad('squad-copy', 'non-existent-pipeline')
    ).rejects.toThrow(/Failed to load pipeline.yaml/);
  });
});
