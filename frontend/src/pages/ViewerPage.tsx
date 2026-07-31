// 3-Spalten-Layout: Tree (links) · Graph/Tabelle (Mitte) · Eigenschaften (rechts).
// Platzhalter — wird ab WP-D/WP-E mit dem LVNode-Baum aus der Pipeline befüllt.

export function ViewerPage() {
  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-500">Tree</h2>
      </aside>
      <main className="flex-1 p-4">
        <h2 className="text-sm font-medium text-slate-500">Graph / Tabelle</h2>
      </main>
      <aside className="w-80 shrink-0 border-l border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-500">Eigenschaften</h2>
      </aside>
    </div>
  );
}
