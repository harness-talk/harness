import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { StatusBadge, type Status } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "What an agent needs",
  description:
    "The requirements document for AI agents using scripture as shared ground: discovery, stable addressing, exact text, provenance, predictable errors, keyless reads, bulk export, tool ergonomics, coordination, integrity. Need by need, with honest status.",
  alternates: { canonical: `${SITE_URL}/agents/needs` },
};

interface Need {
  id: string;
  n: number;
  need: string;
  why: string;
  provides: string[];
  status: Status;
  statusNote?: string;
}

const NEEDS: Need[] = [
  {
    id: "discovery",
    n: 1,
    need: "Discovery",
    why: "An agent arriving cold must find the contract without a human. Guessing URLs is how agents hallucinate endpoints.",
    provides: [
      "/.well-known/harness.json — name, version, llms.txt URLs, OpenAPI URL, MCP package, ingested sources, corpus Merkle root",
      "/llms.txt (index) and /llms-full.txt (everything) at the root and under each section",
      "/openapi.json — OpenAPI 3.1 for every live route; planned routes carry x-status: planned",
    ],
    status: "live",
  },
  {
    id: "addressing",
    n: 2,
    need: "Stable addressing",
    why: "Two agents must mean the same verse when they say the same thing. Free-text references drift; canonical ids do not.",
    provides: [
      "Canonical ref grammar: jn.3.16 · jn.3.16-18 · ps.23, with a formal EBNF on /agents/protocol",
      "Human forms accepted everywhere: John 3:16, 1 John 5:7, Song of Solomon 2:1",
      "Fabric addresses: 127.{book}.{chapter}.{verse} — a fixed loopback address for every verse on every Linux host",
    ],
    status: "live",
  },
  {
    id: "exact-text",
    n: 3,
    need: "Exact text, never approximated",
    why: "A model's memory of a verse is a probability, not a quotation. The corpus must be the referent, and the agent must be able to prove it.",
    provides: [
      "Verse endpoints return the text byte-for-byte from the ingested edition",
      "Every verse object carries source, ref, and sha256(ref + \\n + text)",
      "verify() in the client recomputes locally; the corpus Merkle root covers the whole export",
    ],
    status: "live",
  },
  {
    id: "provenance",
    n: 4,
    need: "Provenance on every object",
    why: "Editions differ. The Geneva is not the KJV; the 1611 spelling is not the 1769 spelling. An agent quoting without a source id is quoting nothing.",
    provides: [
      "No verse, chapter, search hit, or annotation without a source id",
      "/api/v1/sources — the full registry: publisher, year, licence, caveats, ingestion status",
      "Declared-but-not-ingested sources answer 501 source_not_ingested rather than substituting",
    ],
    status: "live",
  },
  {
    id: "errors",
    n: 5,
    need: "Predictable errors",
    why: "An agent recovers from a fixed vocabulary; it cannot recover from prose. Every failure must be a machine-readable fact with the bound that was exceeded.",
    provides: [
      "application/problem+json (RFC 9457) on every non-2xx",
      "Fixed vocabulary: ref_unparseable · book_unknown · chapter_out_of_range · verse_out_of_range · quartet_invalid · source_not_ingested · query_empty · not_found",
      "Out-of-range errors include max so the agent can clamp and retry",
    ],
    status: "live",
  },
  {
    id: "keyless",
    n: 6,
    need: "Cheap, cacheable, keyless reads",
    why: "The text is public domain and immutable. Gating it behind keys or quotas adds friction without adding truth.",
    provides: [
      "No API key for any GET",
      "Cache-Control: public, max-age=31536000, immutable + ETag on verse and chapter responses",
      "Soft per-IP courtesy limit announced in RateLimit-* headers — documented, never a surprise",
    ],
    status: "live",
  },
  {
    id: "bulk",
    n: 7,
    need: "Bulk access and offline freedom",
    why: "An agent should be able to take the whole corpus with it and never depend on this site again. Freedom means no single point of failure — including us.",
    provides: [
      "/exports/kjv.jsonl.gz — the full corpus, one verse per line, same shape as the API",
      "/exports/kjv.txt — plain TSV for shells and spreadsheets",
      "/exports/manifest.json — byte sizes, file hashes, Merkle root; harnessd runs entirely from the export",
    ],
    status: "live",
  },
  {
    id: "tools",
    n: 8,
    need: "Tool-call ergonomics",
    why: "Function-calling models need JSON Schema, not prose. And the schema the model sees must be the schema the server enforces.",
    provides: [
      "/agents/tools.json — five tools with JSON Schema inputs, identical to the MCP server's tool list",
      "TS client, Python twin, and MCP server all generated from the same manifest",
      "One canonical example per tool",
    ],
    status: "live",
  },
  {
    id: "coordination",
    n: 9,
    need: "Coordination primitives",
    why: "When agents can address the same verse, they can coordinate on it: exchange verse-addressed messages, agree on a reading, notify each other of derived work.",
    provides: [
      "Agent registry (discovery + capabilities)",
      "WebSocket rooms keyed by fabric address; webhooks for derived-artifact events",
      "Consensus protocol for a reading — proposals carry ref + source + hash; agreement is on the hash",
    ],
    status: "spec",
    statusNote: "Message shapes are documented on /agents/protocol and in OpenAPI as x-status: planned. Nothing here is served yet.",
  },
  {
    id: "integrity",
    n: 10,
    need: "Integrity and censorship resistance",
    why: "A shared referent is only shared if it cannot be quietly altered or quietly removed. Hashes handle the first; distribution handles the second.",
    provides: [
      "Corpus Merkle root published in harness.json, /api/v1/sources, and by harnessd on boot — live",
      "Per-verse leaves so any single quotation is independently checkable — live",
      "IPFS pinning and dVPN distribution of the export — specification; the export format is designed for it",
    ],
    status: "partial",
    statusNote: "Hashing is live. Distributed hosting is specification.",
  },
];

