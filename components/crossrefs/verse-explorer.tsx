"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";

interface ChapterResult {
  kind: "chapter";
  ref: string;
  display: string;
  verses: Record<string, number>;
}
interface VerseResult {
  kind: "verse";
  ref: string;
  display: string;
  total: number;
  references: { ref: string; display: string; votes: number; text: string }[];
}
type Result = ChapterResult | VerseResult | { detail?: string; kind?: undefined };

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const readerHref = (ref: string) => {
  const [b, c, v] = ref.split(/[.-]/);
  return v ? `/foundation/${b}/${c}/${v}` : `/foundation/${b}/${c}`;
};

export function VerseExplorer({ initialRef }: { initialRef: string }) {
  const router = useRouter();
  const [input, setInput] = useState(initialRef);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useSWR<Result>(
    `/api/v1/crossrefs/${encodeURIComponent(initialRef)}${showAll ? "?all=1" : ""}`,
    fetcher,
    { keepPreviousData: true },
  );
  const go = (ref: string) => router.push(`/cross-references?ref=${encodeURIComponent(ref)}#explore`, { scroll: false });

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) go(input.trim());
        }}
      >
        <label htmlFor="xr-ref" className="sr-only">
          Verse or chapter
        </label>
        <input
          id="xr-ref"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Genesis 3:15, jn.3.16, Isaiah 53"
          className="min-w-0 flex-1 border border-rule bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-gilt"
        />
        <button type="submit" className="border border-gilt px-4 py-2 text-sm text-gilt hover:bg-gilt hover:text-background">
          Trace
        </button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Gathering references…</p>}

      {data && !data.kind && <p className="text-sm text-rubric">{data.detail ?? "That reference could not be read."}</p>}

      {data?.kind === "chapter" && (
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-2xl">{data.display}</h3>
          <p className="text-sm text-muted-foreground">Choose a verse. The number is how many references it carries.</p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(data.verses)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([v, n]) => (
                <li key={v}>
                  <button
                    onClick={() => go(`${data.ref}.${v}`)}
                    className="flex items-baseline gap-1.5 border border-rule px-2.5 py-1 font-mono text-sm hover:border-gilt"
                  >
                    <span className="text-foreground">{v}</span>
                    <span className="text-xs text-muted-foreground">{n}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {data?.kind === "verse" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-2xl">{data.display}</h3>
            <Link href={readerHref(data.ref)} className="text-sm text-rubric hover:underline">
              Read in context
            </Link>
          </div>
          {data.total > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.references.length < data.total
                ? `The ${data.references.length} strongest of ${data.total.toLocaleString()} cross references`
                : `All ${data.total.toLocaleString()} cross references, strongest first`}
            </p>
          )}
          {data.references.length === 0 ? (
            <p className="text-sm text-muted-foreground">No references are recorded for this verse.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-rule border-y border-rule">
              {data.references.map((x) => (
                <li key={x.ref} className="flex flex-col gap-1.5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <button onClick={() => go(x.ref.split("-")[0])} className="font-display text-lg text-gilt hover:underline">
                      {x.display}
                    </button>
                    <span className="font-mono text-xs text-muted-foreground">{x.votes} votes</span>
                  </div>
                  <p className="text-pretty leading-relaxed text-foreground/90">{x.text}</p>
                </li>
              ))}
            </ol>
          )}
          {data.references.length < data.total && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              disabled={isLoading}
              className="self-start border border-gilt px-4 py-2 text-sm text-gilt hover:bg-gilt hover:text-background disabled:opacity-60"
            >
              {isLoading ? "Gathering…" : `Show all ${data.total.toLocaleString()}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
