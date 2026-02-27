/**
 * Override Validator - Story 3.3
 * Schema definition and validation for runtime parameter overrides.
 *
 * AC6: Validates overrides against schema before run starts.
 * - method: enum of allowed copy methods
 * - geos: array of ISO 639-1 language codes
 * - platforms: array of supported platform names
 * - skip_phases: array of phase names (validated against playbook)
 * - custom: free-form object (pass-through, no validation)
 */

const ALLOWED_METHODS = ['modelagem', 'variacao_de_winner', 'do-zero'];
const ALLOWED_PLATFORMS = ['meta', 'tiktok', 'google', 'snapchat'];
const ISO_639_1_PATTERN = /^[a-z]{2}$/;

class OverrideValidationError extends Error {
  /**
   * @param {string[]} details - Array of validation error messages
   */
  constructor(details) {
    super(`Invalid overrides: ${details.join('; ')}`);
    this.name = 'OverrideValidationError';
    this.details = details;
  }
}

/**
 * Validates override object against schema.
 *
 * @param {Object} overrides - Override object from trigger
 * @param {Object} [options]
 * @param {string[]} [options.playbookPhases] - Valid phase names from playbook (for skip_phases validation)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateOverrides(overrides, options = {}) {
  const errors = [];

  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return { valid: false, errors: ['overrides must be a plain object'] };
  }

  const allowedKeys = ['method', 'geos', 'platforms', 'skip_phases', 'custom'];
  const unknownKeys = Object.keys(overrides).filter(k => !allowedKeys.includes(k));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown override fields: ${unknownKeys.join(', ')}`);
  }

  // method: optional string enum
  if (overrides.method !== undefined) {
    if (typeof overrides.method !== 'string') {
      errors.push('overrides.method must be a string');
    } else if (!ALLOWED_METHODS.includes(overrides.method)) {
      errors.push(`overrides.method must be one of: ${ALLOWED_METHODS.join(', ')}. Got: "${overrides.method}"`);
    }
  }

  // geos: optional array of ISO 639-1 strings
  if (overrides.geos !== undefined) {
    if (!Array.isArray(overrides.geos)) {
      errors.push('overrides.geos must be an array');
    } else {
      for (let i = 0; i < overrides.geos.length; i++) {
        const geo = overrides.geos[i];
        if (typeof geo !== 'string') {
          errors.push(`overrides.geos[${i}] must be a string`);
        } else if (!ISO_639_1_PATTERN.test(geo)) {
          errors.push(`overrides.geos[${i}] must be a valid ISO 639-1 code (2 lowercase letters). Got: "${geo}"`);
        }
      }
    }
  }

  // platforms: optional array of platform enum strings
  if (overrides.platforms !== undefined) {
    if (!Array.isArray(overrides.platforms)) {
      errors.push('overrides.platforms must be an array');
    } else {
      for (let i = 0; i < overrides.platforms.length; i++) {
        const platform = overrides.platforms[i];
        if (typeof platform !== 'string') {
          errors.push(`overrides.platforms[${i}] must be a string`);
        } else if (!ALLOWED_PLATFORMS.includes(platform)) {
          errors.push(`overrides.platforms[${i}] must be one of: ${ALLOWED_PLATFORMS.join(', ')}. Got: "${platform}"`);
        }
      }
    }
  }

  // skip_phases: optional array of phase name strings
  if (overrides.skip_phases !== undefined) {
    if (!Array.isArray(overrides.skip_phases)) {
      errors.push('overrides.skip_phases must be an array');
    } else {
      for (let i = 0; i < overrides.skip_phases.length; i++) {
        const phase = overrides.skip_phases[i];
        if (typeof phase !== 'string') {
          errors.push(`overrides.skip_phases[${i}] must be a string`);
        } else if (options.playbookPhases && options.playbookPhases.length > 0) {
          if (!options.playbookPhases.includes(phase)) {
            errors.push(`overrides.skip_phases[${i}] "${phase}" is not a valid phase. Valid phases: ${options.playbookPhases.join(', ')}`);
          }
        }
      }
    }
  }

  // custom: optional free-form object (no validation beyond type check)
  if (overrides.custom !== undefined) {
    if (typeof overrides.custom !== 'object' || Array.isArray(overrides.custom) || overrides.custom === null) {
      errors.push('overrides.custom must be a plain object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateOverrides,
  OverrideValidationError,
  ALLOWED_METHODS,
  ALLOWED_PLATFORMS,
  ISO_639_1_PATTERN,
};
