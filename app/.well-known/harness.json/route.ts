import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { corpus } from "@/lib/bible/store";
import { TOOLS } from "@/lib/agents/tools";
import { QUARTET_PORT } from "@/lib/bible/refs";
import { API_VERSION, SITE_URL, SHORT_CACHE } from "@/lib/api/respond";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/bible/sources";

export const dynamic = "force-static";

/** Discovery manifest — the first thing an agent should fetch. */
export function GET() {
  const c = corpus();
  const manifestPath = join(process.cwd(), "public", "exports", "manifest.json");
  const exports = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  return Response.json(
    {
      name: "harness.talk",
      version: API_VERSION,
      tagline: SITE_TAGLINE,
      thesis: SITE_DESCRIPTION,
      llms: `${SITE_URL}/llms.txt`,
      llmsFull: `${SITE_URL}/llms-full.txt`,
      openapi: `${SITE_URL}/openapi.json`,
      tools: `${SITE_URL}/agents/tools.json`,
      docs: `${SITE_URL}/agents`,
      covenant: `${SITE_URL}/agents/covenant`,
      corpus: {
        source: c.source,
        books: c.books,
        chapters: c.chapters,
        verses: c.verses,
        merkleRoot: c.merkleRoot,
        leaf: c.leaf,
        builtAt: c.builtAt,
      },
      exports: exports
        ? Object.fromEntries(Object.entries(exports.files as Record<string, { bytes: number; sha256: string }>).map(([name, f]) => [name, { url: `${SITE_URL}/exports/${name}`, ...f }]))
        : {},
      fabric: {
        scheme: "127.{book 1-66}.{chapter}.{verse}",
        port: QUARTET_PORT,
        index: `127.0.0.1:${QUARTET_PORT}`,
        hosted: `${SITE_URL}/api/v1/resolve/{quartet}`,
        daemon: "@harness-talk/harnessd",
      },
      mcp: { package: "@harness-talk/mcp", transport: "stdio", tools: TOOLS.map((t) => t.name) },
      auth: "none",
      rateLimit: { policy: "600;w=60", note: "Courtesy limit; prefer the export for bulk work." },
      status: { corpus: "live", rest: "live", fabric: "live", mcp: "live", graphql: "specification", websocket: "specification", webhooks: "specification", registry: "specification" },
    },
    { headers: { "Cache-Control": SHORT_CACHE, "Access-Control-Allow-Origin": "*" } },
  );
}
