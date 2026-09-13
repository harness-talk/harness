import { bookById } from "@/lib/bible/canon";
import { parseRef, displayRef, refToQuartet } from "@/lib/bible/refs";
import { versesFor } from "@/lib/bible/store";
import { verseCard, OG_SIZE } from "@/lib/og/card";
import { SITE_SHARE_DESCRIPTION } from "@/lib/bible/sources";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Verse from the 1611 King James Bible with its address and hash, on harness.talk";

export default async function Image({ params }: { params: Promise<{ book: string; chapter: string; verse: string }> }) {
  const { book, chapter, verse } = await params;
  const b = bookById(book);
  const m = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(verse);
  let r;
  try {
    r = b && m ? parseRef(`${b.id}.${chapter}.${m[1]}${m[2] ? `-${m[2]}` : ""}`) : null;
  } catch {
    r = null;
  }
  const vv = r ? versesFor(r) : [];
  if (!r || !vv.length) {
    return verseCard({ display: "harness.talk", text: SITE_SHARE_DESCRIPTION, quartet: "127.0.0.1" });
  }
  const single = vv.length === 1;
  return verseCard({
    display: displayRef(r),
    text: vv.map((v) => v.text).join(" "),
    quartet: refToQuartet(r).address,
    sha256: single ? vv[0].sha256 : undefined,
    footer: single ? undefined : `${refToQuartet(r).address}:1611 · ${vv.length} verses`,
  });
}
