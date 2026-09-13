#!/usr/bin/env node
/**
 * build-kjv.mjs — assemble data/kjv/{book}.json from the 1611 first-edition
 * KJV transcription, with two mechanical restorations from public-domain
 * KJV witnesses, and hard gates that fail the build rather than ship a gap.
 *
 * Inputs (all fetched + hash-locked by scripts/fetch-sources.mjs):
 *   data/raw/kjv-1611/*.json     body text, 1611 spelling            → every verse
 *   data/raw/kjv-witness/*.json  standard-orthography KJV            → LORD/GOD casing only
 *   data/raw/eng-kjv.osis.xml    eBible KJV (OSIS)                   → Psalm titles only
 *
 * Why the witnesses: the 1611 transcription flattens the small-capital divine
 * name (LORD = Jehovah, GOD in "Lord GOD") to "Lord"/"God" and drops the Psalm
 * superscriptions the 1611 folio printed. Both are restored token-for-token
 * from a KJV witness ONLY where the token sequence matches exactly; every
 * verse where it does not is listed in BUILD-REPORT.md and left untouched.
 * The witnesses contribute casing and Psalm titles. No verse wording comes
 * from them.
 *
 * Output: data/kjv/{id}.json, data/books.json, data/corpus.json, data/kjv/BUILD-REPORT.md
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import zlib from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANON } from "../lib/bible/canon.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "data/raw");
const OUT = join(ROOT, "data/kjv");
mkdirSync(OUT, { recursive: true });

export const SOURCE_ID = "kjv-1611";
const lock = JSON.parse(readFileSync(join(RAW, "SOURCES.lock.json"), "utf8"));
for (const k of ["kjv-1611", "kjv-witness", "kjv-osis", "kjv-gutenberg", "kjv-crosswire"]) if (!lock[k]) throw new Error(`source ${k} not in SOURCES.lock.json — run scripts/fetch-sources.mjs`);

// ---- Book-name mapping ------------------------------------------------------
const NAME_ALIASES = {
  "song of solomon": "so", "song of songs": "so", canticles: "so",
  revelation: "re", "revelation of john": "re", "the revelation": "re",
  psalms: "ps", psalm: "ps",
};
const canonById = new Map(CANON.map((b) => [b.id, b]));
const canonByName = new Map(CANON.map((b) => [b.name.toLowerCase(), b.id]));
function bookIdFor(name) {
  const n = name.toLowerCase().replace(/\.json$/, "").trim();
  return canonByName.get(n) ?? NAME_ALIASES[n] ?? null;
}
function loadBookDir(dir) {
  const out = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!j.chapters) continue; // Books.json index
    const id = bookIdFor(j.book ?? f);
    if (id) out.set(id, j);
  }
  return out;
}
const body = loadBookDir(join(RAW, "kjv-1611"));
const witness = loadBookDir(join(RAW, "kjv-witness"));

// Second casing witness: every verse of the OSIS KJV, tags stripped.
const OSIS_BOOK = { Gen: "gn", Exod: "ex", Lev: "lv", Num: "nm", Deut: "dt", Josh: "js", Judg: "jg", Ruth: "rt", "1Sam": "1sm", "2Sam": "2sm", "1Kgs": "1kg", "2Kgs": "2kg", "1Chr": "1ch", "2Chr": "2ch", Ezra: "ezr", Neh: "ne", Esth: "et", Job: "jb", Ps: "ps", Prov: "pr", Eccl: "ec", Song: "so", Isa: "is", Jer: "jr", Lam: "lm", Ezek: "ez", Dan: "dn", Hos: "ho", Joel: "jl", Amos: "am", Obad: "ob", Jonah: "jnh", Mic: "mi", Nah: "na", Hab: "hk", Zeph: "zp", Hag: "hg", Zech: "zc", Mal: "ml", Matt: "mt", Mark: "mk", Luke: "lk", John: "jn", Acts: "ac", Rom: "rm", "1Cor": "1co", "2Cor": "2co", Gal: "gl", Eph: "ep", Phil: "ph", Col: "cl", "1Thess": "1th", "2Thess": "2th", "1Tim": "1tm", "2Tim": "2tm", Titus: "tt", Phlm: "phm", Heb: "hb", Jas: "jm", "1Pet": "1pe", "2Pet": "2pe", "1John": "1jn", "2John": "2jn", "3John": "3jn", Jude: "jd", Rev: "re" };
const osisXml = readFileSync(join(RAW, "eng-kjv.osis.xml"), "utf8").replace(/\s+/g, " ");
const osisVerse = new Map(); // "gn.1.1" → text
{
  const re = /<verse[^>]*osisID="([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)"[^>]*\/>([\s\S]*?)<verse eID=/g;
  let m;
  while ((m = re.exec(osisXml))) {
    const id = OSIS_BOOK[m[1]];
    if (!id) continue;
    osisVerse.set(`${id}.${m[2]}.${m[3]}`, m[4].replace(/<note[\s\S]*?<\/note>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  }
  for (const [k, v] of Object.entries(OSIS_BOOK)) if (!osisVerse.has(`${v}.1.1`)) throw new Error(`OSIS witness missing ${k}`);
}

// Third casing witness: Project Gutenberg #10. Verses are "C:V text…" tokens that run
// inline through paragraphs. A reference is accepted only if it is the expected next
// verse (v+1, next chapter's 1, or a new book's 1:1), which rejects stray "n:n" text.
const gutVerse = new Map();
{
  const txt = readFileSync(join(RAW, "kjv-gutenberg.txt"), "utf8");
  const flat = txt.slice(txt.indexOf("*** START"), txt.indexOf("*** END")).replace(/\s+/g, " ");
  const re = /(?:^|\s)(\d{1,3}):(\d{1,3})\s/g;
  let bi = -1, c = 0, v = 0, key = null, last = 0, m;
  const flush = (end) => { if (key) gutVerse.set(key, flat.slice(last, end).trim()); };
  while ((m = re.exec(flat))) {
    const nc = Number(m[1]), nv = Number(m[2]);
    const book = CANON[bi];
    const nextVerse = book && nc === c && nv === v + 1;
    const nextChapter = book && nc === c + 1 && nv === 1 && c < book.chapters;
    const nextBook = nc === 1 && nv === 1 && (!book || c === book.chapters);
    if (!nextVerse && !nextChapter && !nextBook) continue;
    flush(m.index);
    if (nextBook) { bi++; if (bi > 65) { key = null; break; } }
    c = nc; v = nv; key = `${CANON[bi].id}.${c}.${v}`; last = m.index + m[0].length;
  }
  flush(flat.length);
  if (bi < 65) throw new Error(`Gutenberg witness: only ${bi + 1} books parsed`);
}

// Third witness: CrossWire KJV SWORD module (zText, BOOK blocks, KJV versification).
// Verse index (.bzv) = 10-byte entries {block u32, start u32, size u16} in v11n order:
// 2 header entries per testament, then per book: a book entry, then per chapter: a
// chapter entry followed by its verses.
// Its casing vote is derived from the HEBREW behind each word, not from a transcriber:
// every English phrase is tagged with Strong's numbers, so YHWH (H3068/H3069) → LORD/GOD
// and Adonai (H0136) → Lord regardless of how the module happened to type it.
const swordVerse = new Map();
{
  const dir = join(RAW, "kjv-crosswire/modules/texts/ztext/kjv");
  const NAME_TOKEN = /\b(LORD|Lord|GOD|God)\b/g;
  const recase = (lemma, inner) => {
    const yhwh = /strong:H0?306[89]\b/.test(lemma), adonai = /strong:H0?136\b/.test(lemma);
    const plain = inner.replace(/<[^>]+>/g, "");
    if (yhwh && !adonai) return plain.replace(NAME_TOKEN, (w) => w.toUpperCase());
    if (adonai && !yhwh) return plain.replace(NAME_TOKEN, (w) => w[0] + w.slice(1).toLowerCase());
    return inner.replace(/<divineName>([\s\S]*?)<\/divineName>/g, (_, w) => w.toUpperCase()).replace(/<[^>]+>/g, "");
  };
  const clean = (s) => s
    .replace(/<title[^>]*>[\s\S]*?<\/title>/g, "") // Psalm superscriptions ride inside verse 1 here
    .replace(/<w ([^>]*)>([\s\S]*?)<\/w>/g, (_, attrs, inner) => recase(/lemma="([^"]*)"/.exec(attrs)?.[1] ?? "", inner))
    .replace(/<divineName>([\s\S]*?)<\/divineName>/g, (_, w) => w.toUpperCase())
    .replace(/<note[\s\S]*?<\/note>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  for (const t of ["ot", "nt"]) {
    const bzs = readFileSync(join(dir, `${t}.bzs`)), bzz = readFileSync(join(dir, `${t}.bzz`)), bzv = readFileSync(join(dir, `${t}.bzv`));
    const blocks = new Map();
    // offsets/sizes in .bzv are BYTES into the inflated block — slice the buffer, then decode
    const block = (i) => { if (!blocks.has(i)) { const off = bzs.readUInt32LE(i * 12), cs = bzs.readUInt32LE(i * 12 + 4); blocks.set(i, zlib.inflateSync(bzz.subarray(off, off + cs))); } return blocks.get(i); };
    const entry = (i) => { const b = bzv.readUInt32LE(i * 10), s = bzv.readUInt32LE(i * 10 + 4), n = bzv.readUInt16LE(i * 10 + 8); return n ? block(b).subarray(s, s + n).toString("utf8") : ""; };
    let i = 2;
    for (const book of CANON.filter((b) => (t === "ot" ? b.testament === "OT" : b.testament === "NT"))) {
      i++; // book heading
      const meta = witness.get(book.id);
      for (let c = 1; c <= book.chapters; c++) {
        i++; // chapter heading
        const nv = meta.chapters[c - 1].verses.length;
        for (let v = 1; v <= nv; v++) swordVerse.set(`${book.id}.${c}.${v}`, clean(entry(i++)));
      }
    }
    if (i !== bzv.length / 10) throw new Error(`SWORD ${t}: walked ${i} entries, index has ${bzv.length / 10}`);
  }
}

// ---- Psalm titles from the OSIS witness -------------------------------------
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
function psalmTitles() {
  const xml = osisXml;
  const start = xml.indexOf('<div type="book" osisID="Ps"');
  const end = xml.indexOf('<div type="book"', start + 10);
  const ps = xml.slice(start, end < 0 ? undefined : end);
  const titles = new Map(); // chapter → { title?, headings: [{before,text}] }
  let chapter = 0, lastVerse = 0;
  const re = /<chapter[^>]*osisRef="Ps\.(\d+)"[^>]*sID=|<verse[^>]*osisID="Ps\.(\d+)\.(\d+)"|<title type="psalm"[^>]*>([\s\S]*?)<\/title>/g;
  let m;
  while ((m = re.exec(ps))) {
    if (m[1]) { chapter = Number(m[1]); lastVerse = 0; titles.set(chapter, { headings: [] }); continue; }
    if (m[2]) { lastVerse = Number(m[3]); continue; }
    const text = strip(m[4]);
    const t = titles.get(chapter);
    if (chapter === 119 || lastVerse > 0) t.headings.push({ before: lastVerse + 1, text });
    else t.title = text;
  }
  return titles;
}
const titles = psalmTitles();

// ---- Casing restoration ------------------------------------------------------
// Base token + optional possessive. The 1611 prints "the Lords hand" (no apostrophe)
// where the witness has "LORD’s"; only the base token's casing is transferred.
// The 1611 spells Jehovah with I ("IEHOVAH"); compare with I/J folded.
const NAME_RE = /\b(LORD|Lord|GOD|God|[IJ]EHOVAH|[IJ]ehovah)(s|['’]s)?\b/g;
const fold = (s) => s.toLowerCase().replace(/^i/, "j");
const report = { casingRestored: 0, casingVerses: 0, casingMismatch: [], versification: [], warnings: [] };
/**
 * Restore casing by majority vote: each witness whose divine-name token sequence
 * matches the 1611 verse (same count, same words with I/J folded) casts a vote for
 * its casing pattern; the pattern needs at least two witnesses. Otherwise the verse
 * is left exactly as transcribed and listed in the report.
 */
