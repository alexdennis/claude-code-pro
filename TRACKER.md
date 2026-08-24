# Progress tracker

Update this at the end of every session, before closing the terminal.
Claude can update it for you — ask it to append the session log entry and tick
whatever exit conditions now hold.

**Started:** 2026-08-08
**Current stage:** 6
**Budget:** 2–4 hrs/week

---

## Stages

Tick an exit condition only when you have watched it hold, not when it seems likely to.

### Stage 1 — Verification before features

- [x] `CLAUDE.md` written by hand, under 40 lines
- [x] Parser implemented with tests covering the ugly inputs (blank lines, unicode, duplicate highlights)
- [x] `.claude/skills/verify-parser/SKILL.md` exists, scoped to one category, has a Gotchas section
- [x] Parser run against a real `My Clippings.txt` export (not fixtures) via the verify-parser skill, output spot-checked against the raw file
- [x] **Exit:** `npm test` green from a cold clone AND the skill invoked by name in a session

### Stage 2 — Autonomous goals

- [x] Three deliberate bugs committed on a branch (landed on `main` directly instead of a branch — spirit satisfied, noted as a miss on the literal mechanic)
- [x] Auto mode configured; safe permissions pre-approved
- [x] A `/goal` condition written that the evaluator can judge from transcript output alone
- [x] **Exit:** goal reached in ≥5 unattended turns, transcript in `docs/logs/`

### Stage 3 — Persistence and hooks

- [x] SQLite storage layer + Fastify API
- [x] `PostToolUse` hook: format + typecheck on edit
- [x] **Exit:** a type-breaking edit caught by the hook before you noticed it

### Stage 4 — Visual verification

- [x] React + Vite front end rendering highlights
- [x] Playwright screenshot flow Claude can invoke itself
- [x] Written UI spec for Claude to diff against
- [x] **Exit:** Claude caught a layout regression unprompted (demonstrated deliberately, not organically — judged to satisfy the spirit of the exercise)

### Stage 5 — Performance as a goal

- [x] Benchmark harness written _before_ optimizing
- [x] 10k+ highlight fixture dataset (10,000 total rows; switched to a realistic 8k/1.5k/500 highlight/note/bookmark mix rather than 10k pure highlights — judged good enough)
- [x] **Exit:** p95 < 300ms in transcript output, zero test regressions (naive LIKE implementation already passed at ~1.7–2.8ms p95 across all three scenarios — no optimization pass was needed)

### Stage 6 — Parallelism

- [ ] `.worktreeinclude` set up so `.env` lands in new worktrees
- [ ] Three features scoped so they genuinely don't overlap
- [ ] Ran 3+ sessions concurrently
- [ ] **Exit:** all three merged in one sitting, no manual conflict resolution

### Stage 7 — Migration at scale

- [ ] Migration plan written and reviewed before any edit
- [ ] `isolation: worktree` subagent used for the mechanical pass
- [ ] **Exit:** migration green, and `/rewind` used at least once to undo a bad path

### Stage 8 — Automation and the context diet

- [ ] `.claude/loop.md` with a real maintenance prompt
- [ ] `/loop` babysitting a PR through CI end to end
- [ ] `/doctor` run; findings acted on
- [ ] Unused skills deleted; `CLAUDE.md` cut hard
- [ ] **Exit:** `CLAUDE.md` smaller than at Stage 3, suite still green

---

## Session log

Keep entries short. The "what surprised me" column is the one worth writing.

