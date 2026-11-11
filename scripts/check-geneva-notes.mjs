#!/usr/bin/env node
// Checks hand-transcribed Geneva 1560 notes and learns from them.
//
//   node scripts/check-geneva-notes.mjs              # check everything
//   node scripts/check-geneva-notes.mjs gn 26        # focus on one new chapter
//   node scripts/check-geneva-notes.mjs --learn      # accept current words as verified
//
// Learning loop: every word in already-verified chapters is stored in
// _vocabulary.json with a count. A word in a NEW chapter that the vocabulary
// has never seen is flagged for a second look against the page image. When a
// chapter is verified, run with --learn so its spellings join the vocabulary.
// Each pass makes the next one faster: fewer new words, sharper flags.
// Flags are prompts to re-read the facsimile, never automatic corrections.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "data/annotations/geneva-notes";
const VOCAB = `${DIR}/_vocabulary.json`;
const args = process.argv.slice(2);
const learn = args.includes("--learn");
const [focusBook, focusChapter] = args.filter((a) => !a.startsWith("--"));

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8"));
const vocab = existsSync(VOCAB) ? JSON.parse(readFileSync(VOCAB, "utf8")) : { words: {} };

// Patterns that betray OCR or modernization rather than 1560 print.
const SUSPECT = [
  { re: /ſ/, why: "long-s should be normalized to s" },
  { re: /\b(fo|fhe|fhall|thefe|bleffed)\b/i, why: "looks like long-s misread as f" },
  { re: /[|{}<>_=\\]/, why: "stray OCR symbol" },
  { re: /\s{2,}/, why: "double space" },
  { re: /\b(the the|and and)\b/i, why: "doubled word" },
];

const words = (s) => (s.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => w.length > 1);
const problems = [];
const unseen = new Map();
let total = 0;

for (const bookId of manifest.books) {
  const file = JSON.parse(readFileSync(`${DIR}/${bookId}.json`, "utf8"));
  const ids = new Set();
  for (const a of file.annotations) {
    const [bk, ch] = a.ref.split(".");
    const inFocus = (!focusBook || bk === focusBook) && (!focusChapter || ch === focusChapter);
    total++;
    const where = `${a.id}`;
    if (ids.has(a.id)) problems.push(`${where}: duplicate id`);
    ids.add(a.id);
    if (bk !== bookId) problems.push(`${where}: ref book ${bk} is in ${bookId}.json`);
    if (!a.text?.trim()) problems.push(`${where}: empty text`);
    if (a.kind === "note") {
      if (!/^[a-z]+\.\d+\.\d+$/.test(a.ref)) problems.push(`${where}: note ref must be book.chapter.verse`);
      const letter = a.id.split(":").pop();
      if (letter === "j") problems.push(`${where}: the 1560 skips the note letter j`);
      if (!a.anchor?.trim()) problems.push(`${where}: note has no anchor word`);
    } else if (a.kind === "argument") {
      if (!/^[a-z]+(\.\d+)?$/.test(a.ref)) problems.push(`${where}: argument ref must be book or book.chapter`);
    } else {
      problems.push(`${where}: unknown kind ${a.kind}`);
    }
    for (const field of ["text", "anchor"]) {
      for (const { re, why } of SUSPECT) if (a[field] && re.test(a[field])) problems.push(`${where} ${field}: ${why}`);
    }
    if (!inFocus) continue;
    for (const w of words(`${a.text} ${a.anchor ?? ""}`)) {
      if (learn) vocab.words[w] = (vocab.words[w] ?? 0) + 1;
      else if (!vocab.words[w]) {
        if (!unseen.has(w)) unseen.set(w, []);
        unseen.get(w).push(a.id);
      }
    }
  }
}

if (learn) {
  vocab.updated = new Date().toISOString();
  vocab.about = "Spellings seen in human-verified Geneva 1560 notes; built by scripts/check-geneva-notes.mjs --learn. Used to flag unfamiliar words in new chapters for a second look at the facsimile.";
  vocab.words = Object.fromEntries(Object.entries(vocab.words).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(VOCAB, JSON.stringify(vocab, null, 2) + "\n");
  console.log(`Learned ${Object.keys(vocab.words).length} distinct spellings from ${focusBook ? `${focusBook}${focusChapter ? " " + focusChapter : ""}` : "all books"}.`);
}

console.log(`${total} annotations checked across ${manifest.books.join(", ")}.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
}
if (!learn && unseen.size) {
  console.log(`\n${unseen.size} word(s) never seen in verified notes. Re-read these on the page:`);
  for (const [w, at] of [...unseen].sort()) console.log(`  ${w.padEnd(18)} ${at.slice(0, 3).join(", ")}${at.length > 3 ? " …" : ""}`);
}
if (problems.length) process.exitCode = 1;
