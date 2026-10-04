// Nachrichtenformat zwischen UI und Pipeline-Worker. Fehler werden auf einen
// serialisierbaren Code abgebildet: Exception-Klassen überleben structuredClone
// nicht, `instanceof` funktioniert jenseits der Worker-Grenze also nicht.

import { GAEBParseError, GAEBValidationError, GAEBVersionError } from '../gaeb';
import type { LVDraft } from '../../types/lvDraft';
import type { LoadedLV } from './runPipeline';

export type PipelineErrorCode = 'parse' | 'validation' | 'version' | 'unknown';

export interface PipelineRequest {
  draft: LVDraft;
  fileName: string;
}

export type PipelineResponse = { ok: true; result: LoadedLV } | ({ ok: false } & PipelineFailure);

export interface PipelineFailure {
  code: PipelineErrorCode;
  message: string;
  /** Fertiger Satz mit eigenem nächsten Schritt: `describeFailure` ergänzt nichts. */
  complete?: boolean;
  /**
   * Technische Ursache für die Fehlersuche, nie für die Anzeige. Ein Text statt
   * eines Error-Objekts, weil Exception-Klassen die Worker-Grenze nicht überleben
   * (structuredClone, siehe Kopfkommentar).
   */
  detail?: string;
}

/** Ursache als Text: „RangeError: Maximum call stack size exceeded". */
function describeCause(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export function toPipelineError(error: unknown): PipelineFailure {
  if (error instanceof GAEBVersionError) {
    return { code: 'version', message: error.message, complete: error.complete };
  }
  if (error instanceof GAEBValidationError) {
    return { code: 'validation', message: error.message, complete: error.complete };
  }
  if (error instanceof GAEBParseError) {
    return { code: 'parse', message: error.message, complete: error.complete };
  }
  // Der Systemtext eines unerwarteten Fehlers („Maximum call stack size exceeded")
  // hilft niemandem beim Laden einer Datei und ist Englisch. Die Meldung bleibt
  // deshalb immer dieselbe deutsche.
  return {
    code: 'unknown',
    message: UNEXPECTED_FAILURE,
    complete: true,
    detail: describeCause(error),
  };
}

/** Meldung für einen Fehler, den keine der eigenen Fehlerklassen beschreibt. */
export const UNEXPECTED_FAILURE =
  'Beim Lesen der Datei ist ein unerwarteter Fehler aufgetreten. ' +
  'Bitte die Datei erneut laden oder prüfen, ob sie sich in der Ausschreibungssoftware öffnen lässt.';

/**
 * Fehlermeldung für die UI — Ursache zuerst, dann was zu tun ist.
 *
 * Eine Meldung mit `complete` ist ein fertiger Satz mit eigenem nächsten Schritt
 * („Die Datei x.x83 ist leer.") und bleibt unverändert. Alle anderen sind
 * Bruchstücke und bekommen den Hinweis zu ihrer Fehlerart. Die Kennzeichnung kommt
 * aus dem Fehler selbst; aus dem letzten Zeichen des Texts würde sie erraten, und
 * ein Dateiname wie „LV." brächte das durcheinander.
 */
export function describeFailure(failure: PipelineFailure): string {
  if (failure.complete === true) return failure.message;
  switch (failure.code) {
    case 'version':
      return `${failure.message}. Bitte die Datei aus der Ausschreibungssoftware in einer unterstützten GAEB-Version exportieren.`;
    case 'validation':
      return `${failure.message}. Erwartet wird eine GAEB-DA-XML-Datei (z. B. .x83).`;
    case 'parse':
      return `${failure.message}. Die Datei ist beschädigt oder kein GAEB-DA-XML.`;
    default:
      return failure.message;
  }
}
