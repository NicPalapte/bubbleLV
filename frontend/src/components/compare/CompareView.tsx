// Ansicht „Vergleich" (WP-N): 2 bis 5 Positionen nebeneinander, eine Spalte je
// Position, eine Zeile je Merkmal. Der Vergleich selbst steht in `CompareBody`
// — dieselbe Komponente zeigt ihn im Fenster über dem Graphen (WP-R, R3).
//
// Hier stehen nur Kopfzeile, Zähler und Schalter: sie unterscheiden sich
// zwischen ganzer Ansicht und schwebendem Fenster.
//
// Mehr als fünf Spalten nebeneinander sind nicht mehr lesbar. Die Auswahl
// selbst wird deshalb **nicht** begrenzt — die Ansicht zeigt die ersten fünf
// und sagt, wie viele warten. Stilles Wegwerfen einer Auswahl wäre schlimmer
// als eine ehrliche Grenze.

import { CompareBody } from './CompareBody';
import { BlockLabel } from '../ui/PanelHeader';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useScrollMemory } from '../common/useScrollMemory';
import { diffCount } from '../../lib/compare/rows';
import { formatCount } from '../../lib/format';
import { MAX_COMPARE_COLUMNS, useViewer, useViewerDispatch } from '../../state/viewer';

export function CompareView() {
  const {
    comparePositions,
    view: {
      compare: { onlyDiffs },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const [attachScroll, onScroll] = useScrollMemory('compare');

  const gezeigt = comparePositions.slice(0, MAX_COMPARE_COLUMNS);
  const wartend = comparePositions.length - gezeigt.length;
  const unterschiede = diffCount(gezeigt);

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto max-w-[1200px] px-[20px] py-[16px]">
        <div className="border-b border-line pb-[10px]">
          <BlockLabel>Vergleich</BlockLabel>
          <p className="mt-[2px] font-sans text-[13px] text-ink">
            <span className="font-semibold">{formatCount(gezeigt.length)}</span>{' '}
            {gezeigt.length === 1 ? 'Position' : 'Positionen'} nebeneinander
            {unterschiede > 0 && (
              <span className="text-dim">
                {' · '}
                {formatCount(unterschiede)} {unterschiede === 1 ? 'Unterschied' : 'Unterschiede'}
              </span>
            )}
            {wartend > 0 && (
              <span className="text-dim">
                {' · '}
                {formatCount(wartend)} weitere gewählt, {MAX_COMPARE_COLUMNS} passen nebeneinander
              </span>
            )}
          </p>
          <p className="mt-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">
            Mit Strg- bzw. Cmd-Klick in Tabelle, Baum oder Graph kommt eine Position dazu — eine
            vorher angewählte gleich mit. Im Graphen geht es auch per Rechtsklick. Markiert ist, was
            sich unterscheidet.
          </p>
          {comparePositions.length > 0 && (
            <div className="mt-[10px] flex flex-wrap items-center gap-[12px]">
              <div className="flex items-center gap-[6px]">
                <span className="font-mono text-[8px] tracking-[0.6px] text-mute">ZEILEN</span>
                <SegmentedControl
                  label="Welche Zeilen"
                  options={[
                    { value: 'alle', label: 'Alle' },
                    { value: 'diffs', label: 'Nur Unterschiede' },
                  ]}
                  value={onlyDiffs ? 'diffs' : 'alle'}
                  onChange={(value) =>
                    dispatch({ type: 'compareOnlyDiffs', value: value === 'diffs' })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'clearCompare' })}
                className="cursor-pointer border border-line bg-white px-[8px] py-[3px] font-mono text-[9px] tracking-[0.6px] text-dim hover:text-blue"
              >
                AUSWAHL LEEREN
              </button>
            </div>
          )}
        </div>

        {comparePositions.length === 0 && (
          <div className="mt-[16px]">
            <EmptyState>Keine Position im Vergleich — mit Strg-Klick auswählen</EmptyState>
          </div>
        )}

        {comparePositions.length === 1 && (
          <p className="mt-[10px] font-sans text-[11.5px] text-dim">
            Eine zweite Position macht daraus einen Vergleich.
          </p>
        )}

        {gezeigt.length > 0 && <CompareBody gezeigt={gezeigt} onlyDiffs={onlyDiffs} />}
      </div>
    </div>
  );
}
