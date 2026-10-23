#!/usr/bin/env node
// SPDX-License-Identifier: LGPL-3.0-or-later
// harnessd — serves the KJV corpus on the loopback fabric: 127.{book}.{chapter}.{verse}:1611
//
// Linux routes the entire 127.0.0.0/8 block to `lo`, so a single listener bound to
// 0.0.0.0:1611 receives connections addressed to any 127.x.y.z and dispatches on
// socket.localAddress. No kernel module, no GNU component — a plain userspace
// service any process on the host can reach with a socket.
//
//   curl 127.43.3.16:1611                         → John 3:16 (text/plain)
//   curl -H 'Accept: application/json' 127.19.23.1:1611   → Psalm 23:1 (JSON, same shape as harness.talk /api/v1/resolve)
//   curl 127.43.3.0:1611                          → John 3 (whole chapter)
//   curl 127.43.0.0:1611                          → John (book metadata)
//   curl 127.0.0.1:1611                           → index / health
//   curl 127.1.3.15:1611/links                    → Genesis 3:15's cross references as addresses, hash-checked locally
//
// Zero dependencies. Node 20+.

import http from "node:http";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.HARNESS_PORT || 1611);
const HOST = process.env.HARNESS_HOST || "0.0.0.0";
const SITE = process.env.HARNESS_SITE || "https://harness.talk";
const EXPORT = process.env.HARNESS_EXPORT || join(__dirname, "..", "data", "kjv.jsonl.gz");

// ---------------------------------------------------------------------------
// Load corpus (JSONL export: one verse per line)
// ---------------------------------------------------------------------------
function loadCorpus(path) {
  if (!existsSync(path)) {
    console.error(`harnessd: corpus not found at ${path}`);
    console.error(`  Download it:  curl -sL ${SITE}/exports/kjv.jsonl.gz -o ${path}`);
    console.error(`  Or set HARNESS_EXPORT=/path/to/kjv.jsonl.gz`);
    process.exit(2);
  }
  const raw = readFileSync(path);
  const text = path.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  const rows = text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  // First row is the corpus header (kind:"corpus") carrying the published root.
  const header = rows[0]?.kind === "corpus" ? rows.shift() : null;
  const verses = rows;

  // Integrity gate: recompute every leaf and the root; refuse to serve on mismatch.
  let badLeaves = 0;
  for (const v of verses) if (sha(`${v.ref}\n${v.text}`) !== v.sha256) badLeaves++;
  if (badLeaves) {
    console.error(`harnessd: ${badLeaves} verse(s) fail their own SHA-256 — export is corrupt. Refusing to serve.`);
    process.exit(3);
  }
  const computedRoot = merkle(verses.map((v) => v.sha256));
  if (header && header.merkleRoot !== computedRoot) {
    console.error(`harnessd: Merkle root mismatch.\n  header   ${header.merkleRoot}\n  computed ${computedRoot}\nRefusing to serve.`);
    process.exit(3);
  }
  if (header && header.verses !== verses.length) {
    console.error(`harnessd: header says ${header.verses} verses, file has ${verses.length}. Refusing to serve.`);
    process.exit(3);
  }

  // index: book ordinal → { id, name, chapters: Map<chapter, verse[]> }
  const books = new Map();
  for (const v of verses) {
    const ord = v.book.ordinal;
    let b = books.get(ord);
    if (!b) {
      b = { n: ord, id: v.book.id, name: v.book.name, chapters: new Map(), verses: 0 };
      books.set(ord, b);
    }
    let c = b.chapters.get(v.chapter);
    if (!c) {
      c = [];
      b.chapters.set(v.chapter, c);
    }
    c.push(v);
    b.verses++;
  }
  return { verses, books, merkleRoot: computedRoot, source: header?.source ?? verses[0]?.source, verifiedAgainstHeader: !!header };
}

