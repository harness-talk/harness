import Link from "next/link";
import { bookById } from "@/lib/bible/canon";

function label(ref: string | null) {
  if (!ref) return null;
  const [id, ch] = ref.split(".");
  const b = bookById(id);
  return b ? `${b.name} ${ch}` : ref;
}

export function ChapterNav({
  prev,
  next,
  bookId,
  chapter,
  chapters,
}: {
  prev: string | null;
  next: string | null;
  bookId: string;
  chapter: number;
  chapters: number;
}) {
  const toHref = (ref: string) => `/foundation/${ref.replace(".", "/")}`;
  return (
    <nav aria-label="Chapter navigation" className="mt-14 flex items-center justify-between border-t border-rule pt-5 text-sm">
      {prev ? (
        <Link href={toHref(prev)} rel="prev" className="hover:text-rubric">
          ← {label(prev)}
        </Link>
      ) : (
        <span />
      )}
      <Link href={`/foundation/${bookId}`} className="font-mono text-xs text-foreground/60 hover:text-rubric">
        {chapter} / {chapters}
      </Link>
      {next ? (
        <Link href={toHref(next)} rel="next" className="hover:text-rubric">
          {label(next)} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
