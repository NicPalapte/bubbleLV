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
  'filterleiste',
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
  // Kurzumfrage (Entscheidung 0071): nur feste Antwortstufen, nie Freitext.
  'umfrage-gezeigt',
  'umfrage-abgelehnt',
  'umfrage-beantwortet',
  'umfrage-note-1',
  'umfrage-note-2',
  'umfrage-note-3',
  'umfrage-note-4',
  'umfrage-note-5',
  'umfrage-zahlen-nein',
  'umfrage-zahlen-bis-10',
  'umfrage-zahlen-bis-30',
  'umfrage-zahlen-mehr',
  'umfrage-freitext-mail',
  // Begleitdokument (Entscheidung 0072): nur das Ereignis, nie Dateiname oder Text.
  'dokument-geoeffnet',
  'dokument-anstreichung',
  'dokument-verknuepft',
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
  check: 'seitenfenster-pruefung',
} as const satisfies Record<string, UsageEvent>;

/**
 * Ereignis zu einer Viewer-Aktion, sonst null. Zählt nur, dass eine Funktion genutzt
 * wurde — bei `search` und `addComment` nie der Text selbst. Marker zählen nur
 * beim Setzen, nicht beim Entfernen.
 */
export function usageEventOf(action: ViewerAction): UsageEvent | null {
  switch (action.type) {
    // Bereich öffnen (Splitscreen, Entscheidung 0074): Überblick, Prüfung und Tabelle
    // zählen wie früher ihr Fenster.
    case 'paneClosed':
    case 'showPane':
      if (action.type === 'paneClosed' && action.closed) return null;
      if (action.pane === 'overview' || action.pane === 'check') {
        return SIDE_PANEL_EVENT[action.pane];
      }
      return action.pane === 'table' ? 'tabelle' : null;
    case 'filterBar':
      return action.open ? 'filterleiste' : null;
    case 'compareWindow':
      return action.open ? 'vergleich' : null;
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
    // Begleitdokument (Entscheidung 0072): nie Name, Text oder Position.
    case 'docRegister':
      return 'dokument-geoeffnet';
    case 'docPaint':
      return action.paint === null ? null : 'dokument-anstreichung';
    case 'docLink':
      return action.ids.length === 0 ? null : 'dokument-verknuepft';
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
    // Bildschirmgröße zeigt, ob Conocto auf Tablet oder Smartphone genutzt wird.
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
