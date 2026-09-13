import { rootLlmsTxt } from "@/lib/agents/llms";
import { SHORT_CACHE } from "@/lib/api/respond";

export const dynamic = "force-static";

export function GET() {
  return new Response(rootLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": SHORT_CACHE, "Access-Control-Allow-Origin": "*" },
  });
}
