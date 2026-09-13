import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bookById } from "./canon";
import { allVerses, versesFor, type VerseRecord } from "./store";
import { parseRef, RefError } from "./refs";
import { canon, canonTokens, tokenize, STOP } from "./text-norm";

interface Index {
  refs: string[];
  terms: Record<string, number[]>;
}

let index: Index | null = null;
function idx(): Index {
  if (!index) index = JSON.parse(readFileSync(join(process.cwd(), "data/search-index.json"), "utf8")) as Index;
  return index;
}

export interface SearchHit extends VerseRecord {
  score: number;
  /** Which of the query's content words this verse contains, as the user typed them. */
  matched: string[];
}
export interface SearchResult {
  query: string;
  /**
   * reference: a citation resolved · phrase: exact quoted text · terms: every word present ·
   * idea: ranked by most words present · common: every word is too frequent to rank, so the
   * text was scanned directly and verses are listed in canonical order
   */
  mode: "reference" | "phrase" | "terms" | "idea" | "common";
  total: number;
  hits: SearchHit[];
  /** Content words the query was reduced to, as typed (stop words removed). */
  words: string[];
  /** Words that occur nowhere in the corpus, in either spelling. */
  unmatched: string[];
}

export function search(query: string, opts: { limit?: number; offset?: number; book?: string } = {}): SearchResult {
  const q = query.trim();
  const limit = Math.min(opts.limit ?? 20, 100);
  const offset = opts.offset ?? 0;

  // 1. Reference lookup ("John 3:16", "jn.3.16-18", "127.43.3.16")
  try {
    const ref = parseRef(q);
    const hits = versesFor(ref).map((v) => ({ ...v, score: 1, matched: [] }));
    return { query: q, mode: "reference", total: hits.length, hits: hits.slice(offset, offset + limit), words: [], unmatched: [] };
  } catch (e) {
    if (!(e instanceof RefError)) throw e;
  }

  const ix = idx();
  const phrase = /^["\u201c].+["\u201d]$/.test(q) ? q.slice(1, -1) : null;
  // Each distinct canonical stem once, remembering the word as typed for the response
  const byStem = new Map<string, string>();
  for (const { stem, surface } of canonTokens(phrase ?? q)) if (!byStem.has(stem)) byStem.set(stem, surface);
  const stems = [...byStem.keys()];
  const words = [...byStem.values()];
  if (!stems.length) return scanCommon(q, phrase, limit, offset);

  const postings = stems.map((s) => ix.terms[s] ?? []);
  const unmatched = stems.filter((_, i) => postings[i].length === 0).map((s) => byStem.get(s)!);
  const present = stems.filter((_, i) => postings[i].length > 0);
  const N = ix.refs.length;

  // 2. Score every verse containing any term (idf-weighted) and record which terms it carries
  const scores = new Map<number, number>();
  const has = new Map<number, string[]>();
  postings.forEach((list, i) => {
    const w = Math.log(1 + N / (list.length + 1));
    for (const id of list) {
      scores.set(id, (scores.get(id) ?? 0) + w);
      let arr = has.get(id);
      if (!arr) has.set(id, (arr = []));
      arr.push(byStem.get(stems[i])!);
    }
  });

  // 3. Every word the user typed present → "terms". If some words exist nowhere in the text, or no
  //    verse carries all the present ones, rank by how many a verse carries → "idea". "terms" must
  //    never be claimed when the user's own words were dropped.
  let candidates = [...scores.entries()].map(([id, score]) => ({ id, score }));
  const strict = candidates.filter((c) => has.get(c.id)!.length === present.length);
  let mode: SearchResult["mode"] = phrase ? "phrase" : "terms";
  if (strict.length > 0) candidates = strict;
  if (!phrase && (strict.length === 0 || unmatched.length > 0) && words.length > 1) mode = "idea";

  if (opts.book) candidates = candidates.filter((c) => ix.refs[c.id].startsWith(opts.book + "."));

  const materialise = (id: number): VerseRecord | null => {
    const [b, c, v] = ix.refs[id].split(".");
    const book = bookById(b);
    if (!book) return null;
    return versesFor({ book, chapter: Number(c), verse: Number(v) })[0] ?? null;
  };

  // 4. Rank: proximity of the query words in the verse first (an idea is words that keep company),
  //    then how many of them are present, then idf weight, then canonical order.
  const tightness = new Map<number, number>();
  const ranked = candidates.map((c) => {
    const rec = materialise(c.id);
    if (!rec) return null;
    const span = minSpan(rec.text, stems);
    tightness.set(c.id, span);
    return { ...c, rec };
  }).filter((c): c is { id: number; score: number; rec: VerseRecord } => c !== null);
  ranked.sort(
    (a, b) =>
      has.get(b.id)!.length - has.get(a.id)!.length ||
      tightness.get(a.id)! - tightness.get(b.id)! ||
      b.score - a.score ||
      a.id - b.id,
  );

  let hits: SearchHit[];
  if (phrase) {
    const needle = canonPhrase(phrase);
    hits = ranked.filter((c) => canonPhrase(c.rec.text).includes(needle)).map((c) => ({ ...c.rec, score: c.score, matched: has.get(c.id)! }));
  } else {
    hits = ranked.map((c) => ({ ...c.rec, score: c.score, matched: has.get(c.id)! }));
  }

  return { query: q, mode, total: hits.length, hits: hits.slice(offset, offset + limit), words, unmatched };
}

