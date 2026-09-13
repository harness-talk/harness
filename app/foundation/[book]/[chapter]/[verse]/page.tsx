import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookById } from "@/lib/bible/canon";
import { parseRef, displayRef, canonicalRef, refToQuartet, type Ref } from "@/lib/bible/refs";
import { versesFor, corpus } from "@/lib/bible/store";
import { KJV_SOURCE, SITE_URL } from "@/lib/bible/sources";
import { VerseText } from "@/components/reader/verse-text";
import { CopyButton } from "@/components/site/copy-button";
import { JsonLd } from "@/components/site/json-ld";

type Params = Promise<{ book: string; chapter: string; verse: string }>;

/** Accepts "16" or "16-18". Returns null for anything that does not resolve in this corpus. */
function resolve(book: string, chapter: string, verse: string): Ref | null {
  const b = bookById(book);
  if (!b) return null;
  const m = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(verse);
  if (!m) return null;
  try {
    return parseRef(`${b.id}.${chapter}.${m[1]}${m[2] ? `-${m[2]}` : ""}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book, chapter, verse } = await params;
  const r = resolve(book, chapter, verse);
  if (!r) return {};
  const vv = versesFor(r);
  const display = displayRef(r);
  const text = vv.map((v) => v.text).join(" ");
  const short = text.length > 200 ? text.slice(0, 197).trimEnd() + "…" : text;
  const url = `${SITE_URL}/foundation/${r.book.id}/${r.chapter}/${verse}`;
  const quartet = refToQuartet(r).address;
  // A single verse carries its own proof; a range carries the address of its first verse.
  const proof = vv.length === 1 ? `${quartet} · sha256 ${vv[0].sha256.slice(0, 12)}…` : `${quartet} · ${vv.length} verses`;
  return {
    title: `${display} — KJV 1611`,
    description: `${short} — ${display}, King James Bible 1611, original spelling. ${proof}`,
    alternates: { canonical: url },
    openGraph: { title: display, description: `${short} — ${proof}`, type: "article", url, siteName: "harness.talk" },
    twitter: { card: "summary_large_image", title: display, description: `${short} — ${proof}` },
  };
}

export default async function VersePage({ params }: { params: Params }) {
  const { book, chapter, verse } = await params;
  const r = resolve(book, chapter, verse);
  if (!r) notFound();
  const vv = versesFor(r);
  if (!vv.length) notFound();

  const single = vv.length === 1;
  const display = displayRef(r);
  const ref = canonicalRef(r);
  const q = refToQuartet(r);
  const c = corpus();
  const url = `${SITE_URL}/foundation/${r.book.id}/${r.chapter}/${verse}`;
  const plain = `${vv.map((v) => (single ? v.text : `${v.verse} ${v.text}`)).join(" ")} — ${display} (KJV)`;
  const apiUrl = `${SITE_URL}/api/v1/verses/${ref}`;
  const first = vv[0];
  const prev = first.verse > 1 ? `/foundation/${r.book.id}/${r.chapter}/${first.verse - 1}` : null;
  const last = vv[vv.length - 1];
  const chapterVerses = versesFor(parseRef(`${r.book.id}.${r.chapter}`)).length;
  const next = last.verse < chapterVerses ? `/foundation/${r.book.id}/${r.chapter}/${last.verse + 1}` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-5 py-12 md:px-8 md:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Quotation",
          text: vv.map((v) => v.text).join(" "),
          spokenByCharacter: undefined,
          isPartOf: { "@type": "Book", name: "The Holy Bible, King James Version", bookEdition: KJV_SOURCE.label },
          citation: display,
          url,
          identifier: [
            { "@type": "PropertyValue", propertyID: "ref", value: ref },
            { "@type": "PropertyValue", propertyID: "quartet", value: q.address },
            ...(single ? [{ "@type": "PropertyValue", propertyID: "sha256", value: first.sha256 }] : []),
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="running-head flex flex-wrap items-center gap-x-2 text-foreground/55">
        <Link href="/foundation" className="hover:text-foreground">
          Foundation
        </Link>
        <span aria-hidden>·</span>
        <Link href={`/foundation/${r.book.id}/1`} className="hover:text-foreground">
          {r.book.name}
        </Link>
        <span aria-hidden>·</span>
        <Link href={`/foundation/${r.book.id}/${r.chapter}`} className="hover:text-foreground">
          Chapter {r.chapter}
        </Link>
      </nav>

      <article className="mt-10 flex flex-col gap-8">
        <h1 className="font-display text-2xl font-medium text-rubric md:text-3xl">{display}</h1>

        <blockquote className="flex flex-col gap-4 text-2xl leading-[1.45] text-foreground md:text-[2rem] md:leading-[1.4]">
          {vv.map((v) => (
            <p key={v.ref} id={`v${v.verse}`} className="text-pretty">
              {!single ? (
                <sup className="verse-num mr-2 align-top">{v.verse}</sup>
              ) : null}
              <VerseText text={v.text} />
            </p>
          ))}
        </blockquote>

        <footer className="flex flex-col gap-6 border-t border-rule pt-6">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 font-mono text-xs sm:grid-cols-[auto_1fr]">
            <dt className="running-head text-foreground/50">Reference</dt>
            <dd className="break-all">{ref}</dd>
            <dt className="running-head text-foreground/50">Loopback</dt>
            <dd>
              {q.address}
              <span className="text-foreground/50">:1611</span>
            </dd>
            {single ? (
              <>
                <dt className="running-head text-foreground/50">SHA-256</dt>
                <dd className="break-all text-foreground/80">{first.sha256}</dd>
              </>
            ) : (
              <>
                <dt className="running-head text-foreground/50">Verses</dt>
                <dd>{vv.length}, each hashed individually</dd>
              </>
            )}
            <dt className="running-head text-foreground/50">Source</dt>
            <dd>
              {KJV_SOURCE.label} · root {c.merkleRoot.slice(0, 16)}…
            </dd>
          </dl>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <CopyButton text={plain} label="Copy verse" />
            <CopyButton text={url} label="Copy link" />
            <Link href={`/foundation/${r.book.id}/${r.chapter}#v${first.verse}`} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
              Read in context
            </Link>
            <a href={apiUrl} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
              JSON
            </a>
            <Link href={`/api/v1/words/${ref}`} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
              {r.book.testament === "OT" ? "Hebrew" : "Greek"}
            </Link>
          </div>
        </footer>
      </article>

      <nav aria-label="Adjacent verses" className="mt-14 flex items-center justify-between border-t border-rule pt-5">
        {prev ? (
          <Link href={prev} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
            ← {r.book.name} {r.chapter}:{first.verse - 1}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
            {r.book.name} {r.chapter}:{last.verse + 1} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
