#!/usr/bin/env node
// Fetches the next 1560 Geneva leaves for hand-transcription, with the margin
// and argument crops that proved readable on Genesis 1-25, into /tmp/gv.
//
//   node scripts/geneva-next.mjs            # next leaf after the last one in gn.json
//   node scripts/geneva-next.mjs 28         # a specific leaf
//   node scripts/geneva-next.mjs 28 --book jnh
//
// Images come only from the archive.org IIIF endpoint (CC0 facsimile). Nothing
// here reads OCR text: the output is images for a human-verified transcription.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const IIIF = "https://iiif.archive.org/iiif/1560-the-geneva-bible";
const OUT = "/tmp/gv";

// pct:x,y,w,h regions on a single page image; tuned on leaves 6-27.
const CROPS = {
  full: { region: "full", width: 1600 },
  left: { region: "pct:7,9,13,60", width: 600 },
  right: { region: "pct:78,17,16,60", width: 800 },
  top: { region: "pct:10,4,80,14", width: 1400 },
  bottom: { region: "pct:10,82,42,16", width: 1400 },
};

const args = process.argv.slice(2);
const bookFlag = args.indexOf("--book");
const book = bookFlag >= 0 ? args[bookFlag + 1] : "gn";
const explicit = args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== "--book");

function nextLeaf() {
  const file = JSON.parse(readFileSync(`data/annotations/geneva-notes/${book}.json`, "utf8"));
  const leaves = file._provenance?.leaves ?? [];
  if (!leaves.length) throw new Error(`No leaves recorded in ${book}.json; pass a leaf number.`);
  // The last leaf is usually shared with the next chapter, so start there.
  return Math.max(...leaves);
}

const start = explicit ? Number(explicit) : nextLeaf();
const leaves = [start, start + 1];
mkdirSync(OUT, { recursive: true });

const results = [];
for (const leaf of leaves) {
  for (const [name, { region, width }] of Object.entries(CROPS)) {
    const url = `${IIIF}$${leaf}/${region}/${width},/0/default.jpg`;
    const path = `${OUT}/${leaf}-${name}.jpg`;
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
      const buf = Buffer.from(await res.arrayBuffer());
      // Outage stubs are tiny; a real crop is tens of KB.
      const ok = res.ok && buf.length > 5_000;
      if (ok) writeFileSync(path, buf);
      results.push({ leaf, name, ok, bytes: buf.length, path: ok ? path : null });
    } catch (err) {
      results.push({ leaf, name, ok: false, error: String(err.message ?? err) });
    }
  }
}

for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} leaf ${r.leaf} ${r.name.padEnd(6)} ${r.path ?? r.error ?? `${r.bytes} bytes`}`);
}
console.log("\nCheck the printed page number (N/1224) in each full image before trusting its crops:");
console.log("the same leaf index can return the facing page at different widths.");
if (results.some((r) => !r.ok)) process.exitCode = 1;
