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

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; clippings: Clipping[] };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    fetch("/clippings")
      .then((response) => {
        if (!response.ok) throw new Error(`request failed: ${response.status}`);
        return response.json() as Promise<{
          clippings: Clipping[];
          nextCursor: string | null;
        }>;
      })
      .then(({ clippings }) => setState({ status: "loaded", clippings }))
      .catch((error: unknown) =>
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "unknown error",
        }),
      );
  }, []);

  return (
    <main>
      <h1>Marginalia</h1>
      {state.status === "loading" && <p className="status">Loading…</p>}
      {state.status === "error" && (
        <p className="status status-error">
          Couldn't load clippings: {state.message}
        </p>
      )}
      {state.status === "loaded" && state.clippings.length === 0 && (
        <p className="status">
          No clippings yet. Import a Kindle export to get started.
        </p>
      )}
      {state.status === "loaded" && state.clippings.length > 0 && (
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
      )}
    </main>
  );
}
