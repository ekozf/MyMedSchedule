import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [],
  define: {
    __DEV__: false,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.{js,ts}',
        'metro.config.js',
        'babel.config.js',
        'tailwind.config.js',
        'expo-env.d.ts',
        'nativewind-env.d.ts',
        'app/+html.tsx',
        'app/+not-found.tsx',
      ],
      all: true,
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['__tests__/components/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'react-native': 'react-native-web',
    },
  },
});
