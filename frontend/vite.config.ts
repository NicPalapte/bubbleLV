/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bau-Stand für „Fehler melden" (WP-P): in GitHub Actions steht der Commit
  // in GITHUB_SHA, lokal gibt es keinen — dann „dev". Bewusst kein Aufruf von
  // `git`: der Build darf nicht daran scheitern, dass es kein Repo gibt.
  define: {
    __BUILD_ID__: JSON.stringify((process.env.GITHUB_SHA ?? 'dev').slice(0, 7)),
  },
  server: {
    // Bind to all interfaces: Docker port-mapping (see .devcontainer/docker-compose.yml)
    // can't reach a listener bound to 127.0.0.1-only inside the container.
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
});
