export type ClippingType = "highlight" | "note" | "bookmark";

interface ClippingBase {
  type: ClippingType;
  title: string;
  author: string | null;
  page: number | null;
  location: { start: number; end: number | null };
  addedAt: Date | null;
  addedAtRaw: string;
  content: string | null;
}

export interface Highlight extends ClippingBase {
  type: "highlight";
  content: string;
}

export interface Note extends ClippingBase {
  type: "note";
  content: string;
}

export interface Bookmark extends ClippingBase {
  type: "bookmark";
  content: null;
}

export type Clipping = Highlight | Note | Bookmark;

export interface ParseSuccess {
  ok: true;
  clipping: Clipping;
}

export interface ParseFailure {
  ok: false;
  error: string;
  raw: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

const SEPARATOR_LINE = /^=+$/m;

const TITLE_LINE = /^(.*) \(([^()]*)\)$/;

const METADATA_LINE =
  /^- Your (Highlight|Note|Bookmark) (?:on page (\d+) \| location (\d+)(?:-(\d+))?|at location (\d+)(?:-(\d+))?) \| Added on (.+)$/i;

const TYPE_BY_LABEL: Record<string, ClippingType> = {
  highlight: "highlight",
  note: "note",
  bookmark: "bookmark",
};

function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

function parseTitleLine(line: string): {
  title: string;
  author: string | null;
} {
  const match = TITLE_LINE.exec(line);
  if (match === null) return { title: line, author: null };
  return { title: match[1] as string, author: match[2] as string };
}

function parseEntry(raw: string): ParseResult {
  const lines = raw.split("\n");
  const titleLine = lines[0];
  const metadataLine = lines[1];

  if (titleLine === undefined || metadataLine === undefined) {
    return { ok: false, error: "entry has fewer than two lines", raw };
  }

  const match = METADATA_LINE.exec(metadataLine);
  if (match === null) {
    return {
      ok: false,
      error: "metadata line did not match a known clipping format",
      raw,
    };
  }

  const [
    ,
    label,
    pageStr,
    rangeLocationStart,
    rangeLocationEnd,
    soloLocationStart,
    soloLocationEnd,
    addedAtRaw,
  ] = match;
  const type = TYPE_BY_LABEL[(label as string).toLowerCase()];
  if (type === undefined) {
    return { ok: false, error: `unrecognized clipping label: ${label}`, raw };
  }

  const page = pageStr === undefined ? null : Number(pageStr);
  const locationStart = Number(rangeLocationStart ?? soloLocationStart);
  const locationEndStr = rangeLocationEnd ?? soloLocationEnd;
  const locationEnd =
    locationEndStr === undefined ? null : Number(locationEndStr);

  const parsedDate = new Date(addedAtRaw as string);
  const addedAt = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;

  const { title, author } = parseTitleLine(titleLine);
  const contentText = lines.slice(2).join("\n").trim();

  const base = {
    title,
    author,
    page,
    location: { start: locationStart, end: locationEnd },
    addedAt,
    addedAtRaw: addedAtRaw as string,
  };

  switch (type) {
    case "bookmark":
      return {
        ok: true,
        clipping: { ...base, type: "bookmark", content: null },
      };
    case "highlight":
      return {
        ok: true,
        clipping: { ...base, type: "highlight", content: contentText },
      };
    case "note":
      return {
        ok: true,
        clipping: { ...base, type: "note", content: contentText },
      };
  }
}

export function parseKindleClippings(input: string): ParseResult[] {
  const normalized = stripBom(input)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return normalized
    .split(SEPARATOR_LINE)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(parseEntry);
}
