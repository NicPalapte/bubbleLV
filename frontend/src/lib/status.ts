// Status kommt als Default aus dem Import und ist nur Anzeige, kein Filter —
// er ist im MVP nicht editierbar (docs/decisions/0051-kein-status-filter.md).
// Das Design kennt drei Werte; ohne Persistenz entsteht aus dem Import nur "offen".
// Die Farben liegen in components/ui/StatusPill.tsx (Design-System-Baustein).

export const POSITION_STATUS = 'offen';
