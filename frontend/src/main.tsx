import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Selbst gehostete Markenschriften (docs/decisions/0068-conocto-look.md) statt
// Google Fonts — kein Fremdaufruf beim Laden der App. Hanken Grotesk trägt Titel
// und Wortmarke, Schibsted Grotesk den übrigen Text.
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import './index.css';
import App from './App.tsx';
import { countPageview } from './lib/usage/count';

countPageview();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
