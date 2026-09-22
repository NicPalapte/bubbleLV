// „Mitnehmen"-Menü der Kopfleiste (WP-P, Schritte 3, 4 und 6): Export, Druck
// und Fehler melden.
//
// Alle vier Einträge erzeugen **keinen Request**: CSV und Markdown entstehen
// als Blob im Browser, der Druck läuft über `window.print()`, und der
// Melde-Link öffnet nur ein vorbefülltes Formular in einem neuen Tab — ohne
// einen einzigen Inhalt aus der geladenen Datei
// (docs/decisions/0017-keine-nutzungsmessung.md).

import { useCallback, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Chip } from '../ui/Chip';
import { Popover, PopoverHead, PopoverRow } from '../ui/Popover';
import { useDismiss } from '../common/useDismiss';
import { checkMarkdown } from '../../lib/export/checkReport';
import { downloadText, exportFileName } from '../../lib/export/download';
import { issueUrl } from '../../lib/export/issueLink';
import { exportCount, positionsCsv } from '../../lib/export/positions';
import { formatCount } from '../../lib/format';
import { filterMask } from '../../lib/index/positionIndex';
import { matchCount } from '../../lib/tree/matchCounts';
import { useViewer } from '../../state/viewer';

export function ExportMenu() {
  const { lv, index, active, filter, matches, nodes, view } = useViewer();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useDismiss(
    [anchorRef, popoverRef],
    open,
    useCallback(() => setOpen(false), []),
  );

  // Die Maske kostet einen Durchlauf über den Positions-Index (bei 10k
  // Positionen spürbar). Das Menü steht dauerhaft in der Kopfleiste, also
  // rechnet es zweimal nicht: nicht bei jedem Render (useMemo) und gar nicht,
  // solange es zu ist — gebraucht wird sie erst für die Zahl im Eintrag und
  // den Export selbst.
  const mask = useMemo(
    () => (open && active.filtering ? filterMask(index, active) : null),
    [open, index, active],
  );
  const anzahl = useMemo(() => (open ? exportCount(index, mask) : 0), [open, index, mask]);

  if (lv === null) return null;

  const positionenAlsCsv = (): void => {
    downloadText(
      exportFileName(lv.fileName, 'positionen', 'csv'),
      positionsCsv(index, mask),
      'csv',
    );
    setOpen(false);
  };

  const hinweiseAlsMarkdown = (): void => {
    // Dieselbe Menge, die die Ansicht „Prüfung" zeigt: der aktive Filter
    // entscheidet, und abgeschaltete Regeln bleiben draußen.
    const visible = matches.filtering
      ? new Set(
          lv.check.flags
            .map((flag) => flag.positionId)
            .filter((positionId) => {
              const node = nodes.get(positionId);
              return node !== undefined && matchCount(matches, node) > 0;
            }),
        )
      : null;
    downloadText(
      exportFileName(lv.fileName, 'hinweise', 'md'),
      checkMarkdown({
        check: lv.check,
        nodes,
        muted: filter.mutedRules,
        visible,
        fileName: lv.fileName,
        projectName: lv.projectName,
      }),
      'markdown',
    );
    setOpen(false);
  };

  const drucken = (): void => {
    // `window.print()` blockiert den Aufbau der Druckseite: ein normales
    // `setState` wäre erst danach gezeichnet, und das offene Menü stünde mit
    // auf dem Blatt. (Die Klasse am Popover deckt denselben Fall auch für
    // Strg+P ab — hier geht es um die Reihenfolge.)
    flushSync(() => setOpen(false));
    window.print();
  };

  const fehlerMelden = (): void => {
    window.open(issueUrl({ view: view.mode, loaded: true }), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <div ref={anchorRef}>
      <Chip onClick={() => setOpen((value) => !value)} title="Exportieren, drucken, Fehler melden">
        ⇩ Mitnehmen <span className="-ml-[2px] text-mute">▾</span>
      </Chip>
      <Popover ref={popoverRef} open={open} width={260} anchorRef={anchorRef}>
        <PopoverHead>Mitnehmen</PopoverHead>
        <PopoverRow
          onClick={positionenAlsCsv}
          title="Alle Spalten, genau die gefilterten Zeilen"
          trailing={formatCount(anzahl)}
        >
          Positionen als CSV
        </PopoverRow>
        <PopoverRow onClick={hinweiseAlsMarkdown} title="Prüf-Hinweise im aktuellen Filter">
          Hinweise als Markdown
        </PopoverRow>
        <PopoverRow onClick={drucken} title="Druckt die gefilterte Liste, nicht nur das Sichtbare">
          Drucken
        </PopoverRow>
        <PopoverRow
          onClick={fehlerMelden}
          title="Öffnet ein vorbefülltes Formular — ohne Inhalte aus deiner Datei"
        >
          Fehler melden
        </PopoverRow>
      </Popover>
    </div>
  );
}
