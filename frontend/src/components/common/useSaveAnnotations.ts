// Markierungen und Kommentare in den Speicher der letzten Datei schreiben
// (Entscheidung 0047). Nur, wenn das LV ein gespeichertes Projekt ist
// (`persistId`); bei Demo-LVs bleiben Notizen in der Sitzung.
//
// Kurz gesammelt statt je Tastendruck: das Kommentarfeld würde sonst bei jedem
// Zeichen die IndexedDB anstoßen. Beim Verlassen der Seite wird sofort
// geschrieben. Ob der Browser das beim Schließen des Tabs noch zu Ende führt,
// liegt bei ihm; im schlimmsten Fall fehlen die letzten 400 ms Tippen.
//
// Gespeichert wird unter dem Positions-Hash statt der Knoten-ID (lib/annotations.ts).

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { rekey, storageKeys, type Annotations } from '../../lib/annotations';
import { saveAnnotations } from '../../lib/persist/lastLv';
import { useViewer } from '../../state/viewer';

export const SAVE_DELAY_MS = 400;

export function useSaveAnnotations(): void {
  const { annotations, loadedAnnotations, persistId, index } = useViewer();
  const toHash = useMemo(() => storageKeys(index.nodes).toHash, [index]);
  const pending = useRef<{ id: string; annotations: Annotations } | null>(null);

  const flush = useCallback((): void => {
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    void saveAnnotations(next.id, next.annotations);
  }, []);

  useEffect(() => {
    // Unverändert seit dem Laden: steht schon so im Speicher. Kein Schreiben beim
    // bloßen Öffnen — sonst überschriebe ein zweiter Tab schon dabei den ersten.
    if (persistId === null || annotations === loadedAnnotations) return;
    pending.current = { id: persistId, annotations: rekey(annotations, toHash) };
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [annotations, loadedAnnotations, persistId, toHash, flush]);

  // Anderes LV, Startseite oder Seite verlassen: Ausstehendes sofort schreiben.
  useEffect(() => flush, [persistId, flush]);
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [flush]);
}
