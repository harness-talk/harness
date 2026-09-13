import { fullLlmsTxt } from "@/lib/agents/llms";
import { IMMUTABLE_CACHE } from "@/lib/api/respond";

export const dynamic = "force-static";

export function GET() {
  const enc = new TextEncoder();
  const gen = fullLlmsTxt();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const { value, done } = gen.next();
      if (done) controller.close();
      else controller.enqueue(enc.encode(value));
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": IMMUTABLE_CACHE, "Access-Control-Allow-Origin": "*" },
  });
}
