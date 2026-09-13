#!/usr/bin/env node
// SPDX-License-Identifier: LGPL-3.0-or-later
// harness-talk — one command for the whole harness.
//
//   npx harness-talk              start the loopback daemon (127.book.chapter.verse:1611)
//   npx harness-talk mcp          run the MCP server over stdio (for Claude, Cursor, Windsurf…)
//   npx harness-talk config <host>  print the MCP config for claude-desktop | claude-code | cursor | windsurf
//   npx harness-talk fetch        download + verify the corpus export without starting anything
//   npx harness-talk verify       recompute the Merkle root of the cached export
//
// Zero dependencies. Node 20+. Nothing here writes outside the cache directory, and nothing
// is served whose Merkle root does not match the one published at /.well-known/harness.json.
//
// Env:
//   HARNESS_SITE     origin to fetch from            default https://harness.talk
//   HARNESS_EXPORT   path to a kjv.jsonl.gz to use   default <cache>/kjv.jsonl.gz
//   HARNESS_CACHE    cache directory                 default $XDG_CACHE_HOME/harness-talk or ~/.cache/harness-talk

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = join(__dirname, "..");
const SITE = (process.env.HARNESS_SITE || "https://harness.talk").replace(/\/$/, "");
const CACHE =
  process.env.HARNESS_CACHE ||
  join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "harness-talk");
const EXPORT = process.env.HARNESS_EXPORT || join(CACHE, "kjv.jsonl.gz");

const [, , cmd = "daemon", ...rest] = process.argv;

const HOSTS = {
  "claude-desktop": {
    where: "Claude Desktop → Settings → Developer → Edit Config (claude_desktop_config.json)",
    text: JSON.stringify({ mcpServers: { "harness-talk": { command: "npx", args: ["-y", "harness-talk", "mcp"] } } }, null, 2),
  },
  "claude-code": {
    where: "Run in your terminal",
    text: "claude mcp add harness-talk -- npx -y harness-talk mcp",
  },
  cursor: {
    where: ".cursor/mcp.json (project) or ~/.cursor/mcp.json (global)",
    text: JSON.stringify({ mcpServers: { "harness-talk": { command: "npx", args: ["-y", "harness-talk", "mcp"] } } }, null, 2),
  },
  windsurf: {
    where: "~/.codeium/windsurf/mcp_config.json",
    text: JSON.stringify({ mcpServers: { "harness-talk": { command: "npx", args: ["-y", "harness-talk", "mcp"] } } }, null, 2),
  },
};

function log(s) {
  process.stderr.write(s + "\n");
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest();
}

/** Same construction as the site: leaf = sha256(ref\ntext); node = sha256(left||right); odd pairs with self. */
function merkleRoot(leavesHex) {
  let level = leavesHex.map((h) => Buffer.from(h, "hex"));
  if (!level.length) return null;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? a;
      next.push(sha256(Buffer.concat([a, b])));
    }
    level = next;
  }
  return level[0].toString("hex");
}

function verifyExport(path) {
  let lines, header;
  try {
    lines = gunzipSync(readFileSync(path)).toString("utf8").split("\n").filter(Boolean);
    header = JSON.parse(lines[0]);
  } catch (e) {
    log(`harness-talk: cannot read export at ${path} (${e.code || e.message}).\nRefusing to serve. Delete it and run again to re-fetch.`);
    process.exit(2);
  }
  const rows = header.kind === "corpus" ? lines.slice(1) : lines;
  const leaves = rows.map((l) => {
    const v = JSON.parse(l);
    return sha256(`${v.ref}\n${v.text}`).toString("hex");
  });
  const root = merkleRoot(leaves);
  return { header: header.kind === "corpus" ? header : null, root, count: rows.length };
}

