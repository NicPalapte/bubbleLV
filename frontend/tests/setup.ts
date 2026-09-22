import '@testing-library/jest-dom/vitest';

// jsdom kennt ResizeObserver nicht; der Bubble-Graph misst damit seine Canvas.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub });
}

// Jeder Test beginnt mit leerer Adresszeile. Seit die App Ansicht und Filter
// ins URL-Fragment schreibt (WP-P, Schritt 2), würde sonst der Stand des
// vorigen Tests im Fragment stehen bleiben und beim nächsten `render(<App />)`
// wieder angewendet — im Browser richtig (ein Reload mit Link), in einer
// Testdatei aber ein Übergriff von einem Test auf den nächsten.
beforeEach(() => {
  window.history.replaceState(null, '', '/');
});
