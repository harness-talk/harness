import type { VerseRecord } from "@/lib/bible/store";
import type { Annotation } from "@/lib/bible/annotations";
import type { OriginalVersePayload } from "@/lib/bible/originals";
import { VerseText } from "./verse-text";

/**
 * The reading column. Verse numbers live in a narrow gutter (rubricated superior figures),
 * the first verse opens with a drop initial, and Psalm 119's Hebrew letters appear as
 * centered rubrics. Each verse is an anchor target (#v16) so citations resolve.
 *
 * When `originals` is provided, each verse carries its Hebrew/Greek line, hidden by CSS
 * until the reader root's `data-original="on"`; when `geneva` is provided, the Geneva
 * Bible's reading of the verse likewise waits on `data-geneva="on"` (both set by
 * <OriginalsToggle/>).
 */
export function VerseReader({
  verses,
  headings,
  notes,
  bookId,
  chapter,
  originals,
  originalLabel,
  geneva,
  geneva1560,
  readerId = "reader",
}: {
  verses: VerseRecord[];
  headings: Annotation[];
  notes?: Annotation[];
  bookId: string;
  chapter: number;
  originals?: Map<number, OriginalVersePayload>;
  originalLabel?: string;
  geneva?: Map<number, string>;
  geneva1560?: Map<number, string>;
  readerId?: string;
}) {
  const headingBefore = new Map<number, string>();
  for (const h of headings) {
    const v = Number(h.ref.split(".")[2]);
    headingBefore.set(v, h.text);
  }

  // Notes grouped by verse, so each verse can carry its keyed footnote markers.
  const notesByVerse = new Map<number, Annotation[]>();
  for (const n of notes ?? []) {
    const v = Number(n.ref.split(".")[2]);
    if (!Number.isFinite(v)) continue;
    const arr = notesByVerse.get(v);
    if (arr) arr.push(n);
    else notesByVerse.set(v, [n]);
  }

  return (
    <div id={readerId} data-original="off" data-geneva="off" data-geneva-1560="off" data-geneva-notes="off" data-compare="off" className="group/reader mt-8 flex flex-col gap-3 text-[1.19rem] leading-[1.62] md:text-[1.25rem]">
      {verses.map((v, i) => {
        const heading = headingBefore.get(v.verse);
        const o = originals?.get(v.verse);
        const rtl = o?.language === "hebrew" || o?.language === "aramaic";
        const g = geneva?.get(v.verse);
        const g1560 = geneva1560?.get(v.verse);
        const verseNotes = notesByVerse.get(v.verse) ?? [];
        return (
          <div key={v.ref} className="contents">
            {heading ? (
              <p className="mt-6 mb-1 text-center font-display text-sm uppercase tracking-[0.2em] text-rubric" aria-label={`Section ${heading}`}>
                {heading}
              </p>
            ) : null}
            <div id={`v${v.verse}`} className="group relative flex gap-3 scroll-mt-24 target:bg-gilt/10 target:-mx-2 target:px-2">
              <a
                href={`#v${v.verse}`}
                className="verse-num mt-[0.55em] w-6 shrink-0 text-right hover:text-gilt"
                aria-label={`Verse ${v.verse}, address ${v.quartet}`}
                title={v.quartet}
              >
                {v.verse}
              </a>
              {/*
                Reading mode: sources stack as lines under the verse (toggles reveal them).
                Parallel mode (data-compare=on): sources become aligned, labeled columns —
                a color-ruled comparison stack on mobile, true side-by-side columns at md+.
                Auto-fit keeps the columns even for however many sources are present.
              */}
              <div className="flex min-w-0 flex-col gap-1 group-data-[compare=on]/reader:gap-4 md:group-data-[compare=on]/reader:grid md:group-data-[compare=on]/reader:grid-cols-[repeat(auto-fit,minmax(0,1fr))] md:group-data-[compare=on]/reader:items-start md:group-data-[compare=on]/reader:gap-6">
                <div className="min-w-0 group-data-[compare=on]/reader:border-l-2 group-data-[compare=on]/reader:border-gilt/70 group-data-[compare=on]/reader:pl-3">
                  <span className="running-head mb-1 hidden text-gilt group-data-[compare=on]/reader:block">King James &middot; 1611</span>
                  <p className={i === 0 ? "drop-initial text-pretty" : "text-pretty"}>
                    <VerseText text={v.text} />
                    {verseNotes.length ? (
                      <span className="whitespace-nowrap">
                        {verseNotes.map((n) => (
                          <a
                            key={n.id}
                            href={`#${noteDomId(n.ref, n.id)}`}
                            className="ml-[0.15em] inline-block px-0.5 align-super font-display text-[0.6em] text-rubric/80 hover:text-rubric"
                            aria-label={`Note ${noteMarker(n.id)} on verse ${v.verse}`}
                          >
                            {noteMarker(n.id)}
                          </a>
                        ))}
                      </span>
                    ) : null}
                  </p>
                </div>
                {verseNotes.length ? (
                  <div className="hidden min-w-0 group-data-[geneva-notes=on]/reader:block group-data-[compare=on]/reader:block group-data-[compare=on]/reader:border-l-2 group-data-[compare=on]/reader:border-gilt/40 group-data-[compare=on]/reader:pl-3">
                    <span className="running-head mb-1 block text-gilt/80 group-data-[compare=on]/reader:text-gilt">Geneva 1560 &middot; notes</span>
                    <ul className="flex flex-col gap-1.5 border-l-2 border-gilt/30 pl-3 text-[0.9em] leading-[1.6] text-foreground/70 group-data-[compare=on]/reader:border-l-0 group-data-[compare=on]/reader:pl-0">
                      {verseNotes.map((n) => (
                        <li key={n.id} className="text-pretty">
                          <span className="mr-1 align-super font-display text-[0.7em] text-rubric">{noteMarker(n.id)}</span>
                          {n.anchor ? <em className="text-foreground/85">{n.anchor} </em> : null}
                          {n.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {geneva1560 ? (
                  <div className="hidden min-w-0 group-data-[geneva-1560=on]/reader:block group-data-[compare=on]/reader:block group-data-[compare=on]/reader:border-l-2 group-data-[compare=on]/reader:border-rubric/35 group-data-[compare=on]/reader:pl-3">
                    <span className="running-head mb-1 hidden text-rubric/75 group-data-[compare=on]/reader:block">Geneva &middot; 1560</span>
                    <p className="text-[0.95em] leading-[1.7] text-foreground/75 text-pretty">
                      <span className="running-head mr-2 align-middle text-[0.6em] text-rubric/75 group-data-[compare=on]/reader:hidden">Geneva 1560</span>
                      {g1560 ?? <span className="running-head text-foreground/45">not yet transcribed &mdash; compare the 1560 page</span>}
                    </p>
                  </div>
                ) : null}
                {geneva ? (
                  <div className="hidden min-w-0 group-data-[geneva=on]/reader:block group-data-[compare=on]/reader:block group-data-[compare=on]/reader:border-l-2 group-data-[compare=on]/reader:border-rubric/60 group-data-[compare=on]/reader:pl-3">
                    <span className="running-head mb-1 hidden text-rubric group-data-[compare=on]/reader:block">Geneva &middot; 1599</span>
                    <p className="text-[0.95em] leading-[1.7] text-foreground/75 text-pretty">
                      <span className="running-head mr-2 align-middle text-[0.6em] text-rubric group-data-[compare=on]/reader:hidden">Geneva 1599</span>
                      {g ?? <span className="running-head text-foreground/45">no verse at this number in the Geneva versification</span>}
                    </p>
                  </div>
                ) : null}
                {originals ? (
                  <div className="hidden min-w-0 group-data-[original=on]/reader:block group-data-[compare=on]/reader:block group-data-[compare=on]/reader:border-l-2 group-data-[compare=on]/reader:border-foreground/25 group-data-[compare=on]/reader:pl-3">
                    <span className="running-head mb-1 hidden text-foreground/50 group-data-[compare=on]/reader:block">{originalLabel ?? (rtl ? "Hebrew" : "Greek")}</span>
                    <p
                      lang={o ? (rtl ? "he" : "grc") : undefined}
                      dir={rtl ? "rtl" : "ltr"}
                      className={`text-[0.95em] leading-[1.7] text-foreground/75 ${rtl ? "font-hebrew text-right" : "font-greek"}`}
                    >
                      {o ? (
                        <>
                          {o.text}
                          {o.language === "aramaic" ? (
                            <span dir="ltr" className="running-head ml-2 align-middle text-[0.6em] text-foreground/45">
                              Aramaic
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="running-head text-foreground/45">not present in the original-language versification at this number</span>
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <p className="sr-only">
        End of {bookId} chapter {chapter}.
      </p>
    </div>
  );
}

/** Mirrors the margin's note ids so an inline marker jumps to its note. */
function noteDomId(ref: string, id: string) {
  const letter = id.split(":").pop() ?? "";
  return `note-${ref.replace(/\./g, "-")}-${letter}`;
}

function noteMarker(id: string) {
  const letter = id.split(":").pop() ?? "";
  return letter === "or" ? "‖" : letter;
}
