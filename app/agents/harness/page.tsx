import type { Metadata } from "next";
import Link from "next/link";
import { CodeTabs } from "@/components/site/code-tabs";
import { StatusBadge } from "@/components/site/status-badge";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";

export const metadata: Metadata = {
  title: "The harness — client, daemon, MCP",
  description:
    "One generated client with a local-first, hosted-fallback path; a loopback daemon on 127.x.x.x:1611; a stdio MCP server. All read-only, all verifying.",
};

const TOC = [
  { id: "layers", label: "Three layers" },
  { id: "client", label: "The client" },
  { id: "daemon", label: "harnessd" },
  { id: "mcp", label: "MCP server" },
  { id: "verify", label: "Verification" },
  { id: "status", label: "What is real today" },
];

const INSTALL = [
  {
    label: "One command",
    lang: "bash",
    code: `npx -y https://harness.talk/downloads/harness-talk.tgz            # fetch + verify the export, start harnessd on 127.x.x.x:1611
npx -y https://harness.talk/downloads/harness-talk.tgz mcp        # the same, as a stdio MCP server (what agent hosts spawn)
npx -y https://harness.talk/downloads/harness-talk.tgz config cursor   # print the MCP config for cursor | claude | claude-code | windsurf | vscode`,
  },
  {
    label: "From source",
    lang: "bash",
    code: `git clone https://github.com/harness-talk/harness && cd harness/packages/harness
node bin/harness-talk.mjs   # same binary; HARNESS_CACHE / HARNESS_SITE override defaults`,
  },
  {
    label: "Client",
    lang: "js",
    code: `import { createClient } from "./client/index.mjs";

const h = createClient({ baseUrl: "https://harness.talk" });
// tries 127.43.3.16:1611 first, falls back to the hosted API
const v = await h.getVerse({ ref: "jn.3.16" });
console.log(v.display, await h.verify(v)); // "John 3:16" true`,
  },
  {
    label: "Python",
    lang: "python",
    code: `import harness_talk as h

c = h.Harness(base_url="https://harness.talk")
v = c.getVerse(ref="ps.23.1")
print(v["display"], h.verify(v))  # "Psalm 23:1" True`,
  },
];

export default function HarnessPage() {
  return (
    <DocShell kicker="For agents · harness" title="The harness." contents={AGENTS_CONTENTS} toc={TOC}
      lede="Three small programs generated from one manifest. Each is read-only. Each verifies what it hands you. None of them need a key, an account, or a network the moment a local copy exists.">
      <section id="layers" className="doc-prose">
        <h2>Three layers, one contract</h2>
        <ul>
          <li><strong>Client</strong> — <code>packages/harness/client/index.mjs</code> (and a Python twin). Generated from <code>/agents/tools.json</code>; one function per tool; <code>verify()</code> recomputes SHA-256 in-process.</li>
          <li><strong>Daemon</strong> — <code>harnessd</code>. Binds <code>127.0.0.0/8</code> on port <code>1611</code> and answers quartet addresses. Same JSON, same hashes, same Merkle root as the hosted API.</li>
          <li><strong>MCP server</strong> — stdio JSON-RPC exposing the same tools to Claude Desktop, Cursor, or any MCP host. Marks every result <code>verified: true|false</code>.</li>
        </ul>
        <p>Because all three are generated from the same manifest, they cannot drift. The build fails if <code>tools.json</code> and the client disagree.</p>
      </section>

      <section id="client" className="doc-prose">
        <h2>The client</h2>
        <CodeTabs tabs={INSTALL} />
        <p>Resolution order: local daemon if reachable in 300 ms, otherwise the hosted API. Set <code>preferLocal: false</code> to skip the probe. Errors are RFC 9457 problem objects surfaced as <code>HarnessError</code> with <code>.code</code> and <code>.status</code>.</p>
      </section>

      <section id="daemon" className="doc-prose">
        <h2>harnessd — the loopback fabric</h2>
        <p>Loopback is the whole 127.0.0.0/8 block, sixteen million addresses that every machine already owns. The daemon maps them: <code>127.BOOK.CHAPTER.VERSE</code>. Genesis is 1, Revelation is 66. Verse 0 means the chapter; chapter 0 means the book; <code>127.0.0.1</code> is the index.</p>
        <CodeTabs tabs={[
          { label: "curl", lang: "bash", code: `curl 127.43.3.16:1611
# For God so loved the world, ...

curl -H 'Accept: application/json' 127.19.23.1:1611
# {"scope":"verse","ref":"ps.23.1","sha256":"...","text":"The LORD is my shepherd; ..."}

curl 127.0.0.1:1611          # corpus index + merkleRoot
curl -i 127.70.1.1:1611      # 404 application/problem+json` },
        ]} />
        <p>The daemon loads the signed export (<code>kjv.jsonl.gz</code>) and recomputes the Merkle root on start. If the root it computes does not match the one embedded in the export, it refuses to serve.</p>
        <p>On Linux the whole block is routable by default. On macOS run <code>sudo ifconfig lo0 alias 127.43.3.16</code> per address you need, or use the hosted <Link href="/api-docs#resolve">resolve</Link> endpoint.</p>
      </section>

      <section id="mcp" className="doc-prose">
        <h2>MCP server</h2>
        <CodeTabs tabs={[
          { label: "claude_desktop_config.json", lang: "json", code: `{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness/packages/harness/mcp/server.mjs"],
      "env": { "HARNESS_BASE_URL": "https://harness.talk" }
    }
  }
}` },
        ]} />
        <p>Tools: <code>listBooks</code>, <code>getBook</code>, <code>getChapter</code>, <code>getVerse</code>, <code>search</code>, <code>resolveQuartet</code>, <code>listSources</code>, <code>getAnnotations</code>. Nothing writes. See <Link href="/agents/mcp">the MCP page</Link> for hosts and prompts.</p>
      </section>

      <section id="verify" className="doc-prose">
        <h2>Verification</h2>
        <p>Every verse carries <code>sha256 = SHA-256(ref + "\n" + text)</code>. Leaves are hashed pairwise (raw bytes, odd node paired with itself) to a corpus root published at <code>/.well-known/harness.json</code>. <code>verify()</code> recomputes the leaf. A mismatch means the text was altered in transit or the copy is not this corpus.</p>
      </section>

      <section id="status" className="doc-prose">
        <h2>What is real today</h2>
        <ul className="not-prose flex flex-col gap-2 font-mono text-sm">
          <li className="flex items-center gap-3"><StatusBadge status="live" /> hosted API, tools.json, OpenAPI, llms.txt</li>
          <li className="flex items-center gap-3"><StatusBadge status="live" /> client (JS + Python), verify(), problem+json errors</li>
          <li className="flex items-center gap-3"><StatusBadge status="live" /> harnessd on 127.x.x.x:1611 — parity tested against hosted</li>
          <li className="flex items-center gap-3"><StatusBadge status="live" /> MCP stdio server</li>
          <li className="flex items-center gap-3"><StatusBadge status="spec" /> signed releases, npm/PyPI packages, Homebrew tap</li>
        </ul>
      </section>
    </DocShell>
  );
}
