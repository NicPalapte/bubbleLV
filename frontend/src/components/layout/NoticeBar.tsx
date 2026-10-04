// Hinweisleiste unter der Kopfleiste (Issues #94, #95): etwas lief anders als
// erwartet, aber das LV ist da — ein zweiter Datei-Drop wurde ignoriert, ein
// Teil des Links passte nicht, der Hintergrundprozess fiel aus.
//
// Bewusst keine Fehlermeldung: ein Fehler verdrängt die Ansicht (Startseite),
// ein Hinweis steht neben ihr und lässt sich schließen. Er bleibt, bis jemand
// ihn schließt oder ein neues LV geladen wird; er verschwindet nicht von selbst,
// weil niemand garantiert hinschaut, wenn er erscheint.

import { useViewer, useViewerDispatch } from '../../state/viewer';

export function NoticeBar() {
  const { notices } = useViewer();
  const dispatch = useViewerDispatch();
  if (notices.length === 0) return null;

  return (
    <section
      role="status"
      aria-label="Hinweise"
      className="flex items-start gap-[10px] border-b px-[16px] py-[7px] font-mono text-[10.5px] leading-[1.6]"
      style={{ borderColor: 'var(--blue)', background: 'var(--blueS)', color: 'var(--blueD)' }}
    >
      <div className="min-w-0 flex-1">
        {notices.map((notice) => (
          <div key={notice}>{notice}</div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Hinweis schließen"
        onClick={() => dispatch({ type: 'dismissNotices' })}
        className="shrink-0 cursor-pointer border-0 bg-transparent px-[4px] font-mono text-[12px] leading-none"
        style={{ color: 'var(--blueD)' }}
      >
        ✕
      </button>
    </section>
  );
}
