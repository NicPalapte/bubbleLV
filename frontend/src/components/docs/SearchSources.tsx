// Liste unter der Suchleiste: wo der Begriff vorkommt — im LV und in jedem PDF dieser
// Sitzung (Entscheidung 0077). Das LV filtert wie immer; PDF-Treffer sind nur ein
// Wegweiser und ändern Graph und Tabelle nicht. Gelb markiert sind sie erst, wenn das
// PDF im Bereich „Dokument“ offen ist.

import { forwardRef, type RefObject } from 'react';
import { useOptionalDocuments } from './DocumentsProvider';
import { Popover } from '../ui/Popover';
import { formatCount } from '../../lib/format';
import { useViewer } from '../../state/viewer';

/** So viele Seitenzahlen je PDF, danach „…“. */
const MAX_PAGES_SHOWN = 6;

const ROW = 'flex items-center gap-[10px] px-[12px] py-[8px] [@media(pointer:coarse)]:py-[11px]';
const GO =
  'shrink-0 cursor-pointer whitespace-nowrap rounded-[var(--r-sm)] border border-line bg-surface px-[8px] py-[3px] font-mono text-[11.5px] text-accent-ink hover:border-accent hover:bg-accent-soft [@media(pointer:coarse)]:py-[7px]';

function Icon({ lv }: { lv: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] font-mono text-[10px] font-semibold ${
        lv ? 'bg-accent-soft text-accent-ink' : 'bg-sunken text-dim'
      }`}
    >
      {lv ? 'LV' : 'PDF'}
    </span>
  );
}

function pagesOf(pages: readonly number[]): string {
  const unique = [...new Set(pages)];
  const shown = unique.slice(0, MAX_PAGES_SHOWN).join(' · ');
  return unique.length > MAX_PAGES_SHOWN ? `S. ${shown} · …` : `S. ${shown}`;
}

export interface SearchSourcesProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  /**
   * „Datei wählen…“ für ein PDF, das nach dem Neuladen nicht mehr offen ist. Fehlt im
   * eigenen Browserfenster — der Dateidialog gehört zum Hauptfenster.
   */
  onPick?: () => void;
  /** Nach einem Sprung ins PDF schließen. */
  onDone: () => void;
}

export const SearchSources = forwardRef<HTMLDivElement, SearchSourcesProps>(function SearchSources(
  { open, anchorRef, onPick, onDone },
  ref,
) {
  const {
    lv,
    matches,
    filter: { search },
    annotations,
  } = useViewer();
  const documents = useOptionalDocuments();
  if (lv === null || documents === null) return null;
  const { docs, searchHits, jumpTo } = documents;
  const lvHits = matches.filtering ? (matches.counts.get(lv.tree.id) ?? 0) : lv.tree.positionCount;
  const openIds = new Set(docs.map((doc) => doc.id));
  const missing = [...annotations.documents.docs].filter(([id]) => !openIds.has(id));

  return (
    <Popover ref={ref} open={open} width={420} anchorRef={anchorRef}>
      <div role="group" aria-label="Treffer je Quelle" className="flex flex-col">
        <div className="px-[12px] pb-[4px] pt-[6px] font-mono text-[10.5px] uppercase tracking-[0.6px] text-mute">
          Treffer für „{search.trim()}“
        </div>
        <div className={ROW}>
          <Icon lv />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[13px] font-semibold text-ink">
              Leistungsverzeichnis
            </b>
            <span className="text-[11.5px] text-mute">Graph und Tabelle zeigen die Treffer</span>
          </span>
          <span className="font-mono text-[12px] text-ink">{formatCount(lvHits)} Pos.</span>
        </div>
        {docs.map((doc) => {
          const hits = searchHits.get(doc.id);
          return (
            <div key={doc.id} className={`${ROW} border-t border-line`}>
              <Icon lv={false} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-semibold text-ink" title={doc.name}>
                  {doc.name}
                </b>
                <span className="text-[11.5px] text-mute">
                  {hits === undefined
                    ? 'sucht…'
                    : hits.length === 0
                      ? 'keine Treffer'
                      : pagesOf(hits.map((hit) => hit.page))}
                </span>
              </span>
              {hits !== undefined && (
                <span className="font-mono text-[12px] text-ink">{formatCount(hits.length)}</span>
              )}
              {hits !== undefined && hits.length > 0 && (
                <button
                  type="button"
                  aria-label={`${doc.name}: zur ersten Fundstelle`}
                  onClick={() => {
                    jumpTo({ doc: doc.id, ...hits[0] });
                    onDone();
                  }}
                  className={GO}
                >
                  Zeigen ›
                </button>
              )}
            </div>
          );
        })}
        {missing.map(([id, info]) => (
          <div key={id} className={`${ROW} border-t border-line text-mute`}>
            <Icon lv={false} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13px] font-semibold" title={info.name}>
                {info.name}
              </b>
              <span className="text-[11.5px]">nicht geöffnet — erst dann durchsuchbar</span>
            </span>
            {onPick !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onPick();
                  onDone();
                }}
                className={GO}
              >
                Datei wählen…
              </button>
            )}
          </div>
        ))}
      </div>
    </Popover>
  );
});
