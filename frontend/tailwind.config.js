/** @type {import('tailwindcss').Config} */
// Farben/Fonts spiegeln die Design-Tokens aus .claude/skills/bubble-design/tokens/
// wider; die CSS-Variablen selbst stehen in src/index.css.
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
        blue: 'var(--blue)',
        blueS: 'var(--blueS)',
        blueD: 'var(--blueD)',
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
      },
    },
  },
  plugins: [],
};
