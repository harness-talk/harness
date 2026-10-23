import { parseQuartet, quartetToRef, RefError } from "@/lib/bible/refs";
import { versesFor } from "@/lib/bible/store";
import { crossRefsForVerse, crossRefTotal, CROSSREF_ATTRIBUTION } from "@/lib/bible/crossrefs";
import { ok, problemFrom, SHORT_CACHE } from "@/lib/api/respond";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 500;

/**
 * GET /api/v1/resolve/127.{book}.{chapter}.{verse}/links[?limit=N]
 * The cross references of one verse, as fabric addresses. Every link carries the
 * target's address and the SHA-256 of its first verse, so a client can resolve the
 * address (here or on harnessd) and check it got the same text.
 *   127.1.3.15/links → Genesis 3:15 → 127.66.12.9 (Revelation 12:9), …
 */
export async function GET(req: Request, ctx: { params: Promise<{ quartet: string }> }) {
  const { quartet } = await ctx.params;
  try {
    const q = parseQuartet(decodeURIComponent(quartet));
    if (q.scope !== "verse") {
      throw new RefError("quartet_invalid", "Links are per verse: use 127.{book}.{chapter}.{verse} with a verse above 0", {
        address: q.address,
        scope: q.scope,
      });
    }
    const ref = quartetToRef(q.address);
    const [verse] = versesFor(ref);
    const total = crossRefTotal(ref);
    const raw = Number(new URL(req.url).searchParams.get("limit") ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), MAX_LIMIT) : DEFAULT_LIMIT;
    const links = crossRefsForVerse(ref, limit).map(({ address, ref: to, display, votes, sha256, text }) => ({
      address,
      ref: to,
      display,
      votes,
      sha256,
      text,
    }));
    return ok(
      {
        address: q.address,
        scope: "links",
        ref: verse.ref,
        display: verse.display,
        sha256: verse.sha256,
        total,
        count: links.length,
        links,
        attribution: CROSSREF_ATTRIBUTION,
      },
      { cache: SHORT_CACHE },
    );
  } catch (e) {
    return problemFrom(e);
  }
}
