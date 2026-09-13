import { search } from "@/lib/bible/search";
import { ok, problem, SHORT_CACHE } from "@/lib/api/respond";

/**
 * GET /api/v1/search?q=...&limit=20&offset=0&book=jn
 * Lexical search over the KJV corpus. Modes: reference | phrase ("quoted") | terms.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return problem("query_empty", "Provide ?q= with a reference, a \"quoted phrase\", or search terms.");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const book = url.searchParams.get("book") ?? undefined;
  const result = search(q, { limit, offset, book });
  return ok({ ...result, limit, offset }, { cache: SHORT_CACHE });
}
