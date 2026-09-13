import "server-only";
import fac from "@/data/facsimile/geneva-1560.json";
import { GENEVA_1560_SOURCE_ID } from "./sources";

/**
 * The 1560 Geneva Bible facsimile — real page photographs served from the Internet
 * Archive IIIF endpoint (CC0). This module maps a book+chapter to an APPROXIMATE opening
 * leaf and builds image / deep-link URLs. It serves no transcribed text: the archive item's
 * only text layer is unreliable OCR of the 1560 type (see the geneva-notes reconstruction
 * track). Mapping is opening-level, hand-calibrated, and always labelled approximate.
 */

interface Sample {
  book: string;
  chapter: number;
  leaf: number;
  seen?: string;
}

const IIIF_BASE: string = fac.iiifBase;
const ARCHIVE_READER: string = fac.archiveReader;
const LEAVES: number = fac.leaves;
const FRONT_MATTER: number = fac.frontMatterLeaves;
const SAMPLES: Sample[] = fac.samples as Sample[];
const BOOK_OPENINGS: Record<string, number> = fac.bookOpenings as Record<string, number>;

export const FACSIMILE_SOURCE_ID = GENEVA_1560_SOURCE_ID;

export interface FacsimileLeaf {
  /** 0-based archive leaf index. */
  leaf: number;
  /** Always true: chapter openings are estimated, not verse-exact. */
  approximate: boolean;
  /** True when this book has no hand-calibrated samples and we fall back to the title page. */
  unmapped: boolean;
  /** IIIF image URL at the requested width. */
  image: string;
  /** Deep link to the same leaf in the archive.org reader. */
  archiveUrl: string;
}

function clampLeaf(n: number): number {
  return Math.max(0, Math.min(LEAVES - 1, Math.round(n)));
}

/** IIIF image URL for a leaf. `width` in CSS px; the endpoint scales server-side. */
export function iiifImage(leaf: number, width = 800): string {
  return `${IIIF_BASE}$${clampLeaf(leaf)}/full/${Math.round(width)},/0/default.jpg`;
}

/** Deep link to the archive.org book reader open at this leaf. */
export function archiveLeafUrl(leaf: number): string {
  return `${ARCHIVE_READER}/page/n${clampLeaf(leaf)}/mode/1up`;
}

/**
 * Estimate the opening leaf for a book+chapter from the hand-verified samples.
 * Piecewise-linear between the two nearest samples of the same book; extrapolates with the
 * local slope past the ends, clamped to the book's neighbourhood. Books with no samples
 * return the title page (leaf 0) flagged `unmapped` so the UI says "browse from here".
 */
export function leafForChapter(bookId: string, chapter: number, width = 800): FacsimileLeaf {
  const mine = SAMPLES.filter((s) => s.book === bookId).sort((a, b) => a.chapter - b.chapter);

  if (mine.length === 0) {
    const opening = BOOK_OPENINGS[bookId];
    const leaf = clampLeaf(opening ?? 0);
    return {
      leaf,
      approximate: true,
      unmapped: opening === undefined,
      image: iiifImage(leaf, width),
      archiveUrl: archiveLeafUrl(leaf),
    };
  }

  let leaf: number;
  if (chapter <= mine[0].chapter) {
    const opening = BOOK_OPENINGS[bookId] ?? mine[0].leaf;
    // Interpolate between the book opening and the first sample.
    if (mine[0].chapter <= 1) leaf = mine[0].leaf;
    else {
      const slope = (mine[0].leaf - opening) / (mine[0].chapter - 1);
      leaf = opening + slope * (chapter - 1);
    }
  } else if (chapter >= mine[mine.length - 1].chapter) {
    const a = mine[mine.length - 2] ?? mine[mine.length - 1];
    const b = mine[mine.length - 1];
    const slope = b.chapter === a.chapter ? 1 : (b.leaf - a.leaf) / (b.chapter - a.chapter);
    leaf = b.leaf + slope * (chapter - b.chapter);
  } else {
    let lo = mine[0];
    let hi = mine[mine.length - 1];
    for (let i = 0; i < mine.length - 1; i++) {
      if (mine[i].chapter <= chapter && chapter <= mine[i + 1].chapter) {
        lo = mine[i];
        hi = mine[i + 1];
        break;
      }
    }
    const slope = hi.chapter === lo.chapter ? 0 : (hi.leaf - lo.leaf) / (hi.chapter - lo.chapter);
    leaf = lo.leaf + slope * (chapter - lo.chapter);
  }

  const clamped = clampLeaf(leaf);
  return {
    leaf: clamped,
    approximate: true,
    unmapped: false,
    image: iiifImage(clamped, width),
    archiveUrl: archiveLeafUrl(clamped),
  };
}

/** Static facts about the facsimile for provenance/help copy. */
export function facsimileInfo() {
  return {
    identifier: fac.identifier as string,
    iiifBase: IIIF_BASE,
    archiveReader: ARCHIVE_READER,
    manifest: fac.manifest as string,
    license: fac.license as string,
    leaves: LEAVES,
    frontMatterLeaves: FRONT_MATTER,
    calibratedBooks: Array.from(new Set(SAMPLES.map((s) => s.book))),
  };
}
