import { existsSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/api/server.js";
import { openClippingsStore } from "../src/storage/clippings-store.js";
import {
  BENCH_DB_PATH,
  COMMON_MARKER,
  P95_TARGET_MS,
  RARE_MARKER,
  ZERO_MATCH_QUERY,
} from "./constants.js";

const WARMUP = 10;
const ITERATIONS = 100;
const PAGE_LIMIT = 50;

interface ScenarioResult {
  name: string;
  samples: number[];
}

function percentile(sortedMs: readonly number[], p: number): number {
  const index = Math.max(
    0,
    Math.min(sortedMs.length - 1, Math.ceil(p * sortedMs.length) - 1),
  );
  return sortedMs[index] as number;
}

async function timedInject(
  app: FastifyInstance,
  url: string,
): Promise<{ elapsedMs: number; nextCursor: string | null }> {
  const start = performance.now();
  const response = await app.inject({ method: "GET", url });
  const elapsedMs = performance.now() - start;
  if (response.statusCode !== 200) {
    throw new Error(`unexpected status ${response.statusCode} for ${url}`);
  }
  return {
    elapsedMs,
    nextCursor: (response.json() as { nextCursor: string | null }).nextCursor,
  };
}

// A single, unpaginated query repeated many times — appropriate for
// scenarios where the whole result set fits on one page (rare and
// zero-match), so there's no "depth" to exercise.
async function runFixedQueryScenario(
  app: FastifyInstance,
  name: string,
  query: string,
): Promise<ScenarioResult> {
  const url = `/clippings?q=${encodeURIComponent(query)}&limit=${PAGE_LIMIT}`;

  for (let i = 0; i < WARMUP; i++) await timedInject(app, url);

  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    samples.push((await timedInject(app, url)).elapsedMs);
  }
  return { name, samples };
}

// Walks the cursor forward page by page, looping back to page one whenever
// it runs out — this is what actually exercises pagination depth (not just
// page one) across the full set of timed samples, per the design decision to
// empirically verify cursor pagination doesn't degrade like OFFSET would.
async function runPaginatedScenario(
  app: FastifyInstance,
  name: string,
): Promise<ScenarioResult> {
  let cursor: string | null = null;

  async function nextPage(): Promise<number> {
    const base = `/clippings?q=${encodeURIComponent(COMMON_MARKER)}&limit=${PAGE_LIMIT}`;
    const url =
      cursor === null ? base : `${base}&cursor=${encodeURIComponent(cursor)}`;
    const { elapsedMs, nextCursor } = await timedInject(app, url);
    cursor = nextCursor;
    return elapsedMs;
  }

  for (let i = 0; i < WARMUP; i++) await nextPage();

  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    samples.push(await nextPage());
  }
  return { name, samples };
}

const COLUMN_WIDTHS = [38, 9, 10, 10, 10, 8] as const;

function row(cells: readonly string[]): string {
  return cells
    .map((cell, i) => cell.padEnd(COLUMN_WIDTHS[i] as number))
    .join("");
}

function report(results: readonly ScenarioResult[]): boolean {
  console.log(row(["Scenario", "Samples", "p50", "p95", "p99", "Result"]));

  let allPassed = true;
  for (const result of results) {
    const sorted = [...result.samples].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);
    const p99 = percentile(sorted, 0.99);
    const passed = p95 < P95_TARGET_MS;
    allPassed = allPassed && passed;

    console.log(
      row([
        result.name,
        String(sorted.length),
        `${p50.toFixed(2)}ms`,
        `${p95.toFixed(2)}ms`,
        `${p99.toFixed(2)}ms`,
        passed ? "PASS" : "FAIL",
      ]),
    );
  }
  return allPassed;
}

async function main(): Promise<void> {
  if (!existsSync(BENCH_DB_PATH)) {
    console.error(
      `No benchmark dataset found at ${BENCH_DB_PATH}. Run \`npm run bench:seed\` first.`,
    );
    process.exitCode = 1;
    return;
  }

  const db = openClippingsStore(BENCH_DB_PATH);
  const app = buildServer(db);

  console.log(
    `Running search benchmark: ${ITERATIONS} timed iterations per scenario (+${WARMUP} warmup), ` +
      `p95 target < ${P95_TARGET_MS}ms\n`,
  );

  const results = [
    await runFixedQueryScenario(
      app,
      "rare (~0.1% match, single page)",
      RARE_MARKER,
    ),
    await runPaginatedScenario(app, "common (~10% match, paginated walk)"),
    await runFixedQueryScenario(
      app,
      "zero (no match, full scan)",
      ZERO_MATCH_QUERY,
    ),
  ];

  const allPassed = report(results);

  console.log();
  if (allPassed) {
    console.log(
      `PASSED: all scenarios met the p95 < ${P95_TARGET_MS}ms target.`,
    );
  } else {
    console.log(
      `FAILED: at least one scenario's p95 met or exceeded the ${P95_TARGET_MS}ms target.`,
    );
    process.exitCode = 1;
  }
}

await main();
