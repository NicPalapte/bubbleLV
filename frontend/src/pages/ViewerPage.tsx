// Ansichts-Gerüst (WP-L): gleichrangige Ansichten auf **einem** Filterzustand —
// Überblick, Graph im Vollbild, die 3-Spalten-Tabellenansicht (Tree · Tabelle ·
// Eigenschaften), Ähnlichkeit (WP-M) und Prüfung. Umgeschaltet wird über den Schalter in der
// Kopfleiste; der Wechsel fasst weder Filter noch Auswahl an, und was eine
// Ansicht sich merkt, steht in `view` (state/viewState.ts).
//
// Alle Daten stammen aus der lokalen Pipeline (Datei → Parser →
// Klassifizierung → Baum); nichts wird geladen oder persistiert.

import { Profiler, useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckView } from '../components/check/CheckView';
import { FilterStrip } from '../components/filter/FilterStrip';
import { BubbleGraph } from '../components/graph/BubbleGraph';
import { GraphHeader } from '../components/graph/GraphHeader';
import { PropertiesPanel } from '../components/layout/PropertiesPanel';
import { ResizeHandle } from '../components/layout/ResizeHandle';
import { TopBar } from '../components/layout/TopBar';
import { Tree } from '../components/layout/Tree';
import { OverviewView } from '../components/overview/OverviewView';
import { SimilarView } from '../components/relate/SimilarView';
import { PositionsTable } from '../components/table/PositionsTable';
import { FileDropzone } from '../components/upload/FileDropzone';
import { PERF_ENABLED, reportViewSwitch } from '../lib/perf';
import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH, useViewer, useViewerDispatch } from '../state/viewer';

// Spiegelt --w-tree aus src/index.css (tokens/spacing.css); die Baumspalte ist
// ziehbar, deshalb braucht der Startwert eine Zahl statt der Variable. Die
// Breite der Info-Panels steht dagegen im Viewer-Zustand (`panelSize`) — sie
// gilt gemeinsam für dieses Panel und die Auswahlkarte im Graphen.
const TREE_WIDTH = 236;

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
  const { tree, selectedNode, view } = useViewer();
  const { mode: viewMode, panelSize } = view;
  const dispatch = useViewerDispatch();
  const [leftWidth, setLeftWidth] = useState(TREE_WIDTH);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  // ESC geht eine Ebene zurück — wie im Design.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dispatch({ type: 'back' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <ViewTiming view={tree === null ? 'leer' : viewMode}>
      <div className="flex h-full flex-col bg-paper">
        <header>
          <TopBar />
          <FilterStrip />
        </header>

        {tree === null && (
          <main aria-label="LV-Ansicht" className="relative flex-1 overflow-hidden bg-paper">
            <FileDropzone />
          </main>
        )}

        {tree !== null && viewMode === 'overview' && (
          <main aria-label="Überblick" className="relative flex-1 overflow-hidden bg-paper">
            <OverviewView />
          </main>
        )}

        {tree !== null && viewMode === 'graph' && (
          // Vollbild-Graph: die Baumspalte entfällt, die Eigenschaften wandern
          // in die schwebende Positionskarte (PositionCard in BubbleGraph) —
          // nur die Kopfleiste mit Suche/Filtern bleibt bestehen.
          <main aria-label="Bubble-Graph" className="relative flex-1 overflow-hidden bg-paper">
            <BubbleGraph root={tree} />
            <GraphHeader root={tree} />
          </main>
        )}

        {tree !== null && viewMode === 'similar' && (
          <main aria-label="Ähnlichkeit" className="relative flex-1 overflow-hidden bg-white">
            <SimilarView />
          </main>
        )}

        {tree !== null && viewMode === 'check' && (
          <main aria-label="Prüfung" className="relative flex-1 overflow-hidden bg-white">
            <CheckView />
          </main>
        )}

        {tree !== null && viewMode === 'table' && (
          <main aria-label="LV-Tabelle" className="flex flex-1 overflow-hidden">
            <Tree
              width={leftWidth}
              collapsed={treeCollapsed}
              onToggleCollapsed={() => setTreeCollapsed((value) => !value)}
            />
            {!treeCollapsed && (
              <ResizeHandle value={leftWidth} onChange={setLeftWidth} min={180} max={460} />
            )}

            <div className="relative min-w-0 flex-1 overflow-hidden bg-paper">
              <PositionsTable root={selectedNode ?? tree} />
            </div>

            <ResizeHandle
              value={panelSize.width}
              onChange={(width) => dispatch({ type: 'panelSize', size: { ...panelSize, width } })}
              min={PANEL_MIN_WIDTH}
              max={PANEL_MAX_WIDTH}
              sign={-1}
            />
            <PropertiesPanel width={panelSize.width} />
          </main>
        )}
      </div>
    </ViewTiming>
  );
}
