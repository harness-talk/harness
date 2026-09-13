import Link from "next/link";
import type { DocSearchResult } from "@/lib/docs/search";

const KIND_LABEL = { page: "page", tool: "tool", report: "build report" } as const;

/**
 * Documentation hits for a query — the second, quieter layer beneath the Scripture
 * results. Rendered only when there is something to show; never interleaved with verses.
 */
export function DocResults({ result, q }: { result: DocSearchResult; q: string }) {
  if (result.hits.length === 0) return null;
  const external = (url: string) => /^https?:/.test(url);

  return (
    <section aria-labelledby="doc-results" className="mt-14">
      <div className="flex flex-col gap-1 border-b border-rule pb-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="doc-results" className="running-head">
            In the documentation
          </h2>
          <Link href={`/api/v1/docs/search?q=${encodeURIComponent(q)}`} className="font-mono text-xs text-rubric underline underline-offset-[3px]">
            JSON
          </Link>
        </div>
        <p className="font-mono text-xs text-foreground/60">
          {result.total} {result.total === 1 ? "section" : "sections"} · our words about the harness, kept in a separate index
        </p>
      </div>
      <ol className="flex flex-col divide-y divide-rule/60">
        {result.hits.map((h) => (
          <li key={h.id} className="flex flex-col gap-1 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <Link
                href={h.url}
                {...(external(h.url) ? { rel: "noreferrer", target: "_blank" } : {})}
                className="font-display text-[0.95rem] font-medium hover:text-rubric"
              >
                {h.heading}
              </Link>
              <span className="shrink-0 font-mono text-[0.68rem] text-foreground/45">{KIND_LABEL[h.kind]}</span>
            </div>
            <p className="font-mono text-[0.68rem] text-foreground/50">
              {h.page}
              {h.kicker ? ` · ${h.kicker}` : ""}
            </p>
            <p className="text-sm leading-relaxed text-foreground/75 text-pretty">{h.snippet}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
