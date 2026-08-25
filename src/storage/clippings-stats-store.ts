import { DatabaseSync } from "node:sqlite";

export interface ClippingsStats {
  total: number;
  byType: {
    highlight: number;
    note: number;
    bookmark: number;
  };
  distinctAuthorCount: number;
}

export interface ClippingsStatsRepository {
  stats(): ClippingsStats;
}

interface StatsRow {
  total: number;
  highlightCount: number;
  noteCount: number;
  bookmarkCount: number;
  distinctAuthorCount: number;
}

const STATS_SQL = `
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE type = 'highlight') AS highlightCount,
    COUNT(*) FILTER (WHERE type = 'note') AS noteCount,
    COUNT(*) FILTER (WHERE type = 'bookmark') AS bookmarkCount,
    COUNT(DISTINCT author) AS distinctAuthorCount
  FROM clippings
`;

export function getClippingsStats(db: DatabaseSync): ClippingsStats {
  const row = db.prepare(STATS_SQL).get() as unknown as StatsRow;

  return {
    total: row.total,
    byType: {
      highlight: row.highlightCount,
      note: row.noteCount,
      bookmark: row.bookmarkCount,
    },
    distinctAuthorCount: row.distinctAuthorCount,
  };
}

export function createSqliteClippingsStatsRepository(
  db: DatabaseSync,
): ClippingsStatsRepository {
  return {
    stats: () => getClippingsStats(db),
  };
}
