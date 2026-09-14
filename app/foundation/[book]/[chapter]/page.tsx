import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CANON, bookById } from "@/lib/bible/canon";
import { bookMeta, chapterPayload, parallelChapter } from "@/lib/bible/store";
import { annotationsFor, kjvHeadings } from "@/lib/bible/annotations";
import { GENEVA_NOTES_SOURCE_ID, GENEVA_SOURCE, GENEVA_SOURCE_ID, KJV_SOURCE, SITE_URL } from "@/lib/bible/sources";
import { JsonLd } from "@/components/site/json-ld";
import { VerseReader } from "@/components/reader/verse-reader";
import { Marginalia } from "@/components/reader/marginalia";
import { ChapterNav } from "@/components/reader/chapter-nav";
import { FacsimileViewer } from "@/components/reader/facsimile-viewer";
import { leafForChapter, facsimileInfo } from "@/lib/bible/facsimile";
import { OriginalsToggle } from "@/components/reader/originals-toggle";
import { originalsAvailable, originalVersesFor, originalSourceFor, originalChapterCount, type OriginalVersePayload } from "@/lib/bible/originals";
import { sourceById } from "@/lib/bible/sources";

export function generateStaticParams() {
  // 1,189 chapters — cheap to prerender, and every one becomes a stable URL for crawlers and agents.
  return CANON.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.id, chapter: String(i + 1) })));
}

type Params = Promise<{ book: string; chapter: string }>;

function resolve(book: string, chapterStr: string) {
  const b = bookById(book);
  const n = Number(chapterStr);
  if (!b || !Number.isInteger(n) || n < 1 || n > b.chapters) return null;
  return { book: b, chapter: n };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book, chapter } = await params;
  const r = resolve(book, chapter);
  if (!r) return {};
  const p = chapterPayload(r);
  const first = p.verses[0]?.text ?? "";
  return {
    title: `${p.display} — KJV 1611`,
    description: `${p.display}, King James Bible 1611, original spelling. "${first.slice(0, 140)}${first.length > 140 ? "…" : ""}" — ${p.verses.length} verses at ${p.quartet}.`,
    alternates: { canonical: `${SITE_URL}/foundation/${r.book.id}/${r.chapter}` },
    openGraph: { title: p.display, description: `${first.slice(0, 160)}${first.length > 160 ? "…" : ""} — ${p.verses.length} verses at ${p.quartet}`, type: "article" },
  };
}

