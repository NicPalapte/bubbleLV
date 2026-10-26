import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Conocto-Designsystem (Entscheidung 0076): Schriften selbst gehostet statt Google Fonts,
// Tokens als CSS-Variablen (hell/dunkel), Grundstil der Bausteine. Vor index.css,
// damit App-eigene Regeln gewinnen.
import '@conocto/design/fonts';
import '@conocto/design/tokens.css';
import '@conocto/design/styles.css';
import './index.css';
import App from './App.tsx';
import { countPageview } from './lib/usage/count';

countPageview();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
