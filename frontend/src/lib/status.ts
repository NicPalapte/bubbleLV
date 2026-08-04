// Status kommt als Default aus dem Import und ist ausschließlich Filter-Facette —
// er ist im MVP nicht editierbar (.claude/CLAUDE.md, docs/mvp-scope.md#out-of-scope).
// Das Design kennt drei Werte; ohne Persistenz entsteht aus dem Import nur "offen".

export const POSITION_STATUS = 'offen';

export type StatusValue = 'geprüft' | 'offen' | 'entwurf';

export const STATUS_COLORS: Record<StatusValue, { bg: string; fg: string; dot: string }> = {
  'geprüft': { bg: 'var(--greenS)', fg: 'var(--greenD)', dot: 'var(--greenD)' },
  offen: { bg: 'var(--amberS)', fg: 'var(--amber)', dot: 'var(--amber)' },
  entwurf: { bg: '#eef2f7', fg: 'var(--dim)', dot: 'var(--mute)' },
};
