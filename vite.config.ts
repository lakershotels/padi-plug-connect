import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  appType: 'spa',
  plugins: [
    ...tanstackStart({
      srcDirectory: 'src',
      start: { entry: 'start.ts' },
      server: { entry: 'server.ts' },
      router: { entry: 'router.tsx' },
      vite: { installDevServerMiddleware: false },
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    tsconfigPaths: true,
  },
  server: {
    host: '0.0.0.0',
    port: 4176,
  },
});
