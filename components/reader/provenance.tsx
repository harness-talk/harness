import Link from "next/link";
import { SOURCES } from "@/lib/bible/sources";
import { StatusBadge } from "@/components/site/status-badge";

/**
 * Provenance panel: one row per declared source, honest about what is ingested.
 * Server component; reads only the static registry.
 */
export function Provenance() {
  return (
    <section aria-labelledby="provenance" className="mx-auto max-w-3xl">
      <h2 id="provenance" className="running-head mb-6 text-center">
        Provenance
      </h2>
      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {SOURCES.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 py-5 md:flex-row md:items-start md:gap-8">
            <div className="flex flex-col gap-1 md:w-64 md:shrink-0">
              <span className="font-display text-base font-medium">{s.label}</span>
              <code className="text-xs text-foreground/60">{s.id}</code>
              <StatusBadge status={s.status === "ingested" ? "live" : "spec"} className="mt-1 self-start">
                {s.status === "ingested" ? "Ingested" : s.status === "partial" ? "Partial" : "Declared, not ingested"}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-2 text-[0.95rem] leading-relaxed text-foreground/85">
              <p>
                {s.publisher}
                {s.year ? `, ${s.year}` : ""}. {s.language === "en" ? "English" : s.language === "he" ? "Hebrew" : s.language === "grc" ? "Greek" : s.language}. License: {s.license}.
              </p>
              {s.notes.map((n) => (
                <p key={n} className="text-foreground/70">
                  {n}
                </p>
              ))}
              {s.url ? (
                <a
                  href={s.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="self-start font-mono text-xs text-rubric underline decoration-rubric/40 underline-offset-[3px]"
                >
                  {s.url}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-sm text-foreground/60">
        Machine form:{" "}
        <Link href="/api/v1/sources" className="font-mono text-rubric underline underline-offset-[3px]">
          /api/v1/sources
        </Link>
      </p>
    </section>
  );
}
