// Unerwarteter Fehler beim Laden in der Oberfläche: deutscher Satz für die
// Nutzerin, Ursache in der Konsole für die Fehlersuche (Review auf PR 114).
// Vorbild ist die ErrorBoundary, die Abstürze ebenfalls mit console.error meldet.

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { UNEXPECTED_FAILURE } from '../../src/lib/pipeline/messages';
import { gaebMitPositionen } from '../support/gaebXml';

vi.mock('../../src/lib/pipeline/runPipeline', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/pipeline/runPipeline')>();
  return {
    ...original,
    classifyAndBuild: vi.fn(() => {
      throw new RangeError('Maximum call stack size exceeded');
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Unerwarteter Ladefehler', () => {
  it('zeigt den deutschen Satz und loggt die Ursache', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
      target: { files: [new File([gaebMitPositionen(3)], 'klein.x83')] },
    });

    const meldung = await screen.findByRole('alert');
    expect(meldung).toHaveTextContent(UNEXPECTED_FAILURE);
    expect(meldung).not.toHaveTextContent(/Maximum call stack/);

    expect(log).toHaveBeenCalledTimes(1);
    const [text, fehler] = log.mock.calls[0];
    expect(text).toMatch(/Unerwarteter Fehler beim Laden/);
    expect((fehler as Error).cause).toBeInstanceOf(Error);
    expect(((fehler as Error).cause as Error).message).toContain('Maximum call stack');
  });

  it('loggt nichts bei einem erwarteten Fehler wie einer leeren Datei', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
      target: { files: [new File([''], 'leer.x83')] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('ist leer');
    expect(log).not.toHaveBeenCalled();
  });
});
