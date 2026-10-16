// Admin-Werkzeuge (Entscheidung 0053): Begriffe im Langtext lernen.
//
// Das Passwort ist ein Sichtschutz, kein Zugriffsschutz: ohne Server steht die
// Prüfung im ausgelieferten Code, wer sucht, kommt daran vorbei. Das ist hier
// in Ordnung — hinter dem Zugang liegen keine fremden Daten, nur eine Funktion,
// die normale Nutzer nicht sehen sollen.
//
// „Freigeschaltet" ist reiner UI-Zustand und überlebt keinen Reload. Die gelernten
// Begriffe dagegen bleiben in diesem Browser (lib/persist/lastLv.ts) und färben
// den Langtext auch ohne Admin-Zugang — es ist ja der Browser des Admins.

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
import { readLearnedTerms, saveLearnedTerms } from '../lib/persist/lastLv';
import { sameTerm, TABLE_TERMS, type LearnedTerm } from '../lib/highlight/terms';

/** SHA-256 des Passworts; ändern: docs/setup/admin-werkzeuge.md. */
export const ADMIN_PASSWORD_SHA256 =
  'a7778ae6d93219dfcb6ffbafda058fe96a781fe5cf36b4b481809860d070b327';

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface AdminContextValue {
  readonly unlocked: boolean;
  /** Prüft das Passwort; `true` = freigeschaltet. */
  unlock(password: string): Promise<boolean>;
  lock(): void;
  /** Im Browser gelernte Begriffe, ohne die aus der Tabelle. */
  readonly learned: readonly LearnedTerm[];
  /** Tabelle + gelernt — das, was der Langtext anwendet. */
  readonly terms: readonly LearnedTerm[];
  /** Lernt einen Begriff; ein gleicher Begriff wird ersetzt. */
  learn(term: LearnedTerm): void;
  forget(begriff: string): void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [learned, setLearned] = useState<readonly LearnedTerm[]>([]);
  // Erst nach dem Lesen schreiben — sonst überschriebe der leere Anfangswert
  // den Speicher, bevor er gelesen ist.
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;
    void readLearnedTerms().then((stored) => {
      if (!active) return;
      loaded.current = true;
      // Was vor dem Lesen schon gelernt wurde, bleibt vorn.
      setLearned((current) => [
        ...current,
        ...stored.filter((term) => !current.some((own) => sameTerm(own.begriff, term.begriff))),
      ]);
    });
    return () => {
      active = false;
    };
  }, []);

  const change = useCallback((next: (current: readonly LearnedTerm[]) => LearnedTerm[]) => {
    setLearned((current) => {
      const result = next(current);
      if (loaded.current) void saveLearnedTerms(result);
      return result;
    });
  }, []);

  const value = useMemo<AdminContextValue>(
    () => ({
      unlocked,
      unlock: async (password) => {
        // Ohne Web Crypto (sehr alter Browser) kein Admin.
        const ok = await sha256(password).then(
          (hash) => hash === ADMIN_PASSWORD_SHA256,
          () => false,
        );
        if (ok) setUnlocked(true);
        return ok;
      },
      lock: () => setUnlocked(false),
      learned,
      terms: [...TABLE_TERMS, ...learned],
      learn: (term) =>
        change((current) => [
          ...current.filter((own) => !sameTerm(own.begriff, term.begriff)),
          term,
        ]),
      forget: (begriff) =>
        change((current) => current.filter((own) => !sameTerm(own.begriff, begriff))),
    }),
    [unlocked, learned, change],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

const OUTSIDE: AdminContextValue = {
  unlocked: false,
  unlock: () => Promise.resolve(false),
  lock: () => undefined,
  learned: [],
  terms: TABLE_TERMS,
  learn: () => undefined,
  forget: () => undefined,
};

/** Außerhalb des Providers (Tests einzelner Komponenten): nur die Tabelle, kein Admin. */
export function useAdmin(): AdminContextValue {
  return useContext(AdminContext) ?? OUTSIDE;
}
