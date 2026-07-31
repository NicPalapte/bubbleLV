import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';

describe('App', () => {
  it('rendert das 3-Spalten-Layout des Viewers', () => {
    render(<App />);
    expect(screen.getByText('Tree')).toBeInTheDocument();
    expect(screen.getByText('Graph / Tabelle')).toBeInTheDocument();
    expect(screen.getByText('Eigenschaften')).toBeInTheDocument();
  });
});