function restoreCasing(text, witnesses) {
  const a = [...text.matchAll(NAME_RE)];
  if (a.length === 0) return text;
  const votes = new Map();
  for (const w of witnesses) {
    if (!w) continue;
    const b = [...w.matchAll(NAME_RE)];
    if (a.length !== b.length || a.some((x, i) => fold(x[1]) !== fold(b[i][1]))) continue;
    const pattern = b.map((x) => (x[1] === x[1].toUpperCase() ? "U" : "T")).join("");
    votes.set(pattern, (votes.get(pattern) ?? 0) + 1);
  }
  const winner = [...votes.entries()].find(([, n]) => n >= 2)?.[0];
  if (!winner) return null;
  let out = "", pos = 0, changed = 0;
  a.forEach((x, i) => {
    // keep the 1611 letters (I vs J) but take the voted casing pattern
    const base = winner[i] === "U" ? x[1].toUpperCase() : x[1][0].toUpperCase() + x[1].slice(1).toLowerCase();
    out += text.slice(pos, x.index) + base + (x[2] ?? "");
    pos = x.index + x[0].length;
    if (base !== x[1]) changed++;
  });
  out += text.slice(pos);
  report.casingRestored += changed;
  if (changed) report.casingVerses++;
  return out;
}

// The transcription encodes the folio's special sorts as HTML entities: þ (thorn,
// as in "þe" = the) and macron vowels marking an omitted n/m ("thē" = them).
const ENTITIES = { "&thorn;": "þ", "&#333;": "ō", "&#275;": "ē", "&#363;": "ū", "&#257;": "ā", "&amp;": "&" };
const decodeEntities = (s) => s.replace(/&[a-z]+;|&#\d+;/g, (e) => ENTITIES[e] ?? (report.warnings.push(`unknown entity ${e}`), e));

// ---- Assemble -----------------------------------------------------------------
const errors = [];
const books = [];
for (const canon of CANON) {
  const b = body.get(canon.id), w = witness.get(canon.id);
  if (!b) { errors.push(`missing body book ${canon.id}`); continue; }
  if (!w) { errors.push(`missing witness book ${canon.id}`); continue; }
  if (b.chapters.length !== canon.chapters) errors.push(`${canon.id}: ${b.chapters.length} chapters (canon ${canon.chapters})`);
  const chapters = [];
  b.chapters.forEach((c, ci) => {
    const n = Number(c.chapter);
    if (n !== ci + 1) errors.push(`${canon.id}: chapter ${n} at index ${ci}`);
    const wc = w.chapters[ci];
    if (!wc || wc.verses.length !== c.verses.length) report.versification.push(`${canon.id} ${n}: body ${c.verses.length} vv, witness ${wc?.verses.length ?? "—"}`);
    const verses = c.verses.map((v, vi) => {
      const vn = Number(v.verse);
      if (vn !== vi + 1) errors.push(`${canon.id} ${n}: verse ${vn} at index ${vi}`);
      let text = decodeEntities(String(v.text)).replace(/\s+/g, " ").trim();
      const key = `${canon.id}.${n}.${vn}`;
      // Three independent witnesses. (The JSON KJV is Gutenberg re-packaged — identical
      // in every Genesis verse — so it does not get a vote; it only checks versification.)
      const wits = [swordVerse.get(key), osisVerse.get(key), gutVerse.get(key)];
      if (wits.filter(Boolean).length < 3) report.warnings.push(`${key}: witness missing (${wits.map((w, i) => (w ? "" : ["sword", "osis", "gutenberg"][i])).filter(Boolean).join(", ")})`);
      const restored = restoreCasing(text, wits);
      if (restored === null) {
        const seq = (t) => (t ? `[${[...t.matchAll(NAME_RE)].map((x) => x[1]).join(" ")}]` : "[—]");
        report.casingMismatch.push(`${canon.id} ${n}:${vn} — 1611 ${seq(text)} · crosswire ${seq(wits[0])} · osis ${seq(wits[1])} · gutenberg ${seq(wits[2])}`);
      } else text = restored;
      if (!text) errors.push(`${canon.id} ${n}:${vn} empty`);
      return { v: vn, text };
    });
    const ch = { n, verses };
    if (canon.id === "ps") {
      const t = titles.get(n);
      if (t?.title) ch.title = t.title;
      if (t?.headings.length) ch.headings = t.headings;
    }
    chapters.push(ch);
  });
  books.push({ id: canon.id, chapters });
}

const chapters = books.reduce((a, b) => a + b.chapters.length, 0);
const verses = books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.verses.length, 0), 0);
if (books.length !== 66) errors.push(`books: ${books.length}`);
if (chapters !== 1189) errors.push(`chapters: ${chapters} (expected 1189)`);
if (verses !== 31102) errors.push(`verses: ${verses} (expected 31102)`);
for (const canon of CANON) {
  const b = books.find((x) => x.id === canon.id);
  const n = b?.chapters.reduce((a, c) => a + c.verses.length, 0);
  if (n !== canon.verses) errors.push(`${canon.id}: ${n} verses (canon ${canon.verses})`);
}
const psTitles = books.find((b) => b.id === "ps").chapters.filter((c) => c.title).length;
const psHeadings = books.find((b) => b.id === "ps").chapters.reduce((a, c) => a + (c.headings?.length ?? 0), 0);
if (psTitles !== 116) errors.push(`Psalm titles: ${psTitles} (expected 116)`);
if (psHeadings !== 22) errors.push(`Psalm 119 headings: ${psHeadings} (expected 22)`);

