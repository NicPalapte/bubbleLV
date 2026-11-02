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
// docs/domain/reference/regeln.json und lässt sich hier nicht ändern, nur je Regel abschalten
// (Entscheidung 0089); die Liste der abgeschalteten bleibt ebenfalls in diesem Browser.
// Ebenso die eigenen Wörter und Listen (Entscheidung 0090): `context` ist das, womit alle
// Regeln suchen.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Rule, RuleContext } from '@core';
import {
  readGrundstockOff,
  readLearnedTerms,
  readOwnRules,
  readWordLists,
  saveGrundstockOff,
  saveLearnedTerms,
  saveOwnRules,
  saveWordLists,
} from '../lib/persist/lastLv';
import { learnedRule, termsToRules, type LearnedTerm } from '../lib/highlight/terms';
import { GRUNDSTOCK } from '../lib/rules/rules';
import { WISSEN } from '../lib/rules/wissen';
import {
  cleanWord,
  contextWith,
  listIdOf,
  sameEntry,
  wordListsOf,
  type WordListEntry,
  type WordListView,
} from '../lib/rules/wordLists';

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
  /**
   * Grundstock + eigene — das, was Langtext, Positionskarte, „Prüfung“ und „Dokument“
   * anwenden. Abgeschaltete Grundstock-Regeln stehen darin mit Status `aus` (0089).
   */
  readonly rules: readonly Rule[];
  /** Kennungen der Grundstock-Regeln, die diese Firma abgeschaltet hat (Entscheidung 0089). */
  readonly grundstockOff: ReadonlySet<string>;
  /** Grundstock-Regel an- oder abschalten; ändern lässt sie sich nicht. */
  setGrundstockOn(id: string, on: boolean): void;
  /** Speichert eine eigene Regel; gleiche `id` wird ersetzt. */
  saveRule(rule: Rule): void;
  deleteRule(id: string): void;
  /** Eigene Wörter, abgeschaltete Grundstock-Wörter und eigene Listen (Entscheidung 0090). */
  readonly wordEntries: readonly WordListEntry[];
  /** Alle Listen für den Reiter „Wortlisten“. */
  readonly wordLists: readonly WordListView[];
  /** Wortlisten und Einheiten-Gruppen, mit denen die Regeln suchen. */
  readonly context: RuleContext;
  /** Eigenes Wort in eine Liste; leere oder doppelte Wörter ändern nichts. */
  addWord(liste: string, wort: string): void;
  /** Eigenes Wort aus einer Liste nehmen. */
  removeWord(liste: string, wort: string): void;
  /** Grundstock-Wort an- oder abschalten. */
  setWordOn(liste: string, wort: string, on: boolean): void;
  /** Neue eigene Liste; gibt ihre Kennung zurück. */
  addList(name: string): string;
  renameList(liste: string, name: string): void;
  /** Eigene Liste samt ihrer Wörter löschen. */
  deleteList(liste: string): void;
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
  // Ein Fehler zählt wie gescheitertes Lesen (`null`): ohne Speicher weiter, nichts schreiben.
  ownRulesOnce ??= migrateTerms()
    .catch(() => null)
    .finally(() => {
      // Nur das erste Lesen teilt sich den Umzug; spätere Provider lesen frisch.
      ownRulesOnce = null;
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
const sameId = (a: string, b: string): boolean => a === b;

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ownRules, changeRules] = usePersistedList(readOwnRulesAndTerms, saveOwnRules, sameRule);
  const [offIds, changeOff] = usePersistedList(readGrundstockOff, saveGrundstockOff, sameId);
  const [wordEntries, changeWords] = usePersistedList(readWordLists, saveWordLists, sameEntry);
  const [ruleRequest, setRuleRequest] = useState<Rule | null>(null);
  const wordLists = useMemo(() => wordListsOf(wordEntries), [wordEntries]);
  const context = useMemo(() => contextWith(wordEntries), [wordEntries]);

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
      rules: [
        ...GRUNDSTOCK.map((rule): Rule =>
          offIds.includes(rule.id) ? { ...rule, status: 'aus' } : rule,
        ),
        ...ownRules.filter((rule) => !GRUNDSTOCK_IDS.has(rule.id)),
      ],
      grundstockOff: new Set(offIds),
      setGrundstockOn: (id, on) =>
        changeOff((current) => {
          const rest = current.filter((other) => other !== id);
          return on || !GRUNDSTOCK_IDS.has(id) ? rest : [...rest, id];
        }),
      saveRule: (rule) =>
        changeRules((current) => {
          if (GRUNDSTOCK_IDS.has(rule.id)) return [...current];
          const own: Rule = { ...rule, geltung: 'unternehmen' };
          const at = current.findIndex((other) => other.id === rule.id);
          return at < 0 ? [...current, own] : current.map((other, i) => (i === at ? own : other));
        }),
      deleteRule: (id) => changeRules((current) => current.filter((rule) => rule.id !== id)),
      wordEntries,
      wordLists,
      context,
      addWord: (liste, raw) => {
        const wort = cleanWord(raw);
        const list = wordLists.find((other) => other.id === liste);
        if (wort === null || list === undefined) return;
        if (list.base.includes(wort)) {
          // Steht schon im Grundstock: nur wieder anschalten.
          changeWords((current) =>
            current.filter((e) => !sameEntry(e, { art: 'aus', liste, wort })),
          );
          return;
        }
        changeWords((current) =>
          current.some((e) => sameEntry(e, { art: 'wort', liste, wort }))
            ? [...current]
            : [...current, { art: 'wort', liste, wort }],
        );
      },
      removeWord: (liste, wort) =>
        changeWords((current) =>
          current.filter((e) => !sameEntry(e, { art: 'wort', liste, wort })),
        ),
      setWordOn: (liste, wort, on) =>
        changeWords((current) => {
          const rest = current.filter((e) => !sameEntry(e, { art: 'aus', liste, wort }));
          return on ? rest : [...rest, { art: 'aus', liste, wort }];
        }),
      addList: (raw) => {
        const name = raw.trim().slice(0, 100) || 'Neue Liste';
        const taken = new Set([
          ...(WISSEN.listen?.keys() ?? []),
          ...wordLists.map((list) => list.id),
        ]);
        const liste = listIdOf(name, taken);
        changeWords((current) => [...current, { art: 'liste', liste, name }]);
        return liste;
      },
      renameList: (liste, raw) => {
        const name = raw.trim().slice(0, 100);
        if (name === '') return;
        changeWords((current) =>
          current.map((e) => (e.art === 'liste' && e.liste === liste ? { ...e, name } : e)),
        );
      },
      deleteList: (liste) =>
        changeWords((current) =>
          // Grundstock-Listen lassen sich nicht löschen, nur ihre eigenen Wörter.
          wordLists.some((list) => list.id === liste && !list.grundstock)
            ? current.filter((e) => e.liste !== liste)
            : [...current],
        ),
      ruleRequest,
      requestRule: setRuleRequest,
    }),
    [
      unlocked,
      ownRules,
      changeRules,
      offIds,
      changeOff,
      wordEntries,
      wordLists,
      context,
      changeWords,
      ruleRequest,
    ],
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
  grundstockOff: new Set(),
  setGrundstockOn: () => undefined,
  saveRule: () => undefined,
  deleteRule: () => undefined,
  wordEntries: [],
  wordLists: wordListsOf([]),
  context: WISSEN,
  addWord: () => undefined,
  removeWord: () => undefined,
  setWordOn: () => undefined,
  addList: () => '',
  renameList: () => undefined,
  deleteList: () => undefined,
  ruleRequest: null,
  requestRule: () => undefined,
};

/** Außerhalb des Providers (Tests einzelner Komponenten): nur der Grundstock, kein Admin. */
export function useAdmin(): AdminContextValue {
  return useContext(AdminContext) ?? OUTSIDE;
}