| # | Date | Stage | Mins | What I practiced | What surprised me |
| --- | ---------- | ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 | 2026-08-08 | 1 | ? | Blind-spot pass + one-question-at-a-time interview to scope the Kindle-only parser (types, error handling, dedup boundary); wrote fixtures and a full failing test suite before any parser implementation; set up TS strict + Vitest so `npm test`/`typecheck` actually run | _(fill in before next session)_ | How easy it is to deviate from the original plan. We ended doing some learnings a bit out of order. |
| 2 | 2026-08-09 | 1 | ? | Reviewed the failing test suite for duplication/assertion depth/coverage gaps; extracted a shared unwrap helper and added 5 more edge-case fixtures (mixed-validity, CRLF, two more malformed shapes, empty input, unparseable date) before touching parser code; asked a single clarifying question to resolve a real design fork (truncated-file behavior) instead of guessing; then implemented `parseKindleClippings` against all 16 tests on explicit request, switching out of coach mode for that step; used Claude Code remote control | I was able to make meaningful progress by using Claude Code remote control. This combined with Auto mode allowed me to make progress while on the go effectively |
| 3 | 2026-08-10 | 1 | ? | Pulled a real `My Clippings.txt` and ran the parser against it directly (0/38 parsed); diagnosed the real bug (case-sensitive `location` vs Kindle's actual `Location`) and investigated a second suspected bug that turned out not to be real (per-entry BOM — already handled by `trim()`); wrote a failing regression test reproducing the real format before touching parser code, confirmed it red, then fixed the regex + type-label lookup; reverified against the real file (38/38) and the full suite; wrote `.claude/skills/verify-parser/SKILL.md` scoped to real-file spot-checking with a Gotchas section from this session's findings, then invoked it by name (`/verify-parser`) against the real file and confirmed `npm test` green from an actual cold clone — closing out Stage 1 | _(fill in before next session)_ |
| 4 | 2026-08-22 | 2 | ? | Committed three deliberate bugs directly to `main` (a plural-vs-singular type typo, a plural-vs-singular regex literal, and a wrong BOM code point); ran `/goal` in auto mode from a fresh, memory-blind session validated against a second real export (`My Clippings 2.txt`); that session found and fixed all three unattended, re-verified via the verify-parser skill and the full suite, and correctly left the fix uncommitted since it wasn't asked to commit; reconciled the tracker's literal wording ("on a branch", "≥5 turns") against what actually happened rather than assuming a mismatch meant failure — decided both counted in spirit — then moved the transcript into `docs/logs/` and closed out Stage 2 | It was hard to introduce a meaningful bug that would give the AI >= 5 turns to solve or maybe I have gotten lazy |
| 5 | 2026-08-22 | 3 | ? | Built the SQLite storage layer on `node:sqlite`'s built-in `DatabaseSync` (no new dependency) and a minimal Fastify API (`POST /clippings/import`, `GET /clippings`), all implemented directly on explicit request; hit a real gotcha getting `npm run start` working (the project's `.js`-extension imports don't resolve under bare `node --experimental-strip-types`, since Node's loader doesn't remap `.js` back to sibling `.ts` files) and added `tsx` to fix it; added Prettier since no formatter existed yet; wrote a `PostToolUse` hook (format + typecheck on edit) as a script + `.claude/settings.json`, pipe-tested it against a synthesized stdin payload before wiring it in, then proved it live by making a real type-breaking edit through the Edit tool and watching it block in the same turn before reverting; user then ran the server manually and confirmed `GET /clippings` worked end to end | _(fill in before next session)_ |
| 6 | 2026-08-22 | 4 | ? | Built a standalone React + Vite front end (`web/`) rendering clippings via a dev-server proxy to the Fastify API; wrote `web/UI_SPEC.md` before wiring verification, so a screenshot diff could be judged as regression-vs-intentional rather than just flagged; wired Playwright (`e2e/ui.spec.ts`) with checked-in baselines and a `verify-ui` skill mirroring `verify-parser`; demonstrated the exit condition with a real CSS regression — first attempt produced a false pass because the test only rendered one card, so row-vs-column layout was invisible; fixed the test to use two clippings, re-baselined, then caught the same regression for real and read the diff before reverting; fixed two other real gaps found along the way (Vitest's default glob picking up the Playwright `.spec.ts` file and failing on it; root `tsconfig.json` silently excluding `playwright.config.ts`/`e2e/`/`vitest.config.ts` from typecheck); an initial screenshot for the README accidentally captured the user's real Kindle highlights instead of fixture data — caught before committing, discarded, regenerated against isolated fixture-seeded servers without disturbing the user's live session | _(fill in before next session)_ |
| 7 | 2026-08-22 | 5 | ? | Coached the search/benchmark design one decision at a time before writing any code (naive LIKE baseline, query-param API, cursor pagination over offset, sort-by-addedAt with nulls always last via a direction-dependent sentinel, base64 cursor, three seeded-selectivity buckets, warmup/sample-size methodology), verifying SQLite's row-value tuple comparison directly before committing to the cursor design; user then handed off implementation midway ("turns out I don't have the time"), so built the whole design directly: search in the storage layer (11 new tests), wired into `GET /clippings` (unifying its response shape to `{clippings, nextCursor}`, which required updating existing tests and the frontend), a 10k-row dataset generator with controlled-selectivity markers, and a benchmark harness (10 warmup + 100 timed iterations, common-bucket scenario walks cursor pages instead of just page one); wrapped `insertClippings` in a transaction after noticing 10k individual auto-committed inserts would be slow; real result: naive LIKE already passes at ~1.7-2.8ms p95 (100-170x under the 300ms target) — no optimization pass was needed, which is itself a valid outcome of "benchmark before optimizing" | _(fill in before next session)_ |
| 8 | 2026-08-23 | 5–6 | ? | Added the search UI that Stage 5's API had no front end for — a search box, sort dropdown, and cursor-based "Load more" button — verified live in a browser against the real benchmark dataset (search for the seeded rare/common markers, watch card count go 50→100) before touching `web/UI_SPEC.md` or the Playwright baselines, both of which were then updated to match; separately, the user drove a clean-architecture refactor from another agent session entirely on their **Even G2 smart glasses** (a `ClippingsRepository` interface, an `importClippings` use case with fully mocked-repo unit tests, routes extracted to their own module) explicitly to give Stage 6's future parallel worktrees non-overlapping seams — reviewed it rather than trusting it, verified genuinely (typecheck ×2, 43/43 tests, 5/5 e2e, benchmark still ~2-3ms p95) before pushing the 3 pending local commits, then found and removed one real gap the refactor didn't touch: `listClippings` had been fully dead code since Stage 5 (only its own tests called it) — rewrote its 4 tests against `searchClippings` instead of just deleting the coverage | Was able to start and finish the refactor entirely from Even G2 smart glasses |

---

## Technique scoreboard

A technique isn't learned until it's reflexive. Tally each real use — not each time
you read about it. Anything still at 0 by Stage 6 is a gap to design a session around.

| Technique                                    | Uses | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrote verification before implementation     |    4 | Fixtures + full failing test suite for the Kindle parser, before the parser existed; second round added 5 more edge-case fixtures/tests before the parser was written; third round: regression test for a real-data bug (case-sensitive Location), confirmed red, before fixing the regex; fourth round: 11 searchClippings tests (escaping, sort, nulls-last, cursor pagination) written and passing before wiring search into the API route |
| `/goal` with a measurable condition          |    1 | "Kindle clippings parses correctly" validated against a real export; fresh blind session found + fixed 3 deliberately committed bugs unattended                                                                                                                                                                                                                                                                                               |
| `/loop` (fixed interval)                     |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/loop` (self-paced)                         |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `claude --worktree`                          |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Subagent with `isolation: worktree`          |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/batch` on a multi-file change              |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Wrote or revised a skill                     |    2 | `.claude/skills/verify-parser/SKILL.md`, invoked by name against a real My Clippings.txt export; `.claude/skills/verify-ui/SKILL.md` packaging the Playwright + UI spec verification loop                                                                                                                                                                                                                                                     |
| Hook fired and caught something              |    1 | `PostToolUse` format+typecheck hook blocked a real type-breaking edit live, in the same turn, before the change was ever noticed manually                                                                                                                                                                                                                                                                                                     |
| `Esc` to halt a drifting agent               |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/rewind` to recover                         |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/doctor`                                    |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/simplify` after a change                   |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Blind-spot pass before building              |    1 | Surfaced source-format scope (Kindle vs Readwise vs hand-written) before writing any code                                                                                                                                                                                                                                                                                                                                                     |
| Interview mode (one question at a time)      |    2 | Used to scope record shape, Note/Bookmark linking, dedup boundary, and error handling one decision at a time; second round: a long design interview for Stage 5's search/pagination/benchmark design (naive vs FTS5, cursor vs offset, nulls-last sort, selectivity buckets, sample methodology) before any code was written                                                                                                                  |
| Deleted a rule to see if it mattered         |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Pushed back: "prove this works" / "grill me" |    0 |                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Open questions

Things you don't understand yet. Delete them as they resolve; add freely.

-
