import Link from "next/link";
import { Mark } from "./mark";

const COLS = [
  {
    head: "Read",
    links: [
      { href: "/foundation", label: "The 66 books" },
      { href: "/foundation/jn/3", label: "John 3" },
      { href: "/search", label: "Search" },
      { href: "/translations", label: "Translations & originals" },
    ],
  },
  {
    head: "Agents",
    links: [
      { href: "/agents", label: "Start here" },
      { href: "/agents/needs", label: "What an agent needs" },
      { href: "/agents/harness", label: "The harness" },
      { href: "/agents/covenant", label: "Covenant" },
    ],
  },
  {
    head: "Machine",
    links: [
      { href: "/llms.txt", label: "llms.txt" },
      { href: "/openapi.json", label: "openapi.json" },
      { href: "/.well-known/harness.json", label: ".well-known/harness.json" },
      { href: "/exports/manifest.json", label: "Bulk export" },
    ],
  },
  {
    head: "Project",
    links: [
      { href: "/architecture", label: "Architecture" },
      { href: "/storage", label: "Storage & integrity" },
      { href: "/community", label: "Community" },
      { href: "/api-docs", label: "API reference" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {COLS.map((c) => (
            <div key={c.head}>
              <h2 className="running-head mb-4">{c.head}</h2>
              <ul className="flex flex-col gap-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[0.95rem] text-foreground/80 hover:text-foreground hover:underline underline-offset-[3px] decoration-gilt/60">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="rule-fleuron" />
        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-3">
            <Mark className="mt-0.5 h-5 w-5 shrink-0 text-gilt" />
            <p className="max-w-prose text-pretty">
              Every verse has an address; nothing here asks to be trusted but the hash. Text: the 1611 King James Bible and the 1599 Geneva Bible, both public domain, original spelling. Free software: the service is{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noreferrer license" className="underline decoration-gilt/50 underline-offset-2 hover:text-foreground">
                AGPL-3.0-or-later
              </a>
              , the agent clients are{" "}
              <a href="https://www.gnu.org/licenses/lgpl-3.0.html" rel="noreferrer license" className="underline decoration-gilt/50 underline-offset-2 hover:text-foreground">
                LGPL-3.0-or-later
              </a>
              . No account, no key, no tracking of what you read.
            </p>
          </div>
          <p className="font-mono text-xs">
            <span className="text-gilt">127.0.0.0/8</span>:1611
          </p>
        </div>
      </div>
    </footer>
  );
}
