/**
 * Unit Tests: Pipeline Schema — Parallel Group Validation
 * Story 4.4: Paralelização de Steps — Parallel Groups
 *
 * Test 8.7: Schema validation (valid parallel group, invalid nested, missing tasks)
 */

const { validatePipelineSchema, validateParallelGroupTasks } = require('../schemas/pipeline-schema');

describe('Pipeline Schema — Parallel Group Validation', () => {
  // Helper to create a minimal valid pipeline with a parallel group
  function createPipelineWithParallelGroup(groupOverrides = {}) {
    return {
      trigger: { type: 'manual' },
      phases: [
        {
          name: 'Phase 1',
          steps: [
            {
              id: 'step-parallel',
              type: 'parallel_group',
              tasks: [
                { id: 'task-a', task: 'do-something' },
                { id: 'task-b', task: 'do-other' },
              ],
              wait_for_all: true,
              fail_fast: false,
              on_success: 'next_step',
              ...groupOverrides,
            },
          ],
        },
      ],
    };
  }

  describe('validateParallelGroupTasks', () => {
    test('should accept valid tasks array', () => {
      const tasks = [
        { id: 'a', task: 'do-a' },
        { id: 'b', task: 'do-b' },
      ];
      const errors = validateParallelGroupTasks(tasks, 0, 0);
      expect(errors).toHaveLength(0);
    });

    test('should reject non-array tasks', () => {
      const errors = validateParallelGroupTasks('not-array', 0, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('must be an array');
    });

    test('should reject empty tasks array', () => {
      const errors = validateParallelGroupTasks([], 0, 0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('at least one task');
    });

    test('should require task id', () => {
      const tasks = [{ task: 'do-a' }];
      const errors = validateParallelGroupTasks(tasks, 0, 0);
      expect(errors.some(e => e.includes('missing required field: id'))).toBe(true);
    });

    test('should require task field', () => {
      const tasks = [{ id: 'a' }];
      const errors = validateParallelGroupTasks(tasks, 0, 0);
      expect(errors.some(e => e.includes('missing required field: task'))).toBe(true);
    });

    test('should reject nested parallel groups', () => {
      const tasks = [
        { id: 'a', task: 'do-a', type: 'parallel_group' },
      ];
      const errors = validateParallelGroupTasks(tasks, 0, 0);
      expect(errors.some(e => e.includes('Nested parallel groups not supported'))).toBe(true);
    });
  });

  describe('validatePipelineSchema — parallel_group step type', () => {
    test('should accept valid parallel group', () => {
      const pipeline = createPipelineWithParallelGroup();
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject parallel group without tasks', () => {
      const pipeline = createPipelineWithParallelGroup({ tasks: undefined });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('must have tasks array'))).toBe(true);
    });

    test('should reject parallel group with invalid wait_for_all', () => {
      const pipeline = createPipelineWithParallelGroup({ wait_for_all: 'yes' });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('wait_for_all must be boolean'))).toBe(true);
    });

    test('should reject parallel group with invalid fail_fast', () => {
      const pipeline = createPipelineWithParallelGroup({ fail_fast: 'no' });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('fail_fast must be boolean'))).toBe(true);
    });

    test('should reject parallel group without on_success', () => {
      const pipeline = createPipelineWithParallelGroup({ on_success: undefined });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('must have on_success'))).toBe(true);
    });

    test('should reject nested parallel groups in tasks', () => {
      const pipeline = createPipelineWithParallelGroup({
        tasks: [
          { id: 'a', task: 'do-a', type: 'parallel_group' },
        ],
      });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Nested parallel groups not supported'))).toBe(true);
    });

    test('should validate task fields within parallel group', () => {
      const pipeline = createPipelineWithParallelGroup({
        tasks: [
          { id: 'a' }, // missing task field
          { task: 'do-b' }, // missing id
        ],
      });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('missing required field: task'))).toBe(true);
      expect(result.errors.some(e => e.includes('missing required field: id'))).toBe(true);
    });

    test('should accept parallel group mixed with regular steps', () => {
      const pipeline = {
        trigger: { type: 'manual' },
        phases: [
          {
            name: 'Phase 1',
            steps: [
              { id: 'step-1', type: 'task', on_success: 'step-parallel' },
              {
                id: 'step-parallel',
                type: 'parallel_group',
                tasks: [
                  { id: 'task-a', task: 'do-a' },
                  { id: 'task-b', task: 'do-b' },
                ],
                on_success: 'step-3',
              },
              { id: 'step-3', type: 'output' },
            ],
          },
        ],
      };
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(true);
    });

    test('should accept parallel group with boolean wait_for_all and fail_fast', () => {
      const pipeline = createPipelineWithParallelGroup({
        wait_for_all: false,
        fail_fast: true,
      });
      const result = validatePipelineSchema(pipeline);
      expect(result.isValid).toBe(true);
    });
  });
});
