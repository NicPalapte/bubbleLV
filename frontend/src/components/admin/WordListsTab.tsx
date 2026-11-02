// Reiter „Wortlisten“ der Admin-Werkzeuge (Entscheidung 0090): links alle Listen, rechts die
// Wörter einer Liste. Grundstock-Listen kommen aus den CSV unter docs/domain/reference/ — ihre
// Wörter lassen sich nur abschalten, eigene kommen dazu. Eigene Listen sind ganz änderbar.
// Alles bleibt in diesem Browser; „Wortlisten exportieren“ gibt die CSV fürs Repo.

import { useMemo, useState } from 'react';
import { downloadText } from '../../lib/export/download';
import { listsOfRule } from '../../lib/check';
import { LISTS_AT_LOAD, wordListsCsv, type WordListView } from '../../lib/rules/wordLists';
import { useAdmin } from '../../state/admin';

const BUTTON =
  'inline-flex h-[28px] cursor-pointer items-center rounded-[var(--r-pill)] border border-line bg-surface px-[12px] font-mono text-[11.5px] text-ink hover:border-line2 disabled:cursor-default disabled:opacity-40';
const INPUT =
  'h-[28px] min-w-0 rounded-[var(--r-sm)] border border-line bg-panel px-[8px] font-sans text-[12.5px] text-ink outline-none focus:border-accent';
const CHIP =
  'inline-flex h-[24px] items-center gap-[4px] rounded-[var(--r-pill)] border px-[9px] font-mono text-[11.5px]';

