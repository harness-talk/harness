"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "See the real 1560 page" — a lightweight lightbox over the Internet Archive IIIF page
 * images of the 1560 Geneva Bible first edition (CC0). Shows the actual printed page with the
 * reformers' marginal notes in the margins, with leaf-by-leaf navigation and a deep link back
 * to archive.org. It shows page IMAGES only; no text is transcribed or claimed from them.
 */
export function FacsimileViewer({
  bookName,
  chapter,
  initialLeaf,
  approximate,
  unmapped,
  iiifBase,
  archiveReader,
  leaves,
}: {
  bookName: string;
  chapter: number;
  initialLeaf: number;
  approximate: boolean;
  unmapped: boolean;
  iiifBase: string;
  archiveReader: string;
  leaves: number;
}) {
  const [open, setOpen] = useState(false);
  const [leaf, setLeaf] = useState(initialLeaf);
  const [loaded, setLoaded] = useState(false);

  const clamp = useCallback((n: number) => Math.max(0, Math.min(leaves - 1, n)), [leaves]);
  const go = useCallback((n: number) => { setLoaded(false); setLeaf(clamp(n)); }, [clamp]);

  const img = `${iiifBase}$${leaf}/full/1000,/0/default.jpg`;
  const archiveUrl = `${archiveReader}/page/n${leaf}/mode/1up`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") go(leaf - 1);
      else if (e.key === "ArrowRight") go(leaf + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, leaf, go]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-rule px-3 py-1.5 font-display text-[0.66rem] uppercase tracking-[0.16em] text-gilt transition-colors hover:border-rubric hover:text-rubric"
      >
        <FrameIcon />
        Compare the 1560 page
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Facsimile of the 1560 Geneva Bible near ${bookName} ${chapter}`}
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <div className="min-w-0">
              <p className="running-head text-rubric">Geneva Bible, 1560</p>
              <p className="truncate text-xs text-foreground/60">
                First edition · leaf {leaf + 1} of {leaves} · Internet Archive · CC0
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-rule text-foreground/70 hover:border-rubric hover:text-rubric"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Approximate-mapping caveat */}
          <p className="border-b border-rule/60 bg-foreground/[0.03] px-4 py-2 text-[0.72rem] leading-relaxed text-foreground/60">
            {unmapped
              ? `This book isn't finely mapped yet, so we open at the title page — browse forward to ${bookName} ${chapter}.`
              : `Approximate opening for ${bookName} ${chapter} — the mapping is leaf-level, not verse-level. Browse a leaf or two either way.`}
          </p>

          {/* Image */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
            {!loaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="running-head animate-pulse text-foreground/50">Loading the page…</span>
              </div>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element -- remote IIIF tiles, not a local asset */}
            <img
              key={leaf}
              src={img || "/placeholder.svg"}
              alt={`Photograph of leaf ${leaf + 1} of the 1560 Geneva Bible`}
              onLoad={() => setLoaded(true)}
              className="max-h-full max-w-full object-contain shadow-lg"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
            <button
              type="button"
              onClick={() => go(leaf - 1)}
              disabled={leaf <= 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-rule px-3 py-1.5 text-sm text-foreground/80 disabled:opacity-30 hover:border-rubric hover:text-rubric"
            >
              <span aria-hidden>‹</span> Prev leaf
            </button>
            <a
              href={archiveUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center rounded-sm px-3 py-1.5 font-display text-[0.62rem] uppercase tracking-[0.16em] text-gilt underline underline-offset-4 hover:text-rubric"
            >
              Open on archive.org
            </a>
            <button
              type="button"
              onClick={() => go(leaf + 1)}
              disabled={leaf >= leaves - 1}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-rule px-3 py-1.5 text-sm text-foreground/80 disabled:opacity-30 hover:border-rubric hover:text-rubric"
            >
              Next leaf <span aria-hidden>›</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FrameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 11l3.5-3 2.5 2 3-3.5 4 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="5.5" cy="6" r="1.1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
