/**
 * Vitest configuration for unit coverage across domain/composable/infra/store layers.
 */
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
        },
      },
      setupFiles: ['./tests/setup/vitest.setup.ts'],
      include: ['tests/unit/**/*.test.ts'],
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
      coverage: {
        provider: 'v8',
        reportsDirectory: './coverage',
        reporter: ['text', 'html', 'lcov'],
        all: true,
        thresholds: {
          lines: 80,
          functions: 90,
          branches: 75,
          statements: 80,
        },
        include: [
          'src/domain/**/*.ts',
          'src/utils/**/*.ts',
          'src/composables/**/*.ts',
          'src/infra/**/*.ts',
          'src/stores/**/*.ts',
        ],
        exclude: [
          'src/main.ts',
          'src/vite-env.d.ts',
          'src/lib/**/*.ts',
          'src/theme/**/*.ts',
          'src/router/**/*.ts',
        ],
      },
    },
  }),
)
