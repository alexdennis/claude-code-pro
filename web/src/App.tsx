import { useEffect, useRef, useState } from "react";

interface Clipping {
  id: number;
  type: "highlight" | "note" | "bookmark";
  title: string;
  author: string | null;
  page: number | null;
  locationStart: number;
  locationEnd: number | null;
  addedAt: string | null;
  addedAtRaw: string;
  content: string | null;
}

interface ClippingsPage {
  clippings: Clipping[];
  nextCursor: string | null;
}

interface Stats {
  total: number;
  byType: {
    highlight: number;
    note: number;
    bookmark: number;
  };
  distinctAuthorCount: number;
}

type SortDirection = "asc" | "desc";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      clippings: Clipping[];
      nextCursor: string | null;
      loadingMore: boolean;
    };

function buildSearchParams(
  query: string,
  sort: SortDirection,
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.length > 0) params.set("q", query);
  params.set("sort", sort);
  return params;
}

function buildUrl(
  query: string,
  sort: SortDirection,
  cursor: string | null,
): string {
  const params = buildSearchParams(query, sort);
  if (cursor !== null) params.set("cursor", cursor);
  return `/clippings?${params.toString()}`;
}

function buildExportUrl(query: string, sort: SortDirection): string {
  return `/clippings/export?${buildSearchParams(query, sort).toString()}`;
}

async function fetchPage(url: string): Promise<ClippingsPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return response.json() as Promise<ClippingsPage>;
}

function ClippingCard({ clipping }: { clipping: Clipping }) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  // Once the user adds/removes a tag, local state is more current than
  // whatever the mount-time GET below saw — a slow GET resolving after that
  // point must not clobber it. StrictMode's double-invoked effect (or any
  // out-of-order response from an unmounted instance) is separately guarded
  // by `ignore`; this ref guards a *still-mounted* instance's own in-flight
  // GET racing against a mutation that happened while it was in flight.
  const hasMutatedRef = useRef(false);

  useEffect(() => {
    let ignore = false;
    hasMutatedRef.current = false;

    fetch(`/clippings/${clipping.id}/tags`)
      .then((response) => response.json() as Promise<{ tags: string[] }>)
      .then(({ tags: fetched }) => {
        if (!ignore && !hasMutatedRef.current) setTags(fetched);
      })
      .catch(() => {
        // Tag loading is a non-essential enhancement — leave the card
        // usable (just without its tags) rather than surfacing an error.
      });

    return () => {
      ignore = true;
    };
  }, [clipping.id]);

  function handleAddTag(event: React.FormEvent) {
    event.preventDefault();
    const tag = newTag.trim();
    if (tag.length === 0 || tags.includes(tag)) return;

    fetch(`/clippings/${clipping.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`request failed: ${response.status}`);
        hasMutatedRef.current = true;
        setTags((previous) => [...previous, tag].sort());
        setNewTag("");
      })
      .catch(() => {});
  }

  function handleRemoveTag(tag: string) {
    fetch(`/clippings/${clipping.id}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`request failed: ${response.status}`);
        hasMutatedRef.current = true;
        setTags((previous) => previous.filter((existing) => existing !== tag));
      })
      .catch(() => {});
  }

  return (
    <li className="clipping">
      <span className={`badge badge-${clipping.type}`}>{clipping.type}</span>
      <h2 className="title">{clipping.title}</h2>
      {clipping.author !== null && <p className="author">{clipping.author}</p>}
      {clipping.content !== null && (
        <p className="content">{clipping.content}</p>
      )}

      <div className="tags">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => handleRemoveTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <form className="add-tag" onSubmit={handleAddTag}>
          <input
            type="text"
            placeholder="add tag…"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            aria-label={`Add a tag to ${clipping.title}`}
          />
        </form>
      </div>
    </li>
  );
}

export default function App() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDirection>("desc");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/clippings/stats")
      .then((response) => response.json() as Promise<Stats>)
      .then(setStats)
      .catch(() => {
        // Stats are a supplementary summary, not core functionality —
        // leave them absent rather than showing an error for this.
      });
  }, []);

  useEffect(() => {
    // Only show the loading state (which unmounts the whole list) on the
    // very first load. A subsequent search/sort change keeps the previous
    // results mounted until the new ones are ready — swapping atomically
    // rather than tearing down every ClippingCard in between preserves
    // React's key-based reconciliation for clippings present in both the
    // old and new results, so in-progress local state (like a tag being
    // typed but not yet submitted) on an unrelated card isn't lost to a
    // search that happens to resolve at the same moment.
    setState((previous) =>
      previous.status === "loaded" ? previous : { status: "loading" },
    );
    fetchPage(buildUrl(query, sort, null))
      .then(({ clippings, nextCursor }) =>
        setState({
          status: "loaded",
          clippings,
          nextCursor,
          loadingMore: false,
        }),
      )
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "unknown error",
        }),
      );
  }, [query, sort]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setQuery(queryInput);
  }

  function handleLoadMore() {
    if (state.status !== "loaded" || state.nextCursor === null) return;
    const cursor = state.nextCursor;
    setState({ ...state, loadingMore: true });

    fetchPage(buildUrl(query, sort, cursor))
      .then(({ clippings: more, nextCursor }) =>
        setState((previous) =>
          previous.status === "loaded"
            ? {
                status: "loaded",
                clippings: [...previous.clippings, ...more],
                nextCursor,
                loadingMore: false,
              }
            : previous,
        ),
      )
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "unknown error",
        }),
      );
  }

  return (
    <main>
      <h1>Marginalia</h1>

      {stats !== null && (
        <p className="stats">
          {stats.total} clippings — {stats.byType.highlight} highlights,{" "}
          {stats.byType.note} notes, {stats.byType.bookmark} bookmarks ·{" "}
          {stats.distinctAuthorCount} authors
        </p>
      )}

      <form className="controls" onSubmit={handleSubmit}>
        <input
          type="search"
          placeholder="Search title, author, or content…"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          aria-label="Search clippings"
        />
        <button type="submit">Search</button>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortDirection)}
          aria-label="Sort order"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <a className="export-link" href={buildExportUrl(query, sort)}>
          Export as Markdown
        </a>
      </form>

      {state.status === "loading" && <p className="status">Loading…</p>}
      {state.status === "error" && (
        <p className="status status-error">
          Couldn't load clippings: {state.message}
        </p>
      )}
      {state.status === "loaded" && state.clippings.length === 0 && (
        <p className="status">
          {query.length > 0
            ? `No clippings match "${query}".`
            : "No clippings yet. Import a Kindle export to get started."}
        </p>
      )}
      {state.status === "loaded" && state.clippings.length > 0 && (
        <>
          <ul className="clippings">
            {state.clippings.map((clipping) => (
              <ClippingCard key={clipping.id} clipping={clipping} />
            ))}
          </ul>
          {state.nextCursor !== null && (
            <button
              type="button"
              className="load-more"
              onClick={handleLoadMore}
              disabled={state.loadingMore}
            >
              {state.loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </main>
  );
}
