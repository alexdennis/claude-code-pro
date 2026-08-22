# Marginalia

Parses markdown highlight exports, stores them, serves them over an API and a small
React UI. This repo doubles as a deliberate-practice project — see README.md.

## Conventions

- TypeScript strict. No `any` without a comment saying why.
- Tests live next to the code as `*.test.ts`. Vitest.
- Prefer pure functions in `src/core/`; side effects at the edges.

## Before you call something done

Run `npm test` and `npm run typecheck`. Report the actual output, not a summary of it.

## Working agreement

This file is intentionally short. If you need context, read the code — don't ask me
to write it down here. If a rule here is wrong or stale, say so.

<!-- Stage 8: cut this file down. Delete rules and see what actually breaks. -->
