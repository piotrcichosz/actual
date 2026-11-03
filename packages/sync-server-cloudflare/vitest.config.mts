import { defineConfig } from 'vitest/config';

// Unit tests run in Node, without the Cloudflare plugin from vite.config.mts.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit.xml',
              suiteName: 'sync-server-cloudflare',
            },
          ],
        ]
      : ['default'],
  },
});
