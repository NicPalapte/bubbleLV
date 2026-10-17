import { resolve } from 'node:path';

// Die Tests laufen mit der App (`cd frontend && npm test`), das Arbeitsverzeichnis
// ist also frontend/. `import.meta.url` taugt hier nicht: jsdom macht daraus
// eine http-Adresse.
export const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');
