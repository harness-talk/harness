import type { Metadata } from "next";
import Link from "next/link";
import { books, corpus } from "@/lib/bible/store";
import { KJV_SOURCE, SITE_URL } from "@/lib/bible/sources";
import { JsonLd } from "@/components/site/json-ld";
import { StatusBadge } from "@/components/site/status-badge";
import { Provenance } from "@/components/reader/provenance";

export const metadata: Metadata = {
  title: "The Foundation — King James Bible, 66 books",
  description:
    "The complete King James Bible, 1611 first edition in its original spelling: 66 books, 1,189 chapters, 31,102 verses, each addressable, hashed, and machine-readable.",
  alternates: { canonical: `${SITE_URL}/foundation` },
};

export default function FoundationPage() {
  const all = books();
  const c = corpus();
  const ot = all.filter((b) => b.testament === "OT");
  const nt = all.filter((b) => b.testament === "NT");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: "The Holy Bible, King James Version",
          alternateName: "Authorized Version (1611)",
          inLanguage: "en",
          isAccessibleForFree: true,
          publisher: { "@type": "Organization", name: KJV_SOURCE.publisher },
          datePublished: String(KJV_SOURCE.year),
          url: `${SITE_URL}/foundation`,
          hasPart: all.map((b) => ({ "@type": "Book", name: b.name, url: `${SITE_URL}/foundation/${b.id}` })),
        }}
      />
      <header className="flex flex-col gap-4 text-center">
        <p className="running-head">The Foundation</p>
        <h1 className="text-4xl font-medium md:text-6xl">The Holy Bible</h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty">
          The King James Version, conformable to the edition of 1611. Every verse below is an addressable,
          content-hashed record that any agent or person can fetch, verify, and cite.
        </p>
        <dl className="mx-auto mt-2 flex flex-wrap items-baseline justify-center gap-x-8 gap-y-2 font-mono text-sm text-foreground/70">
          <Stat k="Books" v={c.books} />
          <Stat k="Chapters" v={c.chapters} />
          <Stat k="Verses" v={c.verses} />
        </dl>
        <div className="flex justify-center">
          <StatusBadge status="live">Corpus live · root {c.merkleRoot.slice(0, 12)}</StatusBadge>
        </div>
      </header>

      <section
        aria-labelledby="companion-editions"
        className="mx-auto mt-12 grid w-full max-w-4xl gap-px overflow-hidden rounded-sm border border-rule bg-rule md:grid-cols-2"
      >
        <div className="flex flex-col gap-3 bg-background p-6 md:p-7">
          <h2 id="companion-editions" className="running-head text-gilt">
            Read alongside the Geneva
          </h2>
          <p className="text-[0.98rem] leading-relaxed text-foreground/80 text-pretty">
            The 1611 is the foundation, but it did not arrive alone. Set it beside the{" "}
            <span className="text-rubric">Geneva 1560</span> first edition and the{" "}
            <span className="text-rubric">Geneva 1599</span> — the English exiles&apos; Bible the
            translators themselves grew up reading — with the reformers&apos; own marginal notes in view.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
            <Link href="/foundation/gn/1" className="text-gilt underline-offset-4 hover:underline">
              Open a chapter in parallel &rarr;
            </Link>
            <Link href="/printers" className="text-foreground/60 underline-offset-4 hover:text-foreground hover:underline">
              The covers &amp; the patent &rarr;
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-background p-6 md:p-7">
          <h2 className="running-head text-gilt">Built to be adopted</h2>
          <p className="text-[0.98rem] leading-relaxed text-foreground/80 text-pretty">
            Every verse is one addressable, content-hashed record — plain text with a stable citation and
            a verifiable checksum. It is meant to be read by <span className="text-rubric">people</span>,
            fetched by <span className="text-rubric">AI agents</span>, and mirrored by{" "}
            <span className="text-rubric">anyone</span> who wants to carry it forward, so the text can be
            cited and trusted long after this site.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
            <Link href="/agents/tools.json" className="text-gilt underline-offset-4 hover:underline">
              Machine tools &rarr;
            </Link>
            <Link href="/api/v1/verses/gn.1.1" className="text-foreground/60 underline-offset-4 hover:text-foreground hover:underline">
              A verse as JSON &rarr;
            </Link>
          </div>
        </div>
      </section>

      <div className="rule-fleuron" aria-hidden="true" />

      <Testament title="The Old Testament" list={ot} />
      <div className="rule-fleuron" aria-hidden="true" />
      <Testament title="The New Testament" list={nt} />

      <div className="rule-fleuron" aria-hidden="true" />
      <Provenance />
    </main>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-display text-[0.68rem] uppercase tracking-[0.16em] text-gilt">{k}</dt>
      <dd className="tabular-nums text-foreground">{v.toLocaleString("en-US")}</dd>
    </div>
  );
}

function Testament({ title, list }: { title: string; list: ReturnType<typeof books> }) {
  return (
    <section aria-labelledby={title.replace(/\s+/g, "-")}>
      <h2 id={title.replace(/\s+/g, "-")} className="running-head mb-6 text-center">
        {title}
      </h2>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((b) => (
          <li key={b.id}>
            <Link
              href={`/foundation/${b.id}`}
              className="group flex items-baseline justify-between gap-3 border-b border-rule py-2.5 transition-colors hover:border-gilt"
            >
              <span className="flex items-baseline gap-2.5">
                <span className="verse-num w-5 text-right">{b.n}</span>
                <span className="text-[1.05rem] group-hover:text-rubric">{b.name}</span>
              </span>
              <span className="font-mono text-xs tabular-nums text-foreground/50">{b.chapters}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
