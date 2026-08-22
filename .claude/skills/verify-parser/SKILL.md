---
name: verify-parser
description: Spot-check parseKindleClippings against a real, non-fixture My Clippings.txt export. Use when the user has a real Kindle export to verify, or wants to confirm the parser still handles real-world format variations the fixture suite doesn't cover.
---

# Verify parser against a real export

The fixture suite in `src/core/fixtures/kindle-clippings/` encodes assumptions
about Kindle's export format. Those assumptions have already been wrong once
(the metadata line's "location" turned out to be "Location" in real exports,
and the fixtures didn't catch it because they were fabricated, not pulled
from a device). This skill's job is narrow: run the parser against a real
file and see whether reality still agrees with the fixtures.

This is not a substitute for `npm test` — it's for the thing unit tests
structurally can't cover, a real export the fixtures don't anticipate.

## Procedure

1. Ask the user for the path to their real `My Clippings.txt` if not already
   given (commonly `~/Downloads/My Clippings.txt`, pulled from a physical
   Kindle device's USB storage — see README/TRACKER for the extraction
   steps).

2. Write a throwaway script (scratchpad directory if available, otherwise
   `/tmp`) that imports the parser directly and reports results:

   ```js
   import { readFileSync } from "node:fs";
   import { parseKindleClippings } from "/absolute/path/to/src/core/kindle-clippings.ts";

   const text = readFileSync("/absolute/path/to/My Clippings.txt", "utf-8");
   const results = parseKindleClippings(text);

   const ok = results.filter((r) => r.ok);
   const failed = results.filter((r) => !r.ok);
   console.log(
     `total: ${results.length}, ok: ${ok.length}, failed: ${failed.length}`,
   );

   for (const f of failed) {
     console.log("--- failure ---");
     console.log("error:", f.error);
     console.log("raw:", JSON.stringify(f.raw.slice(0, 200)));
   }

   for (const r of ok.slice(0, 5)) {
     console.log(JSON.stringify(r.clipping, null, 2));
   }
   ```

3. Run it with `node --experimental-strip-types <script path>` — this repo
   has no `tsx`/`ts-node` dependency, and Node 22's native type-stripping is
   sufficient since `kindle-clippings.ts` only uses erasable TS syntax
   (interfaces, type aliases, type annotations — no enums or namespaces).

4. Delete the throwaway script when done. Don't commit it.

## What counts as verified

Not just "zero failures." Do both:

- **Failures**: for each `ok: false` result, read the raw text and judge
  whether it's a genuine parse gap (the parser should have handled this) or
  legitimately malformed/unexpected data (fine to fail on). A gap means the
  parser needs a fix, and probably a new fixture + regression test before
  the fix, per this project's verification-before-features convention.
- **Successes**: spot-check a handful of parsed entries against the raw
  file by eye — title/author split, page/location numbers, content
  trimming, `addedAt` looking like a sane date for the `addedAtRaw` string.
  A parser can return `ok: true` with a wrong field value; only reading the
  source catches that.

If you find a new gap, add it to the Gotchas section below after fixing it,
so the next real file benefits from what this one taught you.

## Gotchas

- **`Location` is capitalized in real exports.** The original fixtures used
  lowercase `location`, and the parser's regex matched that literally.
  Fixed by making `METADATA_LINE` case-insensitive and normalizing the
  matched type label before the `TYPE_BY_LABEL` lookup (case-insensitive
  regex + case-sensitive object lookup silently breaks type resolution
  otherwise).
- **A BOM appears at the start of every entry, not just the file.** This
  looked like a second bug but isn't one: `String.prototype.trim()` strips
  a leading U+FEFF per the ECMAScript spec, and the parser already calls
  `.trim()` on every split entry, not just the first. Verified directly
  against a real file before writing any fix — don't re-diagnose this.
- **The Kindle app autosaves Note drafts while typing.** A single note you
  compose can produce a dozen-plus near-identical entries at the same
  `page`/`location`, with content that grows one keystroke at a time. This
  is expected user behavior, not corrupted or duplicated data — don't
  "fix" it by deduplicating.
- **Date format varies by device/locale.** US-locale exports use
  `"Monday, August 10, 2026 7:51:48 PM"` (month name, 12-hour); UK-locale
  fixtures use `"Tuesday, 12 January 2021 09:15:22"` (day-month, 24-hour).
  Both parse correctly via `new Date(raw)` — this is here so you don't
  waste time suspecting the date parser when you see an unfamiliar format.
- **Line endings are typically CRLF in real exports**, already normalized
  by the parser before splitting on entries.
