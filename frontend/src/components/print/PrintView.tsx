// Druckansicht (WP-P, Schritt 4): die gefilterte Menge als schlichte Tabelle.
//
// Warum eine eigene Ansicht und nicht Print-CSS auf der Tabelle: die
// Positionstabelle ist **virtualisiert** — im DOM stehen nur die Zeilen des
// sichtbaren Fensters. Ein Druck über sie brächte je nach Scrollposition
// zwanzig Zeilen aufs Papier und sähe trotzdem vollständig aus. Das ist der
// gefährlichere Fehler: er fällt erst auf, wenn das Blatt beim Empfänger liegt.
//
// Gezeichnet wird erst, wenn wirklich gedruckt wird (`beforeprint`). Bei 10k
// Positionen stünden sonst dauerhaft 10k Zeilen im DOM und jede Interaktion
// wäre langsamer — die Ansicht kostet auf dem Bildschirm also nichts.

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { formatEuro, formatNumber, formatPositions } from '../../lib/format';
import { filterMask } from '../../lib/index/positionIndex';
import { canonicalUnit, unitLabel } from '../../lib/units';
import { useViewer } from '../../state/viewer';

/**
 * `true`, solange der Browser druckt. `flushSync` ist hier nötig und nicht
 * Zierde: `beforeprint` ist der letzte Moment vor dem Seitenaufbau, und ein
 * normales `setState` würde erst danach gezeichnet — das Blatt bliebe leer.
 */
function usePrinting(): boolean {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const vor = (): void => flushSync(() => setPrinting(true));
    const nach = (): void => setPrinting(false);
    window.addEventListener('beforeprint', vor);
    window.addEventListener('afterprint', nach);
    return () => {
      window.removeEventListener('beforeprint', vor);
      window.removeEventListener('afterprint', nach);
    };
  }, []);
  return printing;
}

export function PrintView() {
  const { lv, index, active } = useViewer();
  const printing = usePrinting();
  if (lv === null || !printing) return null;

  const mask = active.filtering ? filterMask(index, active) : null;
  const zeilen: number[] = [];
  let ohnePreis = 0;
  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    zeilen.push(i);
    if (!Number.isFinite(index.unitPrice[i])) ohnePreis++;
  }
  const mitPreisen = ohnePreis < zeilen.length;
  // Ohne Preise in der Datei (x83) fallen beide Preisspalten weg, statt als
  // leere Spalten aufs Blatt zu kommen — wie im Überblick, der dann Anzahl
  // statt Summe misst.
  const kopf = mitPreisen
    ? ['OZ', 'Bezeichnung', 'Einheit', 'Menge', 'EP', 'GP']
    : ['OZ', 'Bezeichnung', 'Einheit', 'Menge'];
  // Summe über genau die gedruckten Zeilen — die Zahl, wegen der ein LV
  // überhaupt ausgedruckt wird. Mengen werden nicht summiert: sie mischen
  // Einheiten (docs/decisions/0019-mengen-nur-je-einheit.md).
  const summe = zeilen.reduce((sum, slot) => sum + index.totalPrice[slot], 0);

  return (
    <div className="nur-druck">
      <h1 className="font-sans text-[16px] font-semibold text-ink">
        {lv.projectName ?? lv.fileName}
      </h1>
      <p className="font-mono text-[10px] text-dim">
        {lv.fileName} · {formatPositions(zeilen.length)}
        {active.filtering ? ` im aktuellen Filter, von ${index.size}` : ''} ·{' '}
        {new Date().toLocaleDateString('de-DE')}
      </p>
      <table className="w-full border-collapse font-mono text-[9px]">
        <thead>
          <tr>
            {kopf.map((head) => (
              <th key={head} className="border-b border-line px-[4px] py-[3px] text-left">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((slot) => {
            const position = index.positions[slot];
            const einheit = canonicalUnit(position.unit);
            return (
              <tr key={position.oz + slot}>
                <td className="border-b border-grid px-[4px] py-[2px] align-top">{position.oz}</td>
                <td className="border-b border-grid px-[4px] py-[2px] align-top">
                  {position.shortText}
                </td>
                <td className="border-b border-grid px-[4px] py-[2px] align-top">
                  {einheit === null ? '' : unitLabel(einheit)}
                </td>
                <td className="whitespace-nowrap border-b border-grid px-[4px] py-[2px] text-right align-top">
                  {formatNumber(position.quantity)}
                </td>
                {mitPreisen && (
                  <>
                    <td className="whitespace-nowrap border-b border-grid px-[4px] py-[2px] text-right align-top">
                      {position.unitPrice === null ? '' : formatEuro(position.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap border-b border-grid px-[4px] py-[2px] text-right align-top">
                      {position.unitPrice === null ? '' : formatEuro(index.totalPrice[slot])}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        {mitPreisen && (
          <tfoot>
            <tr>
              <td className="border-t border-line px-[4px] py-[3px]" colSpan={kopf.length - 1}>
                {/* Zeilen ohne Preis stehen mit in der Liste, aber nicht in der
                    Summe. Auf Papier lässt sich das nicht nachträglich prüfen,
                    also muss die Fußzeile es benennen — wie die Kachel „ohne
                    EP" im Überblick. */}
                Summe über {formatPositions(zeilen.length - ohnePreis)}
                {ohnePreis > 0 && ` von ${zeilen.length} · ${ohnePreis} ohne Preis`}
              </td>
              <td className="whitespace-nowrap border-t border-line px-[4px] py-[3px] text-right font-semibold">
                {formatEuro(summe)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
