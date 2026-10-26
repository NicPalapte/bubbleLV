// Hauptscreen (docs/decisions/0034-graph-als-hauptscreen.md): Graph, Tabelle,
// Positionskarte, Überblick und Prüfung als Splitscreen (Entscheidungen 0064, 0074);
// die Filter stehen in einer aufklappbaren Leiste unter der Kopfleiste (Issue #154).
// Alles arbeitet auf **einem** Filterzustand; was eine Ansicht sich
// merkt, steht in `view` (state/viewState.ts).
//
// Alle Daten stammen aus der lokalen Pipeline (Datei → Parser →
// Klassifizierung → Baum); nichts wird geladen. Gespeichert werden nur die
// letzte Datei und ihre Notizen (Entscheidungen 0046, 0047).

import { Profiler, useCallback, useEffect, type ReactNode } from 'react';
import { FilterBar } from '../components/filter/FilterBar';
import { NoticeBar } from '../components/layout/NoticeBar';
import { TopBar } from '../components/layout/TopBar';
import { PrintView } from '../components/print/PrintView';
import { Workspace } from '../components/shell/Workspace';
import { WorkspaceProvider } from '../components/shell/WorkspaceProvider';
import { DocumentsProvider } from '../components/docs/DocumentsProvider';
import { PdfDrop } from '../components/docs/PdfDrop';
import { FileDropzone } from '../components/upload/FileDropzone';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { PositionMenuProvider } from '../components/common/PositionMenu';
import { useSaveAnnotations } from '../components/common/useSaveAnnotations';
import { useShareLink } from '../components/common/useShareLink';
import { PERF_ENABLED, reportViewSwitch } from '../lib/perf';
import { useViewer, useViewerDispatch } from '../state/viewer';

/**
 * Messpunkt „Ansichtswechsel" (docs/scope.md, Ziel < 200 ms): `Profiler` liefert
 * die tatsächliche Commit-Dauer des Wechsels — genauer als eine selbst gestoppte
 * Zeit, und ohne Ref-Schreiberei im Render. Außerhalb des Entwicklungsmodus
 * entfällt die Hülle ganz.
 */
function ViewTiming({ view, children }: { view: string; children: ReactNode }) {
  const onRender = useCallback(
    (_id: string, _phase: string, actualDuration: number) => reportViewSwitch(view, actualDuration),
    [view],
  );
  if (!PERF_ENABLED) return <>{children}</>;
  return (
    <Profiler id="viewer" onRender={onRender}>
      {children}
    </Profiler>
  );
}

export function ViewerPage() {
  const { tree, view } = useViewer();
  const { mode: viewMode } = view;
  const dispatch = useViewerDispatch();

  // ESC geht eine Ebene zurück — wie im Design.
  // Ansicht, Filter und Auswahl stehen in der Adresszeile — ein Link stellt
  // sie wieder her, sobald dieselbe Datei geladen ist (WP-P, Schritt 2).
  useShareLink();
  useSaveAnnotations();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dispatch({ type: 'back' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <ViewTiming view={tree === null ? 'leer' : viewMode}>
      {/* Die Druckansicht steht daneben, nicht darin: beim Drucken tritt die
          ganze Bildschirm-Hülle zurück (Kopfleiste, Baum, Panels), damit das
          Blatt die Liste trägt und nicht die Bedienung. */}
      <PrintView />
      <WorkspaceProvider>
        <DocumentsProvider>
          <PositionMenuProvider>
            <div className="nur-bildschirm flex h-full flex-col bg-paper">
              {/* Über der Arbeitsfläche: die Listen der Filterleiste liegen über Fenstern. */}
              <header className="relative z-[20]">
                <TopBar />
                <FilterBar />
                <NoticeBar />
              </header>

              {/*
          Zweites, engeres Netz (Issue #73): stürzt eine Ansicht ab, bleiben
          Kopfleiste, Filter und die übrigen Ansichten bedienbar. Der `key`
          sorgt dafür, dass ein Ansichtswechsel mit einem frischen Netz
          beginnt — sonst bliebe die Fehlerseite der Matrix im Graphen stehen.
        */}
              <ErrorBoundary
                key={tree === null ? 'leer' : viewMode}
                bereich={tree === null ? 'start' : viewMode}
                dateiGeladen={tree !== null}
              >
                {tree === null && (
                  <main
                    aria-label="LV-Ansicht"
                    className="relative flex-1 overflow-hidden bg-paper"
                  >
                    <FileDropzone />
                  </main>
                )}

                {tree !== null && viewMode === 'graph' && (
                  <main
                    aria-label="Bubble-Graph"
                    className="relative flex-1 overflow-hidden bg-paper"
                  >
                    <Workspace root={tree} />
                    <PdfDrop />
                  </main>
                )}
              </ErrorBoundary>
            </div>
          </PositionMenuProvider>
        </DocumentsProvider>
      </WorkspaceProvider>
    </ViewTiming>
  );
}
