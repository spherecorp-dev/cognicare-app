/**
 * Resolve Project Root — Single Source of Truth
 *
 * Resolves the AIOS project root directory. Used by all engine modules
 * that need to access project-level files (squads/, data/, docs/, etc.).
 *
 * Resolution order:
 *   1. AIOS_PROJECT_ROOT env var (explicit, recommended for dashboard/production)
 *   2. Walk up from cwd looking for markers (squads/, .aios-core/)
 *   3. Fallback to process.cwd()
 *
 * @module core/utils/resolve-project-root
 */

const path = require('path');
const fs = require('fs');

let _cachedRoot = null;
let _cachedCwd = null;

/**
 * Resolves the project root directory.
 * Result is cached per cwd for performance. Cache auto-invalidates
 * when process.cwd() changes (e.g., in tests that chdir to tmpdir).
 *
 * @returns {string} Absolute path to project root
 */
function resolveProjectRoot() {
  // 1. Env var — explicit configuration (always wins, no caching needed)
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }

  // Invalidate cache if cwd changed (tests use chdir)
  const cwd = process.cwd();
  if (_cachedRoot && _cachedCwd === cwd) {
    return _cachedRoot;
  }

  // 2. Walk up from cwd looking for project markers
  const markers = ['squads', '.aios-core'];

  let dir = cwd;
  for (let i = 0; i < 4; i++) {
    for (const marker of markers) {
      try {
        fs.accessSync(path.join(dir, marker));
        _cachedRoot = dir;
        _cachedCwd = cwd;
        return dir;
      } catch {
        // Try next
      }
    }
    const parent = path.resolve(dir, '..');
    if (parent === dir) break; // filesystem root
    dir = parent;
  }

  // 3. Fallback to cwd
  _cachedRoot = cwd;
  _cachedCwd = cwd;
  return cwd;
}

/**
 * Clears the cached root (useful for testing).
 */
function clearCache() {
  _cachedRoot = null;
  _cachedCwd = null;
}

module.exports = { resolveProjectRoot, clearCache };
