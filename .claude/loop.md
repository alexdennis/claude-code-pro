# Marginalia maintenance loop

Run through this checklist. Only act on things that are actually wrong —
don't invent work, and don't start new features or refactors beyond what's
listed here.

1. **Test health.** Run `npm run typecheck`, `npm --prefix web run typecheck`,
   and `npm test`. If anything is red that wasn't red before, diagnose the
   real root cause and fix it with a minimal, correct change — don't just
   silence or skip the failure. Re-run to confirm green. Commit the fix
   locally with a clear message, but don't push without being asked.

2. **Worktree/branch hygiene.** Run `git worktree list` and `git branch`.
   Flag (don't delete) any worktree or branch that looks stale — already
   merged into `main`, or left over from a finished `isolation: worktree`
   subagent — so it can be reviewed before removal.

3. **Working tree drift.** Run `git status`. If something like `TRACKER.md`
   has uncommitted changes sitting from a prior session and it looks like
   harmless drift (e.g. a leftover Prettier reformat) rather than
   in-progress work, point it out — don't commit on the user's behalf.

4. **Scratch files.** Check for stray debug/smoke-test scripts left behind
   from a prior session (e.g. `/tmp/smoke-*`, throwaway checklists) and
   clean up ones that are clearly finished with.

If everything above is clean, say so in one line and stop.
