// Deutsche Zahlen-/Währungsformate — die UI ist durchgehend deutschsprachig.

export function formatNumber(value: number | null, fractionDigits?: number): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(
    'de-DE',
    fractionDigits === undefined
      ? { maximumFractionDigits: 3 }
      : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits },
  );
}

export function formatEuro(value: number | null, fractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, fractionDigits)} €`;
}

/** Große Summen ohne Nachkommastellen, z. B. in Bubble-Sublabels. */
export function formatEuroShort(value: number): string {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('de-DE');
}

/** „1 Position" / „28 Positionen" — Zahl und Beugung an einer Stelle. */
export function formatPositions(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'Position' : 'Positionen'}`;
}

/** „heute 10:42" / „gestern 16:42" / „08.10.2026" — Ortszeit des Browsers. */
export function formatWhen(timestamp: number, now: number = Date.now()): string {
  const when = new Date(timestamp);
  const startOfDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  // Kalendertage über die Tagesanfänge zählen, nicht über 24 h: sonst wäre 23:50
  // von gestern um 00:10 noch „heute".
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(when)) / 86_400_000);
  const time = when.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `heute ${time}`;
  if (days === 1) return `gestern ${time}`;
  return when.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function truncate(text: string | null, max: number): string {
  if (text === null || text === '') return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
