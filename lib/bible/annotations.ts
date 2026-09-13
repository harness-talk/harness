import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ref } from "./refs";
import { chapter } from "./store";
import { KJV_SOURCE_ID } from "./sources";

export type AnnotationKind = "argument" | "note" | "crossref" | "heading";

export interface Annotation {
  id: string; // `${source}:${ref}:${n}`
  kind: AnnotationKind;
  ref: string; // anchor: "jn.3" (chapter-level) or "jn.3.16"
  text: string;
  anchor?: string; // the word(s) in the verse the note attaches to, when known
  targets?: string[]; // for crossref: canonical refs
  source: string;
}

interface AnnotationFile {
  source: string;
  book: string;
  annotations: Annotation[];
}

const DATA = join(process.cwd(), "data", "annotations");
const cache = new Map<string, AnnotationFile | null>();

function loadFile(source: string, bookId: string): AnnotationFile | null {
  const key = `${source}/${bookId}`;
  if (!cache.has(key)) {
    const p = join(DATA, source, `${bookId}.json`);
    cache.set(key, existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as AnnotationFile) : null);
  }
  return cache.get(key)!;
}

/** Books for which a given annotation source has ingested data. */
export function ingestedBooks(source: string): string[] {
  const dir = join(DATA, source);
  if (!existsSync(dir)) return [];
  const manifest = join(dir, "manifest.json");
  if (existsSync(manifest)) return (JSON.parse(readFileSync(manifest, "utf8")) as { books: string[] }).books;
  return [];
}

export function annotationsFor(source: string, r: Ref): { available: boolean; reason?: string; annotations: Annotation[] } {
  const file = loadFile(source, r.book.id);
  if (!file) return { available: false, reason: "No verified transcription has been ingested for this book yet.", annotations: [] };
  const chapterRef = `${r.book.id}.${r.chapter}`;
  const anns = file.annotations.filter((a) => {
    if (a.ref === chapterRef) return true;
    const m = /^([a-z0-9]+)\.(\d+)\.(\d+)$/.exec(a.ref);
    if (!m || m[1] !== r.book.id || Number(m[2]) !== r.chapter) return false;
    const v = Number(m[3]);
    if (!r.verse) return true;
    return v >= r.verse && v <= (r.verseEnd ?? r.verse);
  });
  return { available: true, annotations: anns };
}

/** The KJV's own structural headings (Psalm 119 letters) as annotations. */
export function kjvHeadings(r: Ref): Annotation[] {
  const ch = chapter(r.book.id, r.chapter);
  if (!ch?.headings) return [];
  return ch.headings.map((h, i) => ({
    id: `${KJV_SOURCE_ID}:${r.book.id}.${r.chapter}.${h.before}:${i}`,
    kind: "heading" as const,
    ref: `${r.book.id}.${r.chapter}.${h.before}`,
    text: h.text,
    source: KJV_SOURCE_ID,
  }));
}
