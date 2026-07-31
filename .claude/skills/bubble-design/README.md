# Bubble — Design System

**Bubble** is a German-language *LV-Viewer* (Leistungsverzeichnis / bill-of-quantities viewer)
for construction estimating and procurement. It turns a flat LV into a navigable structure:
a bubble graph of lots and sections, a filterable position table, and analytics views for
Vergabepakete (procurement packages), Nachunternehmer (subcontractors), Bieterfragen
(bidder questions), Aufgaben (tasks) and a Beton-Verzeichnis (concrete register).

Audience: Kalkulation, AVA, BIM and Projektleitung at a construction contractor. Dense,
professional, keyboard-friendly. Never consumer-y.

**Source:** derived from the prototype in this project —
`Bubble LV-Viewer.html`, `lv-main.jsx`, `lv-data.jsx`, `lv-graph.jsx`,
`lv-vergabe.jsx`, `lv-analytics.jsx`, `lv-notes.jsx`, `wf-shell.jsx`.
No external Figma file or repo was provided; the code is the ground truth.

---

## Index
- `styles.css` — the single entry point; `@import`s all tokens.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `elevation.css`, `base.css`.
- `components/core/` — 13 React primitives (`.jsx` + `.d.ts`), see `components/USAGE.md`.
- `patterns.md` — layout, filtering, selection and panel patterns above component level.
- `foundations.html` — visual specimen of colors, type, components. Open in a browser.
- `SKILL.md` — entry point when used as a Claude Code skill.

---

## Visual foundations

**The metaphor is a blueprint / technical drawing.** Light cool paper, hairline rules,
monospace annotation, square corners. Nothing is decorative; if a pixel doesn't carry
information it isn't there.

- **Background:** `--paper #f5f7fa`. The bubble canvas adds a 24px blueprint grid
  (`.bp-canvas`) or a 14px dot pattern behind the graph. Panels and tables sit on
  `--white`; sunken/zebra areas on `--panel #fbfcfd`. No images, no gradients as
  background, no texture.
- **Color:** one accent — blue `#2563eb`. Blue means *selected / active / interactive*
  and nothing else. Amber `#d97706` = "offen / needs attention"; green `#0f8a4c` =
  "geprüft / cheapest bid"; red `#b91c1c`/`#dc2626` = expired document or price over
  estimate. Counts are neutral grey unless they represent something a human must act on.
  Categorical color (Vergabepakete, team roles) is generated in **oklch** with a fixed
  L/C and varying hue — `packageColors(hue)` in `components/core/PackageTag.jsx`.
  Max ~2 saturated hues on screen at once outside those identity dots.
- **Type:** IBM Plex Mono is the *interface* font — every label, number, code, chip,
  table cell. Space Grotesk (600/700) is used only for **names of things**: the wordmark,
  section/position/lot titles, and `Langtext` prose. Sizes are deliberately tiny:
  8px micro-labels, 9px uppercase section labels (letter-spacing .6), 10–11px rows,
  15–18px titles. Uppercase + letterspacing marks *labels*; sentence case marks *content*.
- **Borders do the work of elevation.** Four line steps (`--grid` → `--line2`).
  1px solid is the default; 1px **dashed** means "empty / add / reset". Exactly one real
  shadow exists — `--shadow-popover 0 8px 24px rgba(26,37,51,0.10)` on dropdowns.
  Floating canvas toolbars use a 94%-white capsule with a hairline shadow instead.
