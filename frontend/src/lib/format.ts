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

export function truncate(text: string | null, max: number): string {
  if (text === null || text === '') return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
