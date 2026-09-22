// „Fehler melden" (WP-P, Schritt 6; Issue #57): ein Link auf ein vorbefülltes
// GitHub-Issue.
//
// **Nichts aus der geladenen Datei.** Kein Dateiname, kein Projektname, keine
// OZ, kein Positionstext, keine Zahl daraus. In den Link gehören nur Dinge,
// die den Fehler technisch einordnen: Browser, Bildschirmgröße, Bau-Stand und
// die Ansicht, in der es passiert ist. Begründung und die abgelehnte
// Nutzungsmessung: docs/decisions/0017-keine-nutzungsmessung.md.
//
// Abgeschickt wird nichts automatisch: der Link öffnet das ausgefüllte
// Formular in einem neuen Tab, der Nutzer liest es und drückt selbst ab.

const REPO = 'https://github.com/NicPalapte/bubbleLV';

/** Bau-Stand; in CI gesetzt, lokal „dev". Siehe vite.config.ts. */
declare const __BUILD_ID__: string;

export interface IssueContext {
  /** Aktive Ansicht — „graph", „matrix" … Kein Inhalt, nur der Modus. */
  view: string;
  /** Ist überhaupt eine Datei geladen? Nur ja/nein, nicht welche. */
  loaded: boolean;
}

/**
 * Technische Angaben, die in die Meldung dürfen. Bewusst als eigene Funktion:
 * so steht an einer Stelle, was das Feld enthalten darf — und der Test prüft
 * genau diese Stelle.
 */
function umgebung({ view, loaded }: IssueContext): string[] {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  const fenster = typeof window === 'undefined' ? null : window;
  return [
    `- Bubble-Stand: ${typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'}`,
    `- Ansicht: ${view}`,
    `- Datei geladen: ${loaded ? 'ja' : 'nein'}`,
    `- Browser: ${nav?.userAgent ?? 'unbekannt'}`,
    `- Sprache: ${nav?.language ?? 'unbekannt'}`,
    `- Fenster: ${fenster === null ? 'unbekannt' : `${fenster.innerWidth}×${fenster.innerHeight}`}`,
  ];
}

export function issueBody(context: IssueContext): string {
  return [
    '## Was ist passiert?',
    '',
    '<!-- Bitte hier beschreiben. Keine Inhalte aus dem LV einfügen, wenn sie',
    '     vertraulich sind — dieses Formular ist öffentlich. -->',
    '',
    '## Was war zu erwarten?',
    '',
    '',
    '## Umgebung',
    '',
    ...umgebung(context),
    '',
    '<!-- Aus der geladenen Datei steht hier nichts: kein Dateiname, keine',
    '     Positionen, keine Mengen oder Preise. -->',
  ].join('\n');
}

/** Fertiger Link auf das vorbefüllte Formular. */
export function issueUrl(context: IssueContext): string {
  const params = new URLSearchParams({
    title: 'Fehler in Bubble: ',
    labels: 'bug',
    body: issueBody(context),
  });
  return `${REPO}/issues/new?${params.toString()}`;
}
