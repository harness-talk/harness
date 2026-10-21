import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { NavLinks } from "./nav-links";
import { Mark } from "./mark";

export const NAV = [
  { href: "/foundation", label: "Foundation" },
  { href: "/cross-references", label: "Cross-refs" },
  { href: "/architecture", label: "Architecture" },
  { href: "/agents", label: "Agents" },
  { href: "/api-docs", label: "API" },
  { href: "/translations", label: "Translations" },
  { href: "/geneva-notes", label: "Geneva" },
  { href: "/community", label: "Community" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="harness.talk home">
          <Mark className="h-6 w-6 text-gilt" />
          <span className="font-display text-lg font-medium tracking-tight">harness.talk</span>
        </Link>
        <nav aria-label="Primary" className="order-3 w-full md:order-none md:w-auto">
          <NavLinks items={NAV} />
        </nav>
        <div className="flex items-center gap-5">
          <Link href="/search" className="running-head border-b border-transparent py-1 hover:border-gilt">
            Search
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
