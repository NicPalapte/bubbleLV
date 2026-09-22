// Ansicht „Vergleich" (WP-N): 2 bis 5 Positionen nebeneinander, eine Spalte je
// Position, eine Zeile je Merkmal. Abweichende Zeilen sind markiert, gleiche
// stehen gedämpft daneben — beides zu zeigen ist der Punkt: „gleich" ist eine
// Aussage, kein leerer Platz.
//
// Der Langtext steht unter den Merkmalen, wortweise verglichen: markiert ist,
// was nicht in allen Spalten vorkommt (lib/compare/textDiff.ts).
//
// Mehr als fünf Spalten nebeneinander sind nicht mehr lesbar. Die Auswahl
// selbst wird deshalb **nicht** begrenzt — die Ansicht zeigt die ersten fünf
// und sagt, wie viele warten. Stilles Wegwerfen einer Auswahl wäre schlimmer
// als eine ehrliche Grenze.

import { BlockLabel } from '../ui/PanelHeader';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { useScrollMemory } from '../common/useScrollMemory';
import { compareRows } from '../../lib/compare/rows';
import { markCommonWords } from '../../lib/compare/textDiff';
import { formatCount, truncate } from '../../lib/format';
import { MAX_COMPARE_COLUMNS, useViewer, useViewerDispatch } from '../../state/viewer';
import type { PositionSummary } from '../../types/lvNode';

const SPALTE = 'min-w-[200px] flex-1 px-[10px] py-[6px] align-top';

export function CompareView() {
  const {
    comparePositions,
    view: {
      compare: { onlyDiffs },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpTo = useJumpToPosition();
  const [attachScroll, onScroll] = useScrollMemory('compare');

  const gezeigt = comparePositions.slice(0, MAX_COMPARE_COLUMNS);
  const wartend = comparePositions.length - gezeigt.length;
  const positionen = gezeigt.map((node) => node.position as PositionSummary);

  const rows = compareRows(positionen);
  const sichtbar = onlyDiffs ? rows.filter((row) => row.differs) : rows;
  const unterschiede = rows.filter((row) => row.differs).length;
  const langtexte = markCommonWords(positionen.map((position) => position.longText));

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
            Mit Strg- bzw. Cmd-Klick in Tabelle, Baum oder Graph kommt eine Position dazu. Markiert
            ist, was sich unterscheidet.
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

        {gezeigt.length > 0 && (
          <>
            {/* Kopf: je Spalte OZ, Kurztext und die beiden Wege hinaus. */}
            <div className="mt-[12px] flex border-b border-line2">
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
                  <tr
                    key={row.key}
                    data-differs={row.differs}
                    className="border-b border-grid align-top"
                  >
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
        )}
      </div>
    </div>
  );
}
