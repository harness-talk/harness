import { parseRef, canonicalRef, displayRef, refToQuartet } from "@/lib/bible/refs";
import { versesWithMissing } from "@/lib/bible/store";
import { sourceById, isTextSource, KJV_SOURCE_ID } from "@/lib/bible/sources";
import { originalVersesFor, originalSourceFor, ORIGINAL_SOURCE_IDS, type OriginalSourceId } from "@/lib/bible/originals";
import { ok, problem, problemFrom } from "@/lib/api/respond";

/**
 * GET /api/v1/verses/{ref}
 * ref = jn.3.16 | jn.3.16-18 | jn.3 | "John 3:16" | 127.43.3.16
 * Returns one or more verses, each with source + sha256 so agents can verify locally.
 */
export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? KJV_SOURCE_ID;
  try {
    const r = parseRef(decodeURIComponent(ref));
    const src = sourceById(source);
    if (!src) return problem("source_not_ingested", `Unknown source '${source}'. See /api/v1/sources.`, { source });
    if ((ORIGINAL_SOURCE_IDS as readonly string[]).includes(source) && src.status === "ingested") {
      // Original-language text: served by chapter:verse in its own versification, never remapped.
      const expected = originalSourceFor(r.book);
      if (expected !== source) {
        return problem("not_found", `${canonicalRef(r)} is in the ${r.book.testament}; its original-language source is '${expected}', not '${source}'.`, { source, expected });
      }
      const { verses, missing } = originalVersesFor(r);
      if (!verses.length) {
        return problem("not_found", `${canonicalRef(r)} exists in the KJV but not in ${source} — versification differs here. See /translations.`, { source, missing });
      }
      const single = verses.length === 1 && r.verse && !r.verseEnd;
      const body = single
        ? { ...verses[0], quartet: refToQuartet(r).address }
        : { ref: canonicalRef(r), display: displayRef(r), quartet: refToQuartet(r).address, source: source as OriginalSourceId, count: verses.length, ...(missing.length ? { missing } : {}), verses };
      return ok(body, { etag: single ? verses[0].sha256.slice(0, 32) : undefined });
    }
    if (src.status !== "ingested" || src.kind !== "text" || !isTextSource(source)) {
      return problem("source_not_ingested", `Source '${source}' is ${src.status} (${src.kind}); verse text is not available from it yet. Nothing is fabricated in its place.`, { source, status: src.status });
    }
    const { verses, missing } = versesWithMissing(r, source);
    if (!verses.length) {
      return source === KJV_SOURCE_ID
        ? problem("not_found", `No verses for ${canonicalRef(r)}`)
        : problem("not_found", `${canonicalRef(r)} exists in the KJV but not in ${source} — versification differs here. See /translations.`, { source, missing });
    }
    const single = verses.length === 1 && r.verse && !r.verseEnd;
    const body = single
      ? verses[0]
      : {
          ref: canonicalRef(r),
          display: displayRef(r),
          quartet: refToQuartet(r).address,
          source,
          count: verses.length,
          ...(missing.length ? { missing } : {}),
          verses,
        };
    return ok(body, { etag: single ? verses[0].sha256.slice(0, 32) : undefined });
  } catch (e) {
    return problemFrom(e);
  }
}
