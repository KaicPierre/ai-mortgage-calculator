import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['./test.config.ts'],
    coverage: {
      include: ['**/*UseCase.ts']
    },
  },
});
