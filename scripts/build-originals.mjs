#!/usr/bin/env node
// Ingest original-language texts from the owner's Immutable/BibleOS repo.
//   OT: Hebrew — OSHB (Open Scriptures Hebrew Bible, WLC) with Strong's + morphology  (CC BY 4.0)
//   NT: Greek  — SBLGNT text with MorphGNT tagging (lemma + morphology + POS)        (CC BY 4.0 / SBLGNT EULA)
// NOTE: SBLGNT is a CRITICAL text, not the Textus Receptus the KJV translators used.
//       It is stored under source id "sblgnt-morphgnt" and never described as TR.
//
// Output: data/originals/{bookId}.json  +  data/originals/index.json
// Raw downloads cached in data/raw/originals/ (gitignored).

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const { CANON } = await import("../lib/bible/canon.ts");
const ROOT = process.cwd();
const RAW = join(ROOT, "data", "raw", "originals");
const OUT = join(ROOT, "data", "originals");
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const BASE = "https://raw.githubusercontent.com/THookz/Immutable/main/BibleOS/client/public/data/books/";
const sha = (s) => createHash("sha256").update(s).digest("hex");
// SBLGNT marks its textual apparatus inline with sigla from the Supplemental Punctuation block
// (⸀ ⸁ ⸂ ⸃ ⸄ ⸅ ⸆ ⸇ ⸈ ⸉ ⸊ ⸋ — U+2E00–U+2E0D). They are editorial pointers, not text; almost no font
// carries them. Strip from the served text so the verse reads (and hashes) as words only.
const SIGLA = /[\u2E00-\u2E0D]/g;
const cleanText = (t, lang) => (lang === "greek" ? t.replace(SIGLA, "").replace(/\s+/g, " ").trim() : t.trim());
const cleanWord = (w, lang) => (lang === "greek" ? w.replace(SIGLA, "") : w);

// Immutable uses full English names as file names ("1 John.json", "Song of Solomon.json").
const fileNameFor = (b) => `${b.name}.json`;

const kjvVerses = (id) => {
  const d = JSON.parse(readFileSync(join(ROOT, "data", "kjv", `${id}.json`), "utf8"));
  return new Map(d.chapters.map((c) => [c.n, c.verses.length]));
};

const report = { books: [], missingVsKjv: [], extraVsKjv: [], totals: { hebrew: 0, greek: 0, aramaic: 0, words: 0 } };
const index = { hebrew: { source: "wlc-oshb", books: [] }, greek: { source: "sblgnt-morphgnt", books: [] } };

for (const b of CANON) {
  const rawPath = join(RAW, `${b.id}.json`);
  if (!existsSync(rawPath)) {
    const url = BASE + encodeURIComponent(fileNameFor(b));
    process.stdout.write(`fetch ${b.name} … `);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${b.name}: HTTP ${r.status} from ${url}`);
    writeFileSync(rawPath, Buffer.from(await r.arrayBuffer()));
    console.log("ok");
  }
  const rows = JSON.parse(readFileSync(rawPath, "utf8"));
  // OSHB tags Aramaic sections (Dan 2:4b–7:28, Ezra 4:8–6:18; 7:12–26, Jer 10:11, Gen 31:47) per verse.
  // They belong to the Hebrew Bible corpus; we keep the per-verse tag and count them.
  const langs = new Set(rows.map((r) => r.language));
  const lang = b.testament === "OT" ? "hebrew" : "greek";
  const allowed = b.testament === "OT" ? new Set(["hebrew", "aramaic"]) : new Set(["greek"]);
  for (const l of langs) if (!allowed.has(l)) throw new Error(`${b.name}: unexpected language '${l}'`);
  let aramaic = 0;

  const chapters = new Map();
  let words = 0;
  for (const r of rows) {
    const wa = typeof r.wordAlignment === "string" ? JSON.parse(r.wordAlignment) : r.wordAlignment ?? [];
    const w = wa.map((x) =>
      lang === "hebrew"
        ? { p: x.position, w: x.word, s: x.strongId ?? null, m: x.morphology ?? null }
        : { p: x.position, w: cleanWord(x.word, lang), l: x.lemma ?? null, m: x.morphology ?? null, pos: x.pos ?? null },
    );
    words += w.length;
    if (!chapters.has(r.chapter)) chapters.set(r.chapter, []);
    if (r.language === "aramaic") aramaic++;
    chapters.get(r.chapter).push({ v: r.verse, text: cleanText(r.text, lang), ...(r.language === "aramaic" ? { lang: "aramaic" } : {}), words: w });
  }
  for (const c of chapters.values()) c.sort((a, z) => a.v - z.v);

  // Versification audit vs KJV (report, don't fail — Hebrew/Greek chapter/verse divisions legitimately differ)
  const kjv = kjvVerses(b.id);
  for (const [ch, n] of kjv) {
    const have = chapters.get(ch)?.length ?? 0;
    if (have < n) report.missingVsKjv.push(`${b.id}.${ch}: kjv ${n}, ${lang} ${have}`);
    if (have > n) report.extraVsKjv.push(`${b.id}.${ch}: kjv ${n}, ${lang} ${have}`);
  }
  for (const ch of chapters.keys()) if (!kjv.has(ch)) report.extraVsKjv.push(`${b.id}.${ch}: not in kjv`);

  const verseCount = [...chapters.values()].reduce((a, c) => a + c.length, 0);
  const out = {
    id: b.id,
    name: b.name,
    ordinal: b.ordinal,
    language: lang,
    source: lang === "hebrew" ? "wlc-oshb" : "sblgnt-morphgnt",
    chapters: [...chapters.entries()].sort((a, z) => a[0] - z[0]).map(([n, verses]) => ({ n, verses })),
  };
  const json = JSON.stringify(out);
  writeFileSync(join(OUT, `${b.id}.json`), json);
  index[lang].books.push({ id: b.id, chapters: out.chapters.length, verses: verseCount, sha256: sha(json) });
  report.books.push(`${b.id}: ${lang} ${out.chapters.length} ch / ${verseCount} vv / ${words} words${aramaic ? ` (${aramaic} Aramaic)` : ""}`);
  report.totals.aramaic += aramaic;
  report.totals[lang] += verseCount;
  report.totals.words += words;
}

writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
writeFileSync(
  join(OUT, "BUILD-REPORT.md"),
  `# Originals build report\n\nGenerated ${new Date().toISOString()}\n\n## Totals\n- Hebrew verses: ${report.totals.hebrew}\n- Greek verses: ${report.totals.greek}\n- of the Hebrew Bible verses, in Aramaic: ${report.totals.aramaic}\n- Tagged words: ${report.totals.words}\n\n## Versification differences vs KJV (informational)\n### Fewer verses than KJV\n${report.missingVsKjv.map((l) => "- " + l).join("\n") || "- none"}\n\n### More verses than KJV / chapters not in KJV\n${report.extraVsKjv.map((l) => "- " + l).join("\n") || "- none"}\n\n## Books\n${report.books.map((l) => "- " + l).join("\n")}\n`,
);
console.log(`\nHebrew ${report.totals.hebrew} vv · Greek ${report.totals.greek} vv · ${report.totals.words.toLocaleString()} tagged words`);
console.log(`versification: ${report.missingVsKjv.length} chapters short vs KJV, ${report.extraVsKjv.length} long/extra`);
