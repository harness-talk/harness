import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRef, canonicalRef, displayRef, type Ref } from "./refs";
import { versesFor } from "./store";

const DIR = join(process.cwd(), "data", "crossrefs");

export const CROSSREF_ATTRIBUTION =
  "Cross references from OpenBible.info (CC-BY), seeded from the Treasury of Scripture Knowledge and ranked by reader votes.";

type BookRefs = Record<string, [string, number][]>;
const cache = new Map<string, BookRefs>();

function bookRefs(bookId: string): BookRefs {
  let refs = cache.get(bookId);
  if (!refs) {
    try {
      refs = (JSON.parse(readFileSync(join(DIR, `${bookId}.json`), "utf8")) as { verses: BookRefs }).verses;
    } catch {
      refs = {};
    }
    cache.set(bookId, refs);
  }
  return refs;
}

export interface CrossRef {
  ref: string;
  display: string;
  votes: number;
  text: string;
}

function preview(target: string): { display: string; text: string } | null {
  try {
    const r = parseRef(target);
    const verses = versesFor(r).slice(0, 3);
    if (!verses.length) return null;
    return { display: displayRef(r), text: verses.map((v) => v.text).join(" ") };
  } catch {
    return null;
  }
}

/** How many references a verse carries in the full set. */
export function crossRefTotal(r: Ref): number {
  return r.verse ? (bookRefs(r.book.id)[`${r.chapter}:${r.verse}`]?.length ?? 0) : 0;
}

/** References for one verse, strongest first, each with its KJV 1611 text. */
export function crossRefsForVerse(r: Ref, limit = 15): CrossRef[] {
  if (!r.verse) return [];
  const raw = bookRefs(r.book.id)[`${r.chapter}:${r.verse}`] ?? [];
  const out: CrossRef[] = [];
  for (const [ref, votes] of raw.slice(0, limit)) {
    const p = preview(ref);
    if (p) out.push({ ref, votes, ...p });
  }
  return out;
}

/** Number of references per verse in a chapter, for the chapter overview. */
export function crossRefCountsForChapter(r: Ref): Record<number, number> {
  const refs = bookRefs(r.book.id);
  const counts: Record<number, number> = {};
  const prefix = `${r.chapter}:`;
  for (const key of Object.keys(refs)) {
    if (key.startsWith(prefix)) counts[Number(key.slice(prefix.length))] = refs[key].length;
  }
  return counts;
}

/** Reader votes for a specific pairing, or null when OpenBible doesn't list it. */
export function pairingVotes(from: string, to: string): number | null {
  try {
    const r = parseRef(from);
    const target = canonicalRef(parseRef(to));
    const hit = (bookRefs(r.book.id)[`${r.chapter}:${r.verse}`] ?? []).find(
      ([ref]) => ref === target || ref.startsWith(`${target}-`) || target.startsWith(`${ref.split("-")[0]}`),
    );
    return hit ? hit[1] : null;
  } catch {
    return null;
  }
}

export function verseText(ref: string): { display: string; text: string } | null {
  return preview(ref);
}
