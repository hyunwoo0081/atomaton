import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'apps/web/tests/**', 
    ],
    globals: true,
    environment: 'node',
    // Global environment variables for testing
    env: {
      MASTER_KEY: 'this_is_a_32_byte_test_key_!!!!',
    },
  },
});
