import { books, corpus } from "@/lib/bible/store";
import { ok } from "@/lib/api/respond";

export const dynamic = "force-static";

export function GET() {
  const c = corpus();
  return ok(
    {
      source: c.source,
      count: books().length,
      books: books().map(({ verseCounts: _vc, ...b }) => ({ ...b, quartet: `127.${b.n}.0.0` })),
    },
    { etag: c.merkleRoot.slice(0, 32) },
  );
}
