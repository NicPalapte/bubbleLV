// Bedienelemente zum Messen in Plänen (Entscheidung 0095): Werkzeugleiste über dem
// Plan, Maßstab festlegen, gewählte Messung benennen, verknüpfen oder löschen. Alles
// antippbar am Tablet (mindestens 40 px hoch), so wenig Text wie möglich.

import { useState } from 'react';
import { unitFromDistance, unitFromRatio } from '@core';
import type { PlanTool } from './planTools';
import {
  formatMeasure,
  MEASURE_LABEL,
  measureValue,
  parseMass,
  ratioLabel,
  type PlanMeasure,
  type PlanScale,
} from '../../lib/docs/planNotes';

const SOURCE_LABEL: Readonly<Record<PlanScale['source'], string>> = {
  plankopf: 'Plankopf',
  strecke: 'Strecke',
  hand: 'von Hand',
};

/** Werkzeuge in Gruppen: Länge · Fläche · Stück · gedruckte Maße. */
const TOOL_GROUPS: ReadonlyArray<ReadonlyArray<readonly [PlanTool, string, string]>> = [
  [
    ['laenge', 'Länge', 'Zwei Punkte'],
    ['kette', 'Maßkette', 'Punkte nacheinander, Enter oder Esc beendet'],
  ],
  [
    ['rechteck', 'Rechteck', 'Zwei Ecken'],
    ['polygon', 'Polygon', 'Ecken nacheinander, ersten Punkt antippen schließt'],
    ['kreis', 'Kreis', 'Mitte, dann Rand'],
    ['raum', 'Raum', 'In eine Fläche tippen: Conocto schlägt den Rand vor'],
  ],
  [['stueck', 'Stück', 'Je Bauteil ein Punkt, Enter oder Esc beendet']],
  [['masse', 'Maße', 'Gedruckte Maße antippen, die Summe an Positionen hängen']],
];

const PILL_BTN =
  'h-[40px] min-w-[40px] cursor-pointer whitespace-nowrap rounded-[var(--r-pill)] border-none px-[14px] font-sans text-[13px] disabled:cursor-default disabled:text-mute';
const on = (active: boolean): string =>
  active
    ? 'bg-accent-soft font-semibold text-accent-ink'
    : 'bg-transparent text-ink hover:bg-sunken';

export function PlanToolbar({
  tool,
  hasScale,
  canFinish,
  canUndo,
  onTool,
  onUndo,
  onFinish,
  onClose,
}: {
  tool: PlanTool;
  hasScale: boolean;
  canFinish: boolean;
  canUndo: boolean;
  onTool: (tool: PlanTool) => void;
  onUndo: () => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Messen"
      className="cn-pill absolute left-1/2 top-[8px] z-[5] flex max-w-[calc(100%-16px)] -translate-x-1/2 items-center gap-[2px] overflow-x-auto p-[4px]"
    >
      <button
        type="button"
        aria-pressed={tool === 'massstab'}
        onClick={() => onTool('massstab')}
        className={`${PILL_BTN} ${on(tool === 'massstab')}`}
      >
        Maßstab{hasScale ? ' ✓' : ''}
      </button>
      <span aria-hidden="true" className="mx-[4px] h-[22px] w-px bg-line" />
      {TOOL_GROUPS.map((group, g) => (
        <span key={g} className="flex items-center gap-[2px]">
          {g > 0 && <span aria-hidden="true" className="mx-[4px] h-[22px] w-px bg-line" />}
          {group.map(([value, label, title]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tool === value}
              title={title}
              onClick={() => onTool(value)}
              className={`${PILL_BTN} ${on(tool === value)}`}
            >
              {label}
            </button>
          ))}
        </span>
      ))}
      <span aria-hidden="true" className="mx-[4px] h-[22px] w-px bg-line" />
      <button
        type="button"
        aria-label="Letzten Punkt zurück"
        title="Letzten Punkt zurück"
        disabled={!canUndo}
        onClick={onUndo}
        className={`${PILL_BTN} ${on(false)}`}
      >
        ↶
      </button>
      <button
        type="button"
        disabled={!canFinish}
        onClick={onFinish}
        className={`${PILL_BTN} ${on(false)}`}
      >
        Fertig
      </button>
      <button
        type="button"
        aria-label="Messen beenden"
        title="Messen beenden"
        onClick={onClose}
        className={`${PILL_BTN} ${on(false)}`}
      >
        ✕
      </button>
    </div>
  );
}

