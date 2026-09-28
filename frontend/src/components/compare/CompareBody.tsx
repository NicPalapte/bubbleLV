// Der Vergleich selbst: Spaltenkopf, Merkmalszeilen, Langtext (WP-N).
//
// Herausgezogen aus `CompareView` (WP-R, R3), weil das Fenster über dem
// Graphen dasselbe zeigt. **Dieselbe Komponente, nicht eine zweite
// Darstellung** — sonst behaupteten Ansicht und Fenster irgendwann
// Verschiedenes über dieselben Positionen.
//
// Was hier nicht steht: Kopfzeile, Zähler und Schalter. Die sind an beiden
// Orten verschieden (ganze Ansicht gegen schwebendes Fenster) und gehören
// deshalb dorthin, nicht hierher.

import { BlockLabel } from '../ui/PanelHeader';
import { EmptyState } from '../ui/EmptyState';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { comparedPositions, compareRows } from '../../lib/compare/rows';
import { markCommonWords } from '../../lib/compare/textDiff';
import { truncate } from '../../lib/format';
import { useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

const SPALTE = 'min-w-[200px] flex-1 px-[10px] py-[6px] align-top';
/**
 * Merkmalsnamen stehen in der Tabelle in einer 150 px breiten Spalte davor.
 * Spaltenkopf und Langtext sind keine Tabellenzeilen — ohne diesen Platzhalter
 * stünden sie um genau diese 150 px versetzt zu den Werten darunter.
 */
const LABEL_SPALTE = 'w-[150px] shrink-0';

export interface CompareBodyProps {
  /** Die Positionen, die nebeneinander stehen — schon auf die Spaltenzahl gekürzt. */
  gezeigt: readonly LVNode[];
  /** Nur Zeilen zeigen, in denen sich die Spalten unterscheiden. */
  onlyDiffs: boolean;
}

export function CompareBody({ gezeigt, onlyDiffs }: CompareBodyProps) {
  const dispatch = useViewerDispatch();
  const jumpTo = useJumpToPosition();

  const positionen = comparedPositions(gezeigt);
  const rows = compareRows(positionen);
  const sichtbar = onlyDiffs ? rows.filter((row) => row.differs) : rows;
  const langtexte = markCommonWords(positionen.map((position) => position.longText));

  return (
    <>
      {/* Kopf: je Spalte OZ, Kurztext und die beiden Wege hinaus. */}
      <div className="mt-[12px] flex border-b border-line2">
        <div className={LABEL_SPALTE} aria-hidden="true" />
        {gezeigt.map((node) => (
          <div key={node.id} className={SPALTE}>
            <div className="font-mono text-[10px] text-dim">{node.position?.oz}</div>
            <div className="mt-[2px] font-sans text-[12px] font-semibold leading-[1.35] text-ink">
              {truncate(node.position?.shortText ?? '', 90)}
            </div>
            <div className="mt-[6px] flex gap-[6px]">
              <button
                type="button"
                onClick={() => jumpTo(node.id)}
                className="cursor-pointer border border-line bg-white px-[6px] py-[2px] font-mono text-[9px] text-dim hover:text-blue"
              >
                IN DER TABELLE
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'toggleCompare', positionId: node.id })}
                aria-label={`${node.position?.oz ?? ''} aus dem Vergleich nehmen`}
                className="cursor-pointer border border-line bg-white px-[6px] py-[2px] font-mono text-[9px] text-mute hover:text-blue"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {sichtbar.length === 0 && (
        <div className="mt-[16px]">
          {/* „Keine Unterschiede" wäre eine Aussage über den Vergleich.
              Führen die Positionen gar keine Merkmale, gab es nichts zu
              vergleichen — das ist etwas anderes und muss so dastehen. */}
          <EmptyState>
            {rows.length === 0
              ? 'Keine Merkmale zum Vergleichen — diese Positionen führen keine'
              : 'Keine Unterschiede in den Merkmalen'}
          </EmptyState>
        </div>
      )}

      <table className="mt-[4px] w-full border-collapse">
        <tbody>
          {sichtbar.map((row) => (
            <tr key={row.key} data-differs={row.differs} className="border-b border-grid align-top">
              <th
                scope="row"
                className="w-[150px] px-[10px] py-[6px] text-left font-mono text-[9px] font-normal tracking-[0.6px] text-mute"
              >
                {row.label.toUpperCase()}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={gezeigt[index].id}
                  className={`${SPALTE} font-sans text-[11.5px] leading-[1.4] ${
                    row.differs ? 'font-medium text-ink' : 'text-mute'
                  }`}
                  style={row.differs ? { background: 'var(--blueS)' } : undefined}
                >
                  {value ?? <span className="text-mute">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-[16px] border-t border-line pt-[10px]">
        <BlockLabel>Langtext</BlockLabel>
        <div className="mt-[4px] flex">
          <div className={LABEL_SPALTE} aria-hidden="true" />
          {langtexte.map((teile, index) => (
            <div
              key={gezeigt[index].id}
              className={`${SPALTE} whitespace-pre-wrap font-sans text-[11.5px] leading-[1.5] text-ink`}
            >
              {teile.length === 0 ? (
                <span className="text-mute">—</span>
              ) : (
                teile.map((teil, i) =>
                  teil.common ? (
                    <span key={i} className="text-mute">
                      {teil.text}
                    </span>
                  ) : (
                    <mark
                      key={i}
                      className="font-medium text-ink"
                      style={{ background: 'var(--blueS)' }}
                    >
                      {teil.text}
                    </mark>
                  ),
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
