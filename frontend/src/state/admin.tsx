// Admin-Werkzeuge (Entscheidung 0053): Begriffe im Langtext lernen und eigene Regeln.
//
// Das Passwort ist ein Sichtschutz, kein Zugriffsschutz: ohne Server steht die
// Prüfung im ausgelieferten Code, wer sucht, kommt daran vorbei. Das ist hier
// in Ordnung — hinter dem Zugang liegen keine fremden Daten, nur eine Funktion,
// die normale Nutzer nicht sehen sollen.
//
// „Freigeschaltet" ist reiner UI-Zustand und überlebt keinen Reload. Die eigenen Regeln
// aus dem Regeleditor (Entscheidung 0081) dagegen bleiben in diesem Browser
// (lib/persist/lastLv.ts) und wirken auch ohne Admin-Zugang — es ist ja der Browser des
// Admins. Ein gelernter Begriff ist seit 0088 eine solche Regel; Begriffe älterer
// Versionen zieht `readOwnRulesAndTerms` beim Start einmal um. Der Grundstock kommt aus
// docs/domain/reference/regeln.json und lässt sich hier nicht ändern.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Rule } from '@core';
import {
  readLearnedTerms,
  readOwnRules,
  saveLearnedTerms,
  saveOwnRules,
} from '../lib/persist/lastLv';
import { learnedRule, termsToRules, type LearnedTerm } from '../lib/highlight/terms';
import { GRUNDSTOCK } from '../lib/rules/rules';

const GRUNDSTOCK_IDS: ReadonlySet<string> = new Set(GRUNDSTOCK.map((rule) => rule.id));

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
  /** Lernt einen Begriff als eigene Regel; eine Regel mit gleichem Begriff wird ersetzt. */
  learn(term: LearnedTerm): void;
  /** Eigene Regeln (Geltung `unternehmen`), im Browser gespeichert. */
  readonly ownRules: readonly Rule[];
  /** Grundstock + eigene — das, was Langtext und Positionskarte anwenden. */
  readonly rules: readonly Rule[];
  /** Speichert eine eigene Regel; gleiche `id` wird ersetzt. */
  saveRule(rule: Rule): void;
  deleteRule(id: string): void;
  /** Regel im Editor öffnen, z. B. aus einer Markierung im Langtext. */
  readonly ruleRequest: Rule | null;
  requestRule(rule: Rule | null): void;
}

/**
 * Liste im Browser-Speicher: erst nach dem Lesen schreiben — sonst überschriebe der
 * leere Anfangswert den Speicher, bevor er gelesen ist. Gescheitertes Lesen (`null`):
 * nichts speichern, Änderungen gelten nur bis zum Reload.
 */
function usePersistedList<T>(
  read: () => Promise<T[] | null>,
  save: (items: readonly T[]) => Promise<boolean>,
  same: (a: T, b: T) => boolean,
): [readonly T[], (next: (current: readonly T[]) => T[]) => void] {
  const [items, setItems] = useState<readonly T[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    let active = true;
    void read().then((stored) => {
      if (!active || stored === null) return;
      loaded.current = true;
      // Was vor dem Lesen schon da war, bleibt vorn.
      setItems((current) => [
        ...current,
        ...stored.filter((item) => !current.some((own) => same(own, item))),
      ]);
    });
    return () => {
      active = false;
    };
  }, [read, same]);

  // Speichern nach dem Rendern, nicht im State-Updater: React darf Updater
  // mehrfach ausführen, dann liefen Schreibvorgänge doppelt und in unklarer Folge.
  // Nacheinander, nie parallel: jeder Aufruf öffnet seine eigene Verbindung, zwei
  // schnelle Änderungen könnten sonst in vertauschter Folge ankommen.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    if (!loaded.current) return;
    queue.current = queue.current.then(() => save(items));
  }, [items, save]);

  return [items, setItems];
}

/**
 * Eigene Regeln lesen und gelernte Begriffe älterer Versionen einmal als Regeln dazunehmen
 * (Entscheidung 0088). Erst die Regeln sichern, dann die Begriffe leeren: scheitert das
 * Sichern, bleiben die Begriffe und der Umzug läuft beim nächsten Start noch einmal.
 */
// Einmal je Seitenaufruf: Ein zweiter Lauf (StrictMode, neuer Provider) läse sonst die
// Regeln vor und die Begriffe nach dem Umzug des ersten und überschriebe dessen Ergebnis.
let ownRulesOnce: Promise<Rule[] | null> | null = null;

function readOwnRulesAndTerms(): Promise<Rule[] | null> {
  ownRulesOnce ??= migrateTerms().then((rules) => {
    // Nur das erste Lesen teilt sich den Umzug; spätere Provider lesen frisch.
    ownRulesOnce = null;
    return rules;
  });
  return ownRulesOnce;
}

async function migrateTerms(): Promise<Rule[] | null> {
  const rules = await readOwnRules();
  if (rules === null) return null;
  const terms = await readLearnedTerms();
  if (terms === null || terms.length === 0) return rules;
  const merged = [...rules, ...termsToRules(terms, [...GRUNDSTOCK, ...rules])];
  if (await saveOwnRules(merged)) await saveLearnedTerms([]);
  return merged;
}

const sameRule = (a: Rule, b: Rule): boolean => a.id === b.id;

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ownRules, changeRules] = usePersistedList(readOwnRulesAndTerms, saveOwnRules, sameRule);
  const [ruleRequest, setRuleRequest] = useState<Rule | null>(null);

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
      learn: (term) =>
        changeRules((current) => {
          const taken = new Set([...GRUNDSTOCK_IDS, ...current.map((rule) => rule.id)]);
          const rule = learnedRule(current, term, taken);
          const at = current.findIndex((other) => other.id === rule.id);
          return at < 0 ? [...current, rule] : current.map((other, i) => (i === at ? rule : other));
        }),
      ownRules,
      // Kennungen sind eindeutig: bei gleicher Kennung gilt der Grundstock.
      rules: [...GRUNDSTOCK, ...ownRules.filter((rule) => !GRUNDSTOCK_IDS.has(rule.id))],
      saveRule: (rule) =>
        changeRules((current) => {
          if (GRUNDSTOCK_IDS.has(rule.id)) return [...current];
          const own: Rule = { ...rule, geltung: 'unternehmen' };
          const at = current.findIndex((other) => other.id === rule.id);
          return at < 0 ? [...current, own] : current.map((other, i) => (i === at ? own : other));
        }),
      deleteRule: (id) => changeRules((current) => current.filter((rule) => rule.id !== id)),
      ruleRequest,
      requestRule: setRuleRequest,
    }),
    [unlocked, ownRules, changeRules, ruleRequest],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

const OUTSIDE: AdminContextValue = {
  unlocked: false,
  unlock: () => Promise.resolve(false),
  lock: () => undefined,
  learn: () => undefined,
  ownRules: [],
  rules: GRUNDSTOCK,
  saveRule: () => undefined,
  deleteRule: () => undefined,
  ruleRequest: null,
  requestRule: () => undefined,
};

/** Außerhalb des Providers (Tests einzelner Komponenten): nur der Grundstock, kein Admin. */
export function useAdmin(): AdminContextValue {
  return useContext(AdminContext) ?? OUTSIDE;
}
