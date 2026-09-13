/**
 * The ONE tool manifest. `/agents/tools.json`, the OpenAPI document, the MCP server
 * and the TypeScript/Python clients are all generated from this so they cannot drift.
 * Plain JSON Schema (draft 2020-12), no library-specific extensions.
 */
export interface ToolDef {
  name: string;
  description: string;
  method: "GET";
  path: string; // REST path template
  inputSchema: Record<string, unknown>;
  returns: string; // human-readable description of the response shape
  example: { input: Record<string, unknown>; curl: string };
}

const REF_DESC =
  "A scripture reference. Accepts canonical ids ('jn.3.16', 'jn.3.16-18', 'ps.23'), human forms ('John 3:16', '1 John 5:7', 'Song of Solomon 2:1'), or a fabric quartet ('127.43.3.16').";

export const TOOLS: ToolDef[] = [
  {
    name: "getVerse",
    description: "Fetch one verse (or a verse range) by reference. Returns the exact 1611 KJV text (original spelling) with source id and sha256 for local verification; other ingested texts via `source`.",
    method: "GET",
    path: "/api/v1/verses/{ref}",
    inputSchema: {
      type: "object",
      required: ["ref"],
      properties: {
        ref: { type: "string", description: REF_DESC, examples: ["jn.3.16", "John 3:16-18", "127.43.3.16"] },
        source: {
          type: "string",
          description:
            "Text source id. Default kjv-1611 (King James 1611 first edition, original spelling). 'geneva-1599' = Geneva Bible 1599 verse text (original spelling; KJV refs with no Geneva counterpart are not_found and listed in `missing` for ranges). 'wlc-oshb' = Hebrew OT, 'sblgnt-morphgnt' = Greek NT (critical text, not the TR); both return the original at the same chapter:verse number with word-level tagging. Asking an OT ref for the Greek source (or vice versa) is not_found; non-ingested sources (textus-receptus) return source_not_ingested.",
          default: "kjv-1611",
          enum: ["kjv-1611", "geneva-1599", "wlc-oshb", "sblgnt-morphgnt", "textus-receptus"],
        },
      },
      additionalProperties: false,
    },
    returns: "Verse object {ref, display, book, chapter, verse, text, source, sha256, quartet} or {ref, count, verses[]} for ranges.",
    example: { input: { ref: "jn.3.16" }, curl: "curl -s https://harness.talk/api/v1/verses/jn.3.16" },
  },
  {
    name: "getPassage",
    description: "Fetch a whole chapter with prev/next navigation, Psalm superscription, and Psalm 119 headings.",
    method: "GET",
    path: "/api/v1/chapters/{ref}",
    inputSchema: {
      type: "object",
      required: ["ref"],
      properties: { ref: { type: "string", description: "Book and chapter, e.g. 'jn.3', 'Psalm 23', '127.19.23.0'." } },
      additionalProperties: false,
    },
    returns: "{ref, display, book, chapter, title?, headings?, prev, next, quartet, source, verses[]}",
    example: { input: { ref: "ps.23" }, curl: "curl -s https://harness.talk/api/v1/chapters/ps.23" },
  },
  {
    name: "search",
    description: "Search the 1611 KJV in modern spelling: 'loved' finds 'loued', 'believe' finds 'beleeue' (shared normaliser, 96.6% measured bridge). Plain words: verses with every word, ranked closest-together first; if no verse has all of them, mode becomes 'idea' and verses are ranked by how many they carry. A \"quoted phrase\" matches exact order (spelling-insensitive). A reference resolves it. 'unmatched' lists words that occur nowhere in the text — do not infer they exist.",
    method: "GET",
    path: "/api/v1/search",
    inputSchema: {
      type: "object",
      required: ["q"],
      properties: {
        q: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        offset: { type: "integer", minimum: 0, default: 0 },
        book: { type: "string", description: "Restrict to one book id, e.g. 'ps'." },
      },
      additionalProperties: false,
    },
    returns: "{query, mode: 'reference'|'phrase'|'terms'|'idea'|'common', total, hits: Verse[] with score + matched: string[] (which query words the verse carries), words: string[] (content words sought), unmatched: string[] (words absent from the text in any spelling), limit, offset}. mode 'common' = every word typed is too frequent to rank (his, unto, the); the text was scanned directly and hits are in canonical order.",
    example: { input: { q: "who is God's friend", limit: 5 }, curl: "curl -s 'https://harness.talk/api/v1/search?q=who+is+God%27s+friend&limit=5'" },
  },
  {
    name: "searchDocs",
    description: "Search the harness DOCUMENTATION — a separate layer from Scripture, never mixed with it. Covers every doc page by section (protocol, addressing, hashes, errors, covenant, licence, MCP, harness, storage, translations), the tool manifest, and the corpus build reports. Use this to learn how harness.talk works; use 'search' for the Word itself. Hits carry the page, section heading, anchor URL, and a snippet.",
    method: "GET",
    path: "/api/v1/docs/search",
    inputSchema: {
      type: "object",
      required: ["q"],
      properties: {
        q: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        offset: { type: "integer", minimum: 0, default: 0 },
        kind: { type: "string", enum: ["page", "tool", "report"], description: "Restrict to doc pages, tool definitions, or build reports." },
      },
      additionalProperties: false,
    },
    returns: "{layer: 'documentation', query, total, hits: [{kind, url, page, kicker, heading, snippet, score, matched: string[]}], words, unmatched: string[] (words found nowhere in the documentation), limit, offset}",
    example: { input: { q: "how are verses hashed", limit: 3 }, curl: "curl -s 'https://harness.talk/api/v1/docs/search?q=how+are+verses+hashed&limit=3'" },
  },
  {
    name: "getAnnotations",
    description: "Annotation layer for a chapter or verse: the Geneva Bible's chapter arguments, marginal notes, cross-references (source 'geneva-notes'). Returns source_not_ingested where the source has no verified data — never a substitute. For the Geneva verse TEXT use getVerse with source=geneva-1599.",
    method: "GET",
    path: "/api/v1/annotations/{ref}",
    inputSchema: {
      type: "object",
      required: ["ref"],
      properties: {
        ref: { type: "string", description: REF_DESC },
        source: { type: "string", default: "geneva-notes" },
      },
      additionalProperties: false,
    },
    returns: "{ref, source, count, annotations: [{id, kind, ref, text, anchor?, targets?, source}]}",
    example: { input: { ref: "gn.3" }, curl: "curl -s https://harness.talk/api/v1/annotations/gn.3" },
  },
  {
    name: "getWords",
    description:
      "Original-language text with word-level tagging for a verse, range, or chapter. OT → Hebrew (WLC/OSHB: word, Strong's, morphology; Aramaic verses flagged). NT → Greek (SBLGNT/MorphGNT: word, lemma, morphology, POS). SBLGNT is a critical text, NOT the Textus Receptus behind the KJV; versification follows the original and is never remapped — verses the KJV has but the original lacks are listed in `missing`.",
    method: "GET",
    path: "/api/v1/words/{ref}",
    inputSchema: {
      type: "object",
      required: ["ref"],
      properties: { ref: { type: "string", description: REF_DESC } },
      additionalProperties: false,
    },
    returns: "{ref, source: 'wlc-oshb'|'sblgnt-morphgnt', count, missing?: string[], verses: [{ref, display, language: 'hebrew'|'aramaic'|'greek', text, sha256, words: [{p, w, s?|l?, m, pos?}]}], fields}",
    example: { input: { ref: "jn.3.16" }, curl: "curl -s https://harness.talk/api/v1/words/jn.3.16" },
  },
  {
    name: "resolveQuartet",
    description: "Resolve a fabric address 127.{book}.{chapter}.{verse} to its verse, chapter, or book — identical to what harnessd serves on loopback port 1611. Try local first, fall back here.",
    method: "GET",
    path: "/api/v1/resolve/{quartet}",
    inputSchema: {
      type: "object",
      required: ["quartet"],
      properties: { quartet: { type: "string", pattern: "^127\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$", examples: ["127.43.3.16", "127.19.23.0", "127.1.0.0"] } },
      additionalProperties: false,
    },
    returns: "Verse | Chapter | Book object with `scope` and `address`, or problem+json.",
    example: { input: { quartet: "127.43.3.16" }, curl: "curl -s https://harness.talk/api/v1/resolve/127.43.3.16   # or locally: curl -s 127.43.3.16:1611" },
  },
];

