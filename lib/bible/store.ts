import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANON, bookById, type CanonBook } from "./canon";
import { KJV_SOURCE_ID, TEXT_SOURCES, type TextSourceId } from "./sources";
import { canonicalRef, refToQuartet, registerVerseCounts, type Ref } from "./refs";

const DATA = join(process.cwd(), "data");

export interface BookMeta {
  id: string;
  n: number;
  name: string;
  testament: "OT" | "NT";
  chapters: number;
  verses: number;
  verseCounts: number[];
  sha256: string;
}

export interface Verse {
  v: number;
  text: string;
}
export interface Chapter {
  n: number;
  title?: string;
  verses: Verse[];
  headings?: { before: number; text: string }[];
}
export interface BookData {
  id: string;
  name: string;
  source: string;
  chapters: Chapter[];
}
export interface CorpusInfo {
  source: string;
  books: number;
  chapters: number;
  verses: number;
  merkleRoot: string;
  leaf: string;
  builtAt: string;
}

/** Public verse object — the one shape every API and page uses. */
export interface VerseRecord {
  ref: string; // "jn.3.16"
  display: string; // "John 3:16"
  book: { id: string; name: string; ordinal: number; testament: "OT" | "NT" };
  chapter: number;
  verse: number;
  text: string;
  source: string;
  sha256: string; // sha256(`${ref}\n${text}`) — same leaf as the corpus Merkle tree
  quartet: string; // "127.43.3.16"
}

let booksCache: BookMeta[] | null = null;
const bookDataCache = new Map<string, BookData>(); // key `${source}/${bookId}`
let corpusCache: CorpusInfo | null = null;
const dirFor = (source: TextSourceId) => TEXT_SOURCES.find((s) => s.id === source)!.dir;

export function books(): BookMeta[] {
  if (!booksCache) {
    booksCache = JSON.parse(readFileSync(join(DATA, "books.json"), "utf8")) as BookMeta[];
    registerVerseCounts(Object.fromEntries(booksCache.map((b) => [b.id, b.verseCounts])));
  }
  return booksCache;
}

export function corpus(): CorpusInfo {
  if (!corpusCache) corpusCache = JSON.parse(readFileSync(join(DATA, "corpus.json"), "utf8")) as CorpusInfo;
  return corpusCache;
}

export function bookMeta(id: string): BookMeta | undefined {
  return books().find((b) => b.id === id);
}

export function bookData(id: string, source: TextSourceId = KJV_SOURCE_ID): BookData {
  books(); // ensure verse counts registered
  const key = `${source}/${id}`;
  let d = bookDataCache.get(key);
  if (!d) {
    d = JSON.parse(readFileSync(join(DATA, dirFor(source), `${id}.json`), "utf8")) as BookData;
    bookDataCache.set(key, d);
  }
  return d;
}

export function chapter(bookId: string, n: number, source: TextSourceId = KJV_SOURCE_ID): Chapter | undefined {
  return bookData(bookId, source).chapters[n - 1];
}

export function verseHash(ref: string, text: string): string {
  return createHash("sha256").update(`${ref}\n${text}`).digest("hex");
}

export function toRecord(book: CanonBook, chapterN: number, v: Verse, source: TextSourceId = KJV_SOURCE_ID): VerseRecord {
  const ref = `${book.id}.${chapterN}.${v.v}`;
  return {
    ref,
    display: `${book.name} ${chapterN}:${v.v}`,
    book: { id: book.id, name: book.name, ordinal: book.ordinal, testament: book.testament },
    chapter: chapterN,
    verse: v.v,
    text: v.text,
    source,
    sha256: verseHash(ref, v.text),
    quartet: `127.${book.ordinal}.${chapterN}.${v.v}`,
  };
}

/**
 * Resolve a parsed Ref to verse records (1 verse, a range, or a whole chapter).
 * For a non-KJV source, `missing` lists KJV refs in the range that the source has no
 * verse for (versification differs) — never remapped, never filled in.
 */
export function versesFor(ref: Ref, source: TextSourceId = KJV_SOURCE_ID): VerseRecord[] {
  return versesWithMissing(ref, source).verses;
}

export function versesWithMissing(ref: Ref, source: TextSourceId = KJV_SOURCE_ID): { verses: VerseRecord[]; missing: string[] } {
  const ch = chapter(ref.book.id, ref.chapter, source);
  if (!ch) return { verses: [], missing: [] };
  const kjvCount = chapter(ref.book.id, ref.chapter)?.verses.length ?? ch.verses.length;
  const start = ref.verse ?? 1;
  const end = ref.verseEnd ?? ref.verse ?? kjvCount;
  const verses = ch.verses.filter((v) => v.v >= start && v.v <= end).map((v) => toRecord(ref.book, ref.chapter, v, source));
  const have = new Set(verses.map((v) => v.verse));
  const missing: string[] = [];
  for (let v = start; v <= end; v++) if (!have.has(v)) missing.push(`${ref.book.id}.${ref.chapter}.${v}`);
  return { verses, missing };
}

/** The Geneva (or any second text) line for each KJV verse of a chapter, keyed by verse number. */
export function parallelChapter(bookId: string, n: number, source: TextSourceId): Map<number, string> {
  const ch = chapter(bookId, n, source);
  return new Map(ch?.verses.map((v) => [v.v, v.text]) ?? []);
}

export function chapterPayload(ref: Ref) {
  const ch = chapter(ref.book.id, ref.chapter)!;
  const meta = bookMeta(ref.book.id)!;
  return {
    ref: canonicalRef({ book: ref.book, chapter: ref.chapter }),
    display: `${ref.book.name} ${ref.chapter}`,
    book: { id: ref.book.id, name: ref.book.name, ordinal: ref.book.ordinal, testament: ref.book.testament, chapters: meta.chapters },
    chapter: ref.chapter,
    title: ch.title,
    headings: ch.headings,
    source: KJV_SOURCE_ID,
    quartet: refToQuartet({ book: ref.book, chapter: ref.chapter }).address,
    prev: ref.chapter > 1 ? `${ref.book.id}.${ref.chapter - 1}` : prevBookLast(ref.book),
    next: ref.chapter < meta.chapters ? `${ref.book.id}.${ref.chapter + 1}` : nextBookFirst(ref.book),
    verses: ch.verses.map((v) => toRecord(ref.book, ref.chapter, v)),
  };
}

function prevBookLast(b: CanonBook): string | null {
  const p = CANON[b.ordinal - 2];
  return p ? `${p.id}.${p.chapters}` : null;
}
function nextBookFirst(b: CanonBook): string | null {
  const n = CANON[b.ordinal];
  return n ? `${n.id}.1` : null;
}

/** Iterate every verse in canonical order (used by search index + exports). */
export function* allVerses(): Generator<VerseRecord> {
  for (const b of CANON) {
    const d = bookData(b.id);
    for (const c of d.chapters) for (const v of c.verses) yield toRecord(b, c.n, v);
  }
}

export { CANON, bookById };
