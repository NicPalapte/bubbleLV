// Ansicht „Ähnlichkeit" (WP-M, Schritt 5): Gruppen inhaltlich ähnlicher
// Positionen — mit Größe, Streuung, gemeinsamen und unterscheidenden Merkmalen
// und den Ausreißern der Gruppe.
//
// Gerechnet wird hier **nichts**: die Gruppen entstehen einmal beim Laden im
// Worker (lib/relate/) und liegen fertig im Zustand. Diese Ansicht wählt aus,
// sortiert und zeigt an.
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): eine Gruppe zeigt
// nur die Mitglieder, die der aktive Filter durchlässt — sonst stünde hier eine
// Zahl für das ganze LV, während Tabelle und Graph daneben eine Teilmenge
// zeigen. Fallen zu viele Mitglieder weg, verschwindet die Gruppe.
//
// Ausgenommen sind die **Kennzahlen** der Gruppe (Median, Spanne, Streuung):
// sie beschreiben die Gruppe, nicht die Auswahl, und bleiben deshalb die
// Bezugsgröße, an der die Ausreißer hängen. Blendet der Filter Mitglieder aus,
// schreibt die Karte das dazu („3 von 8 Positionen · über alle 8") — Begründung
// in ClusterCard.tsx#scopeNote.
//
// **Beschreibung, keine Bewertung:** ein Ausreißer ist eine Beobachtung über
// die Datei („fällt aus dem Rahmen seiner Gruppe"), kein Preisurteil.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ClusterCard, type VisibleCluster } from './ClusterCard';
import { EmptyState } from '../ui/EmptyState';
import { BlockLabel } from '../ui/PanelHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import { formatCount, formatPositions } from '../../lib/format';
import { spread } from '../../lib/relate';
import { matchCount } from '../../lib/tree/matchCounts';
import { useJumpToPosition } from '../common/useJumpToPosition';
import { useScrollMemory } from '../common/useScrollMemory';
import { CLUSTER_MIN_MEMBERS, useViewer, useViewerDispatch } from '../../state/viewer';
import type { ClusterSort } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

const SORT_OPTIONS = [
  { value: 'groesse', label: 'Größe', title: 'Die größten Gruppen zuerst' },
  {
    value: 'streuung',
    label: 'Streuung',
    title: 'Gruppen mit den größten Preisunterschieden zuerst',
  },
  { value: 'aehnlichkeit', label: 'Ähnlichkeit', title: 'Die engsten Gruppen zuerst' },
] as const;

