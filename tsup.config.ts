import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src', '!src/**/*.spec.*', '!src/docs', '!src/swagger.json'],
  splitting: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  skipNodeModulesBundle: true,
});
