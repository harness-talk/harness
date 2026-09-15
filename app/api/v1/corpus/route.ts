import { corpus, books, bookData, CANON, verseHash } from "@/lib/bible/store";
import { KJV_SOURCE } from "@/lib/bible/sources";

export const dynamic = "force-static";

/**
 * GET /api/v1/corpus
 * The entire King James corpus as one downloadable JSON file: every book, chapter,
 * and verse in canonical order, each verse carrying the same sha256 leaf used in the
 * corpus Merkle tree so a mirror can verify the text independently. Served as an
 * attachment so a browser saves it rather than rendering it.
 */
export function GET() {
  const c = corpus();
  const meta = books();

  const payload = {
    title: "The Holy Bible, King James Version",
    edition: "Conformable to the edition of 1611, original spelling",
    source: { id: c.source, publisher: KJV_SOURCE.publisher, year: KJV_SOURCE.year },
    license: "Public domain. Free to read, copy, mirror, and cite.",
    counts: { books: c.books, chapters: c.chapters, verses: c.verses },
    integrity: {
      algorithm: "sha256",
      leaf: c.leaf,
      merkleRoot: c.merkleRoot,
      note: "Each verse sha256 = sha256(`${ref}\\n${text}`). The merkleRoot is the root over every verse leaf in canonical order.",
    },
    builtAt: c.builtAt,
    retrievedFrom: "https://harness.talk/api/v1/corpus",
    books: CANON.map((b) => {
      const bm = meta.find((m) => m.id === b.id)!;
      const d = bookData(b.id);
      return {
        id: b.id,
        name: b.name,
        ordinal: b.ordinal,
        testament: b.testament,
        sha256: bm.sha256,
        chapters: d.chapters.map((ch) => ({
          chapter: ch.n,
          verses: ch.verses.map((v) => {
            const ref = `${b.id}.${ch.n}.${v.v}`;
            return { ref, verse: v.v, text: v.text, sha256: verseHash(ref, v.text) };
          }),
        })),
      };
    }),
  };

  const body = JSON.stringify(payload, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="kjv-1611-corpus.json"',
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      etag: `"${c.merkleRoot.slice(0, 32)}"`,
    },
  });
}
