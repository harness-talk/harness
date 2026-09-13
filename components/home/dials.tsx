"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { VerseText } from "@/components/reader/verse-text";

/**
 * The front door. No typing: four drums — 127 · book · chapter · verse — and the
 * text under them changes as you turn. The address IS the reference; the visitor
 * learns that by moving through it. "Let the text choose" is uniform over every
 * verse so nothing here is our curation.
 */

export interface DialBook {
  id: string;
  n: number;
  name: string;
  verseCounts: number[];
}

type Resolved = {
  ref: string;
  display: string;
  text: string;
  sha256: string;
  quartet: string;
  book: { id: string };
  chapter: number;
  verse: number;
};

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));

const wrap = (n: number, max: number) => ((((n - 1) % max) + max) % max) + 1;

/**
 * read: the home lens — the verse is the point, the address is how you got there.
 * anatomy: the architecture lens — the address is the point, taken apart octet by octet;
 * the verse is one dim line of proof that it resolves.
 */
export type DialLens = "read" | "anatomy";

export function Dials({ books, total, lens = "read" }: { books: DialBook[]; total: number; lens?: DialLens }) {
  const [b, setB] = useState(1); // book ordinal
  const [c, setC] = useState(1);
  const [v, setV] = useState(1);

  const book = books[b - 1];
  const chapters = book.verseCounts.length;
  const verses = book.verseCounts[c - 1];
  const quartet = `127.${b}.${c}.${v}`;

  const { data, error, isLoading } = useSWR<Resolved>(`/api/v1/resolve/${quartet}`, fetcher, { keepPreviousData: true });

  // Steps are functional updates so a held key or fast wheel never reads a stale value.
  const stepBook = useCallback(
    (d: number) => {
      setB((cur) => wrap(cur + d, books.length));
      setC(1);
      setV(1);
    },
    [books.length],
  );
  const stepChapter = useCallback(
    (d: number) => {
      setC((cur) => wrap(cur + d, chapters));
      setV(1);
    },
    [chapters],
  );
  const stepVerse = useCallback((d: number) => setV((cur) => wrap(cur + d, verses)), [verses]);
  const jumpBook = useCallback((n: number) => { setB(wrap(n, books.length)); setC(1); setV(1); }, [books.length]);
  const jumpChapter = useCallback((n: number) => { setC(wrap(n, chapters)); setV(1); }, [chapters]);
  const jumpVerse = useCallback((n: number) => setV(wrap(n, verses)), [verses]);

  // Uniform over all verses: pick an index in [0, total) and walk the counts.
  const cumulative = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const bk of books) {
      out.push(acc);
      acc += bk.verseCounts.reduce((a, n) => a + n, 0);
    }
    return out;
  }, [books]);

  const letTheTextChoose = useCallback(() => {
    const target = Math.floor(Math.random() * total);
    let bi = cumulative.findIndex((start, i) => target < start + books[i].verseCounts.reduce((a, n) => a + n, 0));
    if (bi < 0) bi = books.length - 1;
    let rem = target - cumulative[bi];
    const counts = books[bi].verseCounts;
    let ci = 0;
    while (rem >= counts[ci]) {
      rem -= counts[ci];
      ci++;
    }
    setB(bi + 1);
    setC(ci + 1);
    setV(rem + 1);
  }, [books, cumulative, total]);

  // keepPreviousData: while the next verse loads, the last one stays visible, dimmed.
  const shown = data;
  const stale = !!data && data.quartet !== quartet;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-4 gap-2 border-y border-rule py-6 md:gap-6" role="group" aria-label="Verse address dials">
        <Dial label="loopback" value={127} fixed />
        <Dial label={book.name} value={b} max={books.length} onStep={stepBook} onJump={jumpBook} name="book" />
        <Dial label="chapter" value={c} max={chapters} onStep={stepChapter} onJump={jumpChapter} name="chapter" />
        <Dial label="verse" value={v} max={verses} onStep={stepVerse} onJump={jumpVerse} name="verse" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xl tracking-wide text-gilt md:text-2xl" aria-live="polite">
          {quartet}
        </p>
        <p className="text-sm text-foreground/60">
          Turn a dial, or{" "}
          <button
            type="button"
            onClick={letTheTextChoose}
            className="border-b border-gilt/60 pb-px text-foreground/85 transition-colors hover:border-gilt hover:text-foreground"
          >
            let the text choose
          </button>
          {" — "}one of {total.toLocaleString("en-US")}, none of them ours to pick.
        </p>
      </div>

      <div className={`flex flex-col gap-3 transition-opacity duration-300 ${stale || isLoading ? "opacity-50" : "opacity-100"}`} aria-live="polite">
        {error && !shown ? (
          <p className="text-center font-mono text-sm text-rubric">The resolver did not answer. The address above is still valid.</p>
        ) : shown && lens === "anatomy" ? (
          <Anatomy b={b} c={c} v={v} book={book} chapters={chapters} verses={verses} shown={shown} quartet={quartet} />
        ) : shown ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-2xl font-medium">{shown.display}</p>
              <Link href={`/foundation/${shown.book.id}/${shown.chapter}#v${shown.verse}`} className="running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground">
                Read in full →
              </Link>
            </div>
            <p className="line-clamp-2 text-lg leading-relaxed text-foreground/85 md:line-clamp-1">
              <VerseText text={shown.text} />
            </p>
            <div className="flex flex-col gap-1 font-mono text-xs text-foreground/55 md:flex-row md:items-baseline md:justify-between">
              <span className="truncate">sha256 {shown.sha256}</span>
              <span className="flex shrink-0 gap-4">
                <span>curl {quartet}:1611</span>
                <Link href={`/api/v1/resolve/${quartet}`} className="text-rubric underline underline-offset-[3px]">
                  JSON
                </Link>
              </span>
            </div>
          </>
        ) : (
          <p className="text-center font-mono text-xs text-foreground/50">resolving…</p>
        )}
      </div>
    </div>
  );
}

