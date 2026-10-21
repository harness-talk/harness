import { parseRef, canonicalRef, displayRef } from "@/lib/bible/refs";
import { crossRefsForVerse, crossRefCountsForChapter, CROSSREF_ATTRIBUTION } from "@/lib/bible/crossrefs";
import { ok, problemFrom, SHORT_CACHE } from "@/lib/api/respond";

/**
 * GET /api/v1/crossrefs/{ref}
 * Verse ref (jn.3.16) → its cross references with KJV 1611 text, strongest first.
 * Chapter ref (gn.3) → how many references each verse in the chapter carries.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  try {
    const r = parseRef(decodeURIComponent(ref));
    const base = { ref: canonicalRef(r), display: displayRef(r), attribution: CROSSREF_ATTRIBUTION };
    if (!r.verse) {
      return ok({ ...base, kind: "chapter", verses: crossRefCountsForChapter(r) }, { cache: SHORT_CACHE });
    }
    const references = crossRefsForVerse(r);
    return ok({ ...base, kind: "verse", count: references.length, references }, { cache: SHORT_CACHE });
  } catch (e) {
    return problemFrom(e);
  }
}
