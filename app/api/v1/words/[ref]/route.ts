import { parseRef, canonicalRef } from "@/lib/bible/refs";
import { originalVersesFor, originalsAvailable } from "@/lib/bible/originals";
import { ok, problem, problemFrom } from "@/lib/api/respond";

export const dynamic = "force-static";

/**
 * GET /api/v1/words/{ref}
 * Word-level original-language data (Hebrew: word · Strong's · morphology; Greek: word · lemma · morphology · POS)
 * for a verse, range, or chapter. Source is chosen by testament: OT → wlc-oshb, NT → sblgnt-morphgnt.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  let parsed;
  try {
    parsed = parseRef(decodeURIComponent(ref));
  } catch (e) {
    return problemFrom(e);
  }
  if (!originalsAvailable()) return problem("source_not_ingested", "Original-language data is not built on this deployment.");
  const { source, verses, missing } = originalVersesFor(parsed);
  if (verses.length === 0 && missing.length) {
    return problem(
      "not_found",
      `${missing.join(", ")} exist in the KJV versification but not in ${source}. Versification differs here; see /translations.`,
      { source, missing },
    );
  }
  return ok({
    ref: canonicalRef(parsed),
    source,
    count: verses.length,
    ...(missing.length ? { missing } : {}),
    verses,
    fields:
      source === "wlc-oshb"
        ? { p: "position", w: "word (pointed, / marks morpheme boundary)", s: "Strong's number", m: "OSHB morphology code" }
        : { p: "position", w: "word", l: "lemma", m: "MorphGNT parsing code", pos: "part of speech" },
  });
}