export function ScalePanel({
  page,
  current,
  ratios,
  sameRatioPages,
  unscaledPages,
  distance,
  onApply,
  onRemove,
  onMeasure,
  onClose,
}: {
  page: number;
  current: PlanScale | null;
  /** Maßstäbe aus dem Plankopf dieser Seite. */
  ratios: readonly number[];
  /** Weitere Planseiten mit demselben ersten Plankopf-Maßstab. */
  sameRatioPages: (ratio: number) => readonly number[];
  /** Weitere Planseiten ohne Maßstab — für den Maßstab von Hand. */
  unscaledPages: readonly number[];
  /** Gemessene Strecke in Seiten-Einheiten, wenn es eine gibt. */
  distance: number | null;
  onApply: (unit: number, source: PlanScale['source'], pages: readonly number[]) => void;
  onRemove: () => void;
  onMeasure: () => void;
  onClose: () => void;
}) {
  const [meters, setMeters] = useState('');
  const [all, setAll] = useState(true);
  const [typed, setTyped] = useState('');
  const [allTyped, setAllTyped] = useState(true);
  const typedRatio = /^\s*(?:1\s*:\s*)?(\d{1,5}(?:[.,]\d+)?)\s*$/.exec(typed);
  const manual = typedRatio === null ? null : Number(typedRatio[1].replace(',', '.'));
  const manualOk = manual !== null && manual >= 1;
  const value = parseMass(meters);
  const fromDistance =
    distance === null || value === null ? null : unitFromDistance(distance, value);

  return (
    <div
      role="dialog"
      aria-label="Maßstab"
      className="cn-window absolute right-[12px] top-[64px] z-[6] flex w-[300px] flex-col"
    >
      <div className="flex items-center justify-between border-b border-line px-[16px] py-[12px]">
        <span className="font-display text-[15px] font-semibold text-ink">Maßstab</span>
        <span className="font-sans text-[11px] text-mute">S. {page}</span>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="h-[32px] w-[32px] cursor-pointer rounded-[var(--r-pill)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
        >
          ✕
        </button>
      </div>
      {current !== null && (
        <div className="flex items-center gap-[8px] border-b border-line px-[16px] py-[10px] font-sans text-[13px] text-ink">
          <span className="flex-1">
            {ratioLabel(current.unit)}{' '}
            <span className="text-mute">· {SOURCE_LABEL[current.source]}</span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="h-[32px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface px-[10px] font-sans text-[12px] text-ink hover:border-line2"
          >
            Entfernen
          </button>
        </div>
      )}
      {ratios.length > 0 && (
        <div className="flex flex-col gap-[8px] border-b border-line px-[16px] py-[12px]">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
            Aus Plankopf
          </span>
          <div className="flex flex-wrap gap-[6px]">
            {ratios.map((ratio) => {
              const others = sameRatioPages(ratio);
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() =>
                    onApply(unitFromRatio(ratio), 'plankopf', all ? [page, ...others] : [page])
                  }
                  className="h-[40px] cursor-pointer rounded-[var(--r-pill)] border border-accent bg-accent-soft px-[14px] font-sans text-[13px] font-semibold text-accent-ink"
                >
                  1:{ratio} übernehmen
                  {all && others.length > 0 ? ` (+${others.length} S.)` : ''}
                </button>
              );
            })}
          </div>
          <label className="flex min-h-[32px] items-center gap-[8px] font-sans text-[12px] text-dim">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
            Für alle Pläne mit diesem Maßstab
          </label>
          <span className="font-sans text-[11px] text-mute">
            Gilt nur, wenn das PDF in Originalgröße vorliegt. Mit einer Strecke prüfen.
          </span>
        </div>
      )}
      <form
        className="flex flex-col gap-[8px] border-b border-line px-[16px] py-[12px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (manual === null || !manualOk) return;
          onApply(unitFromRatio(manual), 'hand', allTyped ? [page, ...unscaledPages] : [page]);
        }}
      >
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
          Von Hand
        </span>
        <div className="flex items-center gap-[8px] font-sans text-[15px] text-ink">
          <span>1 :</span>
          <input
            inputMode="decimal"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label="Maßstab 1 zu"
            placeholder="100"
            className="h-[40px] w-[96px] rounded-[var(--r-sm)] border border-line bg-surface px-[10px] font-sans text-[15px] text-ink focus:border-accent"
          />
          <button type="submit" className="cn-btn primary" disabled={!manualOk}>
            Übernehmen
          </button>
        </div>
        {unscaledPages.length > 0 && (
          <label className="flex min-h-[32px] items-center gap-[8px] font-sans text-[12px] text-dim">
            <input
              type="checkbox"
              checked={allTyped}
              onChange={(e) => setAllTyped(e.target.checked)}
            />
            Auch für {unscaledPages.length} weitere Pläne ohne Maßstab
          </label>
        )}
      </form>
      <div className="flex flex-col gap-[8px] px-[16px] py-[12px]">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
          Bekannte Strecke
        </span>
        {distance === null ? (
          <button
            type="button"
            onClick={onMeasure}
            className="h-[40px] cursor-pointer rounded-[var(--r-sm)] border border-dashed border-line2 bg-transparent font-sans text-[13px] text-ink"
          >
            Zwei Punkte im Plan antippen
          </button>
        ) : (
          <>
            <label className="flex items-center gap-[8px] font-sans text-[13px] text-ink">
              <span className="text-dim">Länge</span>
              <input
                autoFocus
                inputMode="decimal"
                value={meters}
                onChange={(event) => setMeters(event.target.value)}
                aria-label="Bekannte Länge in m"
                placeholder="5,00"
                className="h-[40px] w-[96px] rounded-[var(--r-sm)] border border-line bg-surface px-[10px] font-sans text-[15px] text-ink focus:border-accent"
              />
              <span>m</span>
            </label>
            {fromDistance !== null && (
              <span className="font-sans text-[12px] text-dim">
                ergibt {ratioLabel(fromDistance)}
              </span>
            )}
            <div className="flex justify-end gap-[8px]">
              <button type="button" className="cn-btn" onClick={onMeasure}>
                Neu messen
              </button>
              <button
                type="button"
                className="cn-btn primary"
                disabled={fromDistance === null}
                onClick={() => {
                  if (fromDistance !== null) onApply(fromDistance, 'strecke', [page]);
                }}
              >
                Übernehmen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MeasureBar({
  measure,
  scale,
  ozOf,
  onRename,
  onLink,
  onUnlink,
  onShowPosition,
  onRemove,
  onClose,
}: {
  measure: PlanMeasure;
  scale: PlanScale | null;
  ozOf: (id: string) => string;
  onRename: (name: string) => void;
  onLink: (anchor: { left: number; top: number }) => void;
  onUnlink: (id: string) => void;
  onShowPosition: (id: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const value = measureValue(measure, scale);
  return (
    <div
      role="group"
      aria-label="Messung"
      className="flex shrink-0 flex-wrap items-center gap-[8px] border-t border-line bg-surface px-[12px] py-[8px]"
    >
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.6px] text-mute">
        {MEASURE_LABEL[measure.kind]}
      </span>
      <input
        aria-label="Name der Messung"
        value={measure.name}
        onChange={(event) => onRename(event.target.value)}
        className="h-[36px] w-[150px] rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-sans text-[13px] text-ink focus:border-accent"
      />
      <span className="font-sans text-[14px] font-semibold text-ink">
        {formatMeasure(value, measure.kind)}
      </span>
      {value === null && <span className="font-sans text-[12px] text-amber">Maßstab fehlt</span>}
      <span className="flex-1" />
      {measure.links.map((id) => (
        <span
          key={id}
          className="flex h-[32px] items-center rounded-[var(--r-pill)] border border-line font-sans text-[12px] text-ink"
        >
          <button
            type="button"
            onClick={() => onShowPosition(id)}
            className="h-full cursor-pointer rounded-l-[var(--r-pill)] border-none bg-transparent pl-[10px] pr-[4px] hover:bg-sunken"
          >
            {ozOf(id)}
          </button>
          <button
            type="button"
            aria-label={`Verknüpfung mit ${ozOf(id)} lösen`}
            onClick={() => onUnlink(id)}
            className="h-full cursor-pointer rounded-r-[var(--r-pill)] border-none bg-transparent pl-[4px] pr-[10px] text-mute hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onLink({ left: box.left, top: box.top - 8 });
        }}
        className={`h-[36px] cursor-pointer rounded-[var(--r-sm)] px-[12px] font-sans text-[13px] ${
          measure.links.length === 0
            ? 'border border-accent bg-accent-fill text-white'
            : 'border border-dashed border-line2 bg-transparent text-ink'
        }`}
      >
        {measure.links.length === 0 ? 'Mit Position verknüpfen…' : '+ Position'}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="h-[36px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface px-[12px] font-sans text-[13px] text-ink hover:border-line2"
      >
        Löschen
      </button>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="h-[36px] w-[36px] cursor-pointer rounded-[var(--r-pill)] border-none bg-transparent text-mute hover:bg-sunken hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
