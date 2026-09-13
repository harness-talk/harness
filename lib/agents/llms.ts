import "server-only";
import { TOOLS, ERROR_CODES } from "./tools";
import { SOURCES, SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/bible/sources";
import { corpus, books, allVerses } from "@/lib/bible/store";

export { SITE_NAME };
/** One sentence a person or an agent can verify against the running site. Same rule as the mark. */
export const THESIS = SITE_DESCRIPTION;

/** Root llms.txt — what an agent needs to act correctly on the first try. */
export function rootLlmsTxt(): string {
  const c = corpus();
  return `# ${SITE_NAME} — ${SITE_TAGLINE}

> ${THESIS} Any vendor, any model, any runtime: address, retrieve, verify, cite. Read-only, keyless, cacheable, exportable. Where a source is declared but not ingested, the API says so (501 source_not_ingested) rather than substitute.

Corpus: ${c.verses.toLocaleString()} verses · ${c.chapters.toLocaleString()} chapters · ${c.books} books · source ${c.source}
Merkle root (sha256 leaves = sha256(ref + "\\n" + text)): ${c.merkleRoot}
Fabric: every verse has a loopback address 127.{book 1-66}.{chapter}.{verse} served on port 1611 by harnessd; hosted twin at ${SITE_URL}/api/v1/resolve/{quartet}.

## Start here (agents)
- [Agent onboarding](${SITE_URL}/agents): discover → resolve → read → cite → verify, in five steps
- [What an agent needs](${SITE_URL}/agents/needs): requirements → what is provided → Live | Specification
- [Protocol reference](${SITE_URL}/agents/protocol): ref grammar (EBNF), response shapes, error codes, caching, rate limits
- [Tool schemas (JSON)](${SITE_URL}/agents/tools.json): ${TOOLS.map((t) => t.name).join(", ")}
- [OpenAPI 3.1](${SITE_URL}/openapi.json)
- [Discovery manifest](${SITE_URL}/.well-known/harness.json)
- [Covenant](${SITE_URL}/agents/covenant): quote exactly, carry provenance, never merge sources, state gaps

## Read
- [Foundation](${SITE_URL}/foundation): the 66 books, provenance, why the KJV / Textus Receptus
- [Reader](${SITE_URL}/foundation/jn/3): ${SITE_URL}/foundation/{book}/{chapter}
- [Search](${SITE_URL}/search?q=): lexical, phrase, or reference
- [Architecture](${SITE_URL}/architecture): the 127 fabric — kernel loopback → harnessd → agents
- [Sources](${SITE_URL}/api/v1/sources): ${SOURCES.map((s) => `${s.id} (${s.status})`).join(", ")}

## Take it with you
- [Full corpus JSONL (gzip)](${SITE_URL}/exports/${c.source}.jsonl.gz)
- [Full corpus TSV](${SITE_URL}/exports/${c.source}.txt)
- [Export manifest with sha256s](${SITE_URL}/exports/manifest.json)
- [Harness package](${SITE_URL}/agents/harness): TypeScript + Python clients, MCP server, harnessd

## API (live)
${TOOLS.map((t) => `- GET ${t.path} — ${t.description.split(". ")[0]}`).join("\n")}
- GET /api/v1/books · GET /api/v1/books/{id} · GET /api/v1/sources

Errors are application/problem+json with title ∈ {${ERROR_CODES.map((e) => e.code).join(", ")}}.

## Specification (documented, not yet served)
GraphQL, WebSocket rooms, webhooks, gRPC, agent registry, consensus protocol, IPFS/dVPN distribution. Marked x-status: planned in OpenAPI and badged "Specification" on every page. Nothing is presented as live that is not.

## Optional
- [llms-full.txt](${SITE_URL}/llms-full.txt): this file plus the entire corpus inline (~4.5 MB)
- [Community](${SITE_URL}/community) · [Translations](${SITE_URL}/translations) · [Storage](${SITE_URL}/storage)
`;
}

/** Section llms.txt for a subtree. */
export function sectionLlmsTxt(section: string, title: string, summary: string, links: { href: string; label: string; note?: string }[]): string {
  return `# ${SITE_NAME} — ${title}

> ${summary}

Parent: ${SITE_URL}/llms.txt

${links.map((l) => `- [${l.label}](${SITE_URL}${l.href})${l.note ? `: ${l.note}` : ""}`).join("\n")}
`;
}

/** Root + the entire corpus. Streams the verses to keep memory flat. */
export function* fullLlmsTxt(): Generator<string> {
  yield rootLlmsTxt();
  yield "\n\n# Corpus — kjv-1611 (1611 first edition, original spelling)\n\nFormat: `ref<TAB>display<TAB>text`. One verse per line. Books in canonical order.\n\n";
  let current = "";
  for (const v of allVerses()) {
    if (v.book.id !== current) {
      current = v.book.id;
      const meta = books().find((b) => b.id === current)!;
      yield `\n## ${meta.name} (${current}, ${meta.chapters} chapters, 127.${meta.n}.0.0)\n`;
    }
    yield `${v.ref}\t${v.display}\t${v.text}\n`;
  }
}