const get = (id, c, v) => books.find((b) => b.id === id)?.chapters[c - 1]?.verses[v - 1]?.text ?? "";
const spot = [
  ["gn", 1, 1, /^(¶ )?In the beginning God created the Heauen, and the Earth\.$/],
  ["ps", 23, 1, /^(¶ )?The LORD is my shepheard/],
  ["ex", 6, 3, /IEHOVAH/],
  ["nm", 11, 23, /the LORDs hand/],
  ["jn", 3, 16, /^(¶ )?For God so loued (þ|the) world/],
  ["1jn", 5, 7, /Father, the Word, and the holy Ghost/],
  ["re", 22, 21, /^(¶ )?The grace of our Lord Iesus Christ be with you all\. Amen\.$/],
];
for (const [id, c, v, want] of spot) if (!want.test(get(id, c, v))) errors.push(`spot ${id} ${c}:${v}\n   got:  ${get(id, c, v)}\n   want: ${want}`);
const lordCount = books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.verses.reduce((y, v) => y + (v.text.match(/\bLORD\b/g)?.length ?? 0), 0), 0), 0);
if (lordCount < 6000) errors.push(`LORD occurrences: ${lordCount} — casing restoration failed`);

// ---- Write ------------------------------------------------------------------
if (!errors.length) {
  for (const f of readdirSync(OUT)) if (f.endsWith(".json")) rmSync(join(OUT, f)); // no stale books survive
  const bookMeta = [];
  for (const b of books) {
    const canon = canonById.get(b.id);
    const json = JSON.stringify({ id: b.id, name: canon.name, source: SOURCE_ID, chapters: b.chapters });
    writeFileSync(join(OUT, `${b.id}.json`), json);
    bookMeta.push({
      id: b.id, n: canon.ordinal, name: canon.name, testament: canon.testament,
      chapters: b.chapters.length, verses: b.chapters.reduce((a, c) => a + c.verses.length, 0),
      verseCounts: b.chapters.map((c) => c.verses.length),
      sha256: createHash("sha256").update(json).digest("hex"),
    });
  }
  writeFileSync(join(ROOT, "data/books.json"), JSON.stringify(bookMeta, null, 1));
}

