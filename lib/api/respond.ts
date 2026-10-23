import { RefError } from "@/lib/bible/refs";
import { SITE_URL } from "@/lib/bible/sources";
import { corpus } from "@/lib/bible/store";

export { SITE_URL };
export const API_VERSION = "1.0.0";

/** Immutable corpus → aggressive public caching. */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
export const SHORT_CACHE = "public, max-age=300, stale-while-revalidate=86400";

const RATE_HEADERS = {
  "RateLimit-Policy": "600;w=60",
  "RateLimit-Limit": "600",
};

export function ok(body: unknown, init: { cache?: string; etag?: string; headers?: Record<string, string> } = {}) {
  const c = corpus();
  return Response.json(body, {
    status: 200,
    headers: {
      "Cache-Control": init.cache ?? IMMUTABLE_CACHE,
      "X-Harness-Api-Version": API_VERSION,
      "X-Harness-Corpus": c.source,
      "X-Harness-Root": c.merkleRoot,
      "Access-Control-Allow-Origin": "*",
      ...RATE_HEADERS,
      ...(init.etag ? { ETag: `"${init.etag}"` } : {}),
      ...init.headers,
    },
  });
}

export type ProblemCode =
  | "ref_unparseable"
  | "book_unknown"
  | "chapter_out_of_range"
  | "verse_out_of_range"
  | "quartet_invalid"
  | "range_too_large"
  | "source_not_ingested"
  | "query_empty"
  | "not_found";

const STATUS: Record<ProblemCode, number> = {
  ref_unparseable: 400,
  book_unknown: 404,
  chapter_out_of_range: 404,
  verse_out_of_range: 404,
  quartet_invalid: 400,
  range_too_large: 400,
  source_not_ingested: 501,
  query_empty: 400,
  not_found: 404,
};

/** RFC 9457 problem details. Stable `type` URIs point at /agents/protocol#errors. */
export function problem(code: ProblemCode, detail: string, extra: Record<string, unknown> = {}) {
  const status = STATUS[code];
  // RFC 9457 reserves type/title/status/detail — extension members must not shadow them.
  const { status: _s, type: _t, title: _ti, detail: _d, ...ext } = extra as Record<string, unknown>;
  return Response.json(
    {
      type: `${SITE_URL}/agents/protocol#${code}`,
      title: code,
      status,
      detail,
      ...ext,
      ...(_s !== undefined ? { sourceStatus: _s } : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "X-Harness-Api-Version": API_VERSION,
      },
    },
  );
}

export function problemFrom(e: unknown) {
  if (e instanceof RefError) return problem(e.code, e.message, e.detail);
  console.error("[api]", e);
  return Response.json({ type: `${SITE_URL}/agents/protocol#internal`, title: "internal", status: 500, detail: "Unexpected error" }, { status: 500, headers: { "Content-Type": "application/problem+json" } });
}
