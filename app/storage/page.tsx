import type { Metadata } from "next";
import Link from "next/link";
import { CodeTabs } from "@/components/site/code-tabs";
import { StatusBadge } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { corpus } from "@/lib/bible/store";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Integrity & storage",
  description:
    "How the corpus is made tamper-evident: per-verse SHA-256, a Merkle root published in the discovery manifest, offline JSONL exports, and the planned IPFS and dVPN distribution for censorship resistance.",
  alternates: { canonical: `${SITE_URL}/storage` },
};

const TOC = [
  { id: "hashes", label: "Per-verse hashes" },
  { id: "merkle", label: "Merkle root" },
  { id: "verify", label: "Verify locally" },
  { id: "export", label: "Take the corpus with you" },
  { id: "distribution", label: "Decentralized distribution" },
  { id: "audit", label: "Audit trail" },
];

export default function StoragePage() {
  const c = corpus();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "Integrity & storage",
          url: `${SITE_URL}/storage`,
          about: "Content verification and censorship-resistant distribution of the harness.talk corpus",
        }}
      />
      <DocShell
        kicker="Integrity & storage"
        title="Exact, or not served"
        lede="Scripture data that can be quietly altered is worse than none. Every verse carries a hash, the whole corpus rolls up to one root, and any agent can check both without trusting this server."
        status="partial"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="hashes" className="doc-prose">
          <h2>Per-verse hashes</h2>
          <p>
            <code>sha256</code> on every verse object is the hash of the UTF-8 string{" "}
            <code>{"{source}|{ref}|{text}"}</code>. Binding the source id and the reference into the hash means a
            verse cannot be moved to another address, or another edition, without the hash changing.
          </p>
          <StatusBadge status="live" />
        </section>

        <section id="merkle" className="doc-prose">
          <h2>Merkle root</h2>
          <p>
            Verse hashes are ordered canonically (book, chapter, verse), paired and hashed upward to a single root. The
            root is published in <Link href="/.well-known/harness.json">/.well-known/harness.json</Link> and{" "}
            <Link href="/api/v1/sources">/api/v1/sources</Link>. It changes only if the text changes, which is the point.
          </p>
          <pre className="not-prose overflow-x-auto border border-rule p-5 font-mono text-[0.8rem] leading-relaxed">
{`corpus      ${c.source}
verses      ${c.verses.toLocaleString()}
leaf        ${c.leaf}
merkleRoot  ${c.merkleRoot}`}
          </pre>
          <StatusBadge status="live" />
        </section>

        <section id="verify" className="doc-prose">
          <h2>Verify locally</h2>
          <p>Recompute a verse hash yourself; the harness client does this in <code>verify()</code>.</p>
          <div className="not-prose mt-4">
            <CodeTabs
              tabs={[
                {
                  label: "bash",
                  lang: "bash",
                  code: `v=$(curl -s ${SITE_URL}/api/v1/verses/jn.3.16)
printf '%s|%s|%s' "$(jq -r .source <<<"$v")" "$(jq -r .ref <<<"$v")" "$(jq -r .text <<<"$v")" | sha256sum
jq -r .sha256 <<<"$v"   # must match`,
                },
                {
                  label: "node",
                  lang: "ts",
                  code: `import { createHash } from "node:crypto";
const v = await (await fetch("${SITE_URL}/api/v1/verses/jn.3.16")).json();
const h = createHash("sha256").update(\`\${v.source}|\${v.ref}|\${v.text}\`).digest("hex");
console.log(h === v.sha256); // true`,
                },
                {
                  label: "python",
                  lang: "python",
                  code: `import hashlib, json, urllib.request
v = json.load(urllib.request.urlopen("${SITE_URL}/api/v1/verses/jn.3.16"))
h = hashlib.sha256(f"{v['source']}|{v['ref']}|{v['text']}".encode()).hexdigest()
assert h == v["sha256"]`,
                },
              ]}
            />
          </div>
        </section>

        <section id="export" className="doc-prose">
          <h2>Take the corpus with you</h2>
          <p>
            <Link href="/exports/kjv.jsonl.gz">/exports/kjv.jsonl.gz</Link> is one verse per line — the same objects the
            API returns, same hashes — so an agent can go fully offline. <code>harnessd</code> serves from this file.
            Nothing here requires our server to keep existing.
          </p>
          <StatusBadge status="live" />
        </section>

        <section id="distribution" className="doc-prose">
          <h2>Decentralized distribution</h2>
          <p>
            Pinning the export to IPFS and mirroring across dVPN exits makes the corpus reachable when any single host
            is not. The Merkle root is what makes a mirror trustworthy: fetch from anywhere, check against the root you
            already hold.
          </p>
          <ul>
            <li>IPFS CID of each export published alongside the Merkle root.</li>
            <li>Mirror manifest listing known-good origins, signed.</li>
            <li>Client fallback order: local harnessd → configured mirrors → this site.</li>
          </ul>
          <StatusBadge status="spec" />
        </section>

        <section id="audit" className="doc-prose">
          <h2>Audit trail</h2>
          <p>
            The ingestion report (<code>data/kjv/BUILD-REPORT.md</code>) lists every line the parser had to resolve —
            page headers dropped mid-verse, inline verse markers split, caps fragments kept as text — so the path from the
            published edition to each JSON verse is inspectable. Build fails if the counts (66 / 1,189 / 31,102) or the
            spot-checked verses do not match.
          </p>
          <StatusBadge status="live" />
        </section>
      </DocShell>
    </>
  );
}
