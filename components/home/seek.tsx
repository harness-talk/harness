"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { parseRef, displayRef, canonicalRef, refToQuartet, type Ref } from "@/lib/bible/refs";

/**
 * One box, two readers.
 * A person types "Who is God's friend?" or "Psalm 23" and gets the text.
 * A builder sees, beneath the same box, exactly what a machine would ask for — the URL, the
 * loopback address, the hash — because the product is the same for both of them.
 */

type Resolved =
  | { kind: "ref"; ref: Ref; href: string; api: string; quartet: string }
  | { kind: "phrase"; q: string; href: string; api: string }
  | { kind: "empty" };

function resolve(input: string): Resolved {
  const raw = input.trim();
  if (!raw) return { kind: "empty" };
  try {
    const ref = parseRef(raw);
    const path = `/foundation/${ref.book.id}/${ref.chapter}${ref.verse ? `/${ref.verse}${ref.verseEnd ? `-${ref.verseEnd}` : ""}` : ""}`;
    return { kind: "ref", ref, href: path, api: `/api/v1/${ref.verse ? "verses" : "chapters"}/${canonicalRef(ref)}`, quartet: refToQuartet(ref).address };
  } catch {
    return { kind: "phrase", q: raw, href: `/search?q=${encodeURIComponent(raw)}`, api: `/api/v1/search?q=${encodeURIComponent(raw)}` };
  }
}

// Non-2xx bodies are problem+json ({title, detail}) — keep them so the box says exactly what the API says.
const fetcher = (u: string) => fetch(u).then((r) => r.json().catch(() => null));

const EXAMPLES = ["Who is God’s friend?", "the stones cry out", "Psalm 23", "shipwreck", "127.66.22.21", "a friend that sticketh closer"];

export function Seek({ origin }: { origin: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const r = useMemo(() => resolve(q), [q]);

  // Rotate the placeholder so the box teaches by example without a paragraph of instructions.
  useEffect(() => {
    if (q) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, [q]);

  // Preview: fetch the actual verse for a resolved reference (debounced by SWR key changes).
  const { data } = useSWR(r.kind === "ref" && r.ref.verse ? r.api : null, fetcher, { keepPreviousData: true });
  const preview: { display: string; text: string; sha256?: string; verses?: { text: string }[] } | null =
    r.kind === "ref" && r.ref.verse && data && (data.text || data.verses) ? data : null;
  const problem: { title: string; detail?: string } | null = r.kind === "ref" && r.ref.verse && data && data.status >= 400 ? data : null;

  function go() {
    if (r.kind === "empty") return;
    router.push(r.href);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex items-stretch border border-rule bg-surface-raised transition-colors focus-within:border-gilt"
      >
        <label htmlFor="seek" className="sr-only">
          Seek a verse, chapter, phrase, or loopback address
        </label>
        <input
          ref={inputRef}
          id="seek"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
          }}
          placeholder={EXAMPLES[placeholderIdx]}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          className="min-w-0 flex-1 bg-transparent px-5 py-4 font-serif text-xl placeholder:text-foreground/35 focus:outline-none md:px-6 md:py-5 md:text-2xl"
        />
        <button
          type="submit"
          disabled={r.kind === "empty"}
          className="border-l border-rule px-5 font-display text-[0.72rem] uppercase tracking-[0.18em] text-gilt transition-colors hover:bg-gilt hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gilt md:px-7"
        >
          Seek
        </button>
      </form>

      {/* What you will get — and what a machine would ask for. Same query, both readers. */}
      <div className="grid min-h-[7.5rem] grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-[1.4fr_1fr]" aria-live="polite">
        <div className="flex flex-col gap-2">
          {r.kind === "empty" ? (
            <p className="text-base leading-relaxed text-foreground/60 text-pretty">
              Ask in your own words, or a reference, or a <span className="font-mono text-[0.9em]">127.x.x.x</span> address. Modern spelling finds the 1611 text.
            </p>
          ) : r.kind === "ref" ? (
            <>
              <p className="running-head text-rubric">{displayRef(r.ref)}</p>
              {preview ? (
                <p className="font-serif text-lg leading-relaxed text-foreground/90 text-pretty line-clamp-3 md:text-xl">
                  {preview.text ?? preview.verses?.map((v) => v.text).join(" ")}
                </p>
              ) : problem ? (
                <p className="text-base leading-relaxed text-foreground/70 text-pretty">
                  <span className="font-mono text-[0.85em] text-rubric">{problem.title}</span>
                  {problem.detail ? ` — ${problem.detail}` : null}
                </p>
              ) : r.ref.verse ? (
                <p className="text-base text-foreground/50">…</p>
              ) : (
                <p className="text-base text-foreground/70">Whole chapter. Press Seek to read it.</p>
              )}
            </>
          ) : (
            <>
              <p className="running-head text-rubric">Concordance</p>
              <p className="text-base leading-relaxed text-foreground/75 text-pretty">
                Verses where these words keep company, closest first. Quote the phrase for exact order.
              </p>
            </>
          )}
        </div>

        <dl className="flex flex-col gap-1.5 border-l border-rule pl-5 font-mono text-[0.72rem] leading-relaxed text-foreground/55 md:pl-6">
          <div className="flex flex-col">
            <dt className="text-foreground/40">GET</dt>
            <dd className="break-all text-foreground/75">
              {origin}
              {r.kind === "empty" ? "/api/v1/verses/{ref}" : r.api}
            </dd>
          </div>
          {r.kind === "ref" ? (
            <div className="flex flex-col">
              <dt className="text-foreground/40">loopback</dt>
              <dd className="text-foreground/75">
                curl {r.quartet}:1611
              </dd>
            </div>
          ) : (
            <div className="flex flex-col">
              <dt className="text-foreground/40">shell</dt>
              <dd className="break-all text-foreground/75">npx -y https://harness.talk/downloads/harness-talk.tgz</dd>
            </div>
          )}
          {preview?.sha256 ? (
            <div className="flex flex-col">
              <dt className="text-foreground/40">sha256</dt>
              <dd className="truncate text-foreground/75">{preview.sha256}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
