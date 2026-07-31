#!/usr/bin/env bash
# .claude/hooks/lint.sh
#
# PostToolUse hook: läuft nach jedem Edit/Write-Tool-Call.
# Führt ESLint + Prettier auf der geänderten Datei aus (sobald frontend/
# über WP-D angelegt ist). Gibt Fehler als "block"-Decision zurück → Claude
# sieht sie und behebt sie.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
EXT="${FILE_PATH##*.}"

if [[ -z "$FILE_PATH" || ! "$EXT" =~ ^(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Noch kein frontend/ mit installierten Tools (z. B. vor WP-D) -> nichts zu tun.
if [[ ! -x "frontend/node_modules/.bin/eslint" ]]; then
  exit 0
fi

ERRORS=""

ESLINT_OUT=$(frontend/node_modules/.bin/eslint --fix "$FILE_PATH" 2>&1) || ERRORS+="### eslint\n${ESLINT_OUT}\n\n"

if [[ -x "frontend/node_modules/.bin/prettier" ]]; then
  frontend/node_modules/.bin/prettier --write "$FILE_PATH" >/dev/null 2>&1 || true
fi

if [[ -n "$ERRORS" ]]; then
  REASON=$(printf "Linting-Fehler in \`%s\` – bitte beheben:\n\n%b" "$FILE_PATH" "$ERRORS")
  jq -n --arg reason "$REASON" '{
    decision: "block",
    reason: $reason
  }'
else
  exit 0
fi
