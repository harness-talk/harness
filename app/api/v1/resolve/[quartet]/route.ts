import { displaySpan, isQuartetRange, parseQuartet, parseQuartetRange, quartetToRef, QUARTET_PORT, verseCount } from "@/lib/bible/refs";
import { bookByOrdinal } from "@/lib/bible/canon";
import { bookMeta, chapterPayload, corpus, versesFor } from "@/lib/bible/store";
import { merkleRoot } from "@/lib/bible/merkle";
import { ok, problemFrom, SITE_URL } from "@/lib/api/respond";

/**
 * GET /api/v1/resolve/127.{book}.{chapter}.{verse}
 * Hosted twin of `harnessd` — identical JSON to what the loopback daemon serves on port 1611.
 *   127.43.3.16      → John 3:16
 *   127.43.3.16-21   → John 3:16-21 (span, one Merkle root over its verses)
 *   127.43.3.16-4.2  → John 3:16-4:2 (span across chapters)
 *   127.43.3.0       → John 3 (chapter)
 *   127.43.0.0       → John (book metadata)
 *   127.0.0.1        → index / health
 */
export async function GET(_req: Request, ctx: { params: Promise<{ quartet: string }> }) {
  const { quartet } = await ctx.params;
  try {
    const address = decodeURIComponent(quartet);
    const c = corpus();
    if (isQuartetRange(address)) {
      const span = parseQuartetRange(address);
      const book = bookByOrdinal(span.ordinal)!;
      const verses = [];
      for (let ch = span.start.chapter; ch <= span.end.chapter; ch++) {
        const from = ch === span.start.chapter ? span.start.verse : 1;
        const to = ch === span.end.chapter ? span.end.verse : verseCount(book.id, ch) ?? from;
        const rows = versesFor({ book, chapter: ch, verse: from, verseEnd: to });
        for (const v of rows) {
          verses.push({ ref: v.ref, address: `127.${span.ordinal}.${ch}.${v.verse}`, chapter: ch, verse: v.verse, text: v.text, sha256: v.sha256 });
        }
      }
      const root = merkleRoot(verses.map((v) => v.sha256));
      return ok(
        {
          address: span.address,
          scope: "span",
          display: displaySpan(span),
          book: book.id,
          start: { ...span.start, address: `127.${span.ordinal}.${span.start.chapter}.${span.start.verse}` },
          end: { ...span.end, address: `127.${span.ordinal}.${span.end.chapter}.${span.end.verse}` },
          count: verses.length,
          merkleRoot: root,
          source: c.source,
          verses,
        },
        { etag: root.slice(0, 32) },
      );
    }

    const q = parseQuartet(address);
    if (q.scope === "index") {
      return ok({
        service: "harness.talk fabric",
        address: "127.0.0.1",
        port: QUARTET_PORT,
        scheme: "127.{book 1-66}.{chapter}.{verse} · .0 = whole chapter · .0.0 = book · -{verse} or -{chapter}.{verse} = span",
        source: c.source,
        merkleRoot: c.merkleRoot,
        verses: c.verses,
        docs: `${SITE_URL}/architecture`,
      });
    }
    if (q.scope === "book") {
      const book = bookByOrdinal(q.ordinal)!;
      const meta = bookMeta(book.id)!;
      return ok({ address: q.address, scope: "book", id: book.id, name: book.name, ordinal: book.ordinal, testament: book.testament, chapters: meta.chapters, verses: meta.verses, sha256: meta.sha256 }, { etag: meta.sha256.slice(0, 32) });
    }
    const ref = quartetToRef(q.address);
    if (q.scope === "chapter") {
      return ok({ address: q.address, scope: "chapter", ...chapterPayload(ref) });
    }
    const [v] = versesFor(ref);
    return ok({ address: q.address, scope: "verse", ...v }, { etag: v.sha256.slice(0, 32) });
  } catch (e) {
    return problemFrom(e);
  }
}
