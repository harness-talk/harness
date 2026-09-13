import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge, type Status } from "@/components/site/status-badge";

export interface TocItem {
  id: string;
  label: string;
}

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
  contents?: { title: string; items: { href: string; label: string }[] };
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-14">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)_12rem] lg:gap-14">
        {contents ? (
          <nav aria-label={contents.title} className="lg:sticky lg:top-20 lg:self-start">
            <p className="running-head mb-3">{contents.title}</p>
            <ul className="flex flex-col border-l border-rule">
              {contents.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-foreground/75 hover:border-gilt hover:text-foreground">
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <article className="min-w-0">
          <header className="flex flex-col gap-3 border-b border-rule pb-8">
            <div className="flex flex-wrap items-center gap-4">
              <p className="running-head">{kicker}</p>
              {status ? <StatusBadge status={status} /> : null}
            </div>
            <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty">{lede}</p>
          </header>
          <div className="doc-prose mt-2">{children}</div>
        </article>

        {toc && toc.length ? (
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
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
    </main>
  );
}

export const DOCS_CONTENTS = {
  title: "Documentation",
  items: [
    { href: "/architecture", label: "Architecture" },
    { href: "/api-docs", label: "API reference" },
    { href: "/translations", label: "Translations & originals" },
    { href: "/storage", label: "Storage & integrity" },
    { href: "/community", label: "Community" },
  ],
};

export const AGENTS_CONTENTS = {
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
};
