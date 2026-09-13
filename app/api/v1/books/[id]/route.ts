import { bookByAlias } from "@/lib/bible/canon";
import { bookMeta } from "@/lib/bible/store";
import { ok, problem } from "@/lib/api/respond";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const book = bookByAlias(id);
  if (!book) return problem("book_unknown", `No book matches '${id}'. Use an id like 'jn', an ordinal 1-66, or a name.`, { input: id });
  const meta = bookMeta(book.id)!;
  return ok(
    {
      ...meta,
      runningHead: book.runningHead,
      aliases: book.aliases,
      quartet: `127.${book.ordinal}.0.0`,
      chapters: Array.from({ length: meta.chapters }, (_, i) => ({
        n: i + 1,
        ref: `${book.id}.${i + 1}`,
        verses: meta.verseCounts[i],
        quartet: `127.${book.ordinal}.${i + 1}.0`,
      })),
    },
    { etag: meta.sha256.slice(0, 32) },
  );
}
