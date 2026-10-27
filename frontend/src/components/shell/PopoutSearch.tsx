// Suchleiste für Graph und Tabelle im eigenen Browserfenster (Entscheidung 0039):
// dieselbe Suche wie in der Kopfleiste, auf demselben Filterzustand. Nur ob die
// Filterleiste offen ist, gilt je Fenster — sonst klappte sie im anderen Fenster mit auf.

import { useState } from 'react';
import { FilterBar } from '../filter/FilterBar';
import { SearchPill } from '../layout/SearchPill';

export function PopoutSearch() {
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <div className="relative z-[20] shrink-0">
      <div className="flex border-b border-line bg-surface px-[12px] py-[8px]">
        <SearchPill
          filterOpen={filterOpen}
          onFilterOpen={setFilterOpen}
          className="mx-auto max-w-[620px] flex-1"
        />
      </div>
      <FilterBar open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
