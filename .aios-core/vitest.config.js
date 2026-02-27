import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: path.resolve(__dirname),
    include: [
      'core/orchestration/squad-engine/__tests__/**/*.test.js',
      'core/services/__tests__/**/*.test.js',
    ],
  },
});
