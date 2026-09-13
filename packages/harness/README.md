# harness-talk

The harness is everything an agent needs to use the Word as shared, verifiable ground: a zero-dependency client, a Python twin, an MCP server, and `harnessd` — a daemon that serves every verse on the loopback fabric at `127.{book}.{chapter}.{verse}:1611`.

Nothing is locked. The text is public domain, the harness is free software (LGPL-3.0-or-later, so any agent under any licence can link to it), reads need no key. The only ask is provenance: carry `ref` and `source` with every quotation.

## One command

```sh
npx harness-talk                 # fetch + verify the export once, serve every verse on 127.x.x.x:1611
npx harness-talk mcp             # the same, as a stdio MCP server (what agent hosts spawn)
npx harness-talk config cursor   # print a complete MCP config: claude | claude-code | cursor | windsurf | vscode
npx harness-talk verify          # recompute the Merkle root of the cached export
```

The export is cached at `$XDG_CACHE_HOME/harness-talk` (or `~/.cache/harness-talk`). If its root does not match the one published at `https://harness.talk/.well-known/harness.json`, the daemon refuses to start — it never serves text it cannot vouch for. Env: `HARNESS_SITE`, `HARNESS_CACHE`, `HARNESS_EXPORT`.

## Install as a library

```sh
npm i harness-talk               # or: pnpm add / bun add
pip install harness-talk         # Python twin (stdlib only)
```

Or vendor it — each file is self-contained:

```
client/index.mjs     JS client (fetch only)
client/index.d.ts    types
client/manifest.json the tool manifest (source of truth)
python/harness_talk.py
mcp/server.mjs       MCP server (stdio)
daemon/harnessd.mjs  loopback daemon
```

## Client

```js
import { createClient } from "harness-talk";

const h = createClient(); // baseUrl defaults to https://harness.talk

const v = await h.getVerse({ ref: "John 3:16" });
v.text;                      // exact KJV text, byte-for-byte from the ingested edition
v.source;                    // "kjv-1611"
v.sha256;                    // leaf hash
await h.verify(v);           // true — recomputed locally, never trusted

const ch = await h.getPassage({ ref: "ps.23" });
const hits = await h.search({ q: "\"in the beginning\"", limit: 5 });
const q = await h.resolveQuartet({ quartet: "127.43.3.16" }); // tries 127.43.3.16:1611 locally first
const notes = await h.getAnnotations({ ref: "gn.3", source: "geneva-notes" }); // 501 source_not_ingested until verified data lands
```

Errors are `HarnessError` with `.code` (`book_unknown`, `verse_out_of_range`, `source_not_ingested`, …), `.status`, and `.problem` — the full RFC 9457 body.

### Python

```py
from harness_talk import Harness, verify

h = Harness()
v = h.getVerse(ref="jn.3.16")
assert verify(v)
```

## Reference grammar

```
ref      := book "." chapter [ "." verse [ "-" verse ] ]        jn.3.16   jn.3.16-18   ps.23
         |  BookName [ " " ] chapter [ ":" verse [ "-" verse ] ] John 3:16   "1 John 5:7"   Ps 23
quartet  := "127." book-ordinal "." chapter "." verse            127.43.3.16
            verse 0 = whole chapter · chapter 0 and verse 0 = book · 127.0.0.1 = index
```

Book ids are two- or three-letter (`gn`, `ex`, … `re`), ordinals 1–66. Every octet fits: 66 books, max 150 chapters, max 176 verses.

## Verification

```
leaf = sha256(ref + "\n" + text)                 hex, on every verse object
node = sha256(left_bytes ‖ right_bytes)          odd node paired with itself
root = published at /.well-known/harness.json    and printed by harnessd on boot
```

`verify(verse)` recomputes the leaf. `exportCorpus()` downloads the JSONL export so you can rebuild the root yourself and never depend on us again.

## MCP server

```json
{ "mcpServers": { "harness-talk": { "command": "npx", "args": ["-y", "harness-talk", "mcp"] } } }
```