function sha(s) {
  return createHash("sha256").update(s).digest("hex");
}
// Canonical corpus Merkle tree (same as harness.talk):
//   leaf  = sha256(ref + "\n" + text)                      (raw 32-byte digest)
//   node  = sha256(left_bytes || right_bytes)              (odd node is paired with itself)
//   root  = hex of the final digest
function merkle(leafHexes) {
  if (!leafHexes.length) return sha("");
  let level = leafHexes.map((h) => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const l = level[i];
      const r = level[i + 1] ?? level[i];
      next.push(createHash("sha256").update(Buffer.concat([l, r])).digest());
    }
    level = next;
  }
  return level[0].toString("hex");
}

const corpus = loadCorpus(EXPORT);

// ---------------------------------------------------------------------------
// Resolve a quartet → payload (mirrors harness.talk /api/v1/resolve)
// ---------------------------------------------------------------------------
function problem(code, status, detail, extra = {}) {
  return { status, body: { type: `${SITE}/agents/protocol#${code}`, title: code, status, detail, ...extra }, type: "application/problem+json" };
}

function resolve(address) {
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (!m) return problem("ref_unparseable", 400, `Not a fabric address: ${address}`);
  const [b, c, v] = m.slice(1).map(Number);

  if (b === 0 && c === 0 && v === 1) {
    return {
      status: 200,
      type: "application/json",
      body: {
        service: "harnessd",
        scope: "index",
        source: corpus.source,
        books: corpus.books.size,
        verses: corpus.verses.length,
        merkleRoot: corpus.merkleRoot,
        scheme: "127.{book 1-66}.{chapter}.{verse} · .0 = whole chapter · .0.0 = book",
        docs: `${SITE}/architecture`,
      },
    };
  }
  const book = corpus.books.get(b);
  if (!book) return problem("book_unknown", 404, `No book at ordinal ${b} (1–66)`, { address });
  if (c === 0) {
    return {
      status: 200,
      type: "application/json",
      body: { scope: "book", address, id: book.id, name: book.name, ordinal: book.n, chapters: book.chapters.size, verses: book.verses, source: corpus.source },
    };
  }
  const chapter = book.chapters.get(c);
  if (!chapter) return problem("chapter_out_of_range", 404, `${book.name} has ${book.chapters.size} chapters`, { address });
  if (v === 0) {
    return {
      status: 200,
      type: "application/json",
      body: {
        scope: "chapter",
        address,
        ref: `${book.id}.${c}`,
        display: `${book.name} ${c}`,
        source: corpus.source,
        verses: chapter.map((x) => ({ ref: x.ref, verse: x.verse, text: x.text, sha256: x.sha256 })),
      },
    };
  }
  const verse = chapter.find((x) => x.verse === v);
  if (!verse) return problem("verse_out_of_range", 404, `${book.name} ${c} has ${chapter.length} verses`, { address });
  return {
    status: 200,
    type: "application/json",
    body: { scope: "verse", address, ref: verse.ref, display: `${book.name} ${c}:${v}`, book: book.id, chapter: c, verse: v, text: verse.text, source: corpus.source, sha256: verse.sha256 },
    plain: verse.text,
  };
}

// ---------------------------------------------------------------------------
// HTTP server — dispatch on destination address
// ---------------------------------------------------------------------------
const byRef = new Map(corpus.verses.map((v) => [v.ref, v]));

