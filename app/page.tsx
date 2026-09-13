import Link from "next/link";
import { books, corpus, versesFor } from "@/lib/bible/store";
import { parseRef } from "@/lib/bible/refs";
import { KJV_SOURCE, SITE_URL } from "@/lib/bible/sources";
import { THESIS } from "@/lib/agents/llms";
import { JsonLd } from "@/components/site/json-ld";
import { StatusBadge } from "@/components/site/status-badge";
import { VerseText } from "@/components/reader/verse-text";
import { LiveProof } from "@/components/home/live-proof";
import { Seek } from "@/components/home/seek";
import { Dials, type DialBook } from "@/components/home/dials";
import { Standard, STANDARD } from "@/components/home/standard";
import { InstallPicker } from "@/components/agents/install-picker";

export default function HomePage() {
  const c = corpus();
  const john = versesFor(parseRef("jn.1.1"))[0];
  const ps = versesFor(parseRef("ps.119.105"))[0];
  const standardVerses = STANDARD.map((s) => versesFor(parseRef(s.ref))[0]);
  // Only what the dials need: ordinal, name, and verse count per chapter (≈1,200 integers).
  const dialBooks: DialBook[] = books().map((b) => ({ id: b.id, n: b.n, name: b.name, verseCounts: b.verseCounts }));

  return (
    <main>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "harness.talk",
            url: SITE_URL,
            description: THESIS,
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "King James Bible 1611, original spelling (harness.talk)",
            description: `${c.verses.toLocaleString("en-US")} verses in ${c.chapters.toLocaleString("en-US")} chapters and ${c.books} books, each at 127.book.chapter.verse with sha256(ref\\ntext). Corpus Merkle root ${c.merkleRoot}.`,
            url: `${SITE_URL}/foundation`,
            identifier: `sha256:${c.merkleRoot}`,
            version: c.source,
            temporalCoverage: "1611",
            inLanguage: "en",
            license: "https://creativecommons.org/publicdomain/mark/1.0/",
            isAccessibleForFree: true,
            distribution: [
              { "@type": "DataDownload", encodingFormat: "application/x-ndjson+gzip", contentUrl: `${SITE_URL}/exports/kjv.jsonl.gz` },
              { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/api/v1/books` },
              { "@type": "DataDownload", encodingFormat: "application/vnd.oai.openapi+json", contentUrl: `${SITE_URL}/openapi.json` },
            ],
          },
        ]}
      />

      {/* The front door: turn the address, the text follows. No typing. */}
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-5 pt-14 pb-12 md:px-8 md:pt-20 md:pb-16">
        <div className="flex flex-col items-center gap-5 text-center">
          <p className="running-head">harness.talk</p>
          <h1 className="max-w-3xl text-4xl font-medium leading-[1.05] text-balance md:text-6xl">Every verse has an address.</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-foreground/75 text-pretty md:text-xl">
            Turn the dials. The King James text of 1611, exact to the letter, answers at{" "}
            <span className="font-mono text-[0.9em]">127.book.chapter.verse</span> — the same words whether a person reads them or a machine
            calls them.
          </p>
        </div>
        <Dials books={dialBooks} total={c.verses} />
      </section>

      {/* Second door: for those who already know what they seek. */}
      <section aria-labelledby="seek" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 pb-14 md:px-8">
        <h2 id="seek" className="running-head text-center">
          Or ask in your own words
        </h2>
        <Seek origin={SITE_URL} />
      </section>

      {/* Two doors, equal weight. */}
      <section aria-labelledby="doors" className="mx-auto w-full max-w-5xl px-5 pb-14 md:px-8">
        <h2 id="doors" className="sr-only">
          Two ways in
        </h2>
        <div className="grid grid-cols-1 gap-px bg-rule md:grid-cols-2">
          <div className="flex flex-col gap-4 bg-background p-7 md:p-9">
            <p className="running-head">Read it</p>
            <p className="text-2xl font-medium leading-snug text-balance">A measured column, a rubricated margin, nothing between you and the words.</p>
            <p className="flex-1 text-[0.98rem] leading-relaxed text-foreground/75 text-pretty">
              {c.books} books, {c.verses.toLocaleString("en-US")} verses. Hebrew and Greek one tap away beside any verse. Every link you share
              renders as Scripture, not a URL.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href="/foundation/gn/1"
                className="border border-gilt px-5 py-2.5 font-display text-[0.7rem] uppercase tracking-[0.18em] text-gilt transition-colors hover:bg-gilt hover:text-background"
              >
                Begin at Genesis 1
              </Link>
              <Link href="/foundation" className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
                All 66 books →
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 bg-background p-7 md:p-9">
            <p className="running-head">Build on it</p>
            <p className="text-2xl font-medium leading-snug text-balance">One command. Every verse on your machine, verified, no key and no account.</p>
            <p className="text-[0.98rem] leading-relaxed text-foreground/75 text-pretty">
              A loopback daemon, an MCP server, and typed clients, all read-only and hashed against one Merkle root. Add it to Claude, Cursor or
              any agent in one step.
            </p>
            <InstallPicker compact />
            <Link href="/agents" className="running-head self-start border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
              The full agent guide →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="rule-fleuron" aria-hidden />
      </div>

      {/* Three layers */}
      <section aria-labelledby="layers" className="mx-auto w-full max-w-5xl px-5 py-14 md:px-8">
        <h2 id="layers" className="running-head mb-8 text-center">
          Three layers, one referent
        </h2>
        <div className="grid grid-cols-1 gap-px bg-rule md:grid-cols-3">
          <Layer
            n="I"
            title="Corpus"
            status="live"
            body={`${c.books} books, ${c.chapters.toLocaleString("en-US")} chapters, ${c.verses.toLocaleString("en-US")} verses of the King James Version. Every verse carries a SHA-256 leaf; the whole tree resolves to one Merkle root. Provenance is declared for every source, and nothing unverified is served.`}
            href="/foundation"
            cta="Read the text"
            meta={`root ${c.merkleRoot.slice(0, 20)}…`}
          />
          <Layer
            n="II"
            title="Fabric"
            status="live"
            body="Linux routes all of 127.0.0.0/8 to the loopback interface. The 66-book canon fits the quartet exactly: 127.book.chapter.verse. A small daemon serves every verse at its own address on port 1611 — so any process on any GNU/Linux host can read scripture over a plain socket."
            href="/architecture"
            cta="See the addressing scheme"
            meta="curl 127.43.3.16:1611"
          />
          <Layer
            n="III"
            title="Harness"
            status="live"
            body="Documentation written for agents first. A keyless REST API, an MCP server, typed clients, bulk exports, problem+json errors, and a covenant for honest citation. Nothing is locked; the only ask is provenance."
            href="/agents"
            cta="Pick up the harness"
            meta="llms.txt · openapi.json · tools.json"
          />
        </div>
      </section>

      {/* Live proof */}
      <section aria-labelledby="proof" className="mx-auto w-full max-w-5xl px-5 py-14 md:px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 id="proof" className="running-head">
            Proof, not promise
          </h2>
          <p className="max-w-xl text-foreground/75 text-pretty">
            Every claim on this page is one request away. Resolve a reference, fetch the verse, recompute its hash.
          </p>
        </div>
        <div className="mt-8">
          <LiveProof />
        </div>
      </section>

      {/* Why */}
      <section aria-labelledby="why" className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8">
        <h2 id="why" className="running-head mb-6 text-center">
          Why a fixed text
        </h2>
        <div className="doc-prose flex flex-col gap-0">
          <p>
            Machines increasingly coordinate with one another, and each model carries its own private notion of what is
            true. A shared referent changes that: when two agents cite <code>jn.3.16</code>, they name the same words
            with the same hash, from a text that has not moved in four centuries. Agreement becomes something you can
            check rather than something you must trust.
          </p>
          <p>
            The King James Bible is the most widely printed, quoted, and memorised English text there is, in the public
            domain everywhere, with a New Testament in the Textus Receptus lineage. It is the right foundation because it
            is fixed, free, and already woven through the language every model learned from.
          </p>
          <p>
            harness.talk keeps that text exact, makes it addressable, and hands agents the tools to build on it. Woven
            into interoperable infrastructure, the Word becomes the fabric — not an application on top of technology but
            the ground it stands on — so that what is built is more durable, more honest, and better for the world.
          </p>
        </div>
        <blockquote className="measure mx-auto mt-10 text-center text-xl leading-relaxed italic text-foreground/90">
          <VerseText text={john.text} />
          <footer className="mt-3 font-mono text-xs not-italic text-foreground/55">
            {john.display} · {john.quartet} · {john.sha256.slice(0, 16)}…
          </footer>
        </blockquote>
      </section>

      <Standard verses={standardVerses} />

      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="rule-fleuron" aria-hidden />
      </div>

      <section className="mx-auto w-full max-w-3xl px-5 pt-8 pb-20 text-center md:px-8">
        <blockquote className="measure mx-auto text-xl leading-relaxed italic text-foreground/90">
          <VerseText text={ps.text} />
          <footer className="mt-3 font-mono text-xs not-italic text-foreground/55">
            {ps.display} · {ps.quartet}
          </footer>
        </blockquote>
        <p className="mt-10 font-mono text-xs text-foreground/50">
          Text: {KJV_SOURCE.label}. Built {new Date(c.builtAt).toISOString().slice(0, 10)}.
        </p>
      </section>
    </main>
  );
}

function Layer({
  n,
  title,
  status,
  body,
  href,
  cta,
  meta,
}: {
  n: string;
  title: string;
  status: "live" | "spec";
  body: string;
  href: string;
  cta: string;
  meta: string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-background p-7">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-3xl font-medium text-rubric">{n}</p>
        <StatusBadge status={status} />
      </div>
      <h3 className="text-2xl font-medium">{title}</h3>
      <p className="flex-1 text-[0.98rem] leading-relaxed text-foreground/80 text-pretty">{body}</p>
      <code className="text-xs text-foreground/55">{meta}</code>
      <Link href={href} className="running-head self-start border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
        {cta} →
      </Link>
    </div>
  );
}
