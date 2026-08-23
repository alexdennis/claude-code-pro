export const BENCH_DB_PATH = "data/marginalia-bench.sqlite";
export const TOTAL_ROWS = 10_000;

// Content-only markers seeded at controlled selectivity so benchmark scenarios
// have a known, reproducible match rate instead of an incidental one.
export const RARE_MARKER = "zqxrarebenchmarkmarker";
export const COMMON_MARKER = "zqxcommonbenchmarkmarker";
// Never seeded anywhere — guarantees a zero-match scenario, which forces a
// full unindexed scan with no early exit (the true worst case for LIKE).
export const ZERO_MATCH_QUERY = "zqxneverseededbenchmarkmarker";

export const P95_TARGET_MS = 300;