export default async function ChapterPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const r = resolve(book, chapter);
  if (!r) notFound();
  const p = chapterPayload(r);
  const meta = bookMeta(r.book.id)!;
  const geneva = annotationsFor(GENEVA_NOTES_SOURCE_ID, r);
  const headings = kjvHeadings(r);
  const genevaText = parallelChapter(r.book.id, r.chapter, GENEVA_SOURCE_ID);

  // Original-language layer (OT: Hebrew WLC/OSHB, NT: Greek SBLGNT). Own versification, never remapped.
  const origSourceId = originalSourceFor(r.book);
  const origSource = sourceById(origSourceId);
  const hasOriginals = originalsAvailable() && origSource?.status === "ingested";
  let originals: Map<number, OriginalVersePayload> | undefined;
  let origCount: number | null = null;
  if (hasOriginals) {
    originals = new Map(originalVersesFor(r).verses.map((o) => [o.verse, o]));
    origCount = originalChapterCount(r.book.id, r.chapter);
  }
  const origLabel = r.book.testament === "OT" ? "Hebrew" : "Greek";
  const origLong = r.book.testament === "OT" ? "Hebrew (WLC / OSHB)" : "Greek (SBLGNT — critical text, not the Textus Receptus)";

  // The real 1560 first-edition page (Internet Archive facsimile, CC0) — page images only.
  const fax = leafForChapter(r.book.id, r.chapter);
  const faxInfo = facsimileInfo();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: p.display,
    position: r.chapter,
    isPartOf: {
      "@type": "Book",
      name: `${r.book.name} (King James Version)`,
      url: `${SITE_URL}/foundation/${r.book.id}`,
      isPartOf: { "@type": "Book", name: "The Holy Bible, King James Version", url: `${SITE_URL}/foundation` },
    },
    url: `${SITE_URL}/foundation/${r.book.id}/${r.chapter}`,
    inLanguage: "en",
    datePublished: String(KJV_SOURCE.year),
    workExample: { "@type": "Book", bookEdition: KJV_SOURCE.edition },
    identifier: [
      { "@type": "PropertyValue", propertyID: "harness-ref", value: p.ref },
      { "@type": "PropertyValue", propertyID: "loopback-quartet", value: p.quartet },
    ],
    hasPart: p.verses.map((v) => ({
      "@type": "CreativeWork",
      name: v.display,
      text: v.text,
      identifier: [
        { "@type": "PropertyValue", propertyID: "harness-ref", value: v.ref },
        { "@type": "PropertyValue", propertyID: "sha256", value: v.sha256 },
      ],
      url: `${SITE_URL}/foundation/${r.book.id}/${r.chapter}#v${v.verse}`,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <JsonLd data={jsonLd} />

      {/* Running head, as on a printed page */}
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <nav aria-label="Breadcrumb" className="running-head flex items-center gap-2">
          <Link href="/foundation" className="hover:text-rubric">
            The Foundation
          </Link>
          <span aria-hidden>·</span>
          <Link href={`/foundation/${r.book.id}`} className="hover:text-rubric">
            {r.book.name}
          </Link>
        </nav>
        <p className="running-head">
          <span className="text-foreground/50">{p.quartet}</span>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:gap-16">
        <article aria-labelledby="chapter-title" className="min-w-0">
          <header className="flex flex-col gap-2">
            <p className="running-head">Chapter {r.chapter}</p>
            <h1 id="chapter-title" className="text-4xl font-medium md:text-5xl">
              {r.book.name}{" "}
              <span className="text-rubric">{r.chapter}</span>
            </h1>
            {p.title ? <p className="mt-2 text-base italic leading-relaxed text-foreground/75 text-pretty">{p.title}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="running-head mr-0.5 text-foreground/40">Compare</span>
                <OriginalsToggle
                  label="Parallel columns"
                  sourceLabel={`Read King James 1611, Geneva 1599${hasOriginals ? `, and ${origLabel}` : ""} side by side`}
                  readerId="reader"
                  layer="compare"
                />
                <span aria-hidden className="mx-0.5 h-5 w-px bg-rule" />
                <OriginalsToggle label="Geneva 1599" sourceLabel={GENEVA_SOURCE.label} readerId="reader" layer="geneva" />
                {geneva.available && geneva.annotations.some((a) => a.kind === "note") ? (
                  <OriginalsToggle
                    label="Geneva 1560 notes"
                    sourceLabel="The reformers' 1560 marginal notes, shown inline beside each verse"
                    readerId="reader"
                    layer="geneva-notes"
                  />
                ) : null}
                {hasOriginals ? <OriginalsToggle label={origLabel} sourceLabel={origLong} readerId="reader" /> : null}
                <span aria-hidden className="mx-0.5 h-5 w-px bg-rule" />
                <FacsimileViewer
                  bookName={r.book.name}
                  chapter={r.chapter}
                  initialLeaf={fax.leaf}
                  approximate={fax.approximate}
                  unmapped={fax.unmapped}
                  iiifBase={faxInfo.iiifBase}
                  archiveReader={faxInfo.archiveReader}
                  leaves={faxInfo.leaves}
                />
              </div>
              {(hasOriginals && origCount != null && origCount !== p.verses.length) || genevaText.size !== p.verses.length ? (
                <div className="flex flex-col gap-0.5">
                  {hasOriginals && origCount != null && origCount !== p.verses.length ? (
                    <p className="running-head normal-case tracking-normal text-foreground/45">
                      {origLabel} numbers {origCount} verses here, the KJV {p.verses.length} — shown at matching numbers, not remapped
                    </p>
                  ) : null}
                  {genevaText.size !== p.verses.length ? (
                    <p className="running-head normal-case tracking-normal text-foreground/45">
                      Geneva 1599 numbers {genevaText.size} verses here, the KJV {p.verses.length} — shown at matching numbers, not remapped
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          <VerseReader
            verses={p.verses}
            headings={headings}
            notes={geneva.available ? geneva.annotations.filter((a) => a.kind === "note") : []}
            bookId={r.book.id}
            chapter={r.chapter}
            originals={originals}
            originalLabel={origLabel}
            geneva={genevaText}
            readerId="reader"
          />

          <ChapterNav prev={p.prev} next={p.next} bookId={r.book.id} chapter={r.chapter} chapters={meta.chapters} />
        </article>

        <Marginalia
          bookId={r.book.id}
          chapter={r.chapter}
          quartet={p.quartet}
          chapterRef={p.ref}
          verseCount={p.verses.length}
          geneva={geneva}
          facsimile={{
            bookName: r.book.name,
            chapter: r.chapter,
            initialLeaf: fax.leaf,
            approximate: fax.approximate,
            unmapped: fax.unmapped,
            iiifBase: faxInfo.iiifBase,
            archiveReader: faxInfo.archiveReader,
            leaves: faxInfo.leaves,
          }}
        />
      </div>
    </main>
  );
}
