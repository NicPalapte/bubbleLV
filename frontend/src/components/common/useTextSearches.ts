// Sucheinträge im Menü beim Markieren im Langtext und Kurztext: „In Suche übernehmen“
// (LV, Suchleiste oben) und, wenn ein PDF offen ist, „Im PDF suchen“ (Entscheidung 0083).

import { useCallback } from 'react';
import type { SearchAction } from './PaintBar';
import { searchTermOf } from './paint';
import { useOptionalDocuments } from '../docs/DocumentsProvider';
import { useViewerDispatch } from '../../state/viewer';

/** Baut die Einträge für einen markierten Text; `done` schließt das Menü. */
export function useTextSearches(): (text: string, done: () => void) => SearchAction[] {
  const dispatch = useViewerDispatch();
  const documents = useOptionalDocuments();
  const docCount = documents?.docs.length ?? 0;
  const setDocSearch = documents?.setDocSearch;
  return useCallback(
    (text, done) => {
      const term = searchTermOf(text);
      const lv: SearchAction = {
        label: 'In Suche übernehmen',
        run: () => {
          dispatch({ type: 'search', value: term });
          done();
        },
      };
      if (docCount === 0 || setDocSearch === undefined) return [lv];
      return [
        lv,
        {
          label: 'Im PDF suchen',
          run: () => {
            setDocSearch(term);
            // Bereich zeigen: Dort springt die Suche zur ersten Fundstelle.
            dispatch({ type: 'showPane', pane: 'doc' });
            done();
          },
        },
      ];
    },
    [dispatch, docCount, setDocSearch],
  );
}
