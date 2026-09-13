import { parseRef, canonicalRef } from "@/lib/bible/refs";
import { chapterPayload, bookMeta } from "@/lib/bible/store";
import { ok, problem, problemFrom } from "@/lib/api/respond";

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  try {
    const r = parseRef(decodeURIComponent(ref));
    if (r.verse) {
      return problem("ref_unparseable", `'${ref}' names a verse. Use /api/v1/verses/${canonicalRef(r)} for verses, or drop the verse for a chapter.`, { input: ref });
    }
    const payload = chapterPayload(r);
    return ok(payload, { etag: bookMeta(r.book.id)!.sha256.slice(0, 32) + "." + r.chapter });
  } catch (e) {
    return problemFrom(e);
  }
}
