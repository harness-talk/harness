#!/usr/bin/env node --experimental-strip-types
/**
 * eval-spelling-bridge.mjs — how well does the normaliser let MODERN queries find 1611 text?
 * For every verse present in both the 1611 corpus and the modern-spelling Gutenberg KJV,
 * count modern content tokens that have a matching canonical stem in the same 1611 verse.
 * Reports recall with identity (no normalisation) vs the shared normaliser, plus the
 * most frequent modern words that still fail to bridge.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize, canon, stem, STOP } from "../lib/bible/text-norm.ts";
import { CANON } from "../lib/bible/canon.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Gutenberg verses, same walker as build-kjv.mjs
const gut = new Map();
{
  const txt = readFileSync(join(ROOT, "data/raw/kjv-gutenberg.txt"), "utf8");
  const flat = txt.slice(txt.indexOf("*** START"), txt.indexOf("*** END")).replace(/\s+/g, " ");
  const re = /(?:^|\s)(\d{1,3}):(\d{1,3})\s/g;
  let bi = -1, c = 0, v = 0, key = null, last = 0, m;
  const flush = (end) => { if (key) gut.set(key, flat.slice(last, end).trim()); };
  while ((m = re.exec(flat))) {
    const nc = Number(m[1]), nv = Number(m[2]), book = CANON[bi];
    const nextVerse = book && nc === c && nv === v + 1;
    const nextChapter = book && nc === c + 1 && nv === 1 && c < book.chapters;
    const nextBook = nc === 1 && nv === 1 && (!book || c === book.chapters);
    if (!nextVerse && !nextChapter && !nextBook) continue;
    flush(m.index);
    if (nextBook) { bi++; if (bi > 65) { key = null; break; } }
    c = nc; v = nv; key = `${CANON[bi].id}.${c}.${v}`; last = m.index + m[0].length;
  }
  flush(flat.length);
}

const identity = (t) => stem(t);
const bridged = canon;

function run(fn) {
  let hit = 0, total = 0;
  const misses = new Map();
  for (const book of CANON) {
    const bk = JSON.parse(readFileSync(join(ROOT, `data/kjv/${book.id}.json`), "utf8"));
    for (const ch of bk.chapters) {
      for (const vs of ch.verses) {
        const modern = gut.get(`${book.id}.${ch.n}.${vs.v}`);
        if (!modern) continue;
        const old = new Set(tokenize(vs.text).map(fn));
        for (const tok of tokenize(modern)) {
          if (STOP.has(tok)) continue;
          total++;
          if (old.has(fn(tok))) hit++;
          else misses.set(tok, (misses.get(tok) ?? 0) + 1);
        }
      }
    }
  }
  return { recall: hit / total, total, misses: [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40) };
}

const a = run(identity), b = run(bridged);
console.log(`modern content tokens compared: ${a.total.toLocaleString()}`);
console.log(`recall, no normalisation : ${(a.recall * 100).toFixed(2)}%`);
console.log(`recall, shared normaliser: ${(b.recall * 100).toFixed(2)}%`);
console.log("\nmost frequent modern words that still do not bridge:");
console.log(b.misses.map(([w, n]) => `${w}(${n})`).join("  "));
