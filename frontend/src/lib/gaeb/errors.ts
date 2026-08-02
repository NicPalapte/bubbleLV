// Fehlertypen der GAEB-Adaptergrenze (docs/architecture/pipeline.md#fehlerbehandlung).
// Sie werden geworfen, nicht verschluckt; die Upload-Komponente zeigt sie an.

/** Datei ist nicht lesbar/kein wohlgeformtes XML. */
export class GAEBParseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GAEBParseError';
  }
}

/** Datei ist wohlgeformt, aber keine verwertbare GAEB-LV-Struktur. */
export class GAEBValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GAEBValidationError';
  }
}

/** GAEB-Version außerhalb des unterstützten Bereichs. */
export class GAEBVersionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GAEBVersionError';
  }
}
