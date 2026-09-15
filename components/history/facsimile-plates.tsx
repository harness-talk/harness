import { FRONT_MATTER } from "@/lib/bible/front-matter";

/**
 * Side-by-side front-matter plates for the 1560 Geneva and 1611 King James Bibles.
 * Server component: renders real IIIF page images with faithful transcriptions and a deep
 * link back to the Internet Archive for each leaf. Stacks to one column on small screens.
 */
export function FacsimilePlates() {
  return (
    <div className="not-prose grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
      {FRONT_MATTER.map((ed) => (
        <section key={ed.key} className="flex flex-col gap-5">
          <header className="flex flex-col gap-1 border-b border-rule pb-3">
            <p className="running-head text-gilt">
              {ed.edition} &middot; {ed.year}
            </p>
            <p className="text-sm text-foreground/60">
              {ed.place} &middot; printed by {ed.printer}
            </p>
          </header>

          {ed.plates.map((p) => (
            <figure key={p.leaf} className="flex flex-col gap-2.5">
              <div className="overflow-hidden rounded-sm border border-rule bg-foreground/[0.02]">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote IIIF facsimile tile, not a local asset */}
                <img
                  src={p.image || "/placeholder.svg"}
                  alt={p.alt}
                  className="mx-auto w-full"
                  loading="lazy"
                />
              </div>
              <figcaption className="flex flex-col gap-1.5">
                <span className="running-head text-rubric">{p.heading}</span>
                <span className="text-[0.82rem] italic leading-relaxed text-foreground/70">
                  {p.transcription}
                </span>
                <a
                  href={p.archiveUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[0.75rem] text-rubric underline underline-offset-[3px]"
                >
                  See leaf {p.leaf} on archive.org
                </a>
              </figcaption>
            </figure>
          ))}

          <p className="text-[0.7rem] leading-relaxed text-foreground/45">{ed.license}</p>
        </section>
      ))}
    </div>
  );
}
