#!/usr/bin/env node
/**
 * build-geneva.mjs — assemble data/geneva/{book}.json from the eBible.org Geneva
 * Bible 1599 (USFM, original spelling, public domain).
 *
 * Input:  data/raw/geneva-1599/NN-XXXenggnv.usfm  (fetched + hash-locked by fetch-sources.mjs)
 * Output: data/geneva/{id}.json, data/geneva/BUILD-REPORT.md
 *
 * This is the verse TEXT of the Geneva Bible. The marginal notes and chapter
 * arguments the reformers wrote are not in this source; they stay declared-only
 * in lib/bible/sources.ts until a verified transcription is ingested.
 *
 * Gates: 66 books; every chapter of the canon present; verse numbers contiguous;
 * spot checks; a full versification diff against the KJV corpus is written to the
 * report (the Geneva has a handful fewer verses — those refs return not_found).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANON } from "../lib/bible/canon.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "data/raw/geneva-1599");
const OUT = join(ROOT, "data/geneva");
mkdirSync(OUT, { recursive: true });

export const SOURCE_ID = "geneva-1599";
const lock = JSON.parse(readFileSync(join(ROOT, "data/raw/SOURCES.lock.json"), "utf8"));
if (!lock["geneva-1599"]) throw new Error("geneva-1599 not in SOURCES.lock.json — run scripts/fetch-sources.mjs");

// USFM 3-letter book codes, in canon order.
const USFM = ["GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"];
const usfmFiles = readdirSync(RAW).filter((f) => f.endsWith(".usfm"));
const fileFor = (code) => usfmFiles.find((f) => f.includes(`-${code}enggnv`));

const errors = [], report = { missingVsKjv: [], extraVsKjv: [], headings: 0 };
const books = [];

CANON.forEach((canon, bi) => {
  const file = fileFor(USFM[bi]);
  if (!file) { errors.push(`${canon.id}: no USFM file for ${USFM[bi]}`); return; }
  const chapters = [];
  let cur = null;
  for (const raw of readFileSync(join(RAW, file), "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    const c = /^\\c (\d+)$/.exec(line);
    if (c) { cur = { n: Number(c[1]), verses: [] }; chapters.push(cur); continue; }
    if (line.startsWith("\\s")) { report.headings++; continue; }
    const m = /^\\v (\d+)\s+(.*)$/.exec(line);
    if (!m || !cur) continue;
    const v = Number(m[1]);
    const text = m[2].replace(/\\[a-z]+\*?/g, "").replace(/\s+/g, " ").trim();
    const prev = cur.verses[cur.verses.length - 1];
    if (prev && v !== prev.v + 1) errors.push(`${canon.id} ${cur.n}: verse ${v} follows ${prev.v}`);
    if (!prev && v !== 1) errors.push(`${canon.id} ${cur.n}: first verse is ${v}`);
    if (!text) errors.push(`${canon.id} ${cur.n}:${v} empty`);
    cur.verses.push({ v, text });
  }
  chapters.forEach((ch, i) => { if (ch.n !== i + 1) errors.push(`${canon.id}: chapter ${ch.n} at position ${i + 1}`); if (!ch.verses.length) errors.push(`${canon.id} ${ch.n}: no verses`); });
  if (chapters.length !== canon.chapters) errors.push(`${canon.id}: ${chapters.length} chapters, canon has ${canon.chapters}`);
  books.push({ id: canon.id, chapters });
});

// Versification against the KJV corpus already built.
const kjvBooks = JSON.parse(readFileSync(join(ROOT, "data/books.json"), "utf8"));
for (const b of books) {
  const k = kjvBooks.find((x) => x.id === b.id);
  b.chapters.forEach((c, i) => {
    const kj = k.verseCounts[i];
    if (c.verses.length < kj) for (let v = c.verses.length + 1; v <= kj; v++) report.missingVsKjv.push(`${b.id}.${c.n}.${v}`);
    if (c.verses.length > kj) for (let v = kj + 1; v <= c.verses.length; v++) report.extraVsKjv.push(`${b.id}.${c.n}.${v}`);
  });
}

const chapters = books.reduce((a, b) => a + b.chapters.length, 0);
const verses = books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.verses.length, 0), 0);
if (books.length !== 66) errors.push(`books: ${books.length}`);
if (chapters !== 1189) errors.push(`chapters: ${chapters}`);
if (verses < 31000) errors.push(`verses: ${verses} — far too few`);

const get = (id, c, v) => books.find((b) => b.id === id)?.chapters[c - 1]?.verses[v - 1]?.text ?? "";
const spot = [
  ["gn", 1, 1, /^In the beginning God created the heauen and the earth\.$/],
  ["ps", 23, 1, /^A Psalme of David\. The Lord is my shepheard, I shall not want\.$/],
  ["jn", 3, 16, /^For God so loued the worlde, that hee hath giuen his onely begotten Sonne/],
  ["1jn", 5, 7, /Father, the Worde, and the holy Ghost/],
  ["re", 22, 21, /grace of our Lord Iesus Christ be with you all/],
];
for (const [id, c, v, want] of spot) if (!want.test(get(id, c, v))) errors.push(`spot ${id} ${c}:${v}\n   got:  ${get(id, c, v)}\n   want: ${want}`);

let merkleRoot = "";
if (!errors.length) {
  for (const f of readdirSync(OUT)) if (f.endsWith(".json")) rmSync(join(OUT, f));
  const leaves = [];
  for (const b of books) {
    const canon = CANON.find((x) => x.id === b.id);
    writeFileSync(join(OUT, `${b.id}.json`), JSON.stringify({ id: b.id, name: canon.name, source: SOURCE_ID, chapters: b.chapters }));
    for (const c of b.chapters) for (const v of c.verses) leaves.push(createHash("sha256").update(`${b.id}.${c.n}.${v.v}\n${v.text}`).digest());
  }
  let level = leaves;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(createHash("sha256").update(Buffer.concat([level[i], level[i + 1] ?? level[i]])).digest());
    level = next;
  }
  merkleRoot = level[0].toString("hex");
  writeFileSync(join(OUT, "corpus.json"), JSON.stringify({
    source: SOURCE_ID, books: books.length, chapters, verses, merkleRoot,
    leaf: "sha256(`${bookId}.${chapter}.${verse}\\n${text}`)",
    body: { url: lock["geneva-1599"].url, sha256: lock["geneva-1599"].sha256 },
    verseCounts: Object.fromEntries(books.map((b) => [b.id, b.chapters.map((c) => c.verses.length)])),
    missingVsKjv: report.missingVsKjv,
    builtAt: new Date().toISOString(),
  }, null, 2));
}

writeFileSync(join(OUT, "BUILD-REPORT.md"), `# Geneva Bible 1599 build report

Source: eBible.org Geneva Bible 1599, original spelling (\`${lock["geneva-1599"].url}\`, sha256 ${lock["geneva-1599"].sha256.slice(0, 16)}…)

- Books: ${books.length} / 66 · Chapters: ${chapters} / 1189 · Verses: ${verses}
- Merkle root: \`${merkleRoot}\`
- Status: ${errors.length ? "FAILED" : "PASSED"}

## What this is
The verse text of the Geneva Bible as printed in 1599 (the edition most reprinted; the 1560 first edition's text is nearly identical and its marginal notes were revised in 1599). Psalm superscriptions are part of verse 1, as the Geneva printed them. Section headings in the source (${report.headings}) are dropped: they are not the reformers' arguments.

## What this is NOT
The marginal notes, chapter arguments and cross-references are NOT in this source and are NOT served. The \`geneva-notes\` annotation source stays \`declared\` until a verified transcription is ingested.

## Versification against the KJV 1611 corpus
- KJV verses with no Geneva counterpart (${report.missingVsKjv.length}) — the API returns not_found for these under ?source=${SOURCE_ID}:
${report.missingVsKjv.map((r) => `  - ${r}`).join("\n") || "  - none"}
- Geneva verses beyond the KJV count (${report.extraVsKjv.length}):
${report.extraVsKjv.map((r) => `  - ${r}`).join("\n") || "  - none"}

## Errors (${errors.length})
${errors.map((e) => `- ${e}`).join("\n") || "- none"}
`);

console.log(`books=${books.length} chapters=${chapters} verses=${verses} missingVsKjv=${report.missingVsKjv.length} extra=${report.extraVsKjv.length} merkle=${merkleRoot.slice(0, 16)}…`);
if (errors.length) { console.error(errors.slice(0, 30).join("\n")); process.exit(1); }
