// Zwei Ansichtsmodi (Issue #30): Graph im Vollbild oder die klassische
// 3-Spalten-Tabellenansicht (Tree · Tabelle · Eigenschaften) — umgeschaltet
// über den Schalter in der Kopfleiste. Alle Daten stammen aus der lokalen
// Pipeline (Datei → Parser → Klassifizierung → Baum); nichts wird geladen
// oder persistiert.

import { useEffect, useState } from 'react';
import { FilterStrip } from '../components/filter/FilterStrip';
import { BubbleGraph } from '../components/graph/BubbleGraph';
import { GraphHeader } from '../components/graph/GraphHeader';
import { PropertiesPanel } from '../components/layout/PropertiesPanel';
import { ResizeHandle } from '../components/layout/ResizeHandle';
import { TopBar } from '../components/layout/TopBar';
import { Tree } from '../components/layout/Tree';
import { PositionsTable } from '../components/table/PositionsTable';
import { FileDropzone } from '../components/upload/FileDropzone';
import { useViewer, useViewerDispatch } from '../state/viewer';

// Spiegelt --w-tree / --w-props aus src/index.css (tokens/spacing.css); die
// Panels sind ziehbar, deshalb braucht der Startwert eine Zahl statt der Variable.
const TREE_WIDTH = 236;
const PROPS_WIDTH = 320;

export function ViewerPage() {
  const { tree, selectedNode, viewMode } = useViewer();
  const dispatch = useViewerDispatch();
  const [leftWidth, setLeftWidth] = useState(TREE_WIDTH);
  const [rightWidth, setRightWidth] = useState(PROPS_WIDTH);
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

      {tree !== null && viewMode === 'graph' && (
        // Vollbild-Graph: die Baumspalte entfällt, die Eigenschaften wandern
        // in die schwebende Positionskarte (PositionCard in BubbleGraph) —
        // nur die Kopfleiste mit Suche/Filtern bleibt bestehen.
        <main aria-label="Bubble-Graph" className="relative flex-1 overflow-hidden bg-paper">
          <BubbleGraph root={tree} />
          <GraphHeader root={tree} />
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

          <ResizeHandle value={rightWidth} onChange={setRightWidth} min={260} max={560} sign={-1} />
          <PropertiesPanel width={rightWidth} />
        </main>
      )}
    </div>
  );
}
