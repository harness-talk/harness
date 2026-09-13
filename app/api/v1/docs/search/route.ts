import { searchDocs, type DocKind } from "@/lib/docs/search";
import { ok, problem, SHORT_CACHE } from "@/lib/api/respond";

const KINDS: DocKind[] = ["page", "tool", "report"];

/**
 * GET /api/v1/docs/search?q=...&limit=10&offset=0&kind=page|tool|report
 * Searches the harness documentation layer only — never the Scripture text.
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return problem("query_empty", "Provide ?q= with words to find in the documentation.");
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 10) || 10));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const kindParam = url.searchParams.get("kind");
  const kind = KINDS.includes(kindParam as DocKind) ? (kindParam as DocKind) : undefined;
  const result = searchDocs(q, { limit, offset, kind });
  return ok({ layer: "documentation", ...result, limit, offset }, { cache: SHORT_CACHE });
}
