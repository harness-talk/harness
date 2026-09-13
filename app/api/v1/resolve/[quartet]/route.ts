import { parseQuartet, quartetToRef, QUARTET_PORT } from "@/lib/bible/refs";
import { bookByOrdinal } from "@/lib/bible/canon";
import { bookMeta, chapterPayload, corpus, versesFor } from "@/lib/bible/store";
import { ok, problemFrom, SITE_URL } from "@/lib/api/respond";

/**
 * GET /api/v1/resolve/127.{book}.{chapter}.{verse}
 * Hosted twin of `harnessd` — identical JSON to what the loopback daemon serves on port 1611.
 *   127.43.3.16  → John 3:16
 *   127.43.3.0   → John 3 (chapter)
 *   127.43.0.0   → John (book metadata)
 *   127.0.0.1    → index / health
 */
export async function GET(_req: Request, ctx: { params: Promise<{ quartet: string }> }) {
  const { quartet } = await ctx.params;
  try {
    const q = parseQuartet(decodeURIComponent(quartet));
    const c = corpus();
    if (q.scope === "index") {
      return ok({
        service: "harness.talk fabric",
        address: "127.0.0.1",
        port: QUARTET_PORT,
        scheme: "127.{book 1-66}.{chapter}.{verse}",
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