export function SimilarView() {
  const {
    lv,
    nodes,
    matches,
    view: { similar },
  } = useViewer();
  const dispatch = useViewerDispatch();
  // Ein Klick auf eine einzelne Position führt dorthin, wo sie vollständig zu
  // sehen ist: Tabelle plus Eigenschaften.
  const jumpTo = useJumpToPosition();
  /**
   * Gruppe in den Vergleich legen — **ungekürzt**. Nebeneinander passen nur
   * `MAX_COMPARE_COLUMNS` Spalten, und eine Gruppe hat oft Dutzende; gekürzt
   * wird aber erst in der Ansicht. Hier zu kürzen würde den Rest der Gruppe
   * lautlos wegwerfen, statt ihn zu benennen (WP-N).
   */
  const vergleichen = (positionIds: readonly string[]): void => {
    dispatch({ type: 'setCompare', positionIds });
    dispatch({ type: 'setViewMode', mode: 'compare' });
  };
  const [attachScroll, onScroll] = useScrollMemory('similar');

  // Sprung aus dem Graphen (WP-R, R2): die aufgeklappte Gruppe ins Fenster
  // holen — dieselbe Mechanik wie bei der Prüfung (CheckView). `useScrollMemory`
  // stellt beim Einhängen den gemerkten Stand her; dieser Effekt läuft danach
  // und überschreibt ihn gezielt für diesen einen Sprung.
  const cards = useRef(new Map<string, HTMLElement>());
  const attachCard = useCallback((id: string, node: HTMLElement | null): void => {
    if (node === null) cards.current.delete(id);
    else cards.current.set(id, node);
  }, []);
  useEffect(() => {
    if (similar.revealCluster === null) return;
    cards.current.get(similar.revealCluster)?.scrollIntoView({ block: 'start' });
    dispatch({ type: 'clusterRevealed' });
  }, [similar.revealCluster, dispatch]);

  const relations = lv?.relations ?? null;
  const hasPrices = (lv?.summary.unitPrice ?? null) !== null;

  const visible = useMemo<VisibleCluster[]>(() => {
    if (relations === null) return [];
    const out: VisibleCluster[] = [];
    for (const cluster of relations.clusters) {
      const members: LVNode[] = [];
      for (const positionId of cluster.positionIds) {
        const node = nodes.get(positionId);
        if (node === undefined) continue;
        // Dieselbe gefilterte Menge wie Baum, Graph und Tabelle.
        if (matches.filtering && matchCount(matches, node) === 0) continue;
        members.push(node);
      }
      // Unter zwei Mitgliedern ist es keine Gruppe mehr, sondern eine Position.
      if (members.length >= Math.max(2, similar.minMembers)) out.push({ cluster, members });
    }
    return sortClusters(out, similar.sort);
  }, [relations, nodes, matches, similar.minMembers, similar.sort]);

  if (relations === null) return null;

  const positionsShown = visible.reduce((sum, entry) => sum + entry.members.length, 0);

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto max-w-[980px] px-[20px] py-[16px]">
        <div className="border-b border-line pb-[10px]">
          <BlockLabel>Ähnlichkeit</BlockLabel>
          <p className="mt-[2px] font-sans text-[13px] text-ink">
            <span className="font-semibold">{formatCount(visible.length)}</span>{' '}
            {visible.length === 1 ? 'Gruppe' : 'Gruppen'} mit {formatPositions(positionsShown)}
            {matches.filtering && <span className="text-dim"> · im aktuellen Filter</span>}
          </p>
          <p className="mt-[4px] font-sans text-[11.5px] leading-[1.5] text-dim">
            Positionen mit ähnlichem Text und gleichen Merkmalen stehen hier zusammen — das findet
            Wiederholungen und Varianten derselben Leistung. Verglichen wird nur innerhalb eines
            Gewerks mit gleicher Einheit und gleichem Bauteiltyp.
          </p>
          <div className="mt-[10px] flex flex-wrap items-center gap-[12px]">
            <div className="flex items-center gap-[6px]">
              <span className="font-mono text-[8px] tracking-[0.6px] text-mute">
                AB MITGLIEDERN
              </span>
              <SegmentedControl
                label="Mindestgröße einer Gruppe"
                options={CLUSTER_MIN_MEMBERS.map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
                value={String(similar.minMembers)}
                onChange={(value) => dispatch({ type: 'clusterMinMembers', value: Number(value) })}
              />
            </div>
            <div className="flex items-center gap-[6px]">
              <span className="font-mono text-[8px] tracking-[0.6px] text-mute">SORTIERUNG</span>
              <SegmentedControl
                label="Sortierung der Gruppen"
                options={SORT_OPTIONS.map((option) => ({
                  ...option,
                  // Ohne Preise gibt es keine Streuung, die etwas aussagt.
                  disabled: option.value === 'streuung' && !hasPrices,
                }))}
                value={similar.sort}
                onChange={(value) => dispatch({ type: 'clusterSort', value: value as ClusterSort })}
              />
            </div>
          </div>
        </div>

        {visible.length === 0 && (
          <div className="mt-[16px]">
            <EmptyState>
              {relations.clusters.length === 0
                ? 'Keine wiederkehrenden Leistungen gefunden'
                : 'Keine Gruppe in dieser Größe im aktuellen Filter'}
            </EmptyState>
          </div>
        )}

        {visible.map((entry) => (
          <div key={entry.cluster.id} ref={(node) => attachCard(entry.cluster.id, node)}>
            <ClusterCard
              entry={entry}
              open={similar.openClusters.has(entry.cluster.id)}
              onToggle={() => dispatch({ type: 'toggleClusterOpen', id: entry.cluster.id })}
              onJump={jumpTo}
              onCompare={() => vergleichen(entry.members.map((node) => node.id))}
            />
          </div>
        ))}

        {relations.clusters.length > 0 && (
          <p className="mt-[14px] font-mono text-[9.5px] text-mute">
            Gruppiert ab einer Ähnlichkeit von {Math.round(relations.threshold * 100)} % ·{' '}
            {formatCount(relations.clustered)} von {formatCount(relations.total)} Positionen des LV
            stehen in einer Gruppe.
          </p>
        )}
      </div>
    </div>
  );
}

/** Sortierung der Gruppen; bei Gleichstand entscheidet die Größe. */
function sortClusters(entries: VisibleCluster[], sort: ClusterSort): VisibleCluster[] {
  const bySize = (a: VisibleCluster, b: VisibleCluster): number =>
    b.members.length - a.members.length;
  if (sort === 'groesse') return [...entries].sort(bySize);
  if (sort === 'aehnlichkeit') {
    return [...entries].sort((a, b) => b.cluster.similarity - a.cluster.similarity || bySize(a, b));
  }
  return [...entries].sort((a, b) => spreadOf(b) - spreadOf(a) || bySize(a, b));
}

function spreadOf(entry: VisibleCluster): number {
  const stats = entry.cluster.unitPrice;
  return stats === null ? 0 : spread(stats);
}