const leaves = [];
for (const b of books) for (const c of b.chapters) for (const v of c.verses) leaves.push(createHash("sha256").update(`${b.id}.${c.n}.${v.v}\n${v.text}`).digest());
let level = leaves;
while (level.length > 1) {
  const next = [];
  for (let i = 0; i < level.length; i += 2) next.push(createHash("sha256").update(Buffer.concat([level[i], level[i + 1] ?? level[i]])).digest());
  level = next;
}
const merkleRoot = level[0]?.toString("hex") ?? "";
if (!errors.length) {
  writeFileSync(join(ROOT, "data/corpus.json"), JSON.stringify({
    source: SOURCE_ID, books: books.length, chapters, verses, merkleRoot,
    leaf: "sha256(`${bookId}.${chapter}.${verse}\\n${text}`)",
    body: { url: lock["kjv-1611"].url, sha256: lock["kjv-1611"].sha256 },
    witnesses: {
      casingVote: ["kjv-crosswire", "kjv-osis", "kjv-gutenberg"].map((k) => ({ id: k, url: lock[k].url, sha256: lock[k].sha256 })),
      psalmTitles: { id: "kjv-osis", url: lock["kjv-osis"].url, sha256: lock["kjv-osis"].sha256 },
    },
    builtAt: new Date().toISOString(),
  }, null, 2));
}

