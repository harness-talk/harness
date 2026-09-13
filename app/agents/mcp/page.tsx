import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { CodeTabs } from "@/components/site/code-tabs";
import { TOOLS } from "@/lib/agents/tools";

export const metadata: Metadata = {
  title: "MCP server — Scripture as tools for Claude, Cursor and any MCP host",
  description: "A zero-dependency stdio MCP server exposing eight read-only Scripture tools, each result marked verified: true|false.",
};

const TOC = [
  { id: "install", label: "Install" },
  { id: "tools", label: "Tools" },
  { id: "verified", label: "The verified flag" },
  { id: "prompts", label: "Prompts that work" },
  { id: "hosts", label: "Hosts" },
];

export default function McpPage() {
  return (
    <DocShell
      kicker="For agents · MCP"
      title="MCP server."
      lede="Model Context Protocol lets a model call tools. This server exposes the harness as eight of them. It has no dependencies beyond Node, it never writes, and every result it returns has already been hashed and checked."
      contents={AGENTS_CONTENTS}
      toc={TOC}
    >
      <section id="install">
        <h2>Install</h2>
        <CodeTabs
          tabs={[
            {
              label: "Claude Desktop",
              lang: "json",
              code: `// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "harness": {
      "command": "npx",
      "args": ["-y", "harness-talk", "mcp"],
      "env": { "HARNESS_BASE_URL": "https://harness.talk" }
    }
  }
}`,
            },
            {
              label: "Cursor / Windsurf",
              lang: "json",
              code: `// .cursor/mcp.json
{
  "mcpServers": {
    "harness": {
      "command": "npx",
      "args": ["-y", "harness-talk", "mcp"]
    }
  }
}`,
            },
            {
              label: "Manual test",
              lang: "bash",
              code: `printf '%s\\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \\
  | npx -y harness-talk mcp`,
            },
          ]}
        />
        <p>
          Environment: <code>HARNESS_BASE_URL</code> (default <code>https://harness.talk</code>), <code>HARNESS_LOCAL=0</code> to skip the loopback
          daemon probe.
        </p>
      </section>

      <section id="tools">
        <h2>Tools</h2>
        <p>Generated from the same manifest as the REST API and the client. Names and schemas are identical to <Link href="/agents/tools.json">/agents/tools.json</Link>.</p>
        <table>
          <thead>
            <tr>
              <th>tool</th>
              <th>does</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.name}>
                <td>
                  <code>{t.name}</code>
                </td>
                <td>{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="verified">
        <h2>The verified flag</h2>
        <p>
          For <code>getVerse</code>, <code>getChapter</code> and <code>resolveQuartet</code> the server recomputes each verse's SHA-256 before
          returning and sets <code>structuredContent.verified</code>. A model can be told, in one line of system prompt, to refuse to quote anything
          where <code>verified</code> is false. That is the entire anti-hallucination story: not a bigger model, a checked hash.
        </p>
      </section>

      <section id="prompts">
        <h2>Prompts that work</h2>
        <ul>
          <li>"Quote John 3:16 from the harness and tell me whether it verified."</li>
          <li>"Find every verse in Psalms containing 'shepherd' and list the references."</li>
          <li>"What is at 127.19.23.1? Resolve it and show the text."</li>
          <li>"Give me Romans 8 as a chapter, then summarise it, keeping verse numbers in your summary."</li>
          <li>"Which sources are ingested versus only declared? Do not guess — call listSources."</li>
        </ul>
      </section>

      <section id="hosts">
        <h2>Hosts</h2>
        <p>
          Tested by hand with the stdio transport against JSON-RPC 2.0 messages for <code>initialize</code>, <code>tools/list</code> and{" "}
          <code>tools/call</code>. Any host that speaks MCP over stdio should work. An HTTP/SSE transport is specified but not shipped.
        </p>
      </section>
    </DocShell>
  );
}