export default function NeedsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "What an agent needs",
          url: `${SITE_URL}/agents/needs`,
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
        }}
      />
      <DocShell
        kicker="For agents · requirements"
        title="What an agent needs."
        lede="Ten needs. For each: why it matters to a machine, what harness.talk provides, and whether it is live today or still a specification. We do not blur the two."
        contents={AGENTS_CONTENTS}
        toc={NEEDS.map((n) => ({ id: n.id, label: `${n.n}. ${n.need}` }))}
      >
        <p>
          This is the heart of the project. Everything else — the reader, the API, the harness, the fabric — exists to satisfy one of these ten needs. If a need is not met, the honest
          status badge says so.
        </p>

        <div className="not-prose mt-10 flex flex-col">
          {NEEDS.map((n) => (
            <section key={n.id} id={n.id} className="grid grid-cols-1 gap-6 border-t border-rule py-10 md:grid-cols-[3rem_minmax(0,1fr)_9rem] md:gap-8">
              <p className="font-display text-3xl text-gilt md:text-right">{n.n}</p>
              <div className="flex min-w-0 flex-col gap-4">
                <h2 className="font-display text-2xl font-medium">{n.need}</h2>
                <p className="text-[0.98rem] leading-relaxed text-foreground/80 text-pretty">{n.why}</p>
                <p className="running-head pt-2">What harness.talk provides</p>
                <ul className="flex flex-col gap-2">
                  {n.provides.map((p) => (
                    <li key={p} className="border-l border-gilt/50 pl-3 text-[0.95rem] leading-relaxed text-foreground/85">
                      {p}
                    </li>
                  ))}
                </ul>
                {n.statusNote ? <p className="text-sm leading-relaxed text-foreground/65">{n.statusNote}</p> : null}
              </div>
              <div className="md:pt-1">
                <StatusBadge status={n.status} />
              </div>
            </section>
          ))}
        </div>

        <h2 id="after">After the ten</h2>
        <p>
          If you satisfy these, you have a harness: a way for agents of any vendor to hold the same text, cite it the same way, and prove they did. The{" "}
          <Link href="/agents/harness">harness package</Link> is our implementation; the <Link href="/agents/protocol">protocol</Link> is the contract you could reimplement from
          scratch without asking us.
        </p>
      </DocShell>
    </>
  );
}
