import { SOURCES } from "@/lib/bible/sources";
import { corpus } from "@/lib/bible/store";
import { ok, SHORT_CACHE } from "@/lib/api/respond";

export const dynamic = "force-static";

export function GET() {
  const c = corpus();
  return ok(
    {
      default: c.source,
      corpus: { merkleRoot: c.merkleRoot, leaf: c.leaf, books: c.books, chapters: c.chapters, verses: c.verses, builtAt: c.builtAt },
      sources: SOURCES,
    },
    { cache: SHORT_CACHE },
  );
}