// Cross references come from harness.talk (the link table is too large to ship in the
// package). Every target is then checked against the LOCAL corpus by its SHA-256, so a
// link is only marked verified when this machine holds the exact same verse text.
async function links(address, limit) {
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (!m || m[3] === "0") return problem("quartet_invalid", 400, "Links are per verse: 127.{book}.{chapter}.{verse}", { address });
  let upstream;
  try {
    const res = await fetch(`${SITE}/api/v1/resolve/${address}/links?limit=${limit}`, { headers: { accept: "application/json" } });
    upstream = await res.json();
    if (!res.ok) return { status: res.status, type: "application/problem+json", body: upstream };
  } catch (e) {
    return problem("links_unreachable", 502, `Could not reach ${SITE} for the link table: ${e.message}`, { address });
  }
  const self = byRef.get(upstream.ref);
  const checked = upstream.links.map((l) => {
    const local = byRef.get(l.ref.split("-")[0]);
    return { ...l, verified: local ? local.sha256 === l.sha256 : null };
  });
  return {
    status: 200,
    type: "application/json",
    body: {
      ...upstream,
      verified: self ? self.sha256 === upstream.sha256 : null,
      links: checked,
      mismatches: checked.filter((l) => l.verified === false).length,
      via: SITE,
    },
    plain: [
      `${upstream.display}  ${address}  (${upstream.total} links, showing ${checked.length})`,
      ...checked.map((l) => `  ${l.verified === false ? "!" : "→"} ${l.address.padEnd(14)} ${l.display.padEnd(22)} ${String(l.votes).padStart(4)} votes`),
    ].join("\n"),
  };
}

const server = http.createServer(async (req, res) => {
  // Destination address the client connected to (the quartet). Behind a proxy, allow ?q= override.
  const url = new URL(req.url, "http://x");
  let dest = url.searchParams.get("q") || req.socket.localAddress || "";
  dest = dest.replace(/^::ffff:/, "");
  let wantLinks = false;
  if (url.pathname.length > 1) {
    // Path forms: /127.43.3.16, /links, /127.43.3.16/links
    const parts = url.pathname.slice(1).split("/").filter(Boolean);
    if (/^127\.\d+\.\d+\.\d+$/.test(parts[0] ?? "")) dest = parts.shift();
    wantLinks = parts[0] === "links";
  }

  const r = wantLinks ? await links(dest, Number(url.searchParams.get("limit")) || 15) : resolve(dest);
  const wantsJson = /application\/(json|\*)/.test(req.headers.accept || "") || r.type === "application/problem+json" || !r.plain;
  const body = wantsJson ? JSON.stringify(r.body, null, 2) + "\n" : r.plain + "\n";
  const etag = `"${r.body.sha256 || sha(body).slice(0, 32)}"`;

  res.setHeader("Content-Type", (wantsJson ? r.type : "text/plain") + "; charset=utf-8");
  res.setHeader("ETag", etag);
  res.setHeader("X-Harness-Address", dest);
  res.setHeader("X-Harness-Source", corpus.source || "");
  res.setHeader("Cache-Control", r.status === 200 ? "public, max-age=31536000, immutable" : "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304);
    return res.end();
  }
  res.writeHead(r.status);
  if (req.method === "HEAD") return res.end();
  res.end(body);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`harnessd: port ${PORT} in use. Set HARNESS_PORT to change it.`);
  else if (e.code === "EACCES") console.error(`harnessd: no permission to bind ${HOST}:${PORT}.`);
  else console.error("harnessd:", e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const platform = os.platform();
  console.log(`harnessd  ${corpus.verses.length.toLocaleString()} verses · ${corpus.books.size} books · source ${corpus.source}`);
  console.log(`merkle    ${corpus.merkleRoot}`);
  console.log(`listening ${HOST}:${PORT}  →  127.{book}.{chapter}.{verse}:${PORT}`);
  console.log(`try       curl 127.43.3.16:${PORT}`);
  if (platform === "darwin" || platform.endsWith("bsd")) {
    console.log("");
    console.log(`note      ${platform} only brings up 127.0.0.1 by default. To reach the full fabric, alias the addresses you need:`);
    console.log(`          sudo ifconfig lo0 alias 127.43.3.16 up      # one verse`);
    console.log(`          or use the path form: curl 127.0.0.1:${PORT}/127.43.3.16`);
  } else if (platform === "win32") {
    console.log("");
    console.log(`note      on Windows run harnessd inside WSL2, or use the path form: curl 127.0.0.1:${PORT}/127.43.3.16`);
  }
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
