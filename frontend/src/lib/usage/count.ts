// Anonyme Nutzungszählung über GoatCounter (Entscheidung 0056). Einzige Stelle der
// App, die von sich aus einen Request an einen fremden Dienst schickt. Gesendet
// werden nur feste Ereignisnamen aus `USAGE_EVENTS` — nie Dateinamen, LV-Inhalte,
// Suchtexte, Filterwerte oder das URL-Fragment.

import type { ViewerAction } from '../../state/viewer';

/** Konto bei GoatCounter: https://bubble.goatcounter.com (docs/setup/nutzungszaehlung.md). */
export const GOATCOUNTER_CODE = 'bubble';
const COUNT_URL = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;

export const USAGE_EVENTS = [
  'demo-geoeffnet',
  'datei-geoeffnet',
  'letzte-datei-geoeffnet',
  'laden-fehlgeschlagen',
  'seitenfenster-ueberblick',
  'seitenfenster-filter',
  'seitenfenster-pruefung',
  'tabelle',
  'vergleich',
  'suche',
  'markierung',
  'kommentar',
  'anstreichung',
  'tour',
  'export-csv',
  'export-treffer',
  'export-markdown',
  'drucken',
  'notizen-gesichert',
  'notizen-geladen',
] as const;

export type UsageEvent = (typeof USAGE_EVENTS)[number];

/** Ereignisse, die je Seitenaufruf mehrfach zählen (jedes Öffnen ist eine Nutzung). */
const REPEATABLE: ReadonlySet<UsageEvent> = new Set([
  'demo-geoeffnet',
  'datei-geoeffnet',
  'letzte-datei-geoeffnet',
  'laden-fehlgeschlagen',
]);

const SIDE_PANEL_EVENT = {
  overview: 'seitenfenster-ueberblick',
  filter: 'seitenfenster-filter',
  check: 'seitenfenster-pruefung',
} as const satisfies Record<string, UsageEvent>;

/**
 * Ereignis zu einer Viewer-Aktion, sonst null. Zählt nur, dass eine Funktion genutzt
 * wurde — bei `search` und `addComment` nie der Text selbst. Marker zählen nur
 * beim Setzen, nicht beim Entfernen.
 */
export function usageEventOf(action: ViewerAction): UsageEvent | null {
  switch (action.type) {
    case 'sidePanel':
      return action.panel === null ? null : SIDE_PANEL_EVENT[action.panel];
    case 'tableWindow':
    case 'compareWindow':
      if (!action.open) return null;
      return action.type === 'tableWindow' ? 'tabelle' : 'vergleich';
    case 'openInTable':
      return 'tabelle';
    case 'search':
      return action.value.trim() === '' ? null : 'suche';
    case 'setProgress':
      return action.progress === null ? null : 'markierung';
    case 'setImportant':
      return action.on ? 'markierung' : null;
    case 'addComment':
      return action.text.trim() === '' ? null : 'kommentar';
    // Gleiche Stelle in gleicher Farbe zählt mit: dafür fehlt hier der Zustand.
    case 'addHighlight':
      return action.text.trim() === '' || action.start < 0 ? null : 'anstreichung';
    case 'tour':
      return action.step === 0 ? 'tour' : null;
    default:
      return null;
  }
}

/**
 * Hauptschalter: erst an, wenn die Datenschutzerklärung GoatCounter nennt. Einschalten
 * über `frontend/.env.production` mit `VITE_USAGE_COUNT=1` (docs/setup/nutzungszaehlung.md).
 */
function switchedOn(): boolean {
  return import.meta.env.VITE_USAGE_COUNT === '1';
}

/** „Do Not Track“: Browser melden `'1'`, ältere Firefox `'yes'`, ältere Safari über `window`. */
function doNotTrack(): boolean {
  const legacy = (window as { doNotTrack?: string | null }).doNotTrack;
  return [navigator.doNotTrack, legacy].some((value) => value === '1' || value === 'yes');
}

/**
 * Zählen nur auf der Live-Seite: nicht im Dev-Server, nicht in Tests, nicht in
 * PR-Vorschauen und nicht, wenn der Browser „Do Not Track“ meldet.
 */
function isEnabled(): boolean {
  if (!import.meta.env.PROD || !switchedOn() || typeof window === 'undefined') return false;
  const { hostname, pathname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  if (pathname.includes('/pr-preview/')) return false;
  return !doNotTrack();
}

/** URL für einen Zähl-Aufruf. `path` ist immer fest, nie aus der Adresszeile. */
export function countUrl(path: string, event: boolean): string {
  const params = new URLSearchParams({ p: path, rnd: Math.random().toString(36).slice(2) });
  if (event) params.set('e', 'true');
  else {
    // Herkunft nur als Domain (z. B. google.com), ohne Pfad und Suchbegriffe.
    const referrer = referrerOrigin();
    if (referrer !== null) params.set('r', referrer);
    // Bildschirmgröße zeigt, ob Bubble auf Tablet oder Smartphone genutzt wird.
    params.set('s', `${screen.width},${screen.height},${window.devicePixelRatio || 1}`);
  }
  return `${COUNT_URL}?${params.toString()}`;
}

function referrerOrigin(): string | null {
  try {
    if (document.referrer === '') return null;
    const origin = new URL(document.referrer).origin;
    return origin === window.location.origin ? null : origin;
  } catch {
    return null;
  }
}

function send(url: string): void {
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)) return;
  void fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true }).catch(() => {});
}

/** Zählen darf die App nie stören — jeder Fehler hier bleibt folgenlos. */
function quietly(work: () => void): void {
  try {
    work();
  } catch {
    // bewusst leer
  }
}

const counted = new Set<UsageEvent>();

/** Einmal je Seitenaufruf, beim Start der App. */
export function countPageview(): void {
  quietly(() => {
    if (isEnabled()) send(countUrl('/', false));
  });
}

/** Ein Ereignis zählen. Funktionen zählen einmal je Seitenaufruf, Dateien jedes Mal. */
export function countEvent(event: UsageEvent): void {
  quietly(() => {
    if (!REPEATABLE.has(event)) {
      if (counted.has(event)) return;
      counted.add(event);
    }
    if (isEnabled()) send(countUrl(event, true));
  });
}
