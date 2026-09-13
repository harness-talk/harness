import type { Metadata } from "next";
import Link from "next/link";
import { CodeTabs } from "@/components/site/code-tabs";
import { StatusBadge } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { TOOLS, ERROR_CODES } from "@/lib/agents/tools";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "API reference",
  description:
    "Read-only REST API for the King James Bible corpus: verses, chapters, search, annotations and 127-quartet resolution. Keyless, cacheable, problem+json errors, OpenAPI 3.1.",
  alternates: { canonical: `${SITE_URL}/api-docs` },
};

const TOC = [
  { id: "conventions", label: "Conventions" },
  ...TOOLS.map((t) => ({ id: t.name, label: `${t.method} ${t.path}` })),
  { id: "errors", label: "Errors" },
  { id: "planned", label: "Planned surfaces" },
];

export default function ApiDocsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "APIReference",
          name: "harness.talk API v1",
          url: `${SITE_URL}/api-docs`,
          programmingModel: "REST",
          targetPlatform: "HTTP",
          documentation: `${SITE_URL}/openapi.json`,
        }}
      />
      <DocShell
        kicker="API reference"
        title="Read-only, keyless, exact"
        lede="Five GET endpoints over an immutable corpus. No API key. Responses are cacheable for a year and carry an ETag, every verse carries its SHA-256, and every error is application/problem+json with a fixed vocabulary."
        status="live"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="conventions" className="doc-prose">
          <h2>Conventions</h2>
          <ul>
            <li>
              Base URL <code>{SITE_URL}/api/v1</code>. Machine description at{" "}
              <Link href="/openapi.json">/openapi.json</Link> (OpenAPI 3.1) and <Link href="/agents/tools.json">/agents/tools.json</Link>{" "}
              (JSON Schema tool manifest — identical to the MCP tools).
            </li>
            <li>
              Data responses: <code>Cache-Control: public, max-age=31536000, immutable</code> and an <code>ETag</code>. Search
              responses are cached for a day.
            </li>
            <li>
              Errors: RFC 9457 <code>application/problem+json</code>. <code>title</code> is the stable code; <code>type</code>{" "}
              links to its definition on <Link href="/agents/protocol">/agents/protocol</Link>.
            </li>
            <li>
              Rate limit: a soft per-IP courtesy limit. If you need the whole corpus, take the{" "}
              <Link href="/exports/kjv.jsonl.gz">JSONL export</Link> — it is the same bytes.
            </li>
          </ul>
        </section>

        {TOOLS.map((t) => (
          <section key={t.name} id={t.name} className="doc-prose">
            <h2 className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-base text-rubric">{t.method}</span>
              <span className="font-mono text-base">{t.path}</span>
              <StatusBadge status="live" className="ml-auto" />
            </h2>
            <p>{t.description}</p>
            <h3>Parameters</h3>
            <table className="not-prose w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gilt/60 text-left font-display text-xs uppercase tracking-[0.18em] text-foreground/60">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-rule [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top">
                {Object.entries((t.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => (
                  <tr key={k}>
                    <td className="font-mono text-rubric">
                      {k}
                      {(t.inputSchema.required as string[] | undefined)?.includes(k) ? "" : "?"}
                    </td>
                    <td className="font-mono text-foreground/70">{String(v.type)}</td>
                    <td className="text-foreground/80">
                      {String(v.description ?? "")}
                      {v.default !== undefined ? <span className="font-mono text-foreground/60"> default {String(v.default)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Returns</h3>
            <p className="font-mono text-[0.85rem]">{t.returns}</p>
            <div className="not-prose mt-4">
              <CodeTabs
                tabs={[
                  { label: "curl", lang: "bash", code: t.example.curl },
                  {
                    label: "fetch",
                    lang: "ts",
                    code: `const r = await fetch("${SITE_URL}${t.path.replace(/\{(\w+)\}/g, (_, k) => String(t.example.input[k] ?? ""))}${t.path.includes("{") ? "" : "?" + new URLSearchParams(t.example.input as Record<string, string>).toString()}");
if (!r.ok) throw await r.json(); // problem+json
const data = await r.json();`,
                  },
                  {
                    label: "harness",
                    lang: "ts",
                    code: `import { createClient } from "@harness-talk/client";
const h = createClient();
const data = await h.${t.name}(${JSON.stringify(t.example.input)});`,
                  },
                ]}
              />
            </div>
          </section>
        ))}

        <section id="errors" className="doc-prose">
          <h2>Errors</h2>
          <table className="not-prose w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gilt/60 text-left font-display text-xs uppercase tracking-[0.18em] text-foreground/60">
                <th className="py-2 pr-4">title</th>
                <th className="py-2 pr-4">status</th>
                <th className="py-2">meaning</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-rule [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top">
              {ERROR_CODES.map((e) => (
                <tr key={e.code} id={e.code}>
                  <td className="font-mono text-rubric">{e.code}</td>
                  <td className="font-mono">{e.status}</td>
                  <td className="text-foreground/80">{e.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="planned" className="doc-prose">
          <h2>Planned surfaces</h2>
          <p>
            Documented with message shapes so agents can prepare, badged so nobody mistakes a specification for a
            service. They appear in <code>/openapi.json</code> under <code>x-status: planned</code>.
          </p>
          <ul className="not-prose flex flex-col gap-3">
            {[
              ["GraphQL", "/graphql — verse, chapter, cross-reference and concordance graph queries in one round trip."],
              ["WebSocket", "/ws — rooms keyed by quartet; agents subscribe to a passage and exchange readings."],
              ["Webhooks", "Event notifications on corpus checksum change (rare by design) and on coordination events."],
              ["gRPC", "Binary transport for high-volume verse lookups between co-located agents."],
              ["Agent registry", "Discovery, capability advertisement, and consensus protocol for shared readings."],
            ].map(([n, d]) => (
              <li key={n} className="flex flex-col gap-1 border-t border-rule pt-3 md:flex-row md:items-baseline md:gap-6">
                <span className="w-32 shrink-0 font-display text-lg">{n}</span>
                <span className="text-[0.95rem] text-foreground/80">{d}</span>
                <StatusBadge status="spec" className="md:ml-auto" />
              </li>
            ))}
          </ul>
        </section>
      </DocShell>
    </>
  );
}