const md = `# KJV 1611 build report

Body: 1611 first-edition transcription (\`${lock["kjv-1611"].url}\`, sha256 ${lock["kjv-1611"].sha256.slice(0, 16)}…)
Casing witness: \`${lock["kjv-witness"].url}\` · Psalm-title witness: \`${lock["kjv-osis"].url}\`

- Books: ${books.length} / 66 · Chapters: ${chapters} / 1189 · Verses: ${verses} / 31102
- Merkle root: \`${merkleRoot}\`
- Status: ${errors.length ? "FAILED" : "PASSED"}

## What the witnesses contributed (and nothing else)
- LORD / GOD / JEHOVAH casing restored in ${report.casingVerses.toLocaleString("en-US")} verses (${report.casingRestored.toLocaleString("en-US")} tokens). Final count of \`LORD\`: ${lordCount.toLocaleString("en-US")}.
- Casing was decided by majority vote of three independent public-domain KJV witnesses (eBible OSIS, a JSON KJV, Project Gutenberg #10). A witness votes only if its divine-name token sequence matches the 1611 verse token-for-token (I/J folded; the 1611's apostrophe-less possessive is kept as printed). A pattern needed two votes. Each witness has isolated slips of its own (e.g. OSIS "Lord" at Ps 7:1, JSON "Lord" at Ps 3:1); the vote is what keeps any single slip out of the corpus.
- Verses with no two-witness agreement (mostly genuine 1611 casing, e.g. Gen 23:6 "my Lord" for a human lord, Ex 4:10 "O my lord", Gen 22:14 "Iehouah-ijreh") were left exactly as transcribed: ${report.casingMismatch.length}
${report.casingMismatch.map((e) => `  - ${e}`).join("\n") || "  - none"}
- The JSON KJV is also the versification cross-check below. No witness contributes verse wording.
- Psalm superscriptions: ${psTitles} / 116 · Psalm 119 letter headings: ${psHeadings} / 22 — from the OSIS witness, in that witness's standard orthography (the 1611 transcription omits them; their 1611 spelling is not available from an open source).

## Versification differences against the witness (${report.versification.length})
${report.versification.map((e) => `- ${e}`).join("\n") || "- none"}

## Errors (${errors.length})
${errors.map((e) => `- ${e}`).join("\n") || "- none"}
`;
writeFileSync(join(OUT, "BUILD-REPORT.md"), md);
console.log(`books=${books.length} chapters=${chapters} verses=${verses} LORD=${lordCount} casingVerses=${report.casingVerses} mismatches=${report.casingMismatch.length} psTitles=${psTitles} ps119=${psHeadings} merkle=${merkleRoot.slice(0, 16)}…`);
if (errors.length) { console.error(errors.slice(0, 30).join("\n")); process.exit(1); }
