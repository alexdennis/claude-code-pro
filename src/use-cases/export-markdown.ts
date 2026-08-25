import type {
  ClippingsRepository,
  SearchOptions,
  StoredClipping,
} from "./types.js";

function formatClipping(clipping: StoredClipping): string {
  const author = clipping.author ?? "Unknown author";
  const content = clipping.content ?? "";

  return `## ${clipping.title}\n*${author}*\n\n> ${content}\n\n---\n`;
}

/**
 * Fetch clippings via the repository and render them as a markdown document.
 */
export function exportClippingsAsMarkdown(
  repo: ClippingsRepository,
  options?: SearchOptions,
): string {
  const { clippings } = repo.search(options);

  return clippings.map(formatClipping).join("\n");
}
