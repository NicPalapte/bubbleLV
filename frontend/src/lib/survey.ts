// Kurzumfrage nach einigen Minuten Nutzung (Issue #157, Entscheidung 0071).
//
// Auswahl-Antworten gehen als feste GoatCounter-Ereignisse raus (lib/usage/count.ts) —
// nie Text. Freitext verlässt den Browser nur, wenn man ihn selbst ans Mailprogramm
// übergibt (`mailto:`, kein Request).

import { meldeMail } from './export/issueLink';
import type { UsageEvent } from './usage/count';

/** Aktive Nutzungszeit mit geöffneter Datei, bevor die Umfrage einmal erscheint. */
export const SURVEY_DELAY_MS = 4 * 60_000;

export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];

export const PAY_OPTIONS = [
  { value: 'nein', label: 'Nein' },
  { value: 'bis-10', label: 'bis 10 €/Monat' },
  { value: 'bis-30', label: 'bis 30 €/Monat' },
  { value: 'mehr', label: 'mehr' },
] as const;
export type Pay = (typeof PAY_OPTIONS)[number]['value'];

export interface SurveyAnswers {
  readonly rating: Rating | null;
  readonly pay: Pay | null;
}

/** Ereignisse für die Auswahl-Antworten; eine fehlende Antwort zählt nicht. */
export function surveyEvents(answers: SurveyAnswers): UsageEvent[] {
  const events: UsageEvent[] = ['umfrage-beantwortet'];
  if (answers.rating !== null) events.push(`umfrage-note-${answers.rating}`);
  if (answers.pay !== null) events.push(`umfrage-zahlen-${answers.pay}`);
  return events;
}

const BETREFF = 'Conocto: Feedback';

/** Öffnet das Mailprogramm mit dem Freitext; Antworten der Auswahl stehen nicht darin. */
export function feedbackMailto(text: string): string {
  const params = new URLSearchParams({ subject: BETREFF, body: text.trim() });
  // `URLSearchParams` kodiert Leerzeichen als „+"; im Mailtext stünde sonst ein Plus.
  return `mailto:${meldeMail()}?${params.toString().replace(/\+/g, '%20')}`;
}

/** Gespeicherter Stand: nach Antwort oder „Nicht mehr fragen" erscheint sie nicht mehr. */
export type SurveyDone = 'beantwortet' | 'abgelehnt';

export function toSurveyDone(value: unknown): SurveyDone | null {
  return value === 'beantwortet' || value === 'abgelehnt' ? value : null;
}
