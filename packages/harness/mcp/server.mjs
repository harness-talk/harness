#!/usr/bin/env node
// SPDX-License-Identifier: LGPL-3.0-or-later
// @harness-talk/mcp — a Model Context Protocol server (stdio) exposing the harness.talk tools.
//
// Zero dependencies: speaks JSON-RPC 2.0 over newline-delimited stdio per the MCP spec
// (protocol 2025-06-18). Tools and their JSON Schemas come from the shared manifest, so this
// server can never drift from /agents/tools.json or the REST client.
//
// Configure (Claude Desktop / Cursor / any MCP host):
//   { "mcpServers": { "harness": { "command": "npx", "args": ["-y", "@harness-talk/mcp"] } } }
//
// Env:
//   HARNESS_BASE_URL   default https://harness.talk
//   HARNESS_LOCAL      "0" to skip the loopback daemon for resolveQuartet

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient, HarnessError } from "../client/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "..", "client", "manifest.json"), "utf8"));

const client = createClient({
  baseUrl: process.env.HARNESS_BASE_URL || "https://harness.talk",
  preferLocal: process.env.HARNESS_LOCAL !== "0",
});

const SERVER = { name: "harness-talk", version: manifest.version || "0.1.0" };

const PROMPTS = [
  {
    name: "cite",
    description: "Quote a passage exactly with its reference, source id, and hash so the citation is verifiable.",
    arguments: [{ name: "ref", description: "Reference, e.g. jn.3.16 or John 3:16-18", required: true }],
  },
];

function write(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function ok(id, result) {
  write({ jsonrpc: "2.0", id, result });
}
function err(id, code, message, data) {
  write({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
}

async function callTool(name, args) {
  const tool = manifest.tools.find((t) => t.name === name);
  if (!tool) throw new HarnessError({ title: "not_found", status: 404, detail: `Unknown tool ${name}` });
  const fn = client[name];
  const result = await fn.call(client, args || {});
  // Attach a verification flag for single verses so the model sees the check happened.
  if (name === "getVerse") {
    // Single ref → flat verse object; range → { verses: [...] }
    const list = Array.isArray(result?.verses) ? result.verses : result?.text ? [result] : [];
    const checks = await Promise.all(list.map((v) => client.verify(v)));
    result.verified = list.length > 0 && checks.every(Boolean);
  } else if (name === "resolveQuartet" && result?.scope === "verse") {
    result.verified = await client.verify(result);
  }
  return result;
}

async function handle(msg) {
  const { id, method, params } = msg;
  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: "2025-06-18",
          capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: SERVER,
          instructions:
            "harness.talk gives you exact, hash-verified King James text. Quote verbatim or mark as paraphrase. Always carry `ref` and `source` into your output. If a source reports source_not_ingested, say so — never fill the gap.",
        });
      case "notifications/initialized":
      case "notifications/cancelled":
        return; // no response to notifications
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, {
          tools: manifest.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        });
      case "tools/call": {
        const { name, arguments: args } = params || {};
        try {
          const result = await callTool(name, args);
          return ok(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
        } catch (e) {
          const problem = e instanceof HarnessError ? e.problem : { title: "error", detail: String(e?.message || e) };
          return ok(id, { content: [{ type: "text", text: JSON.stringify(problem, null, 2) }], isError: true });
        }
      }
      case "prompts/list":
        return ok(id, { prompts: PROMPTS });
      case "prompts/get": {
        const { name, arguments: args } = params || {};
        if (name !== "cite") return err(id, -32602, `Unknown prompt ${name}`);
        const ref = args?.ref || "jn.3.16";
        const data = await client.getVerse({ ref });
        const lines = data.verses.map((v) => `${v.display} — “${v.text}” [${v.source} · sha256 ${v.sha256.slice(0, 12)}…]`);
        return ok(id, {
          description: `Verifiable citation for ${data.display}`,
          messages: [{ role: "user", content: { type: "text", text: `Cite exactly, keeping reference, source id and hash:\n\n${lines.join("\n")}` } }],
        });
      }
      default:
        if (id !== undefined) return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    if (id !== undefined) err(id, -32603, e?.message || "internal error");
  }
}

// Track in-flight requests so a closed stdin (host shutting down, or a one-shot pipe)
// still lets pending tool calls finish and flush their responses.
let inFlight = 0;
let closed = false;
function track(p) {
  inFlight++;
  Promise.resolve(p).finally(() => {
    inFlight--;
    if (closed && inFlight === 0) process.exit(0);
  });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  line = line.trim();
  if (!line) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return err(null, -32700, "Parse error");
  }
  if (Array.isArray(msg)) msg.forEach((m) => track(handle(m)));
  else track(handle(msg));
});
rl.on("close", () => {
  closed = true;
  if (inFlight === 0) process.exit(0);
});
