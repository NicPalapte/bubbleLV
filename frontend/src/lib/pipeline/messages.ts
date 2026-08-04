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

export type PipelineResponse =
  | { ok: true; result: LoadedLV }
  | { ok: false; code: PipelineErrorCode; message: string };

export interface PipelineFailure {
  code: PipelineErrorCode;
  message: string;
}

export function toPipelineError(error: unknown): PipelineFailure {
  if (error instanceof GAEBVersionError) return { code: 'version', message: error.message };
  if (error instanceof GAEBValidationError) return { code: 'validation', message: error.message };
  if (error instanceof GAEBParseError) return { code: 'parse', message: error.message };
  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Datei',
  };
}

/** Fehlermeldung für die UI — Ursache zuerst, dann was zu tun ist. */
export function describeFailure(failure: PipelineFailure): string {
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
