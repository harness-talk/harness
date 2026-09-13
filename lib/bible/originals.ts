import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { bookById, type CanonBook } from "./canon";
import type { Ref } from "./refs";

/**
 * Original-language layer: OSHB Hebrew (WLC) for the OT, SBLGNT/MorphGNT Greek for the NT.
 * Built by scripts/build-originals.mjs into data/originals/{bookId}.json.
 * These follow their OWN versification; we serve by chapter:verse number without remapping.
 */

export type HebrewWord = { p: number; w: string; s: string | null; m: string | null };
export type GreekWord = { p: number; w: string; l: string | null; m: string | null; pos: string | null };
export type OriginalWord = HebrewWord | GreekWord;

export interface OriginalVerse {
  v: number;
  text: string;
  lang?: "aramaic";
  words: OriginalWord[];
}
interface OriginalBook {
  id: string;
  name: string;
  ordinal: number;
  language: "hebrew" | "greek";
  source: "wlc-oshb" | "sblgnt-morphgnt";
  chapters: { n: number; verses: OriginalVerse[] }[];
}

export const ORIGINAL_SOURCE_IDS = ["wlc-oshb", "sblgnt-morphgnt"] as const;
export type OriginalSourceId = (typeof ORIGINAL_SOURCE_IDS)[number];

const DIR = join(process.cwd(), "data", "originals");
const cache = new Map<string, OriginalBook | null>();

export function originalsAvailable(): boolean {
  return existsSync(join(DIR, "index.json"));
}

function load(bookId: string): OriginalBook | null {
  if (cache.has(bookId)) return cache.get(bookId)!;
  const p = join(DIR, `${bookId}.json`);
  const b = existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as OriginalBook) : null;
  cache.set(bookId, b);
  return b;
}

/** Which original-language source covers this book (by testament). */
export function originalSourceFor(book: CanonBook): OriginalSourceId {
  return book.testament === "OT" ? "wlc-oshb" : "sblgnt-morphgnt";
}

export interface OriginalVersePayload {
  ref: string;
  display: string;
  book: { id: string; name: string; ordinal: number; testament: "OT" | "NT" };
  chapter: number;
  verse: number;
  source: OriginalSourceId;
  language: "hebrew" | "aramaic" | "greek";
  text: string;
  sha256: string;
  words: OriginalWord[];
  /** true when the KJV has this chapter:verse but the original-language text does not (versification differs). */
  missing?: false;
}

export function originalVerse(bookId: string, chapter: number, verse: number): OriginalVersePayload | null {
  const canon = bookById(bookId);
  if (!canon) return null;
  const b = load(bookId);
  if (!b) return null;
  const ch = b.chapters.find((c) => c.n === chapter);
  const v = ch?.verses.find((x) => x.v === verse);
  if (!v) return null;
  const ref = `${bookId}.${chapter}.${verse}`;
  return {
    ref,
    display: `${canon.name} ${chapter}:${verse}`,
    book: { id: canon.id, name: canon.name, ordinal: canon.ordinal, testament: canon.testament },
    chapter,
    verse,
    source: b.source,
    language: v.lang ?? b.language,
    text: v.text,
    sha256: createHash("sha256").update(`${ref}\n${v.text}`).digest("hex"),
    words: v.words,
  };
}

/** All original-language verses for a parsed ref (verse, range, or chapter). Missing verses are skipped. */
export function originalVersesFor(r: Ref): { source: OriginalSourceId; verses: OriginalVersePayload[]; missing: string[] } {
  const bookId = r.book.id;
  const src = originalSourceFor(r.book);
  const b = load(bookId);
  const out: OriginalVersePayload[] = [];
  const missing: string[] = [];
  if (!b) return { source: src, verses: out, missing };
  const ch = b.chapters.find((c) => c.n === r.chapter);
  if (r.verse == null) {
    for (const v of ch?.verses ?? []) out.push(originalVerse(bookId, r.chapter, v.v)!);
    return { source: src, verses: out, missing };
  }
  const end = r.verseEnd ?? r.verse;
  for (let v = r.verse; v <= end; v++) {
    const o = originalVerse(bookId, r.chapter, v);
    if (o) out.push(o);
    else missing.push(`${bookId}.${r.chapter}.${v}`);
  }
  return { source: src, verses: out, missing };
}

/** Chapter verse count in the original-language versification (for the reader's alignment note). */
export function originalChapterCount(bookId: string, chapter: number): number | null {
  const b = load(bookId);
  const ch = b?.chapters.find((c) => c.n === chapter);
  return ch ? ch.verses.length : null;
}
