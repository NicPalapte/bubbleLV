// Knopf mit Dateidialog für PDFs. Mehrfachauswahl erlaubt: alle gewählten Dateien gehen
// zusammen an `onFiles` (Issue #211).

import { useRef } from 'react';

export const DOC_TOOL =
  'inline-flex h-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-line bg-surface px-[8px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';

export function PdfInput({
  label,
  onFiles,
  className = DOC_TOOL,
}: {
  label: string;
  onFiles: (files: File[]) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={className}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        aria-label={label}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
          event.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
    </>
  );
}
