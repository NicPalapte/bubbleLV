// Karte der Kurzumfrage (Entscheidung 0071): unten rechts, blockiert nichts.
// Auswahl zählt als festes Ereignis; Freitext geht nur über das eigene Mailprogramm.

import { useState } from 'react';
import {
  feedbackMailto,
  MAX_FEEDBACK_TEXT,
  PAY_OPTIONS,
  RATINGS,
  type Pay,
  type Rating,
} from '../../lib/survey';
import { countEvent } from '../../lib/usage/count';
import { useSurvey } from '../../state/survey';

const BUTTON =
  'h-[28px] cursor-pointer rounded-[var(--r-sm)] border px-[10px] font-mono text-[11.5px]';
const CHOICE =
  'h-[28px] cursor-pointer rounded-[var(--r-sm)] border px-[8px] font-mono text-[11.5px]';
const QUESTION = 'font-sans text-[13px] text-ink';

function choiceClass(on: boolean): string {
  return `${CHOICE} ${
    on ? 'border-blue bg-blueS text-blueD' : 'border-line bg-surface text-dim hover:border-blue'
  }`;
}

export function SurveyCard() {
  const survey = useSurvey();
  const [rating, setRating] = useState<Rating | null>(null);
  const [pay, setPay] = useState<Pay | null>(null);
  const [text, setText] = useState('');
  // Nach dem Senden mit Freitext: Dank statt Fragen. Ohne Mailprogramm passiert beim
  // `mailto:` nichts — dann liegt der Text wenigstens in der Zwischenablage.
  const [mailed, setMailed] = useState(false);

  if (!survey.open) return null;

  if (mailed) {
    return (
      <section
        aria-label="Kurzumfrage"
        className="ov-glass fixed bottom-[72px] right-[16px] z-[30] flex w-[300px] max-w-[calc(100vw-32px)] items-start justify-between gap-[8px] p-[14px]"
      >
        <p className="m-0 font-sans text-[13px] text-ink">
          Danke! Dein Text liegt auch in der Zwischenablage, falls sich kein Mailprogramm öffnet.
        </p>
        <button
          type="button"
          onClick={survey.later}
          aria-label="Umfrage schließen"
          className="cursor-pointer border-none bg-transparent px-[4px] font-mono text-[12px] text-mute hover:text-ink"
        >
          ✕
        </button>
      </section>
    );
  }

  const empty = rating === null && pay === null && text.trim() === '';

  return (
    <section
      // Kein `dialog`: die Karte blockiert nichts, Escape bleibt bei Karte und Fenstern.
      aria-label="Kurzumfrage"
      className="ov-glass fixed bottom-[72px] right-[16px] z-[30] flex w-[300px] max-w-[calc(100vw-32px)] flex-col gap-[12px] p-[14px]"
    >
      <div className="flex items-start justify-between gap-[8px]">
        <h2 className="m-0 font-sans text-[14px] font-semibold text-ink">Kurzes Feedback?</h2>
        <button
          type="button"
          onClick={survey.later}
          aria-label="Umfrage schließen"
          className="cursor-pointer border-none bg-transparent px-[4px] font-mono text-[12px] text-mute hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div role="group" aria-label="Wie hilfreich war Conocto?" className="flex flex-col gap-[6px]">
        <span className={QUESTION}>Wie hilfreich war Conocto?</span>
        <div className="flex gap-[6px]">
          {RATINGS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={rating === value}
              onClick={() => setRating(rating === value ? null : value)}
              className={`${choiceClass(rating === value)} w-[36px]`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Würdest du dafür zahlen?" className="flex flex-col gap-[6px]">
        <span className={QUESTION}>Würdest du dafür zahlen?</span>
        <div className="flex flex-wrap gap-[6px]">
          {PAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={pay === option.value}
              onClick={() => setPay(pay === option.value ? null : option.value)}
              className={choiceClass(pay === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-[6px]">
        <span className={QUESTION}>Was fehlt dir?</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          maxLength={MAX_FEEDBACK_TEXT}
          placeholder="optional, geht per E-Mail"
          className="resize-none rounded-[var(--r-sm)] border border-line bg-surface p-[6px] font-sans text-[12.5px] text-ink outline-none focus:border-blue"
        />
      </label>

      <div className="flex items-center justify-between gap-[8px]">
        <button
          type="button"
          onClick={survey.never}
          className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] text-mute hover:text-ink"
        >
          Nicht mehr fragen
        </button>
        <button
          type="button"
          disabled={empty}
          onClick={() => {
            const withText = text.trim() !== '';
            survey.submit({ rating, pay }, !withText);
            if (!withText) return;
            countEvent('umfrage-freitext-mail');
            setMailed(true);
            void navigator.clipboard?.writeText(text.trim()).catch(() => undefined);
            // Übergibt nur an das Mailprogramm; abschicken muss man dort selbst.
            window.location.href = feedbackMailto(text);
          }}
          className={`${BUTTON} border-blueF bg-blueF text-white hover:bg-blueFH disabled:cursor-default disabled:opacity-50`}
        >
          Senden
        </button>
      </div>
    </section>
  );
}
