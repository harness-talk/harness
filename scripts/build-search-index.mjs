#!/usr/bin/env node --experimental-strip-types
/**
 * build-search-index.mjs — inverted index over the 1611 corpus.
 * Output: data/search-index.json  { refs: ["gn.1.1", ...], terms: { canonStem: [verseIdx, ...] } }
 *
 * Tokens pass through lib/bible/text-norm.ts (shared with the query side) so that modern
 * spelling finds 1611 spelling: "loved" and "loued" index under the same key.
 * Run with: node --no-warnings --experimental-strip-types scripts/build-search-index.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonTokens } from "../lib/bible/text-norm.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const books = JSON.parse(readFileSync(join(ROOT, "data/books.json"), "utf8"));

const terms = new Map();
const refs = [];
let idx = 0;
for (const meta of books) {
  const bk = JSON.parse(readFileSync(join(ROOT, `data/kjv/${meta.id}.json`), "utf8"));
  for (const c of bk.chapters) {
    for (const v of c.verses) {
      refs.push(`${meta.id}.${c.n}.${v.v}`);
      const seen = new Set();
      for (const { stem } of canonTokens(v.text)) {
        if (seen.has(stem)) continue;
        seen.add(stem);
        let arr = terms.get(stem);
        if (!arr) terms.set(stem, (arr = []));
        arr.push(idx);
      }
      idx++;
    }
  }
}

const out = { refs, terms: Object.fromEntries(terms) };
writeFileSync(join(ROOT, "data/search-index.json"), JSON.stringify(out));
console.log(`indexed ${refs.length} verses, ${terms.size} canonical stems, ${(JSON.stringify(out).length / 1e6).toFixed(1)} MB`);
