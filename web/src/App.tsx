import { useEffect, useState } from "react";

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

function buildUrl(
  query: string,
  sort: SortDirection,
  cursor: string | null,
): string {
  const params = new URLSearchParams();
  if (query.length > 0) params.set("q", query);
  params.set("sort", sort);
  if (cursor !== null) params.set("cursor", cursor);
  return `/clippings?${params.toString()}`;
}

async function fetchPage(url: string): Promise<ClippingsPage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return response.json() as Promise<ClippingsPage>;
}

export default function App() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDirection>("desc");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
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
              <li key={clipping.id} className="clipping">
                <span className={`badge badge-${clipping.type}`}>
                  {clipping.type}
                </span>
                <h2 className="title">{clipping.title}</h2>
                {clipping.author !== null && (
                  <p className="author">{clipping.author}</p>
                )}
                {clipping.content !== null && (
                  <p className="content">{clipping.content}</p>
                )}
              </li>
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
