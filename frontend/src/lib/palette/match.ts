// Treffer und Reihenfolge in der Kommandopalette (WP-P, Schritt 1).
//
// Bewusst kein Fuzzy-Matching: „tb" soll nicht „Tabelle" finden. Wer eine OZ
// oder ein Gewerk tippt, tippt es richtig — und eine Liste, die auf jeden
// Tastendruck springt, weil sie irgendetwas Entferntes höher bewertet, ist
// schlechter zu bedienen als eine, die stur nach Anfang sortiert.

import type { Command } from './commands';

/** Kleiner ist besser. Die Stufen sind grob, damit die Reihenfolge stabil bleibt. */
const ANFANG = 0;
const WORTANFANG = 1;
const ENTHALTEN = 2;

function normalisiere(text: string): string {
  return text.toLocaleLowerCase('de-DE');
}

/**
 * Bewertung eines Wortes in einem Text; `null`, wenn es nicht vorkommt.
 * Wortanfang zählt mehr als „irgendwo enthalten": „beton" soll
 * „Gewerk Betonarbeiten" vor „Stahlbetonarbeiten" bringen.
 */
function wortScore(text: string, wort: string): number | null {
  const stelle = text.indexOf(wort);
  if (stelle < 0) return null;
  if (stelle === 0) return ANFANG;
  return /[\s.,;:/–-]/.test(text[stelle - 1]) ? WORTANFANG : ENTHALTEN;
}

/**
 * Bewertung einer Eingabe gegen einen Befehl; `null`, wenn ein Wort der
 * Eingabe fehlt. Mehrere Wörter wirken als UND — „gewerk beton" findet den
 * Gewerkefilter, egal in welcher Reihenfolge die Wörter stehen.
 */
export function commandScore(query: string, command: Command): number | null {
  const woerter = normalisiere(query).split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return 0;
  const text = normalisiere(`${command.label} ${command.hint ?? ''}`);
  let summe = 0;
  for (const wort of woerter) {
    const score = wortScore(text, wort);
    if (score === null) return null;
    summe += score;
  }
  return summe;
}

/**
 * Passende Befehle, beste zuerst. Bei gleichem Score bleibt die Reihenfolge
 * der Eingabeliste — sie ist bereits sortiert (Ansichten wie im Umschalter,
 * Facettenwerte wie im Filtermenü).
 */
export function rankCommands(
  commands: readonly Command[],
  query: string,
  limit: number,
): Command[] {
  const bewertet: { command: Command; score: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const score = commandScore(query, command);
    if (score !== null) bewertet.push({ command, score, index });
  });
  bewertet.sort((a, b) => a.score - b.score || a.index - b.index);
  return bewertet.slice(0, limit).map((eintrag) => eintrag.command);
}
