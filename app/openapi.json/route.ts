import { TOOLS, ERROR_CODES } from "@/lib/agents/tools";
import { API_VERSION, SITE_URL, SHORT_CACHE } from "@/lib/api/respond";

export const dynamic = "force-static";

const Verse = {
  type: "object",
  required: ["ref", "display", "book", "chapter", "verse", "text", "source", "sha256", "quartet"],
  properties: {
    ref: { type: "string", example: "jn.3.16" },
    display: { type: "string", example: "John 3:16" },
    book: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, ordinal: { type: "integer" }, testament: { type: "string", enum: ["OT", "NT"] } } },
    chapter: { type: "integer" },
    verse: { type: "integer" },
    text: { type: "string" },
    source: { type: "string", example: "kjv-1611" },
    sha256: { type: "string", description: "sha256(ref + '\\n' + text); also the Merkle leaf" },
    quartet: { type: "string", example: "127.43.3.16" },
  },
};

const Problem = {
  type: "object",
  required: ["type", "title", "status", "detail"],
  properties: {
    type: { type: "string", format: "uri" },
    title: { type: "string", enum: ERROR_CODES.map((e) => e.code) },
    status: { type: "integer" },
    detail: { type: "string" },
  },
};

function pathItem(tool: (typeof TOOLS)[number]) {
  const props = (tool.inputSchema as { properties: Record<string, Record<string, unknown>>; required?: string[] }).properties;
  const required = (tool.inputSchema as { required?: string[] }).required ?? [];
  const pathParams = [...tool.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  return {
    get: {
      operationId: tool.name,
      summary: tool.description.split(". ")[0],
      description: tool.description,
      tags: ["corpus"],
      parameters: Object.entries(props).map(([name, schema]) => ({
        name,
        in: pathParams.includes(name) ? "path" : "query",
        required: pathParams.includes(name) || required.includes(name),
        schema,
        description: (schema as { description?: string }).description,
      })),
      responses: {
        "200": { description: tool.returns, content: { "application/json": { schema: tool.name === "getVerse" ? { oneOf: [{ $ref: "#/components/schemas/Verse" }, { type: "object", properties: { verses: { type: "array", items: { $ref: "#/components/schemas/Verse" } } } }] } : { type: "object" } } } },
        "4XX": { description: "Problem details", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
        "501": { description: "source_not_ingested", content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } } },
      },
      "x-codeSamples": [{ lang: "shell", source: tool.example.curl }],
    },
  };
}

export function GET() {
  const doc = {
    openapi: "3.1.0",
    info: {
      title: "harness.talk API",
      version: API_VERSION,
      description:
        "Read-only, keyless access to the King James Bible (1611 first edition, original spelling) and the Geneva Bible 1599 as an immutable, content-addressed corpus for AI agents. Every verse carries its source and sha256. Bulk export: /exports/kjv-1611.jsonl.gz. Loopback fabric: 127.{book}.{chapter}.{verse}:1611 via harnessd.",
      license: { name: "Public domain text; service AGPL-3.0-or-later; clients LGPL-3.0-or-later", identifier: "AGPL-3.0-or-later" },
      contact: { url: `${SITE_URL}/community` },
    },
    servers: [{ url: SITE_URL }, { url: "http://127.0.0.1:1611", description: "Local harnessd (resolve only; address is the path)" }],
    paths: {
      ...Object.fromEntries(TOOLS.map((t) => [t.path, pathItem(t)])),
      "/api/v1/books": { get: { operationId: "listBooks", tags: ["corpus"], summary: "All 66 books with chapter/verse counts and book sha256", responses: { "200": { description: "Book list" } } } },
      "/api/v1/books/{id}": { get: { operationId: "getBook", tags: ["corpus"], summary: "One book with per-chapter verse counts", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Book" }, "404": { description: "book_unknown" } } } },
      "/api/v1/sources": { get: { operationId: "listSources", tags: ["provenance"], summary: "Source registry with status (ingested | partial | declared) and corpus Merkle root", responses: { "200": { description: "Sources" } } } },
      "/graphql": { post: { operationId: "graphql", tags: ["specification"], summary: "GraphQL endpoint", description: "Specification — not yet live. Schema draft on /api-docs#graphql.", "x-status": "planned", responses: { "501": { description: "Not implemented" } } } },
      "/api/v1/agents": { post: { operationId: "registerAgent", tags: ["specification"], summary: "Agent registry", description: "Specification — not yet live. Message shapes on /agents/protocol#coordination.", "x-status": "planned", responses: { "501": { description: "Not implemented" } } } },
      "/api/v1/webhooks": { post: { operationId: "createWebhook", tags: ["specification"], summary: "Webhook subscriptions", description: "Specification — not yet live.", "x-status": "planned", responses: { "501": { description: "Not implemented" } } } },
    },
    components: { schemas: { Verse, Problem } },
    tags: [
      { name: "corpus", description: "Live. Immutable, cacheable, keyless." },
      { name: "provenance", description: "Live." },
      { name: "specification", description: "Documented contracts that are not yet served. Marked x-status: planned." },
    ],
  };
  return Response.json(doc, { headers: { "Cache-Control": SHORT_CACHE, "Access-Control-Allow-Origin": "*" } });
}