function ListItem({
  list,
  selected,
  onSelect,
}: {
  list: WordListView;
  selected: boolean;
  onSelect: () => void;
}) {
  const changes = list.own.length + list.off.length;
  return (
    <li>
      <button
        type="button"
        aria-current={selected}
        onClick={onSelect}
        className={`flex w-full cursor-pointer items-center gap-[8px] border-0 border-l-[3px] bg-transparent px-[14px] py-[6px] text-left font-sans text-[13px] text-ink ${
          selected ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-sunken'
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{list.name}</span>
        {list.grundstock && changes > 0 && (
          <span
            title="Eigene Wörter oder abgeschaltete Grundstock-Wörter"
            className="shrink-0 rounded-[var(--r-pill)] bg-cyanS px-[7px] py-[1px] font-mono text-[10.5px] text-cyan"
          >
            geändert
          </span>
        )}
      </button>
    </li>
  );
}

function AddWord({ onAdd }: { onAdd: (word: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="flex gap-[8px]"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(value);
        setValue('');
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Wort hinzufügen"
        placeholder="z. B. auf Anordnung der Bauleitung"
        className={`${INPUT} flex-1`}
      />
      <button type="submit" disabled={value.trim() === ''} className={BUTTON}>
        Hinzufügen
      </button>
    </form>
  );
}

function ListDetail({ list, onDeleted }: { list: WordListView; onDeleted: () => void }) {
  const { rules, addWord, removeWord, setWordOn, renameList, deleteList } = useAdmin();
  const usedBy = useMemo(
    () => rules.filter((rule) => listsOfRule(rule).includes(list.id)),
    [rules, list.id],
  );
  const on = list.base.length - list.off.length + list.own.length;

  return (
    <section className="flex min-w-0 flex-col gap-[14px] p-[16px]" aria-label={list.name}>
      <div className="flex flex-wrap items-center gap-[10px]">
        {list.grundstock ? (
          <b className="font-display text-[15px] font-semibold text-ink">{list.name}</b>
        ) : (
          <input
            type="text"
            // Neuer Schlüssel je Liste: der Entwurf beginnt mit ihrem Namen.
            key={list.id}
            defaultValue={list.name}
            aria-label="Name der Liste"
            onBlur={(event) => renameList(list.id, event.target.value)}
            className={`${INPUT} w-[260px] font-display text-[14px] font-semibold`}
          />
        )}
        <span className="font-mono text-[11.5px] text-mute">{on} Wörter an</span>
        <span className="flex-1" />
        {!list.grundstock && (
          <button
            type="button"
            onClick={() => {
              deleteList(list.id);
              onDeleted();
            }}
            className={BUTTON}
          >
            Liste löschen
          </button>
        )}
      </div>
      {list.grundstock && (
        <p className="m-0 font-sans text-[12px] text-mute">
          Grundstock aus <span className="font-mono">{list.file}</span>
          {list.note !== null && ` — ${list.note}`}. Wörter hier nur abschalten; eigene kommen dazu.
        </p>
      )}
      {LISTS_AT_LOAD.has(list.id) && (
        <p className="m-0 rounded-[var(--r-sm)] bg-amberS px-[10px] py-[6px] font-sans text-[12px] text-amber">
          Wirkt schon beim Einlesen der Datei. Änderungen hier gelten dort noch nicht, nur in den
          Regeln.
        </p>
      )}

      {list.base.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-mute">
            Grundstock — klicken schaltet ab
          </span>
          <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
            {list.base.map((word) => {
              const off = list.off.includes(word);
              return (
                <li key={word}>
                  <button
                    type="button"
                    aria-pressed={!off}
                    title={off ? 'Aus — wieder anschalten' : 'An — abschalten'}
                    onClick={() => setWordOn(list.id, word, off)}
                    className={`${CHIP} cursor-pointer ${
                      off
                        ? 'border-line bg-transparent text-mute line-through'
                        : 'border-line bg-surface text-ink hover:border-line2'
                    }`}
                  >
                    {word}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-mute">
          Eigene Wörter
        </span>
        {list.own.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-[6px] p-0">
            {list.own.map((word) => (
              <li key={word} className={`${CHIP} border-cyan bg-cyanS text-ink`}>
                {word}
                <button
                  type="button"
                  aria-label={`${word} entfernen`}
                  onClick={() => removeWord(list.id, word)}
                  className="cursor-pointer border-none bg-transparent p-0 text-mute hover:text-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddWord onAdd={(word) => addWord(list.id, word)} />
        <span className="font-sans text-[11.5px] text-mute">
          * = beliebige Endung („anlage*“ trifft „Anlagen“), # = eine Zahl. Groß/klein egal.
        </span>
      </div>

      <div className="flex flex-col gap-[4px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-mute">
          Benutzt von
        </span>
        {usedBy.length === 0 ? (
          <span className="font-sans text-[12.5px] text-mute">
            Noch keiner Regel. Im Reiter „Regeln“ als Baustein „Wortliste“ einsetzen.
          </span>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
            {usedBy.map((rule) => (
              <li
                key={rule.id}
                className={`font-sans text-[12.5px] ${
                  rule.status === 'freigegeben' ? 'text-ink' : 'text-mute line-through'
                }`}
              >
                {rule.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function WordListsTab() {
  const { wordLists, wordEntries, addList } = useAdmin();
  const [selectedId, setSelectedId] = useState<string | null>(wordLists[0]?.id ?? null);
  const list = wordLists.find((other) => other.id === selectedId) ?? wordLists[0] ?? null;
  const grundstock = wordLists.filter((other) => other.grundstock);
  const own = wordLists.filter((other) => !other.grundstock);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-[8px] border-b border-line px-[16px] py-[10px]">
        <button
          type="button"
          onClick={() => setSelectedId(addList('Neue Liste'))}
          className={BUTTON}
        >
          + Neue Liste
        </button>
        <span className="flex-1" />
        <button
          type="button"
          disabled={wordEntries.length === 0}
          onClick={() => downloadText('wortlisten.csv', wordListsCsv(wordEntries), 'csv')}
          title="Geänderte und eigene Listen als wortlisten.csv — zum Übernehmen in den Grundstock"
          className={BUTTON}
        >
          Wortlisten exportieren
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Wortlisten"
          className="border-b border-line py-[8px] md:border-b-0 md:border-r"
        >
          {[
            { title: 'Grundstock', lists: grundstock },
            { title: 'Eigene', lists: own },
          ].map(({ title, lists }) =>
            lists.length === 0 ? null : (
              <section key={title} aria-label={title}>
                <div className="px-[14px] pb-[4px] pt-[12px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-mute">
                  {title}
                </div>
                <ul className="m-0 list-none p-0">
                  {lists.map((entry) => (
                    <ListItem
                      key={entry.id}
                      list={entry}
                      selected={entry.id === list?.id}
                      onSelect={() => setSelectedId(entry.id)}
                    />
                  ))}
                </ul>
              </section>
            ),
          )}
        </nav>
        {list === null ? (
          <p className="m-0 p-[16px] font-sans text-[13px] text-mute">Keine Wortliste.</p>
        ) : (
          <ListDetail list={list} onDeleted={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}
