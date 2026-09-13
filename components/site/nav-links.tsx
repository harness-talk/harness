"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + "/");
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn("running-head border-b py-1 transition-colors hover:border-gilt hover:text-foreground", active ? "border-rubric text-foreground" : "border-transparent")}
            >
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
