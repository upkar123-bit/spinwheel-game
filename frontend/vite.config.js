import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // expose server on network (0.0.0.0)
    port: 5173,        // Vite default port
    strictPort: true,  // fail if port is already in use
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    }
  },
  define: {
    'process.env': process.env
  }
});
