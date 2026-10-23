// Kurzumfrage (Issue #157, Entscheidung 0071): erscheint einmal nach einigen Minuten
// aktiver Nutzung mit geöffneter Datei und lässt sich jederzeit über das Logo-Menü
// öffnen. Nach Antwort oder „Nicht mehr fragen" merkt sich der Browser das in
// IndexedDB (lib/persist/lastLv.ts); ohne IndexedDB fragt sie je Sitzung höchstens einmal.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { readSurveyDone, saveSurveyDone } from '../lib/persist/lastLv';
import { SURVEY_DELAY_MS, surveyEvents, type SurveyAnswers, type SurveyDone } from '../lib/survey';
import { countEvent } from '../lib/usage/count';
import { useViewer } from './viewer';

/** Takt, in dem die aktive Zeit wächst. */
const TICK_MS = 5_000;

interface SurveyValue {
  readonly open: boolean;
  show(): void;
  /** Schließen; in dieser Sitzung erscheint sie nicht mehr von selbst. */
  later(): void;
  never(): void;
  /** Antworten zählen und merken; `close: false` lässt die Karte für den Dank offen. */
  submit(answers: SurveyAnswers, close?: boolean): void;
}

const SurveyContext = createContext<SurveyValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const { tree, view } = useViewer();
  const touring = view.tour.step !== null;
  const [open, setOpen] = useState(false);
  // `undefined` = noch nicht gelesen; `null` = offen.
  const [done, setDone] = useState<SurveyDone | null | undefined>(undefined);
  // In dieser Sitzung schon einmal erschienen — danach nur noch über das Logo-Menü.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let active = true;
    void readSurveyDone().then((stored) => {
      if (active) setDone((current) => current ?? stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Nur Zeit mit geöffneter Datei und sichtbarem Tab zählt.
  const activeMs = useRef(0);
  const waiting = tree !== null && !shown && done !== 'beantwortet' && done !== 'abgelehnt';
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      activeMs.current += TICK_MS;
      // Erst nach dem Lesen des Merkers, und nie über die laufende Tour.
      if (activeMs.current < SURVEY_DELAY_MS || done === undefined || touring) return;
      setShown(true);
      setOpen(true);
      countEvent('umfrage-gezeigt');
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [waiting, done, touring]);

  const finish = useCallback((result: SurveyDone): void => {
    setDone(result);
    void saveSurveyDone(result);
  }, []);

  const value = useMemo<SurveyValue>(
    () => ({
      open,
      show: () => {
        setShown(true);
        setOpen(true);
      },
      later: () => {
        setShown(true);
        setOpen(false);
      },
      never: () => {
        setOpen(false);
        countEvent('umfrage-abgelehnt');
        finish('abgelehnt');
      },
      submit: (answers, close = true) => {
        if (close) setOpen(false);
        for (const event of surveyEvents(answers)) countEvent(event);
        finish('beantwortet');
      },
    }),
    [open, finish],
  );

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
}

const OUTSIDE: SurveyValue = {
  open: false,
  show: () => undefined,
  later: () => undefined,
  never: () => undefined,
  submit: () => undefined,
};

/** Außerhalb des Providers (Tests einzelner Komponenten): nie offen. */
export function useSurvey(): SurveyValue {
  return useContext(SurveyContext) ?? OUTSIDE;
}
