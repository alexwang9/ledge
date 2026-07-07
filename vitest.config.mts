import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      // Dummy 32-byte key so src/lib/crypto.ts works in tests.
      ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