- **Corner radius: 0.** Two exceptions: `2px` on status pills and package swatches,
  and full round (`50%`/`99px`) on avatars, count badges and the assignee picker.
  Cards are not rounded and never have a colored left border *as decoration* — a colored
  2px left bar is a *meaning* (selection = blue, otherwise the row's Vergabepaket color).
- **Selection & hover:** selection = `--blueS` fill + 2px blue left bar + `--blueD` text.
  Hover = a light background change only (`--blueS` on the resize handle, row tint on
  lists). No lift, no scale, no shadow on hover. There is no distinct press state.
- **Motion:** `.1–.12s ease` on background/border color. That is all. No entrance
  animations, no bounce, no parallax. The only "animation" is the force-directed bubble
  layout settling.
- **Transparency/blur:** almost none. `rgba(255,255,255,0.94)` behind the over-canvas
  toolbar; `33` alpha suffix on status-pill borders; `1c` alpha on avatar fills. No
  backdrop-filter.
- **Filtering is visual, not destructive:** non-matching items either dim
  (`opacity .32` positions, `.4` sections) or hide, user's choice. Counts render as
  `matching/total` with the matching half in blue.
- **Density:** the whole scale is 4/6/8/12/16px. Table rows are 9px vertical padding,
  tree rows 4–5px. Panels are 236px (left) and 320px (right), both drag-resizable with
  a 5px handle, persisted in localStorage.
- **Imagery:** none. There are no photos or illustrations anywhere in the product.

## Iconography

There is **no icon library and no icon font.** Icons are *typographic*: single Unicode
glyphs set in IBM Plex Mono, usually inside an 18px square with a 1px border
(`--size-icon-tile`). The full vocabulary in use:

`▸ ▾` disclosure · `▣` Vergabepakete · `⊞` Nachunternehmer · `?` Bieterfragen ·
`✓` Aufgaben/checked · `◆` Beton-Verzeichnis · `◯` Übersicht · `⌕` Suche ·
`←` zurück · `‹ ›` collapse/expand · `↑ ↓` sort · `↗` open document · `✕` remove ·
`⚠` warning · `§` section marker · `∑ ∅` totals/average · `·` separator.

**No emoji, ever.** The only drawn SVG in the system is the logo mark (three linked
circles) and the data visualisations (bubbles, treemap, sunburst), which are data, not
decoration. If you need a new icon, prefer another Unicode glyph in the same weight over
importing an icon set. There is no supplied logo file beyond the inline
`BubbleLogo` component.

## Content fundamentals

- **Language is German**, and specifically *Baubranche* German. Domain vocabulary is never
  translated or softened: Leistungsverzeichnis, Position, OZ, Abschnitt, Los,
  Vergabepaket, Nachunternehmer, Bieterfrage, Langtext, Menge, EP/GP, Expositionsklasse,
  Druckfestigkeit, Kalkulation. Field labels are the words an AVA-Fachkraft would use.
- **Tone: instrumental and neutral.** The UI states facts; it doesn't address the user
  and doesn't have a personality. No "you", no "we", no exclamation marks, no marketing
  copy. The one instructional sentence in the app reads like a caption:
  *"Wähle eine Bubble oder Position aus, um Details anzuzeigen."*
- **Casing:** UPPERCASE + 0.6px letterspacing for structural labels (KENNZAHLEN, AUFGABEN,
  VERGABEPAKETE, AKTIVE FILTER). Sentence case for content and buttons.
  Status values are lowercase German words: `geprüft`, `offen`, `entwurf`.
- **Numbers** use German locale throughout: `toLocaleString('de-DE')`, comma decimals,
  `€` after the value with a space, units as `m³ / St / m²`. Percentages get one
  decimal and an explicit sign (`+4,2 %`).
- **Empty states are one short noun phrase**, never an apology: *"Keine Aufgaben"*,
  *"Noch keine Angebote."*, *"Keine Positionen entsprechen den Filtern."*
- **Actions are infinitives or noun phrases:** *"+ Aufgabe hinzufügen"*, *"zurücksetzen"*,
  *"Neue Aufgabe…"*, *"+ Neu…"*. Never "Jetzt hinzufügen!".
- **Abbreviate like a spreadsheet:** Pos., Bearb., EP, GP, ∅ EP, VP-01, Los 2.

## Intentional additions

`Checkbox`, `SegmentedControl`, `EmptyState` and `Popover` were factored out of inline
markup in `lv-main.jsx` — they exist in the product, just not as named components.
Nothing was invented that the prototype doesn't already render.
