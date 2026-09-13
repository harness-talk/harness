import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canon, tokenize, STOP } from "@/lib/bible/text-norm";

const keys = (text: string): string[] =>
  tokenize(text)
    .filter((t) => !STOP.has(t))
    .map(canon)
    .filter(Boolean);

/**
 * Documentation search — a SEPARATE layer from Scripture search.
 *
 * The Scripture index holds only the verse text. This index holds our own words:
 * doc pages split by section, the tool manifest (which also generates openapi.json
 * and llms.txt), and the corpus build reports. Results from the two layers are
 * never interleaved or ranked against each other.
 */

export type DocKind = "page" | "tool" | "report";

export interface DocEntry {
  id: string;
  kind: DocKind;
  url: string;
  page: string;
  kicker: string;
  heading: string;
  text: string;
}

export interface DocHit extends DocEntry {
  score: number;
  matched: string[];
  snippet: string;
}

export interface DocSearchResult {
  query: string;
  total: number;
  hits: DocHit[];
  words: string[];
  unmatched: string[];
}

interface Prepared {
  entry: DocEntry;
  headingKeys: Set<string>;
  bodyCounts: Map<string, number>;
  length: number;
}

interface Index {
  docs: Prepared[];
  df: Map<string, number>;
}

let index: Index | null = null;

function load(): Index {
  if (index) return index;
  const raw = JSON.parse(readFileSync(join(process.cwd(), "data/docs-index.json"), "utf8")) as { docs: DocEntry[] };
  const df = new Map<string, number>();
  const docs: Prepared[] = raw.docs.map((entry) => {
    const headingKeys = new Set(keys(`${entry.page} ${entry.kicker} ${entry.heading}`));
    const bodyCounts = new Map<string, number>();
    const bodyKeys = keys(entry.text);
    for (const k of bodyKeys) bodyCounts.set(k, (bodyCounts.get(k) ?? 0) + 1);
    for (const k of new Set([...headingKeys, ...bodyKeys])) df.set(k, (df.get(k) ?? 0) + 1);
    return { entry, headingKeys, bodyCounts, length: bodyKeys.length };
  });
  index = { docs, df };
  return index;
}

const HEADING_WEIGHT = 3;
// Pages explain; tool entries and reports mention. A page carrying the same words should rank first.
const KIND_PRIOR: Record<DocKind, number> = { page: 1, tool: 0.6, report: 0.7 };

function snippetFor(text: string, words: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const w of words) {
    const i = lower.indexOf(w.toLowerCase());
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return text.slice(0, 180).trim() + (text.length > 180 ? "…" : "");
  const start = Math.max(0, at - 70);
  const end = Math.min(text.length, at + 130);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

export function searchDocs(q: string, opts: { limit?: number; offset?: number; kind?: DocKind } = {}): DocSearchResult {
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const { docs, df } = load();
  const N = docs.length;

  const surface = tokenize(q).filter((t) => !STOP.has(t));
  const words = Array.from(new Set(surface));
  const keyOf = new Map<string, string>();
  for (const w of words) {
    const k = canon(w);
    if (k) keyOf.set(w, k);
  }
  const unmatched = words.filter((w) => !df.has(keyOf.get(w) ?? ""));
  const sought = words.filter((w) => !unmatched.includes(w));
  if (sought.length === 0) return { query: q, total: 0, hits: [], words, unmatched };

  const scored: DocHit[] = [];
  for (const d of docs) {
    if (opts.kind && d.entry.kind !== opts.kind) continue;
    let score = 0;
    const matched: string[] = [];
    for (const w of sought) {
      const k = keyOf.get(w)!;
      const idf = Math.log(1 + N / (df.get(k) ?? 1));
      const inHeading = d.headingKeys.has(k);
      const tf = d.bodyCounts.get(k) ?? 0;
      if (!inHeading && tf === 0) continue;
      matched.push(w);
      // Saturating tf so a long page cannot outrank a short exact section.
      score += idf * ((inHeading ? HEADING_WEIGHT : 0) + tf / (tf + 1.5));
    }
    if (matched.length === 0) continue;
    score *= KIND_PRIOR[d.entry.kind];
    // Documents carrying more of the query's distinct words always rank above those carrying fewer.
    score += matched.length * 100;
    scored.push({ ...d.entry, score: Math.round(score * 1000) / 1000, matched, snippet: snippetFor(d.entry.text, matched) });
  }
  scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  return { query: q, total: scored.length, hits: scored.slice(offset, offset + limit), words, unmatched };
}
