#!/usr/bin/env node --experimental-strip-types
/**
 * ablate-spelling-rules.mjs — recall AND precision for each candidate normalisation rule.
 * recall   : modern content tokens that find a canonical match in the same 1611 verse
 * merges   : distinct modern head-words (by 3-letter prefix) collapsed into one canonical form —
 *            a proxy for false matches ("god"/"good", "beast"/"best")
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize, STOP } from "../lib/bible/text-norm.ts";
import { CANON } from "../lib/bible/canon.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IRREGULAR = { through: "thorow", doth: "doeth", doe: "do", goe: "go" };

function make(flags) {
  const norm = (t) => {
    let s = IRREGULAR[t] ?? t;
    if (flags.fixes) s = s.replace(/^believ/, "beleev").replace(/^shepherd/, "shepheard").replace(/^young/, "yong").replace(/^countr(y|ies)$/, "countrey").replace(/^jew/, "iewe");
    if (flags.uv === "inter") s = s.replace(/([aeiou])u(?=[aeiouy])/g, "$1v").replace(/^v(?=[^aeiouy])/g, "u");
    if (flags.uv === "prevocalic") s = s.replace(/u(?=[aeiouy])/g, "v").replace(/^v(?=[^aeiouy])/g, "u");
    if (flags.ou) s = s.replace(/ou/g, "o").replace(/ow/g, "o");
    if (flags.uv === "all") s = s.replace(/[uv]/g, "v");
    s = s.replace(/j/g, "i").replace(/y/g, "i");
    s = s.replace(/cke?\b/g, "k");
    s = s.replace(/ie\b/g, "i");
    if (flags.ie) s = s.replace(/ie/g, "e");
    if (flags.ea) s = s.replace(/ea/g, "e");
    s = s.replace(/ee/g, "e");
    if (flags.eo) s = s.replace(/eo/g, "e").replace(/oa/g, "o");
    s = flags.dblVowel ? s.replace(/([a-z])\1+/g, "$1") : s.replace(/([b-df-hj-np-tv-z])\1+/g, "$1");
    if (s.length >= 3) s = s.replace(/e\b/, "");
    s = flags.dblVowel ? s.replace(/([a-z])\1+/g, "$1") : s.replace(/([b-df-hj-np-tv-z])\1+/g, "$1");
    return s;
  };
  const stem = (t) => t.length <= 3 ? t : t.replace(/(eth|est)$/, "").replace(/(ing|ings)$/, "").replace(/(?<=.{3})(nes|ness)$/, "").replace(/(ies)$/, "i").replace(/(ed|es|s)$/, "");
  const reduce = (t) => {
    if (flags.e === "all") return t.length <= 2 ? t : t[0] + t.slice(1).replace(/e/g, "");
    if (flags.e === "cec") return t.replace(/(?<=[b-df-hj-np-tv-z])e(?=[b-df-hj-np-tv-z])/g, "");
    return t;
  };
  return (t) => reduce(stem(norm(t)));
}

const gut = new Map();
{
  const txt = readFileSync(join(ROOT, "data/raw/kjv-gutenberg.txt"), "utf8");
  const flat = txt.slice(txt.indexOf("*** START"), txt.indexOf("*** END")).replace(/\s+/g, " ");
  const re = /(?:^|\s)(\d{1,3}):(\d{1,3})\s/g;
  let bi = -1, c = 0, v = 0, key = null, last = 0, m;
  const flush = (end) => { if (key) gut.set(key, flat.slice(last, end).trim()); };
  while ((m = re.exec(flat))) {
    const nc = Number(m[1]), nv = Number(m[2]), book = CANON[bi];
    const nextVerse = book && nc === c && nv === v + 1, nextChapter = book && nc === c + 1 && nv === 1 && c < book.chapters, nextBook = nc === 1 && nv === 1 && (!book || c === book.chapters);
    if (!nextVerse && !nextChapter && !nextBook) continue;
    flush(m.index);
    if (nextBook) { bi++; if (bi > 65) { key = null; break; } }
    c = nc; v = nv; key = `${CANON[bi].id}.${c}.${v}`; last = m.index + m[0].length;
  }
  flush(flat.length);
}
const verses = [];
for (const book of CANON) {
  const bk = JSON.parse(readFileSync(join(ROOT, `data/kjv/${book.id}.json`), "utf8"));
  for (const ch of bk.chapters) for (const vs of ch.verses) { const mod = gut.get(`${book.id}.${ch.n}.${vs.v}`); if (mod) verses.push([tokenize(vs.text), tokenize(mod).filter((t) => !STOP.has(t))]); }
}
const modernVocab = [...new Set(verses.flatMap(([, m]) => m))].filter((t) => t.length >= 3);

function score(fn) {
  let hit = 0, total = 0;
  for (const [old, mod] of verses) { const set = new Set(old.map(fn)); for (const t of mod) { total++; if (set.has(fn(t))) hit++; } }
  const groups = new Map();
  for (const w of modernVocab) { const c = fn(w); (groups.get(c) ?? groups.set(c, new Set()).get(c)).add(w.slice(0, 3)); }
  const merges = [...groups.values()].filter((s) => s.size > 1).length;
  return { recall: (hit / total * 100).toFixed(2), merges };
}

const base = { uv: "inter", ou: false, ie: false, ea: false, eo: false, dblVowel: false, e: "cec", fixes: false };
const variants = {
  "baseline (inter u/v, cons-dbl, c_e_c drop)": base,
  "uv: prevocalic": { ...base, uv: "prevocalic" },
  "uv: fold all": { ...base, uv: "all" },
  "prevocalic + targeted fixes  ← candidate": { ...base, uv: "prevocalic", fixes: true },
  "identity (stem only)": { uv: "none", ou: false, ie: false, ea: false, eo: false, dblVowel: false, e: "none" },
};
for (const [name, flags] of Object.entries(variants)) {
  const { recall, merges } = score(make(flags));
  console.log(`${name.padEnd(50)} recall ${recall}%   merges ${merges}`);
}