/**
 * Every word the user typed is a common word the index skips ("his", "the", "unto"). Rather than
 * claim no verse carries them, read the text itself: 31,102 verses is a cheap scan. Verses are
 * returned in canonical order because frequency, not closeness, is the only honest ranking here.
 * Spelling is bridged both ways (his/hys, unto/vnto) through the same normaliser as the index.
 */
function scanCommon(q: string, phrase: string | null, limit: number, offset: number): SearchResult {
  const typed = [...new Set(tokenize(phrase ?? q))];
  // canon() on every token, common or not: "unto" and "vnto" must meet ("vnto" → "unto").
  const wanted = new Set(typed.map(canon));
  if (!wanted.size) return { query: q, mode: "common", total: 0, hits: [], words: [], unmatched: [] };
  const needle = " " + typed.map(canon).join(" ") + " ";
  const hits: SearchHit[] = [];
  for (const v of allVerses()) {
    const toks = tokenize(v.text).map(canon);
    if (phrase) {
      const hay = " " + toks.join(" ") + " ";
      if (!hay.includes(needle)) continue;
    } else {
      const have = new Set(toks);
      let all = true;
      for (const w of wanted) if (!have.has(w)) { all = false; break; }
      if (!all) continue;
    }
    hits.push({ ...v, score: 1, matched: typed });
  }
  return { query: q, mode: phrase ? "phrase" : "common", total: hits.length, hits: hits.slice(offset, offset + limit), words: typed, unmatched: [] };
}

/** Smallest window (in content tokens) containing every query stem present in the verse. */
function minSpan(text: string, stems: string[]): number {
  const want = new Set(stems);
  const seq = canonTokens(text).filter((t) => want.has(t.stem));
  const distinct = new Set(seq.map((t) => t.stem)).size;
  if (distinct <= 1) return 1;
  let best = Infinity;
  const counts = new Map<string, number>();
  let lo = 0;
  for (let hi = 0; hi < seq.length; hi++) {
    counts.set(seq[hi].stem, (counts.get(seq[hi].stem) ?? 0) + 1);
    while (counts.size === distinct) {
      best = Math.min(best, seq[hi].pos - seq[lo].pos + 1);
      const s = seq[lo].stem;
      counts.set(s, counts.get(s)! - 1);
      if (counts.get(s) === 0) counts.delete(s);
      lo++;
    }
  }
  return best;
}

/** Phrase comparison in canonical spelling so "the lord is my shepherd" matches "the LORD is my shepheard". */
function canonPhrase(text: string): string {
  return " " + tokenize(text).map((t) => (STOP.has(t) ? t : canon(t))).join(" ") + " ";
}
