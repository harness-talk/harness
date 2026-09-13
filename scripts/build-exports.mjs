/**
 * Builds bulk exports into public/exports/ so an agent can take the whole corpus
 * with it and never depend on this site again.
 *   public/exports/kjv-1611.jsonl.gz           one verse per line, same shape as /api/v1/verses
 *   public/exports/kjv-1611.txt                plain text, "jn.3.16\tJohn 3:16\t<text>"
 *   public/exports/manifest.json              sizes + sha256 of each file + corpus merkle root
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { CANON } from "../lib/bible/canon.ts";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "exports");
mkdirSync(OUT, { recursive: true });

const corpus = JSON.parse(readFileSync(join(ROOT, "data", "corpus.json"), "utf8"));
const sha = (s) => createHash("sha256").update(s).digest("hex");

const jsonl = [];
const tsv = [];
for (const b of CANON) {
  const d = JSON.parse(readFileSync(join(ROOT, "data", "kjv", `${b.id}.json`), "utf8"));
  for (const c of d.chapters) {
    for (const v of c.verses) {
      const ref = `${b.id}.${c.n}.${v.v}`;
      const rec = {
        ref,
        display: `${b.name} ${c.n}:${v.v}`,
        book: { id: b.id, name: b.name, ordinal: b.ordinal, testament: b.testament },
        chapter: c.n,
        verse: v.v,
        text: v.text,
        source: corpus.source,
        sha256: sha(`${ref}\n${v.text}`),
        quartet: `127.${b.ordinal}.${c.n}.${v.v}`,
      };
      jsonl.push(JSON.stringify(rec));
      tsv.push(`${ref}\t${rec.display}\t${v.text}`);
    }
  }
}
if (jsonl.length !== corpus.verses) throw new Error(`export count ${jsonl.length} != corpus ${corpus.verses}`);

// First line is a header carrying the source id and Merkle root so a downloaded
// export is self-describing and self-verifying (harnessd recomputes and compares).
const header = JSON.stringify({
  kind: "corpus",
  source: corpus.source,
  verses: corpus.verses,
  leaf: corpus.leaf,
  merkleRoot: corpus.merkleRoot,
  generatedAt: new Date().toISOString(),
});
const jsonlBuf = Buffer.from(header + "\n" + jsonl.join("\n") + "\n");
const gz = gzipSync(jsonlBuf, { level: 9 });
const txt = Buffer.from(tsv.join("\n") + "\n");

const files = {
  [`${corpus.source}.jsonl.gz`]: gz,
  [`${corpus.source}.txt`]: txt,
  // stable aliases — the documented URLs; always point at the current default KJV source
  "kjv.jsonl.gz": gz,
  "kjv.txt": txt,
};
const manifest = { source: corpus.source, merkleRoot: corpus.merkleRoot, leaf: corpus.leaf, verses: corpus.verses, builtAt: new Date().toISOString(), files: {} };
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(OUT, name), buf);
  manifest.files[name] = { bytes: buf.length, sha256: sha(buf) };
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
for (const [name, info] of Object.entries(manifest.files)) console.log(`${name}  ${(info.bytes / 1024).toFixed(0)} KB  ${info.sha256.slice(0, 16)}…`);
console.log("merkle", corpus.merkleRoot);
