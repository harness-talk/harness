import { buildToolManifest } from "@/lib/agents/tools";
import { SITE_URL, SHORT_CACHE } from "@/lib/api/respond";

export const dynamic = "force-static";

/** JSON Schema tool definitions — the same manifest the MCP server and clients are generated from. */
export function GET() {
  return Response.json(buildToolManifest(SITE_URL), {
    headers: { "Cache-Control": SHORT_CACHE, "Access-Control-Allow-Origin": "*" },
  });
}
