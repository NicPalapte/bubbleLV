// Auffangnetz für Abstürze beim Rendern (Issue #73).
//
// **Warum überhaupt:** wirft eine Komponente beim Rendern, hängt React den
// ganzen Baum aus — der Nutzer sieht eine weiße Seite. Seine geladene Datei ist
// damit weg (es gibt keine Persistenz), er muss sie neu hineinziehen und alle
// Filter neu setzen. Und er kann nicht einmal melden, was passiert ist, weil
// der Melde-Knopf mit verschwunden ist.
//
// Fehler der Pipeline sind anderswo abgefangen (GAEBParseError und Geschwister,
// lib/pipeline/loadLv.ts). Hier geht es um alles, was beim **Zeichnen**
// schiefgeht — genau das, was eine fremde Datei mit unerwarteter Struktur
// auslösen kann.
//
// Das Netz hängt zweimal: einmal um die ganze App (App.tsx) und einmal um die
// aktive Ansicht (pages/ViewerPage.tsx). Stürzt nur der Graph ab, bleiben
// Kopfleiste, Filter und die übrigen Ansichten bedienbar.

import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Chip } from '../ui/Chip';
import { ReportDialog } from '../report/ReportDialog';

export interface ErrorBoundaryProps {
  /**
   * Wo es passiert ist — der Ansichtsmodus oder „app". Steht später im
   * Meldetext und sagt nichts über den Inhalt der Datei.
   */
  bereich: string;
  /** Nur ja/nein für die Meldung, nicht welche Datei. */
  dateiGeladen: boolean;
  children: ReactNode;
}

interface ErrorBoundaryState {
  fehler: Error | null;
}

/**
 * React reicht durch, was geworfen wurde — und JavaScript erlaubt jeden Wert,
 * nicht nur `Error`. Die Typisierung der Lebenszyklus-Methoden behauptet
 * `Error`, garantiert es aber nicht. Ohne diese Umhüllung stünde nach einem
 * `throw 'kaputt'` aus fremdem Code „undefined: undefined" auf der Seite —
 * also genau die Information nicht da, für die es die Seite gibt.
 */
function alsFehler(wert: unknown): Error {
  return wert instanceof Error ? wert : new Error(String(wert));
}

/**
 * Die Fehlerseite. Eigene Funktionskomponente, weil sie einen eigenen Zustand
 * braucht (Melde-Fenster offen) — eine Klassenkomponente könnte das zwar auch,
 * aber dann läge der Zustand des Fensters im Auffangnetz selbst.
 */
function CrashPanel({
  fehler,
  bereich,
  dateiGeladen,
  onRetry,
}: {
  fehler: Error;
  bereich: string;
  dateiGeladen: boolean;
  onRetry: () => void;
}) {
  const [melden, setMelden] = useState(false);
  // `name: message` statt `toString()`: das Ergebnis ist dasselbe, aber hier
  // steht schwarz auf weiß, dass kein Stacktrace mitgeht.
  const meldung = `${fehler.name}: ${fehler.message}`;

  // Drei Lagen, drei Texte. „Start" ist die Ablagefläche vor dem ersten Laden:
  // dort gibt es weder eine Datei noch andere Ansichten, Filter oder Suche —
  // die sind in der Kopfleiste an `loaded` gehängt. Ein Satz über
  // weiterlaufende Ansichten wäre dort ein Versprechen ins Leere.
  const start = bereich === 'start';
  const app = bereich === 'app';
  const ueberschrift = app
    ? 'Bubble ist abgestürzt.'
    : start
      ? 'Das Laden ist abgestürzt.'
      : 'Diese Ansicht ist abgestürzt.';
  const lage = start
    ? 'Das ist ein Fehler im Programm. Hochgeladen oder gespeichert wurde nichts.'
    : 'Das ist ein Fehler im Programm, nicht in deiner Datei. Die Datei hat den Browser nicht verlassen — sie wurde nirgendwohin geschickt und nirgends gespeichert.';
  const weiter = app
    ? 'Der Neuaufbau versucht es mit demselben Stand noch einmal.'
    : start
      ? 'Nach dem Neuaufbau kannst du die Datei erneut hierher ziehen.'
      : 'Die anderen Ansichten, Filter und Suche laufen weiter.';

  return (
    <main
      aria-label="Fehler"
      className="flex h-full flex-1 items-center justify-center overflow-auto bg-paper p-[24px]"
    >
      <div
        role="alert"
        className="w-full max-w-[540px] border border-line bg-white px-[32px] py-[28px]"
      >
        <div className="font-sans text-[15px] font-semibold text-ink">{ueberschrift}</div>
        <div className="mt-[10px] font-mono text-[10.5px] leading-[1.7] text-mute">
          {lage} {weiter}
        </div>
        <pre className="mt-[14px] overflow-auto border border-line bg-paper px-[10px] py-[8px] font-mono text-[10px] leading-[1.6] text-ink">
          {meldung}
        </pre>
        <div className="mt-[16px] flex flex-wrap gap-[8px]">
          <Chip on onClick={onRetry}>
            ↻ Ansicht neu aufbauen
          </Chip>
          <Chip onClick={() => setMelden(true)}>⚑ Fehler melden</Chip>
        </div>
        {melden && (
          <ReportDialog
            context={{ view: bereich, loaded: dateiGeladen }}
            // Die Meldung steht im bearbeitbaren Feld, nicht im fertigen Text:
            // sie kommt aus dem Programm, und niemand kann ausschließen, dass
            // ein künftiger Fehler einen Wert aus der Datei hineinschreibt.
            // Dort kann der Nutzer sie lesen — und löschen.
            vorbelegung={`Absturz in ${bereich}: ${meldung}`}
            onClose={() => setMelden(false)}
          />
        )}
      </div>
    </main>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { fehler: null };

  static getDerivedStateFromError(fehler: unknown): ErrorBoundaryState {
    return { fehler: alsFehler(fehler) };
  }

  componentDidCatch(fehler: unknown, info: ErrorInfo): void {
    // Die Konsole ist die einzige Stelle, an der der Stacktrace landen darf:
    // sie bleibt im Browser des Nutzers. Verschickt wird er nie.
    console.error(`Absturz in ${this.props.bereich}:`, fehler, info.componentStack);
  }

  render(): ReactNode {
    const { fehler } = this.state;
    if (fehler === null) return this.props.children;
    return (
      <CrashPanel
        fehler={fehler}
        bereich={this.props.bereich}
        dateiGeladen={this.props.dateiGeladen}
        onRetry={() => this.setState({ fehler: null })}
      />
    );
  }
}