async function publishedRoot() {
  try {
    const r = await fetch(`${SITE}/.well-known/harness.json`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.corpus?.merkleRoot ?? j?.merkleRoot ?? null;
  } catch {
    return null;
  }
}

async function ensureExport({ quiet = false } = {}) {
  if (!existsSync(EXPORT)) {
    mkdirSync(dirname(EXPORT), { recursive: true });
    const url = `${SITE}/exports/kjv.jsonl.gz`;
    if (!quiet) log(`harness-talk: fetching corpus  ${url}`);
    const r = await fetch(url);
    if (!r.ok) {
      log(`harness-talk: download failed (${r.status}). Set HARNESS_EXPORT to a local kjv.jsonl.gz or try again.`);
      process.exit(1);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const tmp = EXPORT + ".part";
    writeFileSync(tmp, buf);
    renameSync(tmp, EXPORT);
    if (!quiet) log(`harness-talk: saved ${(buf.length / 1024 / 1024).toFixed(1)} MB → ${EXPORT}`);
  }
  const { header, root, count } = verifyExport(EXPORT);
  const published = await publishedRoot();
  if (header && header.merkleRoot !== root) {
    log(`harness-talk: export is corrupt.\n  header   ${header.merkleRoot}\n  computed ${root}\nRefusing to serve. Delete ${EXPORT} and run again.`);
    process.exit(2);
  }
  if (published && published !== root) {
    log(`harness-talk: cached export does not match the published corpus.\n  published ${published}\n  computed  ${root}\nDelete ${EXPORT} to fetch the current one.`);
    process.exit(2);
  }
  if (!quiet) log(`harness-talk: ${count.toLocaleString("en-US")} verses verified · root ${root.slice(0, 16)}…${published ? " · matches published" : " · (offline; header only)"}`);
  return { root, count };
}

function run(script, env = {}) {
  const child = spawn(process.execPath, [join(PKG, script), ...rest], {
    stdio: "inherit",
    env: { ...process.env, HARNESS_EXPORT: EXPORT, HARNESS_SITE: SITE, HARNESS_BASE_URL: process.env.HARNESS_BASE_URL || SITE, ...env },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

switch (cmd) {
  case "daemon":
  case "start": {
    await ensureExport();
    run("daemon/harnessd.mjs");
    break;
  }
  case "mcp": {
    // stdout is the MCP transport — everything we say goes to stderr.
    await ensureExport({ quiet: true });
    run("mcp/server.mjs");
    break;
  }
  case "fetch": {
    await ensureExport();
    break;
  }
  case "verify": {
    if (!existsSync(EXPORT)) {
      log(`harness-talk: nothing cached at ${EXPORT}. Run \`npx harness-talk fetch\` first.`);
      process.exit(1);
    }
    const { header, root, count } = verifyExport(EXPORT);
    const published = await publishedRoot();
    const ok = (!header || header.merkleRoot === root) && (!published || published === root);
    console.log(JSON.stringify({ path: EXPORT, verses: count, computedRoot: root, headerRoot: header?.merkleRoot ?? null, publishedRoot: published, ok }, null, 2));
    process.exit(ok ? 0 : 2);
  }
  case "config": {
    const host = rest[0];
    if (!host || !HOSTS[host]) {
      log(`usage: harness-talk config <${Object.keys(HOSTS).join("|")}>`);
      process.exit(1);
    }
    log(`# ${HOSTS[host].where}`);
    console.log(HOSTS[host].text);
    break;
  }
  case "-h":
  case "--help":
  case "help": {
    console.log(`harness-talk — the King James Bible, addressed for machines.

  npx harness-talk               start the loopback daemon on 127.book.chapter.verse:1611
  npx harness-talk mcp           MCP server over stdio
  npx harness-talk config <host> MCP config for claude-desktop | claude-code | cursor | windsurf
  npx harness-talk fetch         download and verify the corpus export
  npx harness-talk verify        recompute the Merkle root of the cached export

  export: ${EXPORT}
  site:   ${SITE}
`);
    break;
  }
  default: {
    log(`harness-talk: unknown command '${cmd}'. Try \`harness-talk help\`.`);
    process.exit(1);
  }
}
