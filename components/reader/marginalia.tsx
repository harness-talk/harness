import Link from "next/link";
import type { Annotation } from "@/lib/bible/annotations";
import { GENEVA_NOTES_SOURCE, KJV_SOURCE } from "@/lib/bible/sources";
import { StatusBadge } from "@/components/site/status-badge";
import { CopyLine } from "./copy-line";

/**
 * The margin of the page: the Geneva Bible's notes beside the KJV body (when ingested),
 * and the machine face of the same chapter — how an agent fetches and verifies it.
 * Renders as a sticky aside on desktop, stacked sections on mobile.
 */
export function Marginalia({
  bookId,
  chapter,
  quartet,
  chapterRef: ref,
  verseCount,
  geneva,
}: {
  bookId: string;
  chapter: number;
  quartet: string;
  chapterRef: string;
  verseCount: number;
  geneva: { available: boolean; reason?: string; annotations: Annotation[] };
}) {
  const args = geneva.annotations.filter((a) => a.kind === "argument");
  const notes = geneva.annotations.filter((a) => a.kind === "note");
  const xrefs = geneva.annotations.filter((a) => a.kind === "crossref");

  return (
    <aside aria-label="Marginalia" className="flex flex-col gap-10 lg:sticky lg:top-20 lg:self-start">
      {/* Geneva marginal notes */}
      <section aria-labelledby="geneva-head" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 id="geneva-head" className="running-head">
            Geneva notes
          </h2>
          <StatusBadge status={geneva.available ? "live" : "spec"}>
            {geneva.available ? `${geneva.annotations.length} notes` : "Not yet ingested"}
          </StatusBadge>
        </div>
        {geneva.available ? (
          <div className="flex flex-col gap-4 text-[0.95rem] leading-relaxed">
            <p className="text-pretty text-[0.78rem] leading-relaxed text-foreground/60">
              Hand-transcribed from the 1560 first edition, original spelling, and checkable against the page —
              use <em>See the real 1560 page</em> above. Notes illegible in the facsimile are omitted, never reconstructed.
            </p>
            {args.map((a) => (
              <p key={a.id} className="italic text-foreground/85">
                {a.text}
              </p>
            ))}
            {notes.length ? (
              <ol className="flex flex-col gap-2.5">
                {notes.map((a) => {
                  const v = a.ref.split(".")[2];
                  return (
                    <li key={a.id} className="flex gap-2.5">
                      <a href={`#v${v}`} className="verse-num mt-[0.45em] w-5 shrink-0 text-right">
                        {v}
                      </a>
                      <span className="text-foreground/85">
                        {a.anchor ? <em className="text-foreground">{a.anchor} </em> : null}
                        {a.text}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {xrefs.length ? (
              <p className="font-mono text-xs leading-relaxed text-foreground/70">
                {xrefs.map((x) => (x.targets ?? []).join(" · ")).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-[0.95rem] leading-relaxed text-foreground/70 text-pretty">
            {geneva.reason} The margin stays empty rather than showing anything unverified. The {GENEVA_NOTES_SOURCE.label}
            {" (chapter arguments, notes, cross-references) will appear here"} once a checked transcription is loaded. The Geneva
            verse text itself is already here — use <em>Show Geneva</em> above the chapter.{" "}
            <Link href="/translations" className="text-rubric underline underline-offset-[3px]">Ingestion status</Link>
          </p>
        )}
      </section>

      {/* Machine face */}
      <section aria-labelledby="machine-head" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 id="machine-head" className="running-head">
            For agents
          </h2>
          <StatusBadge status="live" />
        </div>
        <dl className="flex flex-col gap-3 font-mono text-[0.8rem]">
          <Row k="Reference" v={ref} />
          <Row k="Loopback" v={`${quartet}:1611`} />
          <Row k="Verses" v={String(verseCount)} />
          <Row k="Edition" v={KJV_SOURCE.id} />
        </dl>
        <div className="mt-1 flex flex-col gap-1.5">
          <CopyLine label="REST" text={`curl -s https://harness.talk/api/v1/chapters/${ref}`} />
          <CopyLine label="Local" text={`curl -s ${quartet}:1611`} />
          <CopyLine label="Cite" text={`${ref}@${KJV_SOURCE.id}`} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href={`/api/v1/chapters/${ref}`} className="text-rubric underline underline-offset-[3px]">
            JSON
          </Link>
          <Link href={`/api/v1/annotations/${ref}`} className="text-rubric underline underline-offset-[3px]">
            Annotations
          </Link>
          <Link href={`/api/v1/resolve/${quartet}`} className="text-rubric underline underline-offset-[3px]">
            Resolve quartet
          </Link>
          <Link href="/agents" className="text-rubric underline underline-offset-[3px]">
            Agent guide
          </Link>
        </div>
        <p className="sr-only">
          Book {bookId}, chapter {chapter}.
        </p>
      </section>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule/60 pb-1.5">
      <dt className="font-display text-[0.66rem] uppercase tracking-[0.16em] text-gilt">{k}</dt>
      <dd className="truncate text-foreground/85">{v}</dd>
    </div>
  );
}
