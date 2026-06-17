import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Proxy /api and the auth/list/etc routes to the FastAPI backend so the
// frontend can use relative URLs (no hardcoded http://127.0.0.1:8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Every backend route below is forwarded to uvicorn on :8000.
      '/register': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/me': 'http://127.0.0.1:8000',
      '/profile': 'http://127.0.0.1:8000',
      '/list': 'http://127.0.0.1:8000',
      '/books': 'http://127.0.0.1:8000',
      '/search': 'http://127.0.0.1:8000',
      '/book': 'http://127.0.0.1:8000',
      '/seed': 'http://127.0.0.1:8000',
      '/demo': 'http://127.0.0.1:8000',
    },
  },
})
