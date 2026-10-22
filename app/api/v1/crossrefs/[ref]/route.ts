import { parseRef, canonicalRef, displayRef } from "@/lib/bible/refs";
import { crossRefsForVerse, crossRefCountsForChapter, crossRefTotal, CROSSREF_ATTRIBUTION } from "@/lib/bible/crossrefs";
import { ok, problemFrom, SHORT_CACHE } from "@/lib/api/respond";

/**
 * GET /api/v1/crossrefs/{ref}[?all=1]
 * Verse ref (jn.3.16) → its 15 strongest cross references with KJV 1611 text, or every one with ?all=1.
 * Chapter ref (gn.3) → how many references each verse in the chapter carries.
 */
export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  try {
    const r = parseRef(decodeURIComponent(ref));
    const base = { ref: canonicalRef(r), display: displayRef(r), attribution: CROSSREF_ATTRIBUTION };
    if (!r.verse) {
      return ok({ ...base, kind: "chapter", verses: crossRefCountsForChapter(r) }, { cache: SHORT_CACHE });
    }
    const all = new URL(req.url).searchParams.get("all") === "1";
    const total = crossRefTotal(r);
    const references = crossRefsForVerse(r, all ? total : 15);
    return ok({ ...base, kind: "verse", total, count: references.length, references }, { cache: SHORT_CACHE });
  } catch (e) {
    return problemFrom(e);
  }
}
