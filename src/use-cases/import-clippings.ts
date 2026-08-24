import { parseKindleClippings } from "../core/kindle-clippings.js";
import type { ClippingsRepository, ImportResult } from "./types.js";

/**
 * Parse raw Kindle clippings text and persist the valid entries.
 *
 * This is the sole orchestration point for the import flow: it calls the
 * parser, splits results into successes/failures, delegates persistence to
 * the repository, and returns a summary the caller can relay to the client.
 */
export function importClippings(
  repo: ClippingsRepository,
  text: string,
): ImportResult {
  const results = parseKindleClippings(text);
  const successes = results.filter((r) => r.ok);
  const failures = results.filter((r) => !r.ok);

  repo.insert(successes.map((r) => r.clipping));

  return {
    total: results.length,
    imported: successes.length,
    failed: failures.length,
    errors: failures.map((r) => r.error),
  };
}
