import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CANON, bookById } from "@/lib/bible/canon";
import { bookMeta, chapter } from "@/lib/bible/store";
import { SITE_URL } from "@/lib/bible/sources";
import { JsonLd } from "@/components/site/json-ld";

export function generateStaticParams() {
  return CANON.map((b) => ({ book: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }): Promise<Metadata> {
  const { book } = await params;
  const b = bookById(book);
  if (!b) return {};
  const m = bookMeta(b.id)!;
  return {
    title: `${b.name} — ${m.chapters} chapters, ${m.verses.toLocaleString("en-US")} verses`,
    description: `${b.name} (KJV), book ${b.ordinal} of 66. Loopback address 127.${b.ordinal}.0.0. Read any chapter, fetch any verse by reference or quartet.`,
    alternates: { canonical: `${SITE_URL}/foundation/${b.id}` },
  };
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const b = bookById(book);
  if (!b) notFound();
  const m = bookMeta(b.id)!;
  const first = chapter(b.id, 1)!.verses[0];
  const prev = CANON[b.ordinal - 2];
  const next = CANON[b.ordinal];

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12 md:px-8 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: `${b.name} (King James Version)`,
          position: b.ordinal,
          isPartOf: { "@type": "Book", name: "The Holy Bible, King James Version", url: `${SITE_URL}/foundation` },
          url: `${SITE_URL}/foundation/${b.id}`,
          numberOfPages: m.chapters,
          identifier: [
            { "@type": "PropertyValue", propertyID: "harness-ref", value: b.id },
            { "@type": "PropertyValue", propertyID: "loopback-quartet", value: `127.${b.ordinal}.0.0` },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="running-head flex items-center gap-2">
        <Link href="/foundation" className="hover:text-rubric">
          The Foundation
        </Link>
        <span aria-hidden>·</span>
        <span>{b.testament === "OT" ? "Old Testament" : "New Testament"}</span>
      </nav>

      <header className="mt-6 flex flex-col gap-3">
        <h1 className="text-4xl font-medium md:text-6xl">{b.name}</h1>
        <p className="font-mono text-sm text-foreground/60">
          Book {b.ordinal} of 66 · <span className="text-foreground/80">{b.id}</span> · 127.{b.ordinal}.0.0 ·{" "}
          {m.chapters} {m.chapters === 1 ? "chapter" : "chapters"} · {m.verses.toLocaleString("en-US")} verses
        </p>
        <blockquote className="measure mt-4 border-l-2 border-gilt pl-5 text-lg leading-relaxed italic text-foreground/80 text-pretty">
          {first.text}
          <cite className="ml-2 font-mono text-xs not-italic text-foreground/50">{b.name} 1:1</cite>
        </blockquote>
      </header>

      <section aria-labelledby="chapters" className="mt-12">
        <h2 id="chapters" className="running-head mb-5">
          Chapters
        </h2>
        <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {m.verseCounts.map((count, i) => (
            <li key={i}>
              <Link
                href={`/foundation/${b.id}/${i + 1}`}
                aria-label={`${b.name} chapter ${i + 1}, ${count} verses`}
                className="flex aspect-square items-center justify-center border border-rule font-mono text-sm tabular-nums transition-colors hover:border-gilt hover:text-rubric"
              >
                {i + 1}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <nav aria-label="Adjacent books" className="mt-14 flex items-center justify-between border-t border-rule pt-5 text-sm">
        {prev ? (
          <Link href={`/foundation/${prev.id}`} className="hover:text-rubric">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/foundation/${next.id}`} className="hover:text-rubric">
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
