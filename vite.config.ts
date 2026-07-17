import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Keep HMR enabled for source files but ignore the writable JSON database file.
      hmr: env.DISABLE_HMR !== 'true',
      watch: env.DISABLE_HMR === 'true'
        ? null
        : {
            ignored: ['**/db.json', '**/node_modules/**', '**/.git/**'],
          },
    },
  };
});
