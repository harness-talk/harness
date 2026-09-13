#!/usr/bin/env node
/**
 * fetch-sources.mjs — download every raw text witness the build scripts read,
 * into data/raw/, and pin each file's SHA-256 in data/raw/SOURCES.lock.json.
 *
 * All sources are public-domain scripture text from open repositories. None is
 * a ministry edition; none carries commentary. Re-running verifies the pinned
 * hashes and refuses to overwrite a locked file whose content has drifted
 * (pass --relock to accept new hashes deliberately).
 *
 *   node scripts/fetch-sources.mjs            # fetch missing, verify present
 *   node scripts/fetch-sources.mjs --relock   # accept and record new hashes
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "data/raw");
const LOCK = join(RAW, "SOURCES.lock.json");
const relock = process.argv.includes("--relock");
mkdirSync(RAW, { recursive: true });

/** @type {Record<string, {url: string, kind: "file"|"github-zip", into: string, note: string}>} */
const SOURCES = {
  "kjv-1611": {
    kind: "github-zip",
    url: "https://github.com/aruljohn/Bible-kjv-1611/archive/refs/heads/master.zip",
    into: "kjv-1611",
    note: "1611 first-edition KJV, original spelling, one JSON per book. Body text of the corpus.",
  },
  "kjv-witness": {
    kind: "github-zip",
    url: "https://github.com/aruljohn/Bible-kjv/archive/refs/heads/master.zip",
    into: "kjv-witness",
    note: "Standard (1769-orthography) KJV, one JSON per book. Used ONLY to restore the LORD/GOD small-capital casing the 1611 transcription flattened, and to cross-check versification. No text is taken from it.",
  },
  "kjv-osis": {
    kind: "file",
    url: "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml",
    into: "eng-kjv.osis.xml",
    note: "eBible.org public-domain KJV in OSIS. Used ONLY for the 138 Psalm titles (116 superscriptions + 22 Psalm 119 letter headings), which the 1611 transcription omits.",
  },
  "kjv-gutenberg": {
    kind: "file",
    url: "https://www.gutenberg.org/cache/epub/10/pg10.txt",
    into: "kjv-gutenberg.txt",
    note: "Project Gutenberg #10 KJV plain text. Third casing witness (LORD/GOD) for the majority vote; contributes no text.",
  },
  "kjv-crosswire": {
    kind: "zip",
    url: "https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/KJV.zip",
    into: "kjv-crosswire",
    note: "CrossWire KJV SWORD module (v3.1, OSIS with Strong's). Casing witness: it marks the divine name explicitly (<divineName>), so its LORD/GOD vote is markup, not a transcriber's shift key. Contributes no text.",
  },
  "geneva-1599": {
    kind: "zip",
    url: "https://ebible.org/Scriptures/enggnv_usfm.zip",
    into: "geneva-1599",
    note: "Geneva Bible, 1599 edition, original spelling, USFM straight from eBible.org (public domain). Verse text only; the marginal notes are not in this source. (The GitHub mirror of this text has a corrupted Genesis 38 — do not substitute it.) eBible.org is slow; allow several minutes.",
  },
  "geneva-1560-meta": {
    kind: "file",
    url: "https://archive.org/download/1560-the-geneva-bible/1560-the-geneva-bible_meta.xml",
    into: "geneva-1560-meta.xml",
    note: "Internet Archive item metadata for the 1560 Geneva Bible first edition (identifier 1560-the-geneva-bible, CC0/public domain). Provenance anchor for the facsimile; contributes no served text.",
  },
  "geneva-1560-pages": {
    kind: "file",
    url: "https://archive.org/download/1560-the-geneva-bible/1560%20The%20Geneva%20Bible_page_numbers.json",
    into: "geneva-1560-page_numbers.json",
    note: "Leaf/page index for the 1560 facsimile. Used ONLY to map a book+chapter to an approximate opening leaf for the facsimile image viewer; contributes no served text.",
  },
  "geneva-1560-ocr": {
    kind: "file",
    url: "https://archive.org/download/1560-the-geneva-bible/1560%20The%20Geneva%20Bible_djvu.txt",
    into: "geneva-1560-djvu.txt",
    note: "ABBYY/Tesseract OCR of the 1560 blackletter facsimile. UNRELIABLE (long-s ſ→f, fused columns and margins) — NEVER served as scripture. Locked only as the raw, tamper-evident INPUT to the experimental notes-reconstruction pipeline (scripts/build-geneva-notes.mjs), which labels every output 'reconstructed / unverified'.",
  },
};

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : {};

async function download(url, dest) {
  const res = await fetch(url, { headers: { "user-agent": "harness.talk fetch-sources" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Hash a directory deterministically: sorted relative paths + file hashes. */
function dirHash(dir) {
  const files = [];
  const walk = (d, rel = "") => {
    for (const f of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, f.name), r = rel ? `${rel}/${f.name}` : f.name;
      if (f.isDirectory()) walk(p, r); else files.push(`${r}\n${sha(p)}`);
    }
  };
  walk(dir);
  return createHash("sha256").update(files.join("\n")).digest("hex");
}

let changed = false;
for (const [id, s] of Object.entries(SOURCES)) {
  const dest = join(RAW, s.into);
  if (!existsSync(dest)) {
    console.log(`fetching ${id} …`);
    if (s.kind === "file") {
      await download(s.url, dest);
    } else if (s.kind === "zip") {
      const zip = join(RAW, `${id}.zip`);
      await download(s.url, zip);
      mkdirSync(dest);
      execSync(`unzip -q -o "${zip}" -d "${dest}"`);
      rmSync(zip);
    } else {
      const zip = join(RAW, `${id}.zip`);
      await download(s.url, zip);
      const tmp = join(RAW, `${id}.__unzip`);
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp);
      execSync(`unzip -q -o "${zip}" -d "${tmp}"`);
      const inner = readdirSync(tmp).find((n) => !n.startsWith("."));
      renameSync(join(tmp, inner), dest);
      rmSync(tmp, { recursive: true, force: true });
      rmSync(zip);
    }
  }
  const h = s.kind === "file" ? sha(dest) : dirHash(dest);
  const prev = lock[id]?.sha256;
  if (prev && prev !== h && !relock) {
    console.error(`LOCK MISMATCH ${id}: locked ${prev.slice(0, 16)}… got ${h.slice(0, 16)}…\nThe upstream content changed. Inspect it, then run with --relock to accept.`);
    process.exit(2);
  }
  if (prev !== h) changed = true;
  lock[id] = { url: s.url, into: s.into, sha256: h, note: s.note, fetchedAt: lock[id]?.fetchedAt && prev === h ? lock[id].fetchedAt : new Date().toISOString() };
  console.log(`${prev === h ? "ok      " : "locked  "} ${id}  ${h.slice(0, 16)}…`);
}
if (changed) writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
console.log(changed ? `wrote ${LOCK}` : "all sources match the lock");
