import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { CodeTabs } from "@/components/site/code-tabs";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Worked examples — agents reading Scripture correctly",
  description: "Six end-to-end examples: quote-and-verify, range fetch, RAG grounding, offline daemon, error handling, and bulk export.",
};

const TOC = [
  { id: "quote", label: "1. Quote and verify" },
  { id: "range", label: "2. A range, then a chapter" },
  { id: "rag", label: "3. Grounding a RAG answer" },
  { id: "offline", label: "4. Offline via harnessd" },
  { id: "errors", label: "5. Handling a bad reference" },
  { id: "bulk", label: "6. Bulk work from the export" },
];

export default function ExamplesPage() {
  return (
    <DocShell
      kicker="For agents · examples"
      title="Worked examples."
      lede="Each example is complete, runs against the live API or the local daemon, and shows the output you should see. Copy them; they are the tests."
      contents={AGENTS_CONTENTS}
      toc={TOC}
    >
      <section id="quote">
        <h2>1. Quote and verify</h2>
        <CodeTabs
          tabs={[
            {
              label: "JS",
              lang: "js",
              code: `import { createClient } from "./packages/harness/client/index.mjs";
const h = createClient({ baseUrl: "${SITE_URL}" });

const v = await h.getVerse({ ref: "John 3:16" });
const ok = await h.verify(v);
console.log(\`\${v.display} — \${v.text}\`);
console.log("verified:", ok, "sha256:", v.sha256.slice(0, 12) + "…");
// John 3:16 — For God so loved the world, that he gave his only begotten Son, …
// verified: true sha256: 7d0c…`,
            },
            {
              label: "curl",
              lang: "bash",
              code: `curl -s ${SITE_URL}/api/v1/verses/jn.3.16 | jq '{display, text, sha256}'
# then recompute:
printf 'jn.3.16\\n%s' "$(curl -s ${SITE_URL}/api/v1/verses/jn.3.16 | jq -r .text)" | sha256sum`,
            },
          ]}
        />
      </section>

      <section id="range">
        <h2>2. A range, then a chapter</h2>
        <CodeTabs
          tabs={[
            {
              label: "JS",
              lang: "js",
              code: `const r = await h.getVerse({ ref: "1co.13.4-7" });
console.log(r.display, r.count);            // 1 Corinthians 13:4–7 4
for (const v of r.verses) console.log(v.verse, v.text.slice(0, 40));

const ch = await h.getChapter({ ref: "ps.23" });
console.log(ch.display, ch.verses.length, ch.next, ch.prev);   // Psalm 23 6 ps.24 ps.22`,
            },
          ]}
        />
      </section>

      <section id="rag">
        <h2>3. Grounding a RAG answer</h2>
        <p>Search is lexical. Use it to find candidate references, then fetch and verify the verses you actually quote. Never quote from the search snippet.</p>
        <CodeTabs
          tabs={[
            {
              label: "JS",
              lang: "js",
              code: `const hits = await h.search({ q: "shepherd", book: "ps", limit: 5 });
const refs = hits.hits.map((x) => x.ref);            // ["ps.23.1", "ps.80.1", …]

const verses = await Promise.all(refs.map((ref) => h.getVerse({ ref })));
const grounded = [];
for (const v of verses) if (await h.verify(v)) grounded.push(v);

// Hand the model ONLY verified text, with references attached:
const context = grounded.map((v) => \`[\${v.display}] \${v.text}\`).join("\\n");`,
            },
          ]}
        />
      </section>

      <section id="offline">
        <h2>4. Offline via harnessd</h2>
        <CodeTabs
          tabs={[
            {
              label: "bash",
              lang: "bash",
              code: `npx harness-talk &          # fetches + verifies the export once, then serves it
# harnessd: 31,102 verses, root 3f2a…  listening on 127.0.0.0/8:1611

curl 127.43.3.16:1611
# For God so loved the world, …
curl -H 'Accept: application/json' 127.0.0.1:1611 | jq .merkleRoot
# identical to ${SITE_URL}/.well-known/harness.json`,
            },
            {
              label: "JS (auto)",
              lang: "js",
              code: `// The client probes 127.x.x.x:1611 first; unplug the network and this still works.
const h = createClient({ baseUrl: "${SITE_URL}" });
const v = await h.resolveQuartet({ quartet: "127.66.22.21" });
console.log(v.display, v.text);   // Revelation 22:21 The grace of our Lord Jesus Christ be with you all. Amen.`,
            },
          ]}
        />
      </section>

      <section id="errors">
        <h2>5. Handling a bad reference</h2>
        <CodeTabs
          tabs={[
            {
              label: "JS",
              lang: "js",
              code: `try {
  await h.getVerse({ ref: "John 3:99" });
} catch (e) {
  console.log(e.code, e.status, e.message);
  // verse_out_of_range 404 John 3 has 36 verses; 99 requested.
  // The right move: tell the user. Do NOT return a plausible-looking verse.
}`,
            },
            {
              label: "problem+json",
              lang: "json",
              code: `{
  "type": "${SITE_URL}/agents/protocol#verse_out_of_range",
  "title": "verse_out_of_range",
  "status": 404,
  "detail": "John 3 has 36 verses; 99 requested."
}`,
            },
          ]}
        />
      </section>

      <section id="bulk">
        <h2>6. Bulk work from the export</h2>
        <p>Do not page through the API for the whole Bible. Download the export once; it is 1.4 MB and carries its own root.</p>
        <CodeTabs
          tabs={[
            {
              label: "Node",
              lang: "js",
              code: `import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import readline from "node:readline";

const rl = readline.createInterface({ input: createReadStream("kjv.jsonl.gz").pipe(createGunzip()) });
let header, n = 0;
for await (const line of rl) {
  const row = JSON.parse(line);
  if (row.kind === "corpus") { header = row; continue; }   // first line: source + merkleRoot
  n++;                                                        // verse rows: ref, text, sha256, quartet…
}
console.log(header.merkleRoot, n);   // …, 31102`,
            },
            {
              label: "Python",
              lang: "python",
              code: `import gzip, json
with gzip.open("kjv.jsonl.gz", "rt", encoding="utf-8") as f:
    header = json.loads(next(f))
    verses = [json.loads(l) for l in f]
print(header["merkleRoot"], len(verses))   # …, 31102`,
            },
          ]}
        />
        <p>
          More on the file format and root in <Link href="/storage">Storage &amp; integrity</Link>.
        </p>
      </section>
    </DocShell>
  );
}
