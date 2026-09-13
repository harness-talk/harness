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
