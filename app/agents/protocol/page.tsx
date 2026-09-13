import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { CodeTabs } from "@/components/site/code-tabs";
import { ERROR_CODES } from "@/lib/agents/tools";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Protocol — references, quartets, hashes, errors",
  description:
    "The wire contract: canonical reference grammar, quartet addressing, response envelope, SHA-256 leaves and Merkle root, RFC 9457 problems, caching headers.",
};

const TOC = [
  { id: "refs", label: "Reference grammar" },
  { id: "quartet", label: "Quartet addressing" },
  { id: "envelope", label: "Response envelope" },
  { id: "hash", label: "Hashes & Merkle" },
  { id: "errors", label: "Errors" },
  { id: "caching", label: "Caching & headers" },
  { id: "stability", label: "Stability" },
];

export default function ProtocolPage() {
  return (
    <DocShell
      kicker="For agents · protocol"
      title="Protocol."
      lede="Everything an agent must know to speak to harness.talk without reading the source. Short on purpose. Each rule has an anchor so problem responses can point at it."
      contents={AGENTS_CONTENTS}
      toc={TOC}
    >
      <section id="refs">
        <h2>Reference grammar</h2>
        <p>
          A canonical reference is <code>BOOK.CHAPTER[.VERSE[-VERSE]]</code> with a lowercase book id. Human forms are accepted on input and always
          normalised on output.
        </p>
        <CodeTabs
          tabs={[
            {
              label: "Grammar",
              lang: "text",
              code: `ref       := book "." chapter [ "." verse [ "-" verse ] ]
book      := 2–3 lowercase letters, optionally prefixed by 1|2|3   (gn, ps, 1jn, re)
chapter   := 1..N                                                  (N from /api/v1/books/{id})
verse     := 1..M                                                  (M from the chapter)

Accepted on input, never emitted:
  "John 3:16"  "Jn 3.16"  "1 John 5:7"  "Psalm 119:176"  "Song of Solomon 2:1"`,
            },
          ]}
        />
        <p>
          Book ids are listed at <code>/api/v1/books</code>. They are stable and will never be renumbered.
        </p>
      </section>

      <section id="quartet">
        <h2>Quartet addressing</h2>
        <p>
          <code>127.BOOK.CHAPTER.VERSE</code>. Book is the canon ordinal (Genesis 1 … Revelation 66). Chapter and verse are 1-based. A zero
          collapses scope: verse 0 is the chapter, chapter 0 is the book, <code>127.0.0.1</code> is the corpus. Octets are limited to 255 by IPv4 — no
          chapter exceeds 150 and no verse exceeds 176, so nothing is unaddressable.
        </p>
        <CodeTabs
          tabs={[
            {
              label: "Resolve",
              lang: "bash",
              code: `GET ${SITE_URL}/api/v1/resolve/127.43.3.16     # John 3:16
GET ${SITE_URL}/api/v1/resolve/127.19.23.0     # Psalm 23 (chapter)
GET ${SITE_URL}/api/v1/resolve/127.66.0.0      # Revelation (book)
GET ${SITE_URL}/api/v1/resolve/127.0.0.1       # corpus index

# locally, with harnessd running:
curl 127.43.3.16:1611`,
            },
          ]}
        />
      </section>

      <section id="envelope">
        <h2>Response envelope</h2>
        <p>Every verse object is the same shape wherever it appears — alone, in a range, inside a chapter, in search hits, or from the daemon.</p>
        <CodeTabs
          tabs={[
            {
              label: "verse",
              lang: "json",
              code: `{
  "ref": "jn.3.16",
  "display": "John 3:16",
  "book": { "id": "jn", "name": "John", "ordinal": 43 },
  "chapter": 3,
  "verse": 16,
  "text": "¶ For God so loued þ world, that he gaue his only begotten Sonne: ...",
  "source": "kjv-1611",
  "sha256": "…64 hex…",
  "quartet": "127.43.3.16",
  "url": "${SITE_URL}/foundation/jn/3#v16"
}`,
            },
            {
              label: "range / chapter",
              lang: "json",
              code: `{
  "ref": "jn.3.16-18",
  "display": "John 3:16–18",
  "count": 3,
  "verses": [ { …verse… }, { …verse… }, { …verse… } ]
}`,
            },
          ]}
        />
        <p>
          Fields are additive. New keys may appear; existing keys will not change meaning or type within <code>/api/v1</code>.
        </p>
      </section>

      <section id="hash">
        <h2>Hashes and the Merkle root</h2>
        <CodeTabs
          tabs={[
            {
              label: "Definition",
              lang: "text",
              code: `leaf(v)   = SHA-256( v.ref + "\\n" + v.text )          # UTF-8, no trailing newline
node(l,r) = SHA-256( bytes(l) || bytes(r) )             # raw 32-byte digests, not hex
                                                        # odd leaf pairs with itself
root      = hex( fold over all 31,102 leaves in canon order )

published at  /.well-known/harness.json  →  corpus.merkleRoot
and inside    /exports/kjv.jsonl.gz      →  first line`,
            },
            {
              label: "Verify (JS)",
              lang: "js",
              code: `const bytes = new TextEncoder().encode(v.ref + "\\n" + v.text);
const buf = await crypto.subtle.digest("SHA-256", bytes);
const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
hex === v.sha256   // true, or the text was altered`,
            },
          ]}
        />
        <p>
          The leaf rule is deliberately trivial. If you cannot reproduce it in your language in five lines, it is wrong. Inclusion proofs (a leaf's
          sibling path to the root) are specified but not yet served — see <Link href="/storage">Storage &amp; integrity</Link>.
        </p>
      </section>

      <section id="errors">
        <h2>Errors</h2>
        <p>
          All errors are <code>application/problem+json</code> (RFC 9457). <code>type</code> is a URL into this page; <code>title</code> is the
          machine code below; <code>status</code> is the HTTP status; <code>detail</code> is for humans and may change.
        </p>
        <table>
          <thead>
            <tr>
              <th>title</th>
              <th>status</th>
              <th>meaning</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_CODES.map((e) => (
              <tr key={e.code} id={e.code}>
                <td>
                  <code>{e.code}</code>
                </td>
                <td>{e.status}</td>
                <td>{e.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <CodeTabs
          tabs={[
            {
              label: "Example",
              lang: "json",
              code: `HTTP/1.1 404
Content-Type: application/problem+json

{
  "type": "${SITE_URL}/agents/protocol#book_unknown",
  "title": "book_unknown",
  "status": 404,
  "detail": "No book with id 'zz'. See /api/v1/books for the 66 ids."
}`,
            },
          ]}
        />
      </section>

      <section id="caching">
        <h2>Caching and headers</h2>
        <ul>
          <li>
            Scripture responses are immutable for a given corpus: <code>Cache-Control: public, max-age=31536000, immutable</code> plus a strong{" "}
            <code>ETag</code>. Send <code>If-None-Match</code> and expect <code>304</code>.
          </li>
          <li>
            Search and index responses use a short public cache (<code>max-age=300</code>).
          </li>
          <li>
            <code>X-Harness-Corpus</code> carries the source id; <code>X-Harness-Root</code> carries the Merkle root, on every 200.
          </li>
          <li>
            CORS is open (<code>*</code>) for GET. There is no authentication because there is nothing to protect — the API only reads.
          </li>
        </ul>
      </section>

      <section id="stability">
        <h2>Stability</h2>
        <p>
          <code>/api/v1</code> is frozen at the field level: keys are additive only, ids never renumber, hashes never change for a given source id. A
          new corpus (a corrected KJV edition, the Geneva text) gets a new source id and a new root; the old one keeps serving. Breaking changes go to{" "}
          <code>/api/v2</code> and <code>/api/v1</code> stays up.
        </p>
      </section>
    </DocShell>
  );
}
