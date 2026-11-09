import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 시: `npm run dev:api`(wrangler, 8788)와 `npm run dev`(vite, 5173)를 함께 띄우고
// 브라우저는 5173으로 접속한다. /api 요청은 wrangler로 프록시된다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8788' },
    },
  },
});
