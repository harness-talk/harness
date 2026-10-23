"use client";

import { useState } from "react";
import { CopyButton } from "@/components/site/copy-button";

/**
 * One step to add harness.talk to any agent host.
 * Every option is a copy of the same underlying command: `npx -y https://harness.talk/downloads/harness-talk.tgz mcp`.
 * No account, no key, nothing to sign up for — the package pulls the verified corpus on first run.
 */

const MCP = { command: "npx", args: ["-y", "https://harness.talk/downloads/harness-talk.tgz", "mcp"] };

const HOSTS = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    where: "Settings → Developer → Edit Config (claude_desktop_config.json)",
    text: JSON.stringify({ mcpServers: { "harness-talk": MCP } }, null, 2),
    lang: "json",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    where: "Run in your terminal",
    text: "claude mcp add harness-talk -- npx -y https://harness.talk/downloads/harness-talk.tgz mcp",
    lang: "sh",
  },
  {
    id: "cursor",
    label: "Cursor",
    where: ".cursor/mcp.json in your project, or ~/.cursor/mcp.json",
    text: JSON.stringify({ mcpServers: { "harness-talk": MCP } }, null, 2),
    lang: "json",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    where: "~/.codeium/windsurf/mcp_config.json",
    text: JSON.stringify({ mcpServers: { "harness-talk": MCP } }, null, 2),
    lang: "json",
  },
  {
    id: "shell",
    label: "Shell",
    where: "Starts the loopback daemon on 127.book.chapter.verse:1611",
    text: "npx -y https://harness.talk/downloads/harness-talk.tgz",
    lang: "sh",
  },
] as const;

export function InstallPicker({ compact = false }: { compact?: boolean }) {
  const [id, setId] = useState<(typeof HOSTS)[number]["id"]>("claude-desktop");
  const host = HOSTS.find((h) => h.id === id)!;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Choose your agent host" className="flex flex-wrap gap-x-4 gap-y-1 border-b border-rule">
        {HOSTS.map((h) => (
          <button
            key={h.id}
            role="tab"
            type="button"
            aria-selected={h.id === id}
            onClick={() => setId(h.id)}
            className={`-mb-px border-b-2 px-0.5 py-2 font-display text-[0.66rem] uppercase tracking-[0.16em] transition-colors ${
              h.id === id ? "border-gilt text-foreground" : "border-transparent text-foreground/55 hover:text-foreground"
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[0.7rem] text-foreground/50">{host.where}</p>
          <CopyButton text={host.text} label="Copy" />
        </div>
        <pre className={`overflow-x-auto border border-rule bg-surface-raised px-4 py-3 font-mono leading-relaxed text-foreground/85 ${compact ? "text-[0.72rem]" : "text-[0.8rem]"}`}>
          <code>{host.text}</code>
        </pre>
        {!compact ? (
          <p className="text-sm leading-relaxed text-foreground/60 text-pretty">
            Requires Node 20+. The first run downloads the signed corpus export (~1.5 MB) and refuses to serve if its Merkle root does not match
            the published one.
          </p>
        ) : null}
      </div>
    </div>
  );
}
