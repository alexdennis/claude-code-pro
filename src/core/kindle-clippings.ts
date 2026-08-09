export type ClippingType = "highlight" | "note" | "bookmark";

interface ClippingBase {
  type: ClippingType;
  title: string;
  author: string | null;
  page: number | null;
  locationStart: number;
  locationEnd: number | null;
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

export function parseKindleClippings(input: string): ParseResult[] {
  throw new Error("not implemented");
}

