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

  return (
    <main
      aria-label="Fehler"
      className="flex h-full flex-1 items-center justify-center overflow-auto bg-paper p-[24px]"
    >
      <div
        role="alert"
        className="w-full max-w-[540px] border border-line bg-white px-[32px] py-[28px]"
      >
        <div className="font-sans text-[15px] font-semibold text-ink">
          {bereich === 'app' ? 'Bubble ist abgestürzt.' : 'Diese Ansicht ist abgestürzt.'}
        </div>
        <div className="mt-[10px] font-mono text-[10.5px] leading-[1.7] text-mute">
          Das ist ein Fehler im Programm, nicht in deiner Datei. Die Datei hat den Browser nicht
          verlassen — sie wurde nirgendwohin geschickt und nirgends gespeichert.
          {bereich === 'app'
            ? ' Der Neuaufbau versucht es mit demselben Stand noch einmal.'
            : ' Die anderen Ansichten, Filter und Suche laufen weiter.'}
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
            context={{ view: bereich, loaded: dateiGeladen, fehler: meldung }}
            onClose={() => setMelden(false)}
          />
        )}
      </div>
    </main>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { fehler: null };

  static getDerivedStateFromError(fehler: Error): ErrorBoundaryState {
    return { fehler };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo): void {
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
