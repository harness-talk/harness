import { CANON, bookByAlias, bookById, bookByOrdinal, type CanonBook } from "./canon";

/**
 * Reference grammar (EBNF, also published on /agents/protocol):
 *
 *   ref      = book , "." , chapter , [ "." , verse , [ "-" , verse ] ] ;
 *   book     = canon-id | alias ;                 (* "jn", "john", "1jn", "1 john", "psalm" *)
 *   chapter  = integer ;
 *   verse    = integer ;
 *   quartet  = "127." , ordinal , "." , chapter , "." , verse ;   (* 0 = whole *)
 *
 * Human forms are also accepted: "John 3:16", "John 3:16-18", "Jn 3.16", "1 John 5:7".
 */

export interface Ref {
  book: CanonBook;
  chapter: number;
  verse?: number;
  verseEnd?: number;
}

export type RefErrorCode =
  | "ref_unparseable"
  | "book_unknown"
  | "chapter_out_of_range"
  | "verse_out_of_range"
  | "quartet_invalid";

export class RefError extends Error {
  code: RefErrorCode;
  detail: Record<string, unknown>;
  constructor(code: RefErrorCode, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

let verseCounts: Record<string, number[]> | null = null;
/** Called by the store once books.json is loaded so range checks are exact. */
export function registerVerseCounts(counts: Record<string, number[]>) {
  verseCounts = counts;
}

export function verseCount(bookId: string, chapter: number): number | undefined {
  return verseCounts?.[bookId]?.[chapter - 1];
}

export function canonicalRef(r: Ref): string {
  let s = `${r.book.id}.${r.chapter}`;
  if (r.verse) s += `.${r.verse}`;
  if (r.verseEnd && r.verseEnd !== r.verse) s += `-${r.verseEnd}`;
  return s;
}

export function displayRef(r: Ref): string {
  let s = `${r.book.name} ${r.chapter}`;
  if (r.verse) s += `:${r.verse}`;
  if (r.verseEnd && r.verseEnd !== r.verse) s += `-${r.verseEnd}`;
  return s;
}

export function parseRef(input: string): Ref {
  const raw = input.trim();
  if (!raw) throw new RefError("ref_unparseable", "Empty reference");

  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(raw)) return quartetToRef(raw);

  // Normalise: "John 3:16-18" | "jn.3.16-18" | "1 John 5:7" | "Song of Solomon 2.1"
  const m = /^(\d?\s*[A-Za-z][A-Za-z .']*?)\s*[. ]\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/.exec(raw);
  if (!m) throw new RefError("ref_unparseable", `Could not parse reference '${raw}'`, { input: raw });

  const bookToken = m[1].replace(/\./g, "").replace(/\s+/g, " ").trim();
  const book = bookById(bookToken.toLowerCase()) ?? bookByAlias(bookToken);
  if (!book) throw new RefError("book_unknown", `Unknown book '${bookToken}'`, { book: bookToken });

  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) {
    throw new RefError("chapter_out_of_range", `${book.name} has ${book.chapters} chapters`, { book: book.id, chapter, max: book.chapters });
  }

  const ref: Ref = { book, chapter };
  if (m[3]) {
    const verse = Number(m[3]);
    const max = verseCount(book.id, chapter);
    if (verse < 1 || (max !== undefined && verse > max)) {
      throw new RefError("verse_out_of_range", `${book.name} ${chapter} has ${max} verses`, { book: book.id, chapter, verse, max });
    }
    ref.verse = verse;
    if (m[4]) {
      const end = Number(m[4]);
      if (end < verse || (max !== undefined && end > max)) {
        throw new RefError("verse_out_of_range", `Range end ${end} out of range for ${book.name} ${chapter}`, { book: book.id, chapter, verse: end, max });
      }
      ref.verseEnd = end;
    }
  }
  return ref;
}

/* ------------------------------------------------------------------ */
/* 127 fabric — loopback quartet addressing                            */
/* ------------------------------------------------------------------ */

export const QUARTET_PORT = 1611;

export interface Quartet {
  address: string; // "127.43.3.16"
  ordinal: number;
  chapter: number;
  verse: number;
  scope: "verse" | "chapter" | "book" | "index";
}

export function refToQuartet(r: Ref): Quartet {
  const ordinal = r.book.ordinal;
  const chapter = r.chapter;
  const verse = r.verse ?? 0;
  return {
    address: `127.${ordinal}.${chapter}.${verse}`,
    ordinal,
    chapter,
    verse,
    scope: verse ? "verse" : "chapter",
  };
}

export function parseQuartet(addr: string): Quartet {
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr.trim());
  if (!m) throw new RefError("quartet_invalid", `Not a harness quartet: '${addr}'`, { address: addr });
  const [ordinal, chapter, verse] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if ([ordinal, chapter, verse].some((n) => n > 255)) {
    throw new RefError("quartet_invalid", "Octets must be 0-255", { address: addr });
  }
  if (ordinal === 0 && chapter === 0 && verse === 1) {
    return { address: "127.0.0.1", ordinal: 0, chapter: 0, verse: 1, scope: "index" };
  }
  const book = bookByOrdinal(ordinal);
  if (!book) throw new RefError("book_unknown", `No book at ordinal ${ordinal} (valid 1-66)`, { ordinal });
  if (chapter === 0) return { address: addr, ordinal, chapter: 0, verse: 0, scope: "book" };
  if (chapter > book.chapters) {
    throw new RefError("chapter_out_of_range", `${book.name} has ${book.chapters} chapters`, { book: book.id, chapter, max: book.chapters });
  }
  if (verse === 0) return { address: addr, ordinal, chapter, verse: 0, scope: "chapter" };
  const max = verseCount(book.id, chapter);
  if (max !== undefined && verse > max) {
    throw new RefError("verse_out_of_range", `${book.name} ${chapter} has ${max} verses`, { book: book.id, chapter, verse, max });
  }
  return { address: addr, ordinal, chapter, verse, scope: "verse" };
}

export function quartetToRef(addr: string): Ref {
  const q = parseQuartet(addr);
  if (q.scope === "index" || q.scope === "book") {
    throw new RefError("quartet_invalid", "Address does not resolve to a chapter or verse", { address: addr, scope: q.scope });
  }
  const book = bookByOrdinal(q.ordinal)!;
  return { book, chapter: q.chapter, ...(q.verse ? { verse: q.verse } : {}) };
}

export { CANON };
