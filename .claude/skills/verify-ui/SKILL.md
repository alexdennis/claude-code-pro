---
name: verify-ui
description: Run the Playwright screenshot flow for the web UI and judge the result against web/UI_SPEC.md — not just pixel diffs. Use after any change that could affect web/src/*, or when the user asks to check/verify the UI, look for a layout regression, or review a screenshot.
---

# Verify the UI

`e2e/ui.spec.ts` is a Playwright visual-regression suite: it starts both the Fastify
API and the Vite dev server, renders the app in Chromium, and diffs against baseline
PNGs checked into `e2e/ui.spec.ts-snapshots/`. `web/UI_SPEC.md` is the written spec —
use it to judge whether a diff is a real regression or an intentional change that
should update the baseline instead.

A pixel diff alone can't make that call. Both together can.

## Procedure

1. Run `npm run test:e2e` from the repo root. Playwright starts both dev servers
   itself (see `playwright.config.ts`) — don't start them manually first, and don't
   run this from inside `web/`.
2. If both tests pass: report that, and stop. No regression.
3. If a test fails on a screenshot mismatch, Playwright writes an actual/diff/expected
   triad next to the baseline (e.g. `loaded-state-actual.png`,
   `loaded-state-diff.png`) and prints the file paths. **Read the diff image**, not
   just the pass/fail line — a red/pink highlight marks what changed.
4. Read `web/UI_SPEC.md` and judge the diff against it:
   - If the diff contradicts the spec (a card's border disappeared, the badge color
     changed, cards now render side-by-side instead of stacked) — that's a
     regression. Say so plainly and point at the specific spec line it violates.
     Don't fix silently; report it.
   - If the diff matches an intentional change you (or the user) just made on
     purpose — update the baseline with `npx playwright test --update-snapshots`,
     and update `web/UI_SPEC.md` to describe the new intended behavior in the same
     pass. A baseline update with no matching spec update is itself a smell: it
     means the next regression in that area won't be caught by reading the spec.
5. Clean up `data/marginalia-e2e.sqlite` if it's left over from a run — it's
   gitignored but shouldn't accumulate.

## What counts as verified

Not "the test passed." A screenshot test can pass while still being stale relative
to the actual product intent (e.g. someone updated the baseline for the wrong
reason). When invoked proactively (not just because a test failed), also skim
`web/UI_SPEC.md` against what's actually in `web/src/App.tsx` and flag drift either
direction — spec describing something the code no longer does, or code doing
something the spec doesn't mention.

## Gotchas

- Playwright's `webServer` config launches the API with
  `DB_PATH=data/marginalia-e2e.sqlite`, separate from the dev DB
  (`data/marginalia.sqlite`) — e2e runs don't corrupt data from manual testing, and
  vice versa.
- Test order matters in `e2e/ui.spec.ts`: the empty-state test must run **before**
  the loaded-state test, since both share one API server process for the whole
  file and nothing resets the DB between tests. If you add a new test, either seed
  and clean up its own data, or place it correctly relative to the others.
- Baseline screenshots are named per-OS (e.g. `loaded-state-darwin.png`). A baseline
  generated on Linux CI won't match a local macOS run and vice versa — that's
  expected, not a bug.
- The dev server on port 5173 and the API on port 3000 must both be free before
  running; `reuseExistingServer: false` means Playwright always starts fresh copies
  and will fail loudly if the ports are already taken by something else (e.g. a
  server you started manually for a curl test).
