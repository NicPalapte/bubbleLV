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

/**
 * Empfänger für den E-Mail-Weg. Leer: dann öffnet der Knopf eine neue Mail
 * **ohne** Adresse, und der Absender trägt sie selbst ein.
 *
 * Hier — und nur hier — steht das Postfach, sobald es eines gibt. Eine Adresse
 * im Quelltext einer öffentlichen App findet jeder Spam-Sammler; solange
 * niemand sie braucht, bleibt sie leer.
 */
const MELDE_MAIL = '';

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

/**
 * Der Meldetext. `beschreibung` ist, was der Nutzer selbst getippt hat — leer
 * bleibt die Überschrift mit einem Hinweis stehen, damit der Text auch dann
 * brauchbar ist, wenn jemand ihn unausgefüllt weitergibt.
 */
export function issueBody(context: IssueContext, beschreibung = ''): string {
  const text = beschreibung.trim();
  return [
    '## Was ist passiert?',
    '',
    text === ''
      ? '<!-- Bitte hier beschreiben. Keine Inhalte aus dem LV einfügen, wenn sie\n     vertraulich sind — diese Meldung ist öffentlich. -->'
      : text,
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

/** Betreff — kurz, und ohne einen einzigen Inhalt aus der Datei. */
const BETREFF = 'Fehler in Bubble';

/**
 * Fertiger Link auf das vorbefüllte GitHub-Formular. Braucht ein Konto:
 * GitHub kennt keine anonymen Meldungen, wer nicht angemeldet ist, landet
 * auf der Anmeldeseite. Für alle anderen gibt es Mail und Zwischenablage.
 */
export function issueUrl(context: IssueContext, beschreibung = ''): string {
  const params = new URLSearchParams({
    title: `${BETREFF}: `,
    labels: 'bug',
    body: issueBody(context, beschreibung),
  });
  return `${REPO}/issues/new?${params.toString()}`;
}

/**
 * Link, der das Mailprogramm mit fertiger Nachricht öffnet. Ohne Empfänger,
 * solange `MELDE_MAIL` leer ist — die Adresse trägt der Absender dann selbst
 * ein. `mailto:` erzeugt keinen Request; es übergibt den Text an das Programm,
 * das der Rechner für Mail eingerichtet hat.
 */
export function mailtoUrl(context: IssueContext, beschreibung = ''): string {
  const params = new URLSearchParams({
    subject: BETREFF,
    body: issueBody(context, beschreibung),
  });
  // `URLSearchParams` kodiert Leerzeichen als „+"; in einem mailto-Text
  // stünde dann wörtlich ein Pluszeichen statt eines Leerzeichens.
  return `mailto:${MELDE_MAIL}?${params.toString().replace(/\+/g, '%20')}`;
}
