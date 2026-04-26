import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix loads ALL .env variables, including non-VITE_ ones
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.SERVICE_A_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
