/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Versionsnummer aus der package.json — eine Quelle. Stünde sie zusätzlich im
// Code, wäre die Anzeige irgendwann eine andere als die des Pakets.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Bau-Stand für „Fehler melden" (WP-P): in GitHub Actions steht der Commit
  // in GITHUB_SHA, lokal gibt es keinen — dann „dev". Bewusst kein Aufruf von
  // `git`: der Build darf nicht daran scheitern, dass es kein Repo gibt.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify((process.env.GITHUB_SHA ?? 'dev').slice(0, 7)),
    // Bau-Tag, damit der Stand auch ohne GitHub etwas aussagt. Nur das Datum:
    // eine Uhrzeit wäre ohne Zeitzone irreführend und hilft niemandem weiter.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
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
