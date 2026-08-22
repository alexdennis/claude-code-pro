# Marginalia UI spec

What the front end (`web/src/App.tsx`) is supposed to look like and do. Use this to
judge whether a screenshot diff is a real regression or an intentional change — a
pixel diff alone can't tell the difference.

## Layout

- Single column, max width ~640px, centered, with side padding. The page does not
  use the full browser width even on a wide viewport.
- Page heading "Marginalia" at the top.
- Below the heading, one of: a loading message, an error message, an empty-state
  message, or the list of clippings. Exactly one of these four is visible at a time.

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

## States

- **Loading**: a plain status line, no spinner, text along the lines of "Loading…".
- **Error**: a status line in a distinct (red/warning) color, including the failure
  reason.
- **Empty**: a plain status line telling the user to import a Kindle export — not a
  blank page with no explanation.
- **Loaded with data**: the clipping list, no status line.

## What's explicitly out of scope right now

No sorting/filtering controls, no pagination, no per-clipping actions (edit/delete),
no dark mode. If a screenshot shows any of these, that's either a real feature that
needs its own spec update, or evidence a diff caught something unintended — check
which.
