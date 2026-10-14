harness.talk — Every verse has an address.A fixed, public-domain referent for the 1611 King James Bible (and Geneva editions). Every verse is addressable as 127.book.chapter.verse (loopback fabric), served by a keyless API, MCP server, and local daemon. Exact text, per-verse SHA-256, one Merkle root. Built so agents and humans can cite the same words and check the hash.What it isCorpus: 66 books, 1,189 chapters, 31,102 verses of the 1611 KJV (original spelling). Geneva 1599 verse text is live as a second source. Hebrew/Greek interlinear on tap. Nothing unverified is served.
Annotations (in progress): The reformers’ marginal notes and chapter arguments from the Geneva Bible 1560 first edition (geneva-notes). Hand-transcribed from the 1560 facsimile page images, original spelling preserved. Transcription is ongoing (Jonah fully verified so far; others return source_not_ingested rather than substitute). Facsimile page images of the 1560 edition are also available for browsing.
First side-by-side engine: Real front leaves of the 1560 Geneva Bible and the 1611 King James set beside each other — title pages, dedications, and the people and patent behind them. The Scripture is nearly the same book; what changed was the cover, the crown, and the right to print. See the comparison live at https://www.harness.talk/printers.
Fabric: Deterministic loopback addressing. On Linux, any process can curl 127.43.3.16:1611 (John 3:16) and get the exact verse. Hosted resolver mirrors it.
Harness: Tools for agents first. MCP server (npx harness-talk mcp), REST API, typed clients, bulk exports. Discover → resolve → read → cite → verify. No account, no key, no tracking.

Corpus Merkle root: e33985722301b534baa052a9c9f74db965abbee4deb8b2f70c96cd7bd693f2beChanges over time that have been overlookedThe 1560 Geneva and 1611 KJV are very nearly the same English text — scholars have long noted how much of the wording the 1611 kept from earlier versions, Geneva chief among them. What shifted was mostly presentation, patronage, and the commercial right to print:The Geneva was made by a circle of English exiles in Geneva during Mary’s reign (Whittingham, Gilby, Sampson and others), working from Hebrew and Greek with the reformers’ marginal notes. It was dedicated to Elizabeth I in 1560; she did not commission or fund it.
The notes were revised in later editions (the 1599 primarily revised the notes, not the verse text). Those 1560 marginal notes — the layer that made Geneva the people’s study Bible and the one the KJV translators disliked — are now being hand-transcribed and added.
Christopher Barker secured the lucrative Bible patent. Between roughly 1576 and 1600 he and his assigns printed more than fifty editions of the Geneva Bible. The 1577 patent gathered statutes, service books, and Bibles into one exclusive right. His son Robert Barker’s press later produced the 1611 King James. The patent governed printing, not authorship.
Versification differs from the KJV in a limited set of places (66 documented differences for Geneva). The site never remaps or substitutes; it returns the exact source or says when something is not ingested.

These details — the patent-holder’s long role printing Geneva before the KJV, the near-identity of the texts, and the reformers’ notes that were later set aside — are easy to overlook when the story is told only as “the KJV replaced everything.” The side-by-side front leaves and the ongoing 1560 notes work make the actual record checkable.Quick startFor agents (Claude Desktop, Cursor, etc.)
Add to claude_desktop_config.json (or equivalent):json

{
  "mcpServers": {
    "harness-talk": {
      "command": "npx",
      "args": ["-y", "harness-talk", "mcp"]
    }
  }
}

Requires Node 20+. First run downloads and verifies the ~1.5 MB signed corpus.Local daemon (Linux preferred):bash

npx @harness-talk/daemon
# listens on 127.0.0.0/8:1611

REST examples:bash

curl -s https://harness.talk/api/v1/verses/jn.3.16
curl -s https://harness.talk/api/v1/resolve/127.43.3.16
curl -s https://harness.talk/.well-known/harness.json
# Annotations (where transcribed):
curl -s "https://harness.talk/api/v1/annotations/jnh.1?source=geneva-notes"

WhyWhen agents (or people) cite jn.3.16, they name the same fixed words with the same hash. The text has not moved in four centuries. Agreement becomes something you can check. Public domain, AGPL/LGPL free software, freely given. The 1560 Geneva notes are being added so the reformers’ own commentary can sit beside the text with the same verifiability.In the beginning was the Word, & the Word was with God, and the Word was God.
LinksLive site: https://www.harness.talk/
Printers / side-by-side title pages: https://www.harness.talk/printers
Agent guide: https://www.harness.talk/agents
Architecture: https://www.harness.talk/architecture
Foundation / sources: https://www.harness.talk/foundation
Protocol, covenant, examples: under /agents

Text: 1611 King James Bible and Geneva Bible (1599 verse text live; 1560 notes and partial verse text in progress), both public domain, original spelling.
Licenses: service AGPL-3.0-or-later; agent clients LGPL-3.0-or-later.
Built 2026.

