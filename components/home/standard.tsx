import Link from "next/link";
import { VerseText } from "@/components/reader/verse-text";
import type { VerseRecord } from "@/lib/bible/store";

/**
 * The measure this site submits to, in his own recorded words, each at its address.
 * Not a claim of commission — a standard anyone can hold us to and check.
 */
export const STANDARD: { ref: string; kept: string; how: string }[] = [
  {
    ref: "jn.5.39",
    kept: "Make the Scriptures searchable.",
    how: "Every verse indexed; modern spelling reaches the 1611 text; nothing curated for you to find.",
  },
  {
    ref: "mt.5.18",
    kept: "Not one jot or tittle moves.",
    how: "The 1611 letters, SHA-256 per verse, inputs locked by hash. Any change is visible to anyone.",
  },
  {
    ref: "mt.5.37",
    kept: "Yea, yea; nay, nay.",
    how: "A search says which words are absent. An unavailable source says 501, never a plausible fabrication.",
  },
  {
    ref: "mt.10.8",
    kept: "Freely give.",
    how: "No key, no account, no fee. GNU licence. Every export downloadable in whole.",
  },
  {
    ref: "jn.8.32",
    kept: "Point to the truth, not to ourselves.",
    how: "Nothing here asks to be trusted. The hash is checkable, the source is named, the machine points past itself.",
  },
];

export function Standard({ verses }: { verses: VerseRecord[] }) {
  return (
    <section aria-labelledby="standard" className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8">
      <h2 id="standard" className="running-head mb-3 text-center">
        The standard we are held to
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-center text-foreground/70 text-pretty">
        Not a commission we claim. A measure we submit to, in words that are not ours, each at its address so you can
        check the words and check us.
      </p>
      <ol className="flex flex-col divide-y divide-rule">
        {STANDARD.map((s, i) => {
          const v = verses[i];
          if (!v) return null;
          return (
            <li key={s.ref} className="flex flex-col gap-3 py-7">
              <blockquote className="text-lg leading-relaxed italic text-foreground/90 md:text-xl">
                <VerseText text={v.text} />
                <footer className="mt-2 flex flex-wrap items-baseline gap-x-3 font-mono text-xs not-italic text-foreground/55">
                  <Link href={`/foundation/${v.book.id}/${v.chapter}#v${v.verse}`} className="text-rubric underline underline-offset-[3px]">
                    {v.display}
                  </Link>
                  <span>{v.quartet}</span>
                  <span className="hidden sm:inline">{v.sha256.slice(0, 16)}…</span>
                </footer>
              </blockquote>
              <div className="flex flex-col gap-1">
                <p className="font-display text-base font-medium text-gilt">{s.kept}</p>
                <p className="text-sm leading-relaxed text-foreground/75 text-pretty">{s.how}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
