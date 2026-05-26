"""Domain exceptions raised by the GAEB adapter layer."""


class GAEBParseError(Exception):
    """Raised when a GAEB file cannot be parsed (malformed XML, I/O error)."""


class GAEBValidationError(Exception):
    """Raised when a parsed GAEB document fails business-rule validation."""


class GAEBVersionError(Exception):
    """Raised when the GAEB version is not supported (outside 2.0–3.3)."""
