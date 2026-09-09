import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Selbst gehostete Markenschriften (siehe .claude/skills/bubble-design/tokens/
// typography.css) statt Google Fonts — kein Fremdaufruf beim Laden der App.
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
