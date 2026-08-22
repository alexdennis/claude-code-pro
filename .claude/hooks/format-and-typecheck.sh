#!/usr/bin/env bash
set -uo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac

npm run format >/dev/null 2>&1

if ! output="$(npm run typecheck 2>&1)"; then
  jq -n --arg file "$file" --arg reason "$output" \
    '{decision: "block", reason: ("Typecheck failed after editing " + $file + ":\n\n" + $reason)}'
fi
