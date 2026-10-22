#!/usr/bin/env node
/**
 * Builds the cross-reference layer from OpenBible.info's "Bible Cross References"
 * dataset (CC-BY, https://www.openbible.info/labs/cross-references/), itself seeded
 * from the Treasury of Scripture Knowledge (public domain) and ranked by reader votes.
 *
 * Outputs:
 *   data/crossrefs/{book}.json   per-verse references (server-side lookup)
 *   public/crossrefs/arcs.json   chapter-to-chapter arcs for the arc chart
 *
 * The input zip is SHA-256 pinned; a different file fails the build rather than
 * silently changing the data.
 *
 *   node scripts/build-crossrefs.mjs [path/to/cross-references.zip]
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SOURCE_URL = "https://a.openbible.info/data/cross-references.zip";
const SOURCE_SHA256 = "5f61f4525156b7c7b8f7ae07e3a4225038cf4b60def39247df8b92916e14c56f";
// Every reference is kept except ones readers voted net-negative (rejected as unhelpful).
const VERSE_MIN_VOTES = 0;
// Arcs are only the drawn layer; chapter counts below use the full set.
const ARC_MIN_VOTES = 10;

// OSIS book codes in canonical order; index i maps to the book with ordinal i+1.
const OSIS = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
  "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam",
  "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech",
  "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col",
  "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John",
  "2John", "3John", "Jude", "Rev",
];

const root = new URL("..", import.meta.url).pathname;
const books = JSON.parse(readFileSync(join(root, "data/books.json"), "utf8")).sort((a, b) => a.n - b.n);
if (books.length !== OSIS.length) throw new Error(`expected 66 books, got ${books.length}`);
const osisToBook = new Map(OSIS.map((code, i) => [code, books[i]]));

let zipPath = process.argv[2];
if (!zipPath) {
  zipPath = join(mkdtempSync(join(tmpdir(), "xr-")), "cross-references.zip");
  execFileSync("curl", ["-sSL", "-o", zipPath, SOURCE_URL]);
}
const sha = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
if (sha !== SOURCE_SHA256) throw new Error(`cross-references.zip SHA mismatch: ${sha}`);
const text = execFileSync("unzip", ["-p", zipPath, "cross_references.txt"], { maxBuffer: 64 << 20 }).toString("utf8");

const chapterStart = new Map();
let chapterTotal = 0;
for (const b of books) {
  chapterStart.set(b.id, chapterTotal);
  chapterTotal += b.chapters;
}

function parsePoint(s) {
  const [code, c, v] = s.split(".");
  const book = osisToBook.get(code);
  if (!book) return null;
  const chapter = Number(c);
  const verse = Number(v);
  if (!(chapter >= 1 && chapter <= book.chapters) || !(verse >= 1)) return null;
  return { book, chapter, verse };
}

/** "Rev.14.7" or "Rev.14.7-Rev.14.9" → our canonical ref string ("rv.14.7", "rv.14.7-9"). */
function toRef(s) {
  const [a, b] = s.split("-");
  const from = parsePoint(a);
  if (!from) return null;
  let ref = `${from.book.id}.${from.chapter}.${from.verse}`;
  if (b) {
    const to = parsePoint(b);
    if (to && to.book.id === from.book.id) {
      ref += to.chapter === from.chapter ? `-${to.verse}` : `-${to.chapter}.${to.verse}`;
    }
  }
  return { ref, from };
}

const perBook = new Map(books.map((b) => [b.id, new Map()]));
const arcWeights = new Map();
let kept = 0;
const chapterRefs = new Array(chapterTotal).fill(0);
const chapterLinks = Array.from({ length: chapterTotal }, () => new Set());

for (const line of text.split("\n").slice(1)) {
  if (!line) continue;
  const [fromS, toS, votesS] = line.split("\t");
  const votes = Number(votesS);
  if (!Number.isFinite(votes)) continue;
  const from = parsePoint(fromS);
  const target = toRef(toS);
  if (!from || !target) continue;

  const a = chapterStart.get(from.book.id) + from.chapter - 1;
  const b = chapterStart.get(target.from.book.id) + target.from.chapter - 1;

  if (votes >= VERSE_MIN_VOTES) {
    const key = `${from.chapter}:${from.verse}`;
    const map = perBook.get(from.book.id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push([target.ref, votes]);
    kept++;
    chapterRefs[a]++;
    chapterLinks[a].add(b);
  }

  if (votes >= ARC_MIN_VOTES) {
    if (a !== b) {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      arcWeights.set(key, (arcWeights.get(key) ?? 0) + 1);
    }
  }
}

const outDir = join(root, "data/crossrefs");
mkdirSync(outDir, { recursive: true });
for (const [id, map] of perBook) {
  const verses = {};
  for (const [key, refs] of map) {
    refs.sort((x, y) => y[1] - x[1]);
    verses[key] = refs;
  }
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ book: id, verses }));
}

const arcs = [];
for (const [key, w] of arcWeights) {
  const [a, b] = key.split(",").map(Number);
  arcs.push(a, b, w);
}
const verseCounts = books.flatMap((b) => b.verseCounts);
const pubDir = join(root, "public/crossrefs");
mkdirSync(pubDir, { recursive: true });
writeFileSync(
  join(pubDir, "arcs.json"),
  JSON.stringify({
    source: "OpenBible.info Bible Cross References (CC-BY)",
    minVotes: ARC_MIN_VOTES,
    books: books.map((b) => [b.id, b.name, b.testament, chapterStart.get(b.id), b.chapters]),
    verseCounts,
    totalRefs: kept,
    chapterRefs,
    chapterLinks: chapterLinks.map((s, i) => s.size - (s.has(i) ? 1 : 0)),
    arcs,
  }),
);
writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      source: "openbible-cross-references",
      url: SOURCE_URL,
      sha256: SOURCE_SHA256,
      license: "CC-BY",
      attribution: "Cross references from OpenBible.info, CC-BY, seeded from the Treasury of Scripture Knowledge.",
      verseMinVotes: VERSE_MIN_VOTES,
      arcMinVotes: ARC_MIN_VOTES,
      referencesKept: kept,
      arcs: arcs.length / 3,
    },
    null,
    2,
  ),
);
console.log(`kept ${kept} verse refs, ${arcs.length / 3} chapter arcs`);
if (!existsSync(join(outDir, "gn.json"))) throw new Error("no output written");
