import { parseRef, canonicalRef } from "@/lib/bible/refs";
import { annotationsFor } from "@/lib/bible/annotations";
import { sourceById, GENEVA_NOTES_SOURCE_ID } from "@/lib/bible/sources";
import { ok, problem, problemFrom, SHORT_CACHE } from "@/lib/api/respond";

/**
 * GET /api/v1/annotations/{ref}?source=geneva-notes
 * Returns the annotation layer (arguments, marginal notes, cross-references, headings)
 * for a chapter or verse. If the source is not ingested for that book, returns
 * source_not_ingested — never a substitute.
 */
export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const source = new URL(req.url).searchParams.get("source") ?? GENEVA_NOTES_SOURCE_ID;
  try {
    const r = parseRef(decodeURIComponent(ref));
    const src = sourceById(source);
    if (!src || src.kind !== "annotations") {
      return problem("source_not_ingested", `'${source}' is not an annotation source. See /api/v1/sources.`, { source });
    }
    const result = annotationsFor(source, r);
    if (!result.available) {
      return problem("source_not_ingested", `${src.label} is not ingested for ${r.book.name}. ${result.reason ?? ""}`.trim(), { source, book: r.book.id, status: src.status });
    }
    return ok({ ref: canonicalRef(r), source, count: result.annotations.length, annotations: result.annotations }, { cache: SHORT_CACHE });
  } catch (e) {
    return problemFrom(e);
  }
}
