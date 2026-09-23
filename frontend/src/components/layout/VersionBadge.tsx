// Bau-Stand in der Kopfleiste (Issue #71). Steht dort, weil eine Meldung ohne
// Versionsangabe kaum zu gebrauchen ist: „bei mir geht X nicht" lässt sich
// nicht einordnen, wenn niemand weiß, welcher Stand im Browser lief.
//
// Dieselbe Quelle wie der Meldetext (lib/version.ts) — der Nutzer liest also
// genau den Wert, der später in seiner Meldung steht.

import { BUILD_ID, buildDate } from '../../lib/version';

export interface VersionBadgeProps {
  /**
   * Mit geladenem LV teilt sich die Kopfleiste den Platz mit Ansichten und
   * Filtern — dann steht nur der Stand da und das Datum im Tooltip. Auf der
   * Startseite ist Platz, dort steht beides.
   */
  kompakt?: boolean;
}

export function VersionBadge({ kompakt = false }: VersionBadgeProps) {
  const datum = buildDate();
  const titel = datum === '' ? `Bau-Stand ${BUILD_ID}` : `Bau-Stand ${BUILD_ID} vom ${datum}`;
  const mitDatum = datum !== '' && !kompakt;
  return (
    <div
      className="flex shrink-0 items-center gap-[6px] border-l border-line px-[14px] font-mono text-[9px] tracking-[0.4px] text-mute"
      title={titel}
    >
      <span className="border border-line px-[4px] py-[1px] text-dim">BETA</span>
      <span>{BUILD_ID}</span>
      {mitDatum && <span className="text-line2">·</span>}
      {mitDatum && <span>{datum}</span>}
    </div>
  );
}
