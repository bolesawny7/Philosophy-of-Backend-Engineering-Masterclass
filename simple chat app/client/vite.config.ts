import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/graphql': 'http://localhost:3000',
      '/events': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
