/**
 * Squad YAML Schema Validator
 * Validates squad.yaml structure against required fields
 */

function validateSquadSchema(squad) {
  const errors = [];

  // Required fields
  if (!squad.name) errors.push('Missing required field: name');
  if (!squad.version) errors.push('Missing required field: version');
  if (!squad.components) errors.push('Missing required field: components');

  // Validate components structure
  if (squad.components) {
    if (typeof squad.components !== 'object') {
      errors.push('components must be an object');
    } else {
      // Check for components.workflows (not top-level workflows)
      if (!squad.components.workflows) {
        errors.push('Missing required field: components.workflows');
      }

      // Validate workflows array
      if (squad.components.workflows && !Array.isArray(squad.components.workflows)) {
        errors.push('components.workflows must be an array');
      }
    }
  }

  // Validate version format (e.g., "1.0.0")
  if (squad.version && typeof squad.version !== 'string') {
    errors.push('version must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = { validateSquadSchema };
