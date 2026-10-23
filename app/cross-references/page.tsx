import type { Metadata } from "next";
import Link from "next/link";
import { ArcChart } from "@/components/crossrefs/arc-chart";
import { VerseExplorer } from "@/components/crossrefs/verse-explorer";
import { THREADS, type ThreadKind } from "@/lib/bible/threads";
import { pairingVotes, verseText, CROSSREF_ATTRIBUTION } from "@/lib/bible/crossrefs";
import { parseRef, canonicalRef } from "@/lib/bible/refs";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Cross references — every thread from Genesis to Revelation",
  description:
    "An arc chart of 25,739 chapter-to-chapter connections across the King James Bible, a verse explorer with all 343,571 ranked references, and threads to follow: echoes, promises kept and patterns.",
  alternates: { canonical: `${SITE_URL}/cross-references` },
};

const KINDS: { kind: ThreadKind; id: string; label: string; term: string; blurb: string }[] = [
  {
    kind: "Typology",
    id: "echoes",
    label: "Echoes",
    term: "often called types",
    blurb: "An early person, event or object that a later passage looks back to.",
  },
  {
    kind: "Prophecy",
    id: "promises",
    label: "Promises kept",
    term: "often called prophecy",
    blurb: "Words spoken beforehand, and the later passage that says they came to pass.",
  },
  {
    kind: "Shadow",
    id: "patterns",
    label: "Patterns",
    term: "often called shadows",
    blurb: "Places where the text calls one thing a copy or shadow of another.",
  },
];

function normalize(input?: string) {
  try {
    return input ? canonicalRef(parseRef(input)) : "gn.3.15";
  } catch {
    return input ?? "gn.3.15";
  }
}

export default async function CrossReferencesPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const current = normalize(ref);
  const chapterRef = current.split(".").slice(0, 2).join(".");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-12 md:px-8 md:py-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="running-head text-rubric">Cross references</p>
        <h1 className="text-balance font-display text-4xl leading-tight md:text-5xl">
          One book, bound together by its own threads
        </h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          Every bar below is a chapter, Genesis on the left to Revelation on the right. Every arc is a place where
          one chapter points to another. Short arcs glow gilt; the long ones that reach across the Testaments turn
          red.
        </p>
        <dl className="grid gap-x-6 gap-y-2 border-l border-rule pl-4 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
          <dt className="running-head text-gilt">Scripture text</dt>
          <dd className="text-pretty">
            King James Version, the 1611 first edition in its original spelling, printed in London by Robert Barker.{" "}
            <Link href="/printers" className="text-rubric hover:underline">
              See the printed pages
            </Link>
          </dd>
          <dt className="running-head text-gilt">Cross references</dt>
          <dd className="text-pretty">
            <a href="https://www.openbible.info/labs/cross-references/" className="text-rubric hover:underline">
              OpenBible.info
            </a>
            , built on the Treasury of Scripture Knowledge and ranked by reader votes.
          </dd>
        </dl>
      </header>

      <section aria-label="Arc chart of cross references">
        <ArcChart selected={chapterRef} />
      </section>

      <section id="explore" aria-labelledby="explore-h" className="grid scroll-mt-8 gap-10 md:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-3">
          <h2 id="explore-h" className="font-display text-3xl">
            Trace a verse
          </h2>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Type a verse or chapter, or click any chapter in the chart. References are ranked by how many readers
            found the link helpful, and each is shown in the King James Version of 1611.
          </p>
        </div>
        <VerseExplorer key={current} initialRef={current} />
      </section>

      <section
        id="threads"
        aria-labelledby="threads-h"
        className="mt-6 flex scroll-mt-24 flex-col gap-10 border-t border-rule pt-14 md:mt-10 md:pt-20"
      >
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 id="threads-h" className="font-display text-3xl">
            Threads to follow
          </h2>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Some of the best-known places where one passage points back to another. Start with any verse, then tap
            a reference beside it to trace where the thread leads.
          </p>
          <nav aria-label="Thread groups" className="flex flex-wrap gap-2">
            {KINDS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="border border-rule px-3 py-1.5 text-sm hover:border-gilt hover:text-gilt"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {KINDS.map(({ kind, id, label, term, blurb }) => (
          <div key={kind} id={id} className="flex scroll-mt-24 flex-col gap-4">
            <div className="flex flex-col gap-1 border-b border-rule pb-3">
              <h3 className="running-head text-gilt">
                {label} <span className="normal-case tracking-normal text-muted-foreground">({term})</span>
              </h3>
              <p className="text-sm text-muted-foreground">{blurb}</p>
            </div>
            <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              {THREADS.filter((t) => t.kind === kind).map((t) => {
                const from = verseText(t.from);
                return (
                  <li key={t.title} className="flex flex-col gap-2">
                    <p className="font-display text-xl">{t.title}</p>
                    {from && (
                      <p className="text-pretty text-sm leading-relaxed text-foreground/80">
                        <Link href={`/cross-references?ref=${t.from}#explore`} className="text-rubric hover:underline">
                          {from.display}
                        </Link>{" "}
                        {from.text}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Leads to</p>
                    <ul className="flex flex-wrap gap-2">
                      {t.to.map((to) => {
                        const target = verseText(to);
                        const votes = pairingVotes(t.from, to);
                        return (
                          <li key={to}>
                            <Link
                              href={`/cross-references?ref=${to}#explore`}
                              className="flex items-baseline gap-2 border border-rule px-2.5 py-1 text-sm hover:border-gilt"
                            >
                              <span>{target?.display ?? to}</span>
                              {votes !== null && (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {votes}
                                  <span className="sr-only"> readers linked these verses</span>
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <footer className="flex flex-col gap-2 border-t border-rule pt-6 text-sm text-muted-foreground">
        <p>{CROSSREF_ATTRIBUTION}</p>
        <p>
          The arc chart follows Chris Harrison and Christoph Römhild&apos;s 2007 visualization, as reworked by{" "}
          <a href="https://trekhleb.dev/bible-cross-references/" className="text-rubric hover:underline">
            Oleksii Trekhleb
          </a>
          . Also available to agents at <code className="font-mono">/api/v1/crossrefs/{"{ref}"}</code>.
        </p>
        <p>Numbers beside a reference show how many readers marked that link as helpful.</p>
      </footer>
    </main>
  );
}
