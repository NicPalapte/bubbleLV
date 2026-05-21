#!/usr/bin/env bash
# .claude/hooks/lint.sh
#
# PostToolUse hook: läuft nach jedem Edit/Write-Tool-Call.
# Führt ruff (Lint + Format) und mypy auf der geänderten Datei aus.
# Gibt Fehler als "block"-Decision zurück → Claude sieht sie und behebt sie.

set -euo pipefail

INPUT=$(cat)

# Nur Python-Dateien prüfen
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" || "${FILE_PATH##*.}" != "py" ]]; then
  exit 0
fi

if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

ERRORS=""

# --- ruff: Lint mit Auto-Fix ---
if command -v ruff &>/dev/null; then
  RUFF_OUT=$(ruff check --fix "$FILE_PATH" 2>&1) || true
  RUFF_FMT=$(ruff format "$FILE_PATH" 2>&1) || true

  # Prüfen ob nach Auto-Fix noch Fehler übrig sind
  RUFF_REMAINING=$(ruff check "$FILE_PATH" 2>&1) || true
  if [[ -n "$RUFF_REMAINING" ]]; then
    ERRORS+="### ruff\n${RUFF_REMAINING}\n\n"
  fi
else
  ERRORS+="### ruff nicht gefunden\nBitte installieren: pip install ruff\n\n"
fi

# --- mypy: Typprüfung ---
if command -v mypy &>/dev/null; then
  MYPY_OUT=$(mypy "$FILE_PATH" --config-file pyproject.toml 2>&1) || true
  # mypy gibt auch bei Erfolg Text aus – nur bei Fehlern (error:) blockieren
  if echo "$MYPY_OUT" | grep -q "error:"; then
    ERRORS+="### mypy\n${MYPY_OUT}\n"
  fi
else
  ERRORS+="### mypy nicht gefunden\nBitte installieren: pip install mypy\n\n"
fi

# --- Ergebnis zurückgeben ---
if [[ -n "$ERRORS" ]]; then
  REASON=$(printf "Linting-Fehler in \`%s\` – bitte beheben:\n\n%b" "$FILE_PATH" "$ERRORS")
  jq -n --arg reason "$REASON" '{
    decision: "block",
    reason: $reason
  }'
else
  exit 0
fi