import type { Clipping } from "../core/kindle-clippings.js";

export type StoredClipping = Clipping & { id: number };

export interface SearchOptions {
  query?: string;
  sortDirection?: "asc" | "desc";
  limit?: number;
  cursor?: string | null;
}

export interface SearchResult {
  clippings: StoredClipping[];
  nextCursor: string | null;
}

export interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: string[];
}

/**
 * Storage-agnostic contract for clipping persistence.
 *
 * Route handlers and use cases depend on this interface, not on a concrete
 * database implementation — keeping the dependency arrow pointing inward
 * (Clean Architecture / DIP).
 */
export interface ClippingsRepository {
  insert(clippings: readonly Clipping[]): void;
  search(options?: SearchOptions): SearchResult;
}
