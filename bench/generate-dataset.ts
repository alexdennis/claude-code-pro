import { existsSync, unlinkSync } from "node:fs";
import {
  insertClippings,
  openClippingsStore,
} from "../src/storage/clippings-store.js";
import type { Clipping, ClippingType } from "../src/core/kindle-clippings.js";
import {
  BENCH_DB_PATH,
  COMMON_MARKER,
  RARE_MARKER,
  TOTAL_ROWS,
} from "./constants.js";

const HIGHLIGHT_COUNT = Math.round(TOTAL_ROWS * 0.8);
const NOTE_COUNT = Math.round(TOTAL_ROWS * 0.15);
const BOOKMARK_COUNT = TOTAL_ROWS - HIGHLIGHT_COUNT - NOTE_COUNT;

// Fractions of ALL rows, not just eligible (non-bookmark) ones — matches how
// the benchmark scenarios were scoped during design.
const RARE_COUNT = Math.round(TOTAL_ROWS * 0.001);
const COMMON_COUNT = Math.round(TOTAL_ROWS * 0.1);

const NULL_DATE_FRACTION = 0.05;
const SEED = 20260822; // fixed so the generated dataset is reproducible across runs

function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("empty item pool");
  return item;
}

function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = temp;
  }
  return copy;
}

const WORD_BANK = [
  "design",
  "system",
  "attention",
  "quiet",
  "morning",
  "clarity",
  "practice",
  "discipline",
  "curiosity",
  "structure",
  "habit",
  "focus",
  "patience",
  "growth",
  "insight",
  "courage",
  "simplicity",
  "balance",
  "reflection",
  "intention",
  "craft",
  "rhythm",
  "presence",
  "wonder",
  "resilience",
  "trust",
  "change",
  "meaning",
  "silence",
  "wisdom",
  "effort",
  "vision",
  "gratitude",
  "freedom",
  "honesty",
  "purpose",
  "energy",
  "stillness",
  "kindness",
  "restraint",
];

const TITLE_POOL = [
  "The Art of Focus",
  "Quiet Systems",
  "Notes on Discipline",
  "The Long Game",
  "Small Habits",
  "The Craft of Attention",
  "Deep Work Revisited",
  "The Practice",
  "On Clarity",
  "The Patient Builder",
  "Structures of Thought",
  "The Reflective Mind",
  "Working in Silence",
  "The Discipline of Craft",
  "Slow Growth",
  "The Honest Practice",
  "Attention as Currency",
  "The Unhurried Life",
  "Systems Over Goals",
  "The Quiet Discipline",
];

const AUTHOR_POOL = [
  "J. Alden",
  "M. Okafor",
  "R. Sato",
  "L. Bergström",
  "A. Kowalski",
  "T. Nakamura",
  "S. Achebe",
  "P. Novak",
  "E. Larsson",
  "K. Mensah",
  "D. Ivanov",
  "C. Duarte",
];

function sentence(rng: () => number): string {
  const wordCount = 6 + Math.floor(rng() * 10);
  const words = Array.from({ length: wordCount }, () => pick(rng, WORD_BANK));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

function paragraph(rng: () => number): string {
  const sentenceCount = 1 + Math.floor(rng() * 3);
  return Array.from({ length: sentenceCount }, () => sentence(rng)).join(" ");
}

interface BaseFields {
  title: string;
  author: string | null;
  page: number | null;
  locationStart: number;
  locationEnd: number | null;
  addedAt: Date | null;
  addedAtRaw: string;
}

function buildClipping(
  type: ClippingType,
  base: BaseFields,
  content: string | null,
): Clipping {
  switch (type) {
    case "bookmark":
      return { ...base, type: "bookmark", content: null };
    case "highlight":
      return { ...base, type: "highlight", content: content ?? "" };
    case "note":
      return { ...base, type: "note", content: content ?? "" };
  }
}

export function generateDataset(): Clipping[] {
  const rng = mulberry32(SEED);

  const types = shuffle(rng, [
    ...Array<ClippingType>(HIGHLIGHT_COUNT).fill("highlight"),
    ...Array<ClippingType>(NOTE_COUNT).fill("note"),
    ...Array<ClippingType>(BOOKMARK_COUNT).fill("bookmark"),
  ]);

  // Bookmarks always have null content, so they can never carry a marker —
  // only pick candidates from the highlight/note rows.
  const eligibleIndices = shuffle(
    rng,
    types
      .map((type, index) => ({ type, index }))
      .filter(({ type }) => type !== "bookmark")
      .map(({ index }) => index),
  );

  const rareIndices = new Set(eligibleIndices.slice(0, RARE_COUNT));
  const commonIndices = new Set(
    eligibleIndices.slice(RARE_COUNT, RARE_COUNT + COMMON_COUNT),
  );

  const now = Date.parse("2026-08-22T00:00:00.000Z");
  const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;

  const clippings: Clipping[] = [];
  for (let i = 0; i < TOTAL_ROWS; i++) {
    const type = types[i] as ClippingType;
    const hasNullDate = rng() < NULL_DATE_FRACTION;
    const addedAt = hasNullDate
      ? null
      : new Date(now - Math.floor(rng() * fiveYearsMs));

    const base: BaseFields = {
      title: pick(rng, TITLE_POOL),
      author: rng() < 0.9 ? pick(rng, AUTHOR_POOL) : null,
      page: rng() < 0.8 ? 1 + Math.floor(rng() * 400) : null,
      locationStart: 1 + Math.floor(rng() * 50_000),
      locationEnd: null,
      addedAt,
      addedAtRaw:
        addedAt === null ? "an unparseable date string" : addedAt.toISOString(),
    };

    if (type === "bookmark") {
      clippings.push(buildClipping(type, base, null));
      continue;
    }

    let content = paragraph(rng);
    if (rareIndices.has(i)) content = `${content} ${RARE_MARKER}`;
    if (commonIndices.has(i)) content = `${content} ${COMMON_MARKER}`;

    clippings.push(buildClipping(type, base, content));
  }

  return clippings;
}

function main(): void {
  if (existsSync(BENCH_DB_PATH)) unlinkSync(BENCH_DB_PATH);

  const db = openClippingsStore(BENCH_DB_PATH);
  const clippings = generateDataset();
  insertClippings(db, clippings);

  console.log(`Seeded ${clippings.length} clippings into ${BENCH_DB_PATH}`);
  console.log(`  rare marker  "${RARE_MARKER}": ${RARE_COUNT} rows (~0.1%)`);
  console.log(
    `  common marker "${COMMON_MARKER}": ${COMMON_COUNT} rows (~10%)`,
  );
}

main();
