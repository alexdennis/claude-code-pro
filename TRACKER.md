# Progress tracker

Update this at the end of every session, before closing the terminal.
Claude can update it for you — ask it to append the session log entry and tick
whatever exit conditions now hold.

**Started:** 2026-08-08
**Current stage:** 1
**Budget:** 2–4 hrs/week

---

## Stages

Tick an exit condition only when you have watched it hold, not when it seems likely to.

### Stage 1 — Verification before features

- [x] `CLAUDE.md` written by hand, under 40 lines
- [x] Parser implemented with tests covering the ugly inputs (blank lines, unicode, duplicate highlights)
- [ ] `.claude/skills/verify-parser/SKILL.md` exists, scoped to one category, has a Gotchas section
- [ ] Parser run against a real `My Clippings.txt` export (not fixtures) via the verify-parser skill, output spot-checked against the raw file
- [ ] **Exit:** `npm test` green from a cold clone AND the skill invoked by name in a session

### Stage 2 — Autonomous goals

- [ ] Three deliberate bugs committed on a branch
- [ ] Auto mode configured; safe permissions pre-approved
- [ ] A `/goal` condition written that the evaluator can judge from transcript output alone
- [ ] **Exit:** goal reached in ≥5 unattended turns, transcript in `docs/logs/`

### Stage 3 — Persistence and hooks

- [ ] SQLite storage layer + Fastify API
- [ ] `PostToolUse` hook: format + typecheck on edit
- [ ] **Exit:** a type-breaking edit caught by the hook before you noticed it

### Stage 4 — Visual verification

- [ ] React + Vite front end rendering highlights
- [ ] Playwright screenshot flow Claude can invoke itself
- [ ] Written UI spec for Claude to diff against
- [ ] **Exit:** Claude caught a layout regression unprompted

### Stage 5 — Performance as a goal

- [ ] Benchmark harness written _before_ optimizing
- [ ] 10k+ highlight fixture dataset
- [ ] **Exit:** p95 < 300ms in transcript output, zero test regressions

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

| #   | Date       | Stage | Mins | What I practiced                                                                                                                                                                                                                                                            | What surprised me               |
| --- | ---------- | ----- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | 2026-08-08 | 1     | ?    | Blind-spot pass + one-question-at-a-time interview to scope the Kindle-only parser (types, error handling, dedup boundary); wrote fixtures and a full failing test suite before any parser implementation; set up TS strict + Vitest so `npm test`/`typecheck` actually run | _(fill in before next session)_ | How easy it is to deviate from the original plan. We ended doing some learnings a bit out of order. |
| 2   | 2026-08-09 | 1     | ?    | Reviewed the failing test suite for duplication/assertion depth/coverage gaps; extracted a shared unwrap helper and added 5 more edge-case fixtures (mixed-validity, CRLF, two more malformed shapes, empty input, unparseable date) before touching parser code; asked a single clarifying question to resolve a real design fork (truncated-file behavior) instead of guessing; then implemented `parseKindleClippings` against all 16 tests on explicit request, switching out of coach mode for that step; used Claude Code remote control | I was able to make meaningful progress by using Claude Code remote control. This combined with Auto mode allowed me to make progress while on the go effectively |

---

## Technique scoreboard

A technique isn't learned until it's reflexive. Tally each real use — not each time
you read about it. Anything still at 0 by Stage 6 is a gap to design a session around.

| Technique                                    | Uses | Notes                                                                                                        |
| -------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------ |
| Wrote verification before implementation     |    2 | Fixtures + full failing test suite for the Kindle parser, before the parser existed; second round added 5 more edge-case fixtures/tests before the parser was written |
| `/goal` with a measurable condition          |    0 |                                                                                                              |
| `/loop` (fixed interval)                     |    0 |                                                                                                              |
| `/loop` (self-paced)                         |    0 |                                                                                                              |
| `claude --worktree`                          |    0 |                                                                                                              |
| Subagent with `isolation: worktree`          |    0 |                                                                                                              |
| `/batch` on a multi-file change              |    0 |                                                                                                              |
| Wrote or revised a skill                     |    0 |                                                                                                              |
| Hook fired and caught something              |    0 |                                                                                                              |
| `Esc` to halt a drifting agent               |    0 |                                                                                                              |
| `/rewind` to recover                         |    0 |                                                                                                              |
| `/doctor`                                    |    0 |                                                                                                              |
| `/simplify` after a change                   |    0 |                                                                                                              |
| Blind-spot pass before building              |    1 | Surfaced source-format scope (Kindle vs Readwise vs hand-written) before writing any code                    |
| Interview mode (one question at a time)      |    1 | Used to scope record shape, Note/Bookmark linking, dedup boundary, and error handling one decision at a time |
| Deleted a rule to see if it mattered         |    0 |                                                                                                              |
| Pushed back: "prove this works" / "grill me" |    0 |                                                                                                              |

---

## Open questions

Things you don't understand yet. Delete them as they resolve; add freely.

-
