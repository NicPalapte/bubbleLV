// Abschnitt „VA-Menge“ der Positionskarte (Entscheidung 0093): Menge aus Plänen mit
// Herkunft. „Plan“ = Summe der verknüpften Messungen; „Rechenansatz“ = Bausteine, die im
// Plan angetippt werden (gedruckte Maße einer Maßkette oder eigene Messungen), dazwischen
// Rechenzeichen. Zahlen werden nie getippt. Die Differenz zur LV-Menge steht nur da,
// ohne Wertung.

import { useOptionalDocuments } from './DocumentsProvider';
import { Section } from '../common/CardParts';
import { formatNumber } from '../../lib/format';
import {
  ANSATZ_OPS,
  ansatzText,
  appendTerm,
  EMPTY_PLAN_NOTES,
  formatMeasure,
  vaOf,
  type AnsatzOp,
} from '../../lib/docs/planNotes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

export const PLAN_QUANTITY_SECTION = 'VA-Menge';

const OP_LABEL: Readonly<Record<AnsatzOp, string>> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': ':',
  '(': '(',
  ')': ')',
};

const SMALL_BTN =
  'h-[36px] min-w-[36px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-sans text-[13px] text-ink hover:border-line2 disabled:cursor-default disabled:text-mute';

export function PlanQuantity({
  positionId,
  quantity,
  unit,
}: {
  positionId: string;
  quantity: number | null;
  unit: string | null;
}) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const documents = useOptionalDocuments();
  const plans = annotations.plans ?? EMPTY_PLAN_NOTES;
  const va = vaOf(plans, positionId);
  const note = plans.quantities.get(positionId) ?? {};
  const ansatz = note.ansatz ?? [];
  const building = documents?.ansatzFor === positionId;
  const hasDoc = (documents?.docs.length ?? 0) > 0;
  if (va === null && !hasDoc) return null;

  const nameOf = (id: string): string =>
    plans.measures.find((entry) => entry.id === id)?.name ?? 'Messung';
  const setAnsatz = (next: typeof ansatz): void =>
    dispatch({ type: 'planQuantity', id: positionId, note: { ...note, ansatz: next } });
  const isOpen = (doc: string): boolean =>
    documents?.docs.some((entry) => entry.id === doc) ?? false;
  const difference =
    va?.value === null || va === null || quantity === null ? null : va.value - quantity;

  return (
    <Section
      title={PLAN_QUANTITY_SECTION}
      right={
        va !== null ? (
          <span className="rounded-[var(--r-pill)] border border-line px-[8px] font-sans text-[11px] text-dim">
            {va.herkunft}
          </span>
        ) : undefined
      }
    >
      {va !== null && (
        <div className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[2px] font-sans">
          <span className="text-[15px] font-semibold text-ink">
            {va.value === null ? '—' : formatNumber(va.value, 3)} {unit ?? ''}
          </span>
          {va.reason !== null && <span className="text-[12px] text-amber">{va.reason}</span>}
          <span className="text-[12px] text-dim">
            LV {formatNumber(quantity)} {unit ?? ''}
            {difference !== null && quantity !== null && quantity !== 0 && (
              <>
                {' '}
                · Differenz {difference > 0 ? '+' : ''}
                {formatNumber(difference, 3)} ({difference > 0 ? '+' : ''}
                {formatNumber((difference / quantity) * 100, 1)} %)
              </>
            )}
          </span>
        </div>
      )}

      {va !== null && va.parts.length > 0 && (
        <ul
          aria-label="Messungen"
          className="m-0 flex list-none flex-col overflow-hidden rounded-[var(--r-md)] border border-line bg-surface p-0"
        >
          {va.parts.map(({ measure, value }, i) => (
            <li
              key={measure.id}
              className={`group flex items-stretch ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <button
                type="button"
                disabled={!isOpen(measure.doc)}
                onClick={() =>
                  documents?.jumpTo({ doc: measure.doc, page: measure.page, start: 0, text: '' })
                }
                title={isOpen(measure.doc) ? 'Im Plan zeigen' : 'Dokument ist nicht offen'}
                className="flex min-h-[40px] min-w-0 flex-1 cursor-pointer items-center gap-[8px] border-none bg-transparent px-[12px] text-left hover:bg-sunken disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-ink">
                  {measure.name}
                </span>
                <span className="font-sans text-[11px] text-mute">
                  {annotations.documents.docs.get(measure.doc)?.name ?? 'Dokument'} · S.{' '}
                  {measure.page}
                </span>
                <span className="font-sans text-[13px] font-semibold text-ink">
                  {formatMeasure(value, measure.kind)}
                </span>
              </button>
              <button
                type="button"
                aria-label="Verknüpfung lösen"
                title="Verknüpfung lösen"
                onClick={() =>
                  dispatch({
                    type: 'planMeasure',
                    measure: {
                      ...measure,
                      links: measure.links.filter((id) => id !== positionId),
                    },
                  })
                }
                className="cursor-pointer border-none bg-transparent px-[12px] font-mono text-[12px] text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-[8px] rounded-[var(--r-md)] bg-sunken px-[12px] py-[10px]">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
            Rechenansatz
          </span>
          {ansatz.length > 0 && (
            <button
              type="button"
              onClick={() => setAnsatz([])}
              className="cursor-pointer border-none bg-transparent font-sans text-[12px] text-mute hover:text-ink"
            >
              Löschen
            </button>
          )}
        </div>
        {ansatz.length > 0 && (
          <span className="font-sans text-[13px] text-ink">{ansatzText(ansatz, nameOf)}</span>
        )}
        {building ? (
          <>
            <span className="font-sans text-[12px] text-dim">
              Maß oder Messung im Plan antippen
            </span>
            <div className="flex flex-wrap gap-[4px]">
              {ANSATZ_OPS.map((op) => (
                <button
                  key={op}
                  type="button"
                  aria-label={`Rechenzeichen ${OP_LABEL[op]}`}
                  onClick={() => setAnsatz(appendTerm(ansatz, { kind: 'op', op }))}
                  className={SMALL_BTN}
                >
                  {OP_LABEL[op]}
                </button>
              ))}
              <button
                type="button"
                aria-label="Letzten Baustein entfernen"
                disabled={ansatz.length === 0}
                onClick={() => setAnsatz(ansatz.slice(0, -1))}
                className={SMALL_BTN}
              >
                ⌫
              </button>
              <span className="flex-1" />
              <button
                type="button"
                className="cn-btn primary"
                onClick={() => documents?.setAnsatzFor(null)}
              >
                Fertig
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={!hasDoc}
            onClick={() => documents?.setAnsatzFor(positionId)}
            title={hasDoc ? undefined : 'Erst einen Plan als PDF öffnen'}
            className="h-[40px] cursor-pointer rounded-[var(--r-sm)] border border-dashed border-line2 bg-transparent font-sans text-[13px] text-ink disabled:cursor-default disabled:text-mute"
          >
            {ansatz.length === 0 ? 'Ansatz im Plan bilden' : 'Ansatz ergänzen'}
          </button>
        )}
      </div>
    </Section>
  );
}
