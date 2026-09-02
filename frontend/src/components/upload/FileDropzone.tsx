// Datei laden → lokale Pipeline anstoßen. Drag & Drop + Datei-Dialog.
// Die Datei verlässt den Browser nie: kein Upload, kein Fetch, keine Persistenz.

import { useCallback, useRef, useState } from 'react';
import { Chip } from '../ui/Chip';
import { BubbleLogo } from '../ui/BubbleLogo';
import { loadLv, LVLoadError } from '../../lib/pipeline/loadLv';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const ACCEPT = '.x81,.x82,.x83,.x84,.x85,.x86,.xml,.X81,.X82,.X83,.X84,.X85,.X86,.XML';

export function FileDropzone() {
  const { loading, error } = useViewer();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined): Promise<void> => {
      if (file === undefined) return;
      dispatch({ type: 'loading' });
      try {
        dispatch({ type: 'loaded', lv: await loadLv(file) });
      } catch (cause) {
        const message =
          cause instanceof LVLoadError
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'Unbekannter Fehler beim Laden der Datei';
        dispatch({ type: 'error', message });
      }
    },
    [dispatch],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-paper p-[24px]">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex w-full max-w-[540px] cursor-pointer flex-col items-center gap-[14px] bg-white px-[32px] py-[44px] text-center"
        style={{
          border: `1px dashed ${dragging ? 'var(--blue)' : 'var(--line2)'}`,
          background: dragging ? 'var(--blueS)' : 'var(--white)',
        }}
      >
        <BubbleLogo size={26} />
        <div className="font-sans text-[15px] font-semibold text-ink">
          GAEB-Datei hierher ziehen
        </div>
        <div className="max-w-[420px] font-mono text-[10.5px] leading-[1.6] text-mute">
          GAEB DA XML (X81–X86), Versionen 2.0 bis 3.3. Die Datei wird ausschließlich im Browser
          verarbeitet — nichts wird hochgeladen, nichts gespeichert. Ein Reload verwirft den Stand.
        </div>
        <Chip on onClick={() => inputRef.current?.click()}>
          {loading ? 'Wird gelesen…' : 'Datei auswählen'}
        </Chip>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label="GAEB-Datei auswählen"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {error !== null && (
          <div
            role="alert"
            className="mt-[6px] w-full border px-[12px] py-[10px] text-left font-mono text-[10.5px] leading-[1.6]"
            style={{ borderColor: 'var(--red)', background: '#fef2f2', color: 'var(--redD)' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
