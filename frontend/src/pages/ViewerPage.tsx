// 3-Spalten-Layout: Tree (links) · Graph/Tabelle (Mitte) · Eigenschaften (rechts).
// Alle Daten stammen aus der lokalen Pipeline (Datei → Parser → Klassifizierung →
// Baum); nichts wird geladen oder persistiert.

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
  const { tree, selectedNode, centerMode } = useViewer();
  const dispatch = useViewerDispatch();
  const [leftWidth, setLeftWidth] = useState(TREE_WIDTH);
  const [rightWidth, setRightWidth] = useState(PROPS_WIDTH);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const showTable = centerMode === 'table' && selectedNode !== null;

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
      <TopBar />
      <FilterStrip />
      <div className="flex flex-1 overflow-hidden">
        <Tree
          width={leftWidth}
          collapsed={treeCollapsed}
          onToggleCollapsed={() => setTreeCollapsed((value) => !value)}
        />
        {!treeCollapsed && (
          <ResizeHandle value={leftWidth} onChange={setLeftWidth} min={180} max={460} />
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden bg-paper">
          {tree === null ? (
            <FileDropzone />
          ) : (
            <>
              {/*
                Der Graph bleibt beim Abstecher in die Tabelle montiert und wird
                nur verborgen — sonst ginge sein Ausschnitt (Pan/Zoom) verloren
                und man käme auf den Startzustand zurück (Issue #19). `active`
                legt ihn währenddessen schlafen.
              */}
              <div className="absolute inset-0" style={{ display: showTable ? 'none' : undefined }}>
                <BubbleGraph root={tree} active={!showTable} />
                <GraphHeader root={tree} />
              </div>
              {showTable && <PositionsTable root={selectedNode} />}
            </>
          )}
        </div>

        <ResizeHandle value={rightWidth} onChange={setRightWidth} min={260} max={560} sign={-1} />
        <PropertiesPanel width={rightWidth} />
      </div>
    </div>
  );
}
