// Schalter an/aus einer Regel (Entscheidung 0089): in der Liste und im Kopf des Editors.

export function RuleSwitch({
  on,
  label,
  locked = false,
  onToggle,
}: {
  on: boolean;
  /** Grundstock-Regel, die schon im Grundstock aus ist: anschalten geht nicht (0089). */
  locked?: boolean;
  /** Name der Regel — der Schalter heißt „<Name> an“. */
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} an`}
      disabled={locked}
      title={
        locked
          ? 'Im Grundstock noch aus — lässt sich hier nicht anschalten'
          : on
            ? 'An — wirkt im LV'
            : 'Aus — wirkt nicht im LV'
      }
      onClick={(event) => {
        // In der Liste sitzt der Schalter neben dem Eintrag: nicht zugleich auswählen.
        event.stopPropagation();
        onToggle();
      }}
      className={`relative h-[18px] w-[30px] shrink-0 cursor-pointer rounded-[var(--r-pill)] border-none p-0 transition-colors disabled:cursor-default disabled:opacity-40 ${
        on ? 'bg-greenD' : 'bg-line2'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-surface transition-[left] ${
          on ? 'left-[14px]' : 'left-[2px]'
        }`}
      />
    </button>
  );
}
