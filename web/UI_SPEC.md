# Marginalia UI spec

What the front end (`web/src/App.tsx`) is supposed to look like and do. Use this to
judge whether a screenshot diff is a real regression or an intentional change — a
pixel diff alone can't tell the difference.

## Layout

- Single column, max width ~640px, centered, with side padding. The page does not
  use the full browser width even on a wide viewport.
- Page heading "Marginalia" at the top.
- Directly below the heading, a **stats summary line** (e.g. "12 clippings — 8
  highlights, 3 notes, 1 bookmarks · 5 authors") — only rendered once
  `GET /clippings/stats` has actually returned; absent (not a placeholder/loading
  state) before then or if that fetch fails. This is a supplementary line, not a
  control — it never blocks or gates the rest of the page.
- Below the stats line, a **search bar**: a text input (placeholder
  "Search title, author, or content…"), a "Search" submit button, a sort dropdown
  ("Newest first" / "Oldest first"), and an **"Export as Markdown" link** that
  navigates to `GET /clippings/export`, carrying whatever `q`/`sort` is currently
  active — exporting matches what's currently searched/sorted, not always
  everything. All four controls are always visible, in every state (loading,
  error, empty, loaded) — they're controls, not part of the result display.
- Below the search bar, one of: a loading message, an error message, an empty-state
  message, or the list of clippings. Exactly one of these four is visible at a time.
- Search is submit-triggered (Enter or the button), not live-as-you-type — the input
  can hold text that hasn't been searched yet without firing a request.
- Changing the sort dropdown re-runs the current search immediately (no submit
  needed) and resets to the first page.

## Clipping list

- Each clipping renders as its own card: white background, a thin border, rounded
  corners, visually distinct from the page background.
- Cards stack vertically with visible gap between them — never side by side, never
  touching.
- Each card shows, top to bottom:
  1. A small pill-shaped **type badge** (`highlight`, `note`, or `bookmark`),
     uppercase, colored distinctly per type (highlight = yellow, note = blue,
     bookmark = gray).
  2. The **title**, bold/larger than body text.
  3. The **author**, italic, smaller and lighter than the title — only present when
     the clipping has a non-null author.
  4. The **content**, normal weight — only present when the clipping has non-null
     content. Bookmarks never show a content line (their content is always null).
  5. A **tags row**: any tags already on the clipping as small rounded chips (each
     with a "×" remove button), followed by a dashed-border "add tag…" input.
     Tags load asynchronously per-card after the card itself renders — a card is
     never blocked on its tags to display its title/author/content. A failed tag
     fetch leaves the row showing just the empty add-tag input, not an error.

## States

- **Loading**: a plain status line, no spinner, text along the lines of "Loading…".
  Only shown on the very first page load. A subsequent search or sort change does
  _not_ re-enter this state — the previous results stay visible until the new ones
  are ready, then swap atomically. This is deliberate, not an oversight: briefly
  unmounting the whole list on every search was destroying in-progress local state
  on cards that survive the search (e.g. a tag being typed but not yet submitted),
  since React's key-based reconciliation can only preserve a component's state
  across a re-render if the component's parent stays mounted the whole time.
- **Error**: a status line in a distinct (red/warning) color, including the failure
  reason.
- **Empty, no search active**: tells the user to import a Kindle export — not a
  blank page with no explanation.
- **Empty, search active**: a different message naming the search term (e.g.
  `No clippings match "foo".`) — must not show the "import a Kindle export" message
  when the database has data but the search just didn't match anything, since that
  would misleadingly suggest the whole database is empty.
- **Loaded with data**: the clipping list, no status line.

## Pagination

- When more results exist beyond the current page, a **"Load more"** button
  appears centered below the list.
- Clicking it appends the next page's cards to the bottom of the existing list —
  it does not replace or scroll-reset the current results.
- While a "Load more" fetch is in flight, the button is disabled and its label
  changes to "Loading…".
- The button is absent entirely once there are no more pages (not disabled — not
  rendered at all).

## What's explicitly out of scope right now

No per-clipping edit/delete of the clipping itself (tags are the one exception —
they're addable/removable), no dark mode, no debounced/live-as-you-type search, no
jump-to-page navigation (only "next page" via Load more — this is a direct
consequence of using cursor-based pagination, which trades random page access for
pagination that never degrades with depth), no tag-based filtering in the UI (the
`GET /tags/:tag/clippings` endpoint exists but nothing in the UI links to it yet),
no visible loading/error state for the stats line or per-card tags specifically —
both fail silently rather than surfacing their own error UI, since they're
supplementary to the core clipping list. If a screenshot shows any of these, that's
either a real feature that needs its own spec update, or evidence a diff caught
something unintended — check which.
