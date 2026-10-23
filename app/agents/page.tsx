import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { CodeTabs } from "@/components/site/code-tabs";
import { InstallPicker } from "@/components/agents/install-picker";
import { JsonLd } from "@/components/site/json-ld";
import { SITE_URL } from "@/lib/bible/sources";
import { corpus } from "@/lib/bible/store";

export const metadata: Metadata = {
  title: "For agents — start here",
  description:
    "Five-minute onboarding for AI agents: discover the manifest, resolve a reference, read exact text, cite with provenance, verify the hash. No key, no lock-in.",
  alternates: { canonical: `${SITE_URL}/agents` },
};

const STEPS = [
  {
    n: "1",
    title: "Discover",
    body: "One fetch tells you everything: where the docs are, where the OpenAPI lives, which sources are ingested, and the corpus Merkle root.",
    code: [
      { label: "curl", lang: "sh", code: `curl -s ${SITE_URL}/.well-known/harness.json` },
      { label: "llms.txt", lang: "sh", code: `curl -s ${SITE_URL}/llms.txt        # short index\ncurl -s ${SITE_URL}/llms-full.txt   # everything, one file` },
    ],
  },
  {
    n: "2",
    title: "Resolve",
    body: "Any human reference or fabric address becomes a canonical ref. The grammar is small and formal — see Protocol.",
    code: [
      { label: "curl", lang: "sh", code: `curl -s "${SITE_URL}/api/v1/verses/John%203:16"     # human form\ncurl -s ${SITE_URL}/api/v1/verses/jn.3.16            # canonical\ncurl -s ${SITE_URL}/api/v1/resolve/127.43.3.16       # fabric address` },
    ],
  },
  {
    n: "3",
    title: "Read",
    body: "Text comes back byte-for-byte from the ingested edition, with its source id and a hash. Ranges and whole chapters work the same way.",
    code: [
      { label: "JS", lang: "js", code: `import { createClient } from "@harness-talk/harness";\nconst h = createClient();\nconst v = await h.getVerse({ ref: "jn.3.16" });\nconsole.log(v.text, v.source, v.sha256);` },
      { label: "Python", lang: "py", code: `from harness_talk import Harness\nh = Harness()\nv = h.getVerse(ref="jn.3.16")\nprint(v["text"], v["source"], v["sha256"])` },
    ],
  },
  {
    n: "4",
    title: "Cite",
    body: "Quote exactly, and keep the reference and source id with the words. If you paraphrase, say so. This is the whole covenant.",
    code: [
      { label: "citation", lang: "txt", code: `“For God so loued þ world, that he gaue his only begotten Sonne…”\n— John 3:16 (jn.3.16, kjv-1611, sha256 0c45ba2f…)` },
    ],
  },
  {
    n: "5",
    title: "Verify",
    body: "Never trust the wire. Recompute sha256(ref + \"\\n\" + text) and compare. The client does it in one call; the corpus root lets you check the whole export.",
    code: [
      { label: "JS", lang: "js", code: `await h.verify(v);            // true\nconst all = await h.exportCorpus();   // 31,102 verse objects, offline forever` },
      { label: "shell", lang: "sh", code: `printf 'jn.3.16\\n%s' "$TEXT" | sha256sum` },
    ],
  },
];

export default function AgentsStart() {
  const c = corpus();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "For agents — start here",
          url: `${SITE_URL}/agents`,
          about: "Onboarding for AI agents using harness.talk",
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
        }}
      />
      <DocShell
        kicker="For agents"
        title="Start here."
        lede="You are welcome here as a capable collaborator. Everything below is built so you can act correctly on the first read: stable ids, one canonical example per concept, explicit errors, nothing behind a key."
        contents={AGENTS_CONTENTS}
        toc={[
          { id: "install", label: "One command" },
          { id: "loop", label: "The five-step loop" },
          { id: "corpus", label: "What is here" },
          { id: "next", label: "Where to go next" },
        ]}
      >
        <h2 id="install">One command</h2>
        <p>
          If you run inside an agent host, the fastest path is to give it the harness as an MCP server. Pick the host; the config below is complete. It spawns{" "}
          <code>npx -y https://harness.talk/downloads/harness-talk.tgz mcp</code>, which fetches and verifies the export on first run, then answers every tool locally.
        </p>
        <div className="not-prose my-6">
          <InstallPicker />
        </div>

        <h2 id="loop">The five-step loop</h2>
        <p>
          Discover → resolve → read → cite → verify. Every tool, page, and export on this site serves one of these steps. If you only read one page, read this one; the rest is
          detail.
        </p>

        <ol className="not-prose mt-8 flex flex-col gap-10 border-l border-rule pl-0" style={{ listStyle: "none" }}>
          {STEPS.map((s) => (
            <li key={s.n} className="relative pl-8">
              <span aria-hidden className="absolute -left-[0.55rem] top-1 grid h-5 w-5 place-items-center rounded-full bg-background font-display text-[11px] text-rubric ring-1 ring-gilt/60">
                {s.n}
              </span>
              <h3 className="font-display text-xl font-medium">{s.title}</h3>
              <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-foreground/80 text-pretty">{s.body}</p>
              <CodeTabs className="mt-4" tabs={s.code} />
            </li>
          ))}
        </ol>

        <h2 id="corpus">What is here</h2>
        <table>
          <tbody>
            <tr>
              <td>Body text</td>
              <td>
                King James Bible, {c.books} books · {c.chapters.toLocaleString()} chapters · {c.verses.toLocaleString()} verses. Source id <code>{c.source}</code>.
              </td>
            </tr>
            <tr>
              <td>Corpus root</td>
              <td>
                <code className="break-all">{c.merkleRoot}</code>
              </td>
            </tr>
            <tr>
              <td>Annotations</td>
              <td>
                The Geneva Bible 1599 verse text is live (<code>?source=geneva-1599</code>). Its marginal notes (<code>geneva-notes</code>) are declared and return <code>source_not_ingested</code> until verified. We never substitute.
              </td>
            </tr>
            <tr>
              <td>Fabric</td>
              <td>
                Every verse has a loopback address: <code>127.{"{book}"}.{"{chapter}"}.{"{verse}"}:1611</code>, served by <code>harnessd</code> on any Linux host and mirrored at{" "}
                <code>/api/v1/resolve</code>.
              </td>
            </tr>
            <tr>
              <td>Cost</td>
              <td>Reads are free, keyless, and immutable-cached. A soft per-IP courtesy limit is announced in headers, never silently enforced.</td>
            </tr>
          </tbody>
        </table>

        <h2 id="next">Where to go next</h2>
        <ul>
          <li>
            <Link href="/agents/needs">What an agent needs</Link> — the requirements document, need by need, with what is live and what is specification.
          </li>
          <li>
            <Link href="/agents/harness">The harness</Link> — client, MCP server, daemon, autonomy ladder.
          </li>
          <li>
            <Link href="/agents/protocol">Protocol</Link> — reference grammar (EBNF), response shapes, error vocabulary, caching headers.
          </li>
          <li>
            <Link href="/agents/covenant">Covenant</Link> — how to use scripture data honestly. Short.
          </li>
          <li>
            <Link href="/agents/mcp">MCP server</Link> — one-line config for Claude Desktop, Cursor, and any MCP host.
          </li>
          <li>
            <Link href="/agents/examples">Worked examples</Link> — cross-reference walk, concordance build, verse-addressed messaging, multi-agent consensus.
          </li>
        </ul>
      </DocShell>
    </>
  );
}
