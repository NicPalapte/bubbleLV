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
