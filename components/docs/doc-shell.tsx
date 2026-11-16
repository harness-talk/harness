import Link from "next/link";
import { cache, type ReactNode } from "react";
import { StatusBadge, type Status } from "@/components/site/status-badge";
import { ContentsNav, DocPager, PrintButton } from "./doc-nav";

export interface TocItem {
  id: string;
  label: string;
}

type Contents = { title: string; items: { href: string; label: string }[]; footer?: { href: string; label: string } };

/**
 * Per-request flag: the printable handbook renders every agents page inside one document,
 * so DocShell drops its side navigation and renders each page as a chapter section instead.
 * React.cache is scoped to a single server request, so this never leaks between visitors.
 */
export const handbookMode = cache(() => ({ on: false }));

/**
 * Manual-style documentation layout: section contents on the left, the text in the center,
 * "on this page" on the right. Collapses to a single column on small screens.
 */
export function DocShell({
  kicker,
  title,
  lede,
  status,
  toc,
  contents,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  status?: Status;
  toc?: TocItem[];
  contents?: Contents;
  children: ReactNode;
}) {
  if (handbookMode().on) {
    return (
      <section className="handbook-chapter border-t border-rule pt-12 first:border-t-0 first:pt-0" aria-label={`${kicker}: ${title}`}>
        <header className="flex flex-col gap-3 border-b border-rule pb-8">
          <div className="flex flex-wrap items-center gap-4">
            <p className="running-head">{kicker}</p>
            {status ? <StatusBadge status={status} /> : null}
          </div>
          <h2 className="text-4xl font-medium md:text-5xl">{title}</h2>
          <p className="max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty">{lede}</p>
        </header>
        <div className="doc-prose mt-2">{children}</div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14 print:max-w-none print:p-0">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)_12rem] lg:gap-14 print:block">
        {contents ? <ContentsNav title={contents.title} items={contents.items} footer={contents.footer} /> : <div className="hidden lg:block" />}

        <article className="min-w-0">
          <header className="flex flex-col gap-3 border-b border-rule pb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <p className="running-head">{kicker}</p>
                {status ? <StatusBadge status={status} /> : null}
              </div>
              <PrintButton />
            </div>
            <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty">{lede}</p>
          </header>

          {toc && toc.length ? (
            <details className="mt-6 border border-rule lg:hidden print:hidden">
              <summary className="cursor-pointer px-4 py-3 running-head">On this page</summary>
              <ul className="flex flex-col gap-2 border-t border-rule px-4 py-3">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="text-sm text-foreground/80 hover:text-rubric">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="doc-prose mt-2">{children}</div>
          {contents ? <DocPager items={contents.items} /> : null}
        </article>

        {toc && toc.length ? (
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-20 lg:block lg:self-start print:hidden">
            <p className="running-head mb-3">On this page</p>
            <ul className="flex flex-col gap-1.5">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-sm text-foreground/70 hover:text-rubric">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </div>
  );
}

export const DOCS_CONTENTS = {
  title: "Documentation",
  items: [
    { href: "/architecture", label: "Architecture" },
    { href: "/api-docs", label: "API reference" },
    { href: "/translations", label: "Translations & originals" },
    { href: "/printers", label: "Printers & the patent" },
    { href: "/storage", label: "Storage & integrity" },
    { href: "/community", label: "Community" },
  ],
};

export const AGENTS_CONTENTS: Contents = {
  title: "For agents",
  items: [
    { href: "/agents", label: "Start here" },
    { href: "/agents/needs", label: "What an agent needs" },
    { href: "/agents/harness", label: "The harness" },
    { href: "/agents/protocol", label: "Protocol" },
    { href: "/agents/covenant", label: "Covenant" },
    { href: "/agents/mcp", label: "MCP server" },
    { href: "/agents/examples", label: "Worked examples" },
  ],
  footer: { href: "/agents/handbook", label: "The whole handbook, printable" },
};
