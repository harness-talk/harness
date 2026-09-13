import type { Metadata } from "next";
import { Dials, type DialBook } from "@/components/home/dials";
import { LoopbackDiagram } from "@/components/architecture/loopback-diagram";
import { books, corpus } from "@/lib/bible/store";
import { CodeTabs } from "@/components/site/code-tabs";
import { StatusBadge } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Architecture — the 127 fabric",
  description:
    "How harness.talk addresses every verse of the King James Bible on the loopback quartet 127.book.chapter.verse, served by a userspace daemon on any GNU/Linux host, with an identical hosted resolver.",
  alternates: { canonical: `${SITE_URL}/architecture` },
};

const TOC = [
  { id: "thesis", label: "Three layers" },
  { id: "fabric", label: "The 127 fabric" },
  { id: "visualizer", label: "Anatomy of an address" },
  { id: "grammar", label: "Address grammar" },
  { id: "daemon", label: "harnessd" },
  { id: "honesty", label: "What it is, exactly" },
  { id: "status", label: "Status of each layer" },
];

export default function ArchitecturePage() {
  const c = corpus();
  const dialBooks: DialBook[] = books().map((b) => ({ id: b.id, n: b.n, name: b.name, verseCounts: b.verseCounts }));
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "Architecture — the 127 fabric",
          url: `${SITE_URL}/architecture`,
          about: "Loopback-quartet addressing of the King James Bible for machine-to-machine coordination",
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
        }}
      />
      <DocShell
        kicker="Architecture"
        title="The 127 fabric"
        lede="Every Linux kernel routes the whole 127.0.0.0/8 block to the loopback interface. The canon fits inside it exactly: 66 books, at most 150 chapters, at most 176 verses. So every verse has an address, and any process on the machine can ask for it with a plain socket."
        status="live"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="thesis" className="doc-prose">
          <h2>Three layers</h2>
          <dl className="not-prose mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              ["Corpus", "31,102 verses from one immutable edition, each with a SHA-256 and a Merkle root over the whole. Text is exact or it is not served."],
              ["Fabric", "A deterministic address for every verse on the loopback quartet, served locally by harnessd and remotely by the hosted resolver with identical JSON."],
              ["Harness", "A tool manifest, a fetch-only client, and an MCP server so any agent can discover, retrieve, verify and cite without asking anyone."],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-gilt/60 pt-4">
                <dt className="font-display text-xl text-foreground">{t}</dt>
                <dd className="mt-2 text-[0.95rem] leading-relaxed text-foreground/75">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="fabric" className="doc-prose">
          <h2>The 127 fabric</h2>
          <p>
            The kernel owns the loopback interface. GNU userland — the shell, coreutils, your language runtimes — talks to
            it through ordinary sockets. <code>harnessd</code> sits between them as a userspace service: it listens on port{" "}
            <code>1611</code>, reads the <em>destination</em> address of each connection, and answers with the verse that
            address names. No kernel module, no patched libc, no privileged capability beyond binding a port.
          </p>
          <LoopbackDiagram />
        </section>

        <section id="visualizer" className="doc-prose">
          <h2>Anatomy of an address</h2>
          <p>
            Turn any dial. Each is one octet of an IPv4 address: the first is fixed at 127 so the kernel routes it to
            loopback; the other three are the book, chapter and verse in canonical order, bounded by the text itself.
            The same four bytes are a socket destination for the local daemon and a path on the hosted resolver, and
            they commit to one hash.
          </p>
          <div className="not-prose mt-6">
            <Dials books={dialBooks} total={c.verses} lens="anatomy" />
          </div>
        </section>

        <section id="grammar" className="doc-prose">
          <h2>Address grammar</h2>
          <pre className="not-prose overflow-x-auto border border-rule p-5 font-mono text-[0.8rem] leading-relaxed">
{`quartet   = "127." book "." chapter "." verse
book      = 1..66          ; canonical order, Genesis = 1, Revelation = 66
chapter   = 0 | 1..150     ; 0 = book metadata
verse     = 0 | 1..176     ; 0 = whole chapter

127.0.0.1               index and health (GET /)
127.{b}.0.0             book metadata
127.{b}.{c}.0           whole chapter
127.{b}.{c}.{v}         single verse

reserved  = 127.0.x.x (x ≠ 0.1) and any octet above the canonical maximum
            → application/problem+json  book_unknown | chapter_out_of_range | verse_out_of_range`}
          </pre>
          <p>
            Canonical text references use the same book numbering through short ids (<code>jn.3.16</code>,{" "}
            <code>jn.3.16-18</code>); the two forms round-trip through <code>/api/v1/resolve</code>.
          </p>
        </section>

        <section id="daemon" className="doc-prose">
          <h2>harnessd</h2>
          <p>
            Ships in the harness package. Zero dependencies, Node 20+. It loads the offline export once and answers
            every quartet from memory. On Linux it works immediately because <code>lo</code> already carries the whole
            /8; on macOS only <code>127.0.0.1</code> is up by default, and the daemon prints the alias command it needs.
          </p>
          <div className="not-prose mt-6">
            <CodeTabs
              tabs={[
                {
                  label: "run",
                  lang: "bash",
                  code: `npx @harness-talk/daemon            # or: node packages/harness/daemon/harnessd.mjs
# listening on 127.0.0.0/8:1611 — 31,102 verses, 1,189 chapters, 66 books`,
                },
                {
                  label: "curl",
                  lang: "bash",
                  code: `curl -s 127.43.3.16:1611
# For God so loved the world, that he gave his only begotten Son, …

curl -s -H 'Accept: application/json' 127.19.23.1:1611 | jq .verses[0].sha256`,
                },
                {
                  label: "python",
                  lang: "python",
                  code: `import socket
s = socket.create_connection(("127.43.3.16", 1611))
s.sendall(b"GET / HTTP/1.0\\r\\nHost: 127.43.3.16\\r\\n\\r\\n")
print(s.recv(65536).decode().split("\\r\\n\\r\\n", 1)[1])`,
                },
                {
                  label: "shell",
                  lang: "bash",
                  code: `printf 'GET / HTTP/1.0\\r\\n\\r\\n' | nc 127.66.22.21 1611 | tail -n 1`,
                },
              ]}
            />
          </div>
          <p>
            macOS: <code>sudo ifconfig lo0 alias 127.43.3.16</code> per address you need, or run the daemon on{" "}
            <code>127.0.0.1</code> and pass the quartet as the <code>Host</code> header. Windows: WSL2 behaves like Linux.
          </p>
        </section>

        <section id="honesty" className="doc-prose">
          <h2>What it is, exactly</h2>
          <p>
            A userspace service on the kernel&apos;s loopback interface, reachable from any GNU/Linux process over plain
            sockets. It is not a kernel module and not a GNU component. It gives agents a shared, verifiable referent
            for scripture on every machine they run on; what they do with that referent is theirs.
          </p>
        </section>

        <section id="status" className="doc-prose">
          <h2>Status of each layer</h2>
          <table className="not-prose w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gilt/60 text-left font-display text-xs uppercase tracking-[0.18em] text-foreground/60">
                <th className="py-2 pr-4">Layer</th>
                <th className="py-2 pr-4">Component</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-rule [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top">
              {[
                ["Corpus", "KJV 1611 text (original spelling), per-verse SHA-256, Merkle root, JSONL export", "live"],
                ["Corpus", "Geneva Bible 1599 verse text as a second source", "live"],
                ["Corpus", "Geneva marginal notes and chapter arguments", "spec"],
                ["Corpus", "Hebrew (OSHB) and Greek (SBLGNT) with morphology", "live"],
                ["Fabric", "127 quartet grammar and hosted resolver", "live"],
                ["Fabric", "harnessd loopback daemon", "live"],
                ["Harness", "Tool manifest, TypeScript client, MCP stdio server", "live"],
                ["Coordination", "Agent registry, WebSocket rooms, webhooks, consensus", "spec"],
                ["Coordination", "GraphQL and gRPC surfaces", "spec"],
                ["Distribution", "IPFS pinning and dVPN mirrors", "spec"],
              ].map(([l, c, s]) => (
                <tr key={l + c}>
                  <td className="font-display text-foreground">{l}</td>
                  <td className="text-foreground/80">{c}</td>
                  <td>
                    <StatusBadge status={s as "live" | "spec" | "partial"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </DocShell>
    </>
  );
}
