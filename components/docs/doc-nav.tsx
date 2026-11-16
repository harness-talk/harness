"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

export function ContentsNav({ title, items, footer }: { title: string; items: Item[]; footer?: Item }) {
  const path = usePathname();
  return (
    <nav aria-label={title} className="print:hidden lg:sticky lg:top-20 lg:self-start">
      <p className="running-head mb-3">{title}</p>
      <ul className="flex flex-col border-l border-rule">
        {items.map((it) => {
          const active = path === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors hover:border-gilt hover:text-foreground",
                  active ? "border-rubric font-medium text-foreground" : "border-transparent text-foreground/75",
                )}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {footer ? (
        <Link
          href={footer.href}
          aria-current={path === footer.href ? "page" : undefined}
          className="mt-6 inline-flex items-center gap-2 border border-rule px-3 py-2 font-mono text-xs text-foreground/80 transition-colors hover:border-gilt hover:text-foreground"
        >
          {footer.label}
        </Link>
      ) : null}
    </nav>
  );
}

export function DocPager({ items }: { items: Item[] }) {
  const path = usePathname();
  const i = items.findIndex((it) => it.href === path);
  if (i === -1) return null;
  const prev = items[i - 1];
  const next = items[i + 1];
  return (
    <nav aria-label="Previous and next page" className="mt-16 grid grid-cols-1 gap-4 border-t border-rule pt-8 sm:grid-cols-2 print:hidden">
      {prev ? (
        <Link href={prev.href} className="group flex flex-col gap-1 border border-rule p-4 transition-colors hover:border-gilt">
          <span className="running-head">Previous</span>
          <span className="font-display text-lg group-hover:text-rubric">{prev.label}</span>
        </Link>
      ) : (
        <span aria-hidden className="hidden sm:block" />
      )}
      {next ? (
        <Link href={next.href} className="group flex flex-col items-end gap-1 border border-rule p-4 text-right transition-colors hover:border-gilt">
          <span className="running-head">Next</span>
          <span className="font-display text-lg group-hover:text-rubric">{next.label}</span>
        </Link>
      ) : null}
    </nav>
  );
}

export function PrintButton({ label = "Print this page" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-mono text-xs text-muted-foreground underline decoration-rule underline-offset-4 transition-colors hover:text-foreground hover:decoration-gilt print:hidden"
    >
      {label}
    </button>
  );
}