export const ERROR_CODES = [
  { code: "ref_unparseable", status: 400, meaning: "Input is not a recognisable reference. Grammar is on /agents/protocol." },
  { code: "book_unknown", status: 404, meaning: "No book matched the id, name, alias, or ordinal." },
  { code: "chapter_out_of_range", status: 404, meaning: "Chapter exceeds the book's chapter count (given in `max`)." },
  { code: "verse_out_of_range", status: 404, meaning: "Verse exceeds the chapter's verse count (given in `max`)." },
  { code: "quartet_invalid", status: 400, meaning: "Not a 127.b.c.v address, or an octet > 255." },
  { code: "source_not_ingested", status: 501, meaning: "The source exists in the registry but has no verified data for this request. Nothing is substituted." },
  { code: "query_empty", status: 400, meaning: "Search requires ?q=." },
  { code: "not_found", status: 404, meaning: "Nothing at this address." },
] as const;

export const HARNESS_VERSION = "0.1.0";

/**
 * The ONE tool manifest. Served at /agents/tools.json, written to
 * packages/harness/client/manifest.json by scripts/build-harness.mjs, and read by the
 * MCP server — so the three can never disagree.
 */
export function buildToolManifest(baseUrl = "https://harness.talk") {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    name: "harness.talk",
    version: HARNESS_VERSION,
    baseUrl,
    localDaemon: { host: "127.0.0.0/8", port: 1611, docs: `${baseUrl}/architecture` },
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      method: t.method,
      path: t.path,
      inputSchema: t.inputSchema,
      returns: t.returns,
      example: t.example,
    })),
    errors: ERROR_CODES,
    errorFormat: "application/problem+json (RFC 9457)",
  };
}
