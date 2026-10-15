/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { thirdPartyLicenses } from './build/thirdPartyLicenses.ts';

// Versionsnummer aus der package.json — eine Quelle. Stünde sie zusätzlich im
// Code, wäre die Anzeige irgendwann eine andere als die des Pakets.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

// Die gepflegten Tabellen liegen einmal, unter docs/domain/reference/ — die App
// liest sie dort zur Build-Zeit (Rohtext, kein Fetch). Eine Kopie im Frontend
// gibt es nicht mehr: sie lief zweimal still auseinander.
const REFERENCE = fileURLToPath(new URL('../docs/domain/reference', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { '@reference': REFERENCE } },
  plugins: [react(), thirdPartyLicenses(fileURLToPath(new URL('.', import.meta.url)))],
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
    // Der Dev-Server liefert sonst nichts außerhalb von frontend/ aus.
    fs: { allow: ['.', REFERENCE] },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
});
