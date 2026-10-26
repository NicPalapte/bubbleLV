/** @type {import('tailwindcss').Config} */
// Farben/Fonts spiegeln die Design-Tokens wider; die CSS-Variablen selbst stehen
// in src/index.css (docs/decisions/0069-conocto-look.md).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        white: 'var(--white)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        panel: 'var(--panel)',
        grid: 'var(--grid)',
        grid2: 'var(--grid2)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        ink: 'var(--ink)',
        dim: 'var(--dim)',
        mute: 'var(--mute)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        'accent-fill': 'var(--accent-fill)',
        'accent-fill-hover': 'var(--accent-fill-hover)',
        cyan: 'var(--cyan)',
        amber: 'var(--amber)',
        amberS: 'var(--amberS)',
        amberD: 'var(--amberD)',
        greenD: 'var(--greenD)',
        greenS: 'var(--greenS)',
        red: 'var(--red)',
        redD: 'var(--redD)',
      },
      fontFamily: {
        mono: 'var(--mono)',
        sans: 'var(--sans)',
        display: 'var(--display)',
      },
    },
  },
  plugins: [],
};
