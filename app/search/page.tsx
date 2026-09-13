import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/lib/bible/search";
import { searchDocs } from "@/lib/docs/search";
import { SITE_URL } from "@/lib/bible/sources";
import { SearchForm } from "@/components/search/search-form";
import { DocResults } from "@/components/search/doc-results";
import { VerseText } from "@/components/reader/verse-text";

export const metadata: Metadata = {
  title: "Concordance — search the King James Bible",
  description: "Search every verse of the KJV by word, phrase, or reference. Results are exact, hashed, and addressable.",
  alternates: { canonical: `${SITE_URL}/search` },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const pageN = Math.max(1, Number(page) || 1);
  const limit = 25;
  const result = q.trim() ? search(q, { limit, offset: (pageN - 1) * limit }) : null;
  // Documentation is a separate layer: searched only on the first page, and only for word queries.
  const docs = result && pageN === 1 && result.mode !== "reference" ? searchDocs(q, { limit: 5 }) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 md:px-8 md:py-16">
      <header className="flex flex-col gap-4 text-center">
        <p className="running-head">Concordance</p>
        <h1 className="text-4xl font-medium md:text-5xl">Seek, and ye shall find</h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-foreground/75 text-pretty">
          Ask in your own words. Modern spelling finds the 1611 text; verses where your words keep company come first. Every hit is the exact verse with its address and hash.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-2xl">
        <SearchForm initial={q} />
      </div>

      {result ? (
        <>
        <section aria-labelledby="scripture-results" aria-live="polite" className="mt-10">
          <div className="flex flex-col gap-1 border-b border-rule pb-2">
            <div className="flex items-baseline justify-between">
              <h2 id="scripture-results" className="running-head">
                In the Scripture
              </h2>
              <Link href={`/api/v1/search?q=${encodeURIComponent(q)}`} className="font-mono text-xs text-rubric underline underline-offset-[3px]">
                JSON
              </Link>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs text-foreground/60">
                {result.total.toLocaleString("en-US")} {result.total === 1 ? "verse" : "verses"} ·{" "}
                {result.mode === "reference"
                  ? "reference"
                  : result.mode === "phrase"
                    ? "exact phrase"
                    : result.mode === "idea"
                      ? "no verse has every word — ranked by how many it carries"
                      : result.mode === "common"
                        ? "too common a word to rank — every verse that has it, in canonical order"
                        : "every word present, closest together first"}
              </p>
            </div>
            {result.words.length > 0 ? (
              <p className="font-mono text-xs text-foreground/50">
                sought: {result.words.join(" · ")}
                {result.unmatched.length > 0 ? (
                  <>
                    {" "}
                    · <span className="text-rubric">not in the text in any spelling: {result.unmatched.join(", ")}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {result.hits.length === 0 ? (
            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 text-center text-foreground/70">
              <p>No verse carries any of these words.</p>
              {result.unmatched.length > 0 ? (
                <p className="text-sm text-pretty">
                  The 1611 text never uses {result.unmatched.map((w) => `“${w}”`).join(" or ")}. Try the word the text would
                  use — <em>friend</em>, <em>companion</em>, <em>wedding</em>, <em>tempest</em> — or a name or a place.
                </p>
              ) : null}
              {docs && docs.hits.length > 0 ? (
                <p className="text-sm text-foreground/60">The harness documentation does speak of this — see below.</p>
              ) : null}
            </div>
          ) : (
            <ol className="flex flex-col divide-y divide-rule">
              {result.hits.map((h) => (
                <li key={h.ref} className="flex flex-col gap-1.5 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link
                      href={`/foundation/${h.book.id}/${h.chapter}#v${h.verse}`}
                      className="font-display text-base font-medium hover:text-rubric"
                    >
                      {h.display}
                    </Link>
                    <span className="flex items-baseline gap-3 font-mono text-xs text-foreground/50">
                      {result.mode === "idea" ? (
                        <span title="query words present in this verse">
                          {h.matched.length}/{result.words.length - result.unmatched.length}
                        </span>
                      ) : null}
                      {h.quartet}
                    </span>
                  </div>
                  <p className="measure text-[1.08rem] leading-relaxed text-foreground/90 text-pretty">
                    <VerseText text={h.text} />
                  </p>
                </li>
              ))}
            </ol>
          )}

          {result.total > limit ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between border-t border-rule pt-4 text-sm">
              {pageN > 1 ? (
                <Link href={`/search?q=${encodeURIComponent(q)}&page=${pageN - 1}`} className="hover:text-rubric">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="font-mono text-xs text-foreground/60">
                {pageN} / {Math.ceil(result.total / limit)}
              </span>
              {pageN * limit < result.total ? (
                <Link href={`/search?q=${encodeURIComponent(q)}&page=${pageN + 1}`} className="hover:text-rubric">
                  Next →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
        {docs ? <DocResults result={docs} q={q} /> : null}
        </>
      ) : (
        <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Who is God\u2019s friend?", "an idea"],
            ["\u201ca friend that sticketh closer\u201d", "exact phrase"],
            ["Psalm 23", "reference"],
          ].map(([ex, kind]) => (
            <Link
              key={ex}
              href={`/search?q=${encodeURIComponent(ex.replace(/[\u201c\u201d]/g, '"'))}`}
              className="flex flex-col gap-1 border border-rule p-4 transition-colors hover:border-gilt"
            >
              <span className="font-display text-[0.66rem] uppercase tracking-[0.16em] text-gilt">{kind}</span>
              <span className="text-lg">{ex}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
