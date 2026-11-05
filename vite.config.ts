import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Geliştirme sırasında /api isteklerini API Gateway'e yönlendirir.
// Tarayıcı istekleri aynı adrese (localhost:5173) gönderdiği için CORS ayarı gerekmez.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_GATEWAY_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
