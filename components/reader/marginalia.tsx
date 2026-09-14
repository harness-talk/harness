import Link from "next/link";
import type { Annotation } from "@/lib/bible/annotations";
import { GENEVA_NOTES_SOURCE, KJV_SOURCE } from "@/lib/bible/sources";
import { StatusBadge } from "@/components/site/status-badge";
import { FacsimileViewer } from "./facsimile-viewer";
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
  facsimile,
}: {
  bookId: string;
  chapter: number;
  quartet: string;
  chapterRef: string;
  verseCount: number;
  geneva: { available: boolean; reason?: string; annotations: Annotation[] };
  facsimile: {
    bookName: string;
    chapter: number;
    initialLeaf: number;
    approximate: boolean;
    unmapped: boolean;
    iiifBase: string;
    archiveReader: string;
    leaves: number;
  };
}) {
  const args = geneva.annotations.filter((a) => a.kind === "argument");
  const notes = geneva.annotations
    .filter((a) => a.kind === "note")
    .sort((a, b) => (Number(a.ref.split(".")[2]) || 0) - (Number(b.ref.split(".")[2]) || 0));
  const xrefs = geneva.annotations.filter((a) => a.kind === "crossref");
  // "Available" is per-book (the source file exists); a chapter can still be awaiting
  // transcription with zero annotations. Treat that as empty and point to the facsimile.
  const hasContent = args.length > 0 || notes.length > 0 || xrefs.length > 0;

  return (
    <aside aria-label="Marginalia" className="flex flex-col gap-10 lg:sticky lg:top-20 lg:self-start">
      {/* Geneva marginal notes */}
      <section id="geneva-notes" aria-labelledby="geneva-head" className="flex scroll-mt-20 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 id="geneva-head" className="running-head">
            Geneva 1560 notes
          </h2>
          <StatusBadge status={hasContent ? "live" : "spec"}>
            {hasContent ? `${geneva.annotations.length} notes` : "Not yet ingested"}
          </StatusBadge>
        </div>
        {hasContent ? (
          <div className="flex flex-col gap-4 text-[0.95rem] leading-relaxed">
            <p className="text-pretty text-[0.78rem] leading-relaxed text-foreground/60">
              Hand-transcribed from the 1560 first edition in its original spelling. Each note is keyed to the word it
              glosses — tap a letter in the text to jump to its note, or <em>Compare the 1560 page</em> above to check it
              against the facsimile. Notes illegible in the facsimile are omitted, never reconstructed.
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
                    <li
                      key={a.id}
                      id={noteDomId(a.ref, a.id)}
                      className="flex scroll-mt-24 gap-2.5 rounded-sm target:-mx-1.5 target:bg-gilt/10 target:px-1.5 target:py-1"
                    >
                      <a
                        href={`#v${v}`}
                        className="verse-num mt-[0.45em] w-5 shrink-0 text-right hover:text-gilt"
                        title={`Back to verse ${v}`}
                      >
                        {v}
                      </a>
                      <span className="text-foreground/85">
                        <span className="mr-1 align-super font-display text-[0.7em] text-rubric">{noteMarker(a.id)}</span>
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
          <div className="flex flex-col gap-4">
            <p className="text-[0.95rem] leading-relaxed text-foreground/70 text-pretty">
              {geneva.reason} Rather than show anything unverified here, read this chapter&apos;s notes straight from the
              1560 first edition — open the facsimile and see the reformers&apos; marginalia in the actual printed margins.
            </p>
            <FacsimileViewer {...facsimile} />
            <p className="text-[0.8rem] leading-relaxed text-foreground/55 text-pretty">
              The transcribed {GENEVA_NOTES_SOURCE.label} (chapter arguments, notes, cross-references) will appear here
              once a checked transcription is loaded. The Geneva verse text itself is already here — use{" "}
              <em>Show Geneva 1599</em> above the chapter.{" "}
              <Link href="/translations" className="text-rubric underline underline-offset-[3px]">
                Ingestion status
              </Link>
            </p>
          </div>
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

/** A stable, selector-safe DOM id for a note, shared with the inline markers in the reader. */
function noteDomId(ref: string, id: string) {
  const letter = id.split(":").pop() ?? "";
  return `note-${ref.replace(/\./g, "-")}-${letter}`;
}

/** The marker printed at the keyed word: the note's letter, or a bar for an alternate reading. */
function noteMarker(id: string) {
  const letter = id.split(":").pop() ?? "";
  return letter === "or" ? "‖" : letter;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule/60 pb-1.5">
      <dt className="font-display text-[0.66rem] uppercase tracking-[0.16em] text-gilt">{k}</dt>
      <dd className="truncate text-foreground/85">{v}</dd>
    </div>
  );
}
