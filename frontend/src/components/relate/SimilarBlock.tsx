// Block „Ähnliche" in den Positionsdetails (WP-R, R2).
//
// Er beantwortet eine Frage: Gibt es zu dieser Position Geschwister, und wenn
// ja, wie viele? Die Gruppe selbst — gemeinsame Merkmale, Kennzahlen,
// Ausreißer — steht in der Ansicht „Ähnlichkeit"; hier stünde sie dem Langtext
// im Weg.
//
// Der Knopf „Ähnliche zeigen" hebt die Gruppe **im Graphen** hervor, statt in
// eine andere Ansicht zu springen: wer eine Bubble angeklickt hat, will die
// Geschwister dort sehen, wo er gerade steht. Ein zweiter Klick hebt die
// Hervorhebung wieder auf.
//
// Dasselbe gilt für „zur nächsten": er setzt nur die Auswahl weiter. Der Block
// steht in der Auswahlkarte des Graphen und im Eigenschaften-Panel der Tabelle
// — in beiden Fällen bleibt man, wo man ist.

import { useJumpToPosition } from '../common/useJumpToPosition';
import { truncate } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export function SimilarBlock({ positionId }: { positionId: string }) {
  const {
    clusters,
    view: {
      mode,
      graph: { highlightCluster },
    },
  } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpTo = useJumpToPosition();

  const cluster = clusters.get(positionId);
  // Keine Geschwister, kein Block — eine Überschrift über einer leeren Liste
  // sagt nichts.
  if (cluster === undefined) return null;

  const weitere = cluster.positionIds.length - 1;
  const hervorgehoben = highlightCluster === cluster.id;
  // Die Hervorhebung wirkt nur im Graphen. Steht der Nutzer woanders, führt
  // derselbe Knopf in die Ansicht „Ähnlichkeit" — ein Knopf, der nichts tut,
  // wäre schlimmer als keiner.
  const imGraphen = mode === 'graph';

  return (
    <div
      style={{ padding: 'var(--pad-panel-head)', borderBottom: '1px solid var(--grid)' }}
      className="bg-panel"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] tracking-[0.6px] text-mute uppercase">Ähnliche</span>
        <span className="font-mono text-[9px] text-mute">
          {weitere} {weitere === 1 ? 'weitere Position' : 'weitere Positionen'}
        </span>
      </div>
      <p className="mt-[2px] font-sans text-[11.5px] leading-[1.5] text-ink">
        {truncate(cluster.label, 80)}
      </p>
      <div className="mt-[5px] flex flex-wrap gap-[5px]">
        <button
          type="button"
          onClick={() =>
            imGraphen
              ? dispatch({
                  type: 'highlightCluster',
                  id: hervorgehoben ? null : cluster.id,
                })
              : dispatch({ type: 'setViewMode', mode: 'similar' })
          }
          className="inline-flex cursor-pointer items-center border border-line bg-white px-[7px] py-[2px] font-mono text-[9px] tracking-[0.6px] text-dim hover:text-blue focus-visible:text-blue"
        >
          {imGraphen
            ? hervorgehoben
              ? 'HERVORHEBUNG AUFHEBEN'
              : 'ÄHNLICHE ZEIGEN'
            : 'IN DER ÄHNLICHKEIT ZEIGEN'}
        </button>
        {cluster.positionIds
          .filter((id) => id !== positionId)
          .slice(0, 1)
          .map((id) => (
            <button
              key={id}
              type="button"
              // `stayInView`: der Knopf setzt nur die Auswahl weiter. Ohne das
              // sprünge er in die Tabelle — und stünde damit gegen den Zweck
              // dieses Blocks, die Geschwister dort zu zeigen, wo man steht.
              onClick={() => jumpTo(id, { stayInView: true })}
              className="inline-flex cursor-pointer items-center border border-line bg-white px-[7px] py-[2px] font-mono text-[9px] tracking-[0.6px] text-dim hover:text-blue focus-visible:text-blue"
            >
              ZUR NÄCHSTEN
            </button>
          ))}
      </div>
    </div>
  );
}