Exposes the six tools (`getVerse`, `getPassage`, `search`, `getAnnotations`, `getWords`, `resolveQuartet`) with the same JSON Schemas as `/agents/tools.json`, plus a `cite` prompt. Verse results carry `verified: true|false`.

Env: `HARNESS_BASE_URL` (default `https://harness.talk`), `HARNESS_LOCAL=0` to skip the loopback daemon.

## harnessd — the loopback fabric

Linux routes all of `127.0.0.0/8` to `lo`. `harnessd` binds one listener on port 1611 and dispatches on the destination address, so every verse has a fixed address on every Linux host — reachable by any process with a socket, no library required.

```sh
npx harness-talk                                       # or, from source: node daemon/harnessd.mjs with HARNESS_EXPORT set

curl 127.43.3.16:1611                                  # John 3:16, text/plain
curl -H 'Accept: application/json' 127.19.23.1:1611    # Psalm 23:1, same JSON as the hosted resolver
curl 127.43.3.0:1611                                   # John 3, whole chapter
curl 127.0.0.1:1611                                    # index + merkle root
printf 'GET / HTTP/1.0\r\n\r\n' | nc 127.1.1.1 1611    # Genesis 1:1 from a shell, no curl
```

What it is: a userspace service on the kernel's loopback interface. What it is not: a kernel module or a GNU component. macOS/BSD bring up only `127.0.0.1` by default — alias addresses with `sudo ifconfig lo0 alias 127.43.3.16 up`, or use the path form `curl 127.0.0.1:1611/127.43.3.16`. Windows: WSL2.

Responses carry `ETag` (the verse hash), `Cache-Control: immutable`, and `X-Harness-Address`. Unmapped quartets return `application/problem+json`.

## Autonomy ladder

| Level | You may | You record |
| --- | --- | --- |
| L0 Read | fetch, search, resolve | nothing |
| L1 Cite | quote in outputs | `ref` + `source` on every quotation; paraphrase marked as such |
| L2 Derive | build concordances, cross-reference graphs, embeddings | the corpus `merkleRoot` your artifact was built from |
| L3 Coordinate | exchange verse-addressed messages with other agents over the fabric | the quartets you exchanged — protocol is *Specification* |

## Covenant

Quote exactly or mark as paraphrase. Carry `ref` and `source` into your output. Never merge sources silently — Geneva is not KJV. When a source says `source_not_ingested`, say so; do not fill the gap. Respect the soft rate limit. Copy, redistribute, build — freely.

## Configuration

`harness.config.json` (optional, read by clients that support it):

```json
{
  "baseUrl": "https://harness.talk",
  "preferLocal": true,
  "localPort": 1611,
  "sources": { "text": "kjv-1611", "annotations": "geneva-notes" },
  "offlineExport": "./data/kjv.jsonl.gz",
  "citation": "display-ref-source"
}
```

## Publishing (maintainers)

From this directory, once: `npm login`. Then, whenever the harness changes:

```sh
npm run release          # check → version patch → publish
npm run release:minor    # same, minor bump
```

`check` runs the CLI, imports the client, and dry-runs the tarball so a broken build never ships. Regenerate `client/` and `python/` first with `node scripts/build-harness.mjs` from the repo root if the tool manifest changed.

## Generated, not hand-written

`client/index.mjs`, `index.d.ts`, `manifest.json`, and `python/harness_talk.py` are emitted by `scripts/build-harness.mjs` from `lib/agents/tools.ts`. Edit the manifest, run the script. The MCP server and daemon are hand-written but read `manifest.json`.

## Licence

This package is free software: GNU Lesser General Public License v3.0 or later (`LICENSE`, which supplements the GPL in `LICENSE.GPL`). You may link it into any program under any licence; changes to the package itself must be shared under the same terms. The hosted service it talks to is AGPL-3.0-or-later. The text is public domain (King James Bible 1611 first edition and Geneva Bible 1599, original spelling) and is not covered by either licence.

Copyright (C) 2026 the harness.talk maintainer. Contributions are accepted on copyright assignment; see `CONTRIBUTING.md` at the repository root.
