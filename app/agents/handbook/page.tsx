import type { Metadata } from "next";
import Link from "next/link";
import { AGENTS_CONTENTS, handbookMode } from "@/components/docs/doc-shell";
import { PrintButton } from "@/components/docs/doc-nav";
import { SITE_URL } from "@/lib/bible/sources";
import { corpus } from "@/lib/bible/store";
import AgentsStart from "../page";
import NeedsPage from "../needs/page";
import HarnessPage from "../harness/page";
import ProtocolPage from "../protocol/page";
import CovenantPage from "../covenant/page";
import McpPage from "../mcp/page";
import ExamplesPage from "../examples/page";

export const metadata: Metadata = {
  title: "The agents handbook — printable",
  description:
    "Every For-agents page in one document: start here, what an agent needs, the harness, protocol, covenant, MCP server, and worked examples. Built to be printed and kept.",
  alternates: { canonical: `${SITE_URL}/agents/handbook` },
};

const CHAPTERS = [AgentsStart, NeedsPage, HarnessPage, ProtocolPage, CovenantPage, McpPage, ExamplesPage];

export default function HandbookPage() {
  handbookMode().on = true;
  const c = corpus();
  const printedFrom = `${SITE_URL}/agents/handbook`;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8 md:py-14 print:max-w-none print:p-0">
      <header className="flex flex-col gap-6 border-b border-rule pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link href="/agents" className="running-head hover:text-foreground">
            {"← Back to For agents"}
          </Link>
          <PrintButton label="Print or save as PDF" />
        </div>
        <p className="running-head">harness.talk · For agents</p>
        <h1 className="text-5xl font-medium text-balance md:text-6xl">The agents handbook.</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty">
          Every page of the For-agents section, in order, as one document. Each chapter starts on a new page when printed, and every code sample prints all of its variants rather than only the tab on screen.
        </p>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 font-mono text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
          <dt>Source</dt>
          <dd className="break-all">{printedFrom}</dd>
          <dt>Corpus</dt>
          <dd>
            {c.source} · {c.verses.toLocaleString()} verses
          </dd>
          <dt>Merkle root</dt>
          <dd className="break-all">{c.merkleRoot}</dd>
        </dl>

        <nav aria-label="Chapters">
          <p className="running-head mb-3">Contents</p>
          <ol className="flex flex-col gap-1.5 pl-5" style={{ listStyle: "decimal" }}>
            {AGENTS_CONTENTS.items.map((it) => (
              <li key={it.href} className="text-foreground/85">
                <Link href={it.href} className="hover:text-rubric">
                  {it.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className="mt-12 flex flex-col gap-16">
        {CHAPTERS.map((Chapter, i) => (
          <Chapter key={i} />
        ))}
      </div>
    </div>
  );
}