/** The address taken apart. Everything here is derivable from the four numbers; nothing is decoration. */
function Anatomy({
  b,
  c,
  v,
  book,
  chapters,
  verses,
  shown,
  quartet,
}: {
  b: number;
  c: number;
  v: number;
  book: DialBook;
  chapters: number;
  verses: number;
  shown: Resolved;
  quartet: string;
}) {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const bin = (n: number) => n.toString(2).padStart(8, "0");
  const octets: { label: string; value: number; range: string }[] = [
    { label: "loopback", value: 127, range: "fixed · 127.0.0.0/8" },
    { label: "book", value: b, range: `1–66 · ${book.name}` },
    { label: "chapter", value: c, range: `1–${chapters} of ${book.name}` },
    { label: "verse", value: v, range: `1–${verses} of chapter ${c}` },
  ];
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 font-mono text-xs md:grid-cols-4">
        {octets.map((o) => (
          <div key={o.label} className="flex flex-col gap-1 border-t border-rule pt-2">
            <dt className="running-head text-[10px]">{o.label}</dt>
            <dd className="flex items-baseline justify-between gap-2 md:flex-col md:items-start">
              <span className="text-foreground/85">
                0x{hex(o.value)} · {bin(o.value)}
              </span>
              <span className="text-foreground/50">{o.range}</span>
            </dd>
          </div>
        ))}
      </dl>

      <dl className="flex flex-col gap-2 border-t border-rule pt-4 font-mono text-xs">
        <Row k="as an IPv4 address">{quartet} <span className="text-foreground/45">— 32 bits, loopback, routes to your own machine</span></Row>
        <Row k="as a reference">{shown.ref} <span className="text-foreground/45">— {shown.display}</span></Row>
        <Row k="local daemon">GET {quartet}:1611/</Row>
        <Row k="hosted resolver">
          <Link href={`/api/v1/resolve/${quartet}`} className="text-rubric underline underline-offset-[3px]">
            GET /api/v1/resolve/{quartet}
          </Link>
        </Row>
        <Row k="leaf hash">
          <span className="break-all">sha256 {shown.sha256}</span>
        </Row>
      </dl>

      <p className="border-t border-rule pt-4 text-sm leading-relaxed text-foreground/60">
        <span className="running-head mr-2 text-[10px]">resolves to</span>
        <span className="line-clamp-1">
          <VerseText text={shown.text} />
        </span>
      </p>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 md:flex-row md:gap-4">
      <dt className="shrink-0 text-foreground/50 md:w-40">{k}</dt>
      <dd className="text-foreground/85">{children}</dd>
    </div>
  );
}

const STEP_PX = 28;

function Dial({
  label,
  value,
  max,
  onStep,
  onJump,
  fixed,
  name,
}: {
  label: string;
  value: number;
  max?: number;
  onStep?: (delta: number) => void;
  onJump?: (n: number) => void;
  fixed?: boolean;
  name?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; acc: number } | null>(null);
  const step = useCallback((d: number) => onStep?.(d), [onStep]);

  // Wheel and drag are non-passive listeners so the page does not scroll while a dial turns.
  useEffect(() => {
    const el = ref.current;
    if (!el || fixed) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step, fixed]);

  const prev = max ? wrap(value - 1, max) : null;
  const next = max ? wrap(value + 1, max) : null;

  return (
    <div
      ref={ref}
      tabIndex={fixed ? -1 : 0}
      role={fixed ? undefined : "spinbutton"}
      aria-label={fixed ? `${label}, fixed at 127` : name}
      aria-valuenow={fixed ? undefined : value}
      aria-valuemin={fixed ? undefined : 1}
      aria-valuemax={fixed ? undefined : max}
      aria-valuetext={fixed ? undefined : name === "book" ? `${value}, ${label}` : `${label} ${value}`}
      onKeyDown={(e) => {
        if (fixed) return;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); step(1); }
        if (e.key === "Home") onJump?.(1);
        if (e.key === "End" && max) onJump?.(max);
      }}
      onPointerDown={(e) => {
        if (fixed) return;
        drag.current = { y: e.clientY, acc: 0 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dy = drag.current.y - e.clientY;
        const steps = Math.trunc((dy - drag.current.acc) / STEP_PX);
        if (steps !== 0) {
          step(-steps);
          drag.current.acc += steps * STEP_PX;
        }
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      className={`flex select-none flex-col items-center gap-1 outline-none ${fixed ? "" : "cursor-ns-resize touch-none rounded-sm focus-visible:ring-1 focus-visible:ring-gilt"}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={fixed}
        onClick={() => step(-1)}
        className="h-7 font-display text-lg leading-none text-foreground/30 transition-colors hover:text-gilt disabled:invisible"
      >
        {prev ?? "\u00a0"}
      </button>
      <p className={`font-display text-4xl font-medium leading-none tabular-nums md:text-5xl ${fixed ? "text-foreground/70" : "text-foreground"}`}>{value}</p>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={fixed}
        onClick={() => step(1)}
        className="h-7 font-display text-lg leading-none text-foreground/30 transition-colors hover:text-gilt disabled:invisible"
      >
        {next ?? "\u00a0"}
      </button>
      <p className="running-head mt-1 max-w-full truncate text-center" title={label}>
        {label}
      </p>
    </div>
  );
}
