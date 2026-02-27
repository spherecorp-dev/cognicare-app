/**
 * Pipeline YAML Schema Validator
 * Validates pipeline.yaml structure against required fields
 *
 * Story 4.4: Added parallel_group step type validation
 */

/**
 * Validates tasks within a parallel group
 * @param {Array} tasks - Array of task definitions
 * @param {number} phaseIdx - Phase index for error messages
 * @param {number} stepIdx - Step index for error messages
 * @returns {string[]} Array of error messages
 */
function validateParallelGroupTasks(tasks, phaseIdx, stepIdx) {
  const errors = [];
  const prefix = `Phase ${phaseIdx} Step ${stepIdx}`;

  if (!Array.isArray(tasks)) {
    errors.push(`${prefix}: parallel_group tasks must be an array`);
    return errors;
  }

  if (tasks.length === 0) {
    errors.push(`${prefix}: parallel_group must have at least one task`);
    return errors;
  }

  tasks.forEach((task, k) => {
    if (!task.id) {
      errors.push(`${prefix} Task ${k}: missing required field: id`);
    }
    if (!task.task) {
      errors.push(`${prefix} Task ${k}: missing required field: task`);
    }

    // Reject nested parallel groups (AC: no nesting)
    if (task.type === 'parallel_group') {
      errors.push(`${prefix} Task ${k}: Nested parallel groups not supported`);
    }
  });

  return errors;
}

function validatePipelineSchema(pipeline) {
  const errors = [];

  // Required fields
  if (!pipeline.phases) errors.push('Missing required field: phases');
  if (!pipeline.trigger) errors.push('Missing required field: trigger');

  // Validate phases array
  if (pipeline.phases && !Array.isArray(pipeline.phases)) {
    errors.push('phases must be an array');
  }

  // Validate each phase
  if (Array.isArray(pipeline.phases)) {
    pipeline.phases.forEach((phase, i) => {
      if (!phase.name) errors.push(`Phase ${i}: missing required field: name`);
      if (!phase.steps || !Array.isArray(phase.steps)) {
        errors.push(`Phase ${i}: steps must be an array`);
      }

      // Validate each step
      if (Array.isArray(phase.steps)) {
        phase.steps.forEach((step, j) => {
          if (!step.id) errors.push(`Phase ${i} Step ${j}: missing required field: id`);
          if (!step.type) errors.push(`Phase ${i} Step ${j}: missing required field: type`);

          // Flow control validation - depends on step type
          const isRouter = step.type === 'router';
          const isOutput = step.type === 'output';
          const isGate = step.type === 'gate';
          const isParallelGroup = step.type === 'parallel_group';

          // Router steps use conditions + goto
          if (isRouter && !step.conditions) {
            errors.push(`Phase ${i} Step ${j}: router step must have conditions`);
          }

          // Story 4.4: Validate parallel_group steps
          if (isParallelGroup) {
            if (!step.tasks) {
              errors.push(`Phase ${i} Step ${j}: parallel_group must have tasks array`);
            } else {
              errors.push(...validateParallelGroupTasks(step.tasks, i, j));
            }

            // Validate boolean fields if present
            if (step.wait_for_all !== undefined && typeof step.wait_for_all !== 'boolean') {
              errors.push(`Phase ${i} Step ${j}: wait_for_all must be boolean`);
            }
            if (step.fail_fast !== undefined && typeof step.fail_fast !== 'boolean') {
              errors.push(`Phase ${i} Step ${j}: fail_fast must be boolean`);
            }

            // parallel_group needs on_success for flow continuation
            if (!step.on_success) {
              errors.push(`Phase ${i} Step ${j}: parallel_group must have on_success`);
            }
          }

          // Output steps (final steps) don't need flow control
          // Gate steps use on_verdict
          // Parallel groups validated above
          // Regular steps use on_success
          if (!isRouter && !isOutput && !isParallelGroup) {
            if (!step.on_success && !step.on_verdict) {
              errors.push(`Phase ${i} Step ${j}: missing on_success or on_verdict`);
            }
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = { validatePipelineSchema, validateParallelGroupTasks };
