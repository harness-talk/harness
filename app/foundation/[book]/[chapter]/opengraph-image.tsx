import { bookById } from "@/lib/bible/canon";
import { parseRef, refToQuartet } from "@/lib/bible/refs";
import { chapterPayload } from "@/lib/bible/store";
import { verseCard, OG_SIZE } from "@/lib/og/card";
import { SITE_SHARE_DESCRIPTION } from "@/lib/bible/sources";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Chapter from the 1611 King James Bible with its address, on harness.talk";

export default async function Image({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  const b = bookById(book);
  const n = Number(chapter);
  if (!b || !Number.isInteger(n) || n < 1 || n > b.chapters) {
    return verseCard({ display: "harness.talk", text: SITE_SHARE_DESCRIPTION, quartet: "127.0.0.1" });
  }
  const r = parseRef(`${b.id}.${n}`);
  const p = chapterPayload(r);
  const first = p.verses[0]?.text ?? "";
  return verseCard({
    display: `${p.display} · ${p.verses.length} verses`,
    text: first,
    quartet: refToQuartet(r).address,
    footer: `${refToQuartet(r).address}:1611 · opening verse shown`,
  });
}
