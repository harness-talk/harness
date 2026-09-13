/**
 * Text normalisation shared by the search index builder and the query side.
 * Pure functions, no imports — safe for scripts, server, and edge.
 *
 * The corpus is the 1611 first edition in its own spelling ("loued", "heauen",
 * "beleeue", "Iesus", "vnto"). People and agents type modern English. Both sides
 * are folded into one canonical form so "loved" finds "loued" without either the
 * text or the query being rewritten for display.
 */

export const STOP = new Set([
  "the", "and", "of", "to", "that", "in", "he", "shall", "unto", "for", "his", "a", "they", "be", "is", "him", "not", "them",
  "it", "with", "all", "thou", "thy", "was", "which", "my", "me", "as", "their", "have", "will", "from", "were", "ye", "thee",
  "but", "upon", "when", "this", "out", "are", "by", "you", "up", "there", "hath", "then", "also", "an", "or", "so", "if", "on",
  "her", "at", "your", "had", "she", "into", "we", "one", "no", "us", "who", "do", "before", "went", "even", "said", "came", "let",
  "am", "how", "now", "than", "these", "our", "any", "over", "against", "because", "what", "whom", "whose", "where", "why", "did",
  "does", "was", "been", "being", "vnto", "haue", "bee", "hee", "shee", "wee", "yee", "vp", "vs", "vpon", "doe", "goe", "thine",
]);

/** Lower-case, strip apostrophes and pilcrows, split on non-letters. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u2019'\u00b6]/g, "")
    .replace(/\u00fe/g, "th") // þ (thorn) as in "þe" = the
    .replace(/[\u0101\u0113\u012b\u014d\u016b]/g, (c) => ({ "\u0101": "an", "\u0113": "en", "\u012b": "in", "\u014d": "on", "\u016b": "un" })[c] ?? c) // macron marks an omitted n/m
    .split(/[^a-z]+/)
    .filter((t) => t.length > 1);
}

/**
 * Fold early-modern and modern spelling into one form. Applied identically to
 * corpus and query, so it need not produce real words — only stable ones.
 */
/*
 * Every rule below was kept or dropped by measurement (scripts/ablate-spelling-rules.mjs):
 * recall = modern words that find their 1611 counterpart in the same verse across the
 * whole Bible; merges = unrelated modern words collapsed together (false matches).
 * Kept rules reach 96.6% recall at 82 merges. Rejected because they cost precision for
 * little recall: ou→o (loue→lo), ea→e (beast/best), ie→e, double-VOWEL collapse (god/good),
 * and dropping every medial e (bread/bring/bear).
 */

// High-frequency words whose 1611 spelling no general rule reaches.
const IRREGULAR: Record<string, string> = { through: "thorow", doth: "doeth", doe: "do", goe: "go", trueth: "truth", moneth: "month", moneths: "months" };
const IRREGULAR_PREFIX: [RegExp, string][] = [
  [/^believ/, "beleev"],
  [/^shepherd/, "shepheard"],
  [/^young/, "yong"],
  [/^countr(y|ies)$/, "countrey"],
  [/^jew/, "iewe"],
  [/wreck/, "wrack"], // shipwracke (1 Tim 1:19, 2 Cor 11:25)
];

export function normalizeSpelling(t: string): string {
  let s = IRREGULAR[t] ?? t;
  for (const [re, to] of IRREGULAR_PREFIX) s = s.replace(re, to);
  s = s.replace(/u(?=[aeiouy])/g, "v"); // loue/love, saluation/salvation, seruant/servant
  s = s.replace(/^v(?=[^aeiouy])/, "u"); // vnto/unto, vp/up
  s = s.replace(/j/g, "i"); // Iesus/Jesus, ioy/joy
  s = s.replace(/y/g, "i"); // glorie/glory, dayes/days
  s = s.replace(/cke?\b/g, "k"); // musick, backe
  s = s.replace(/ie\b/g, "i"); // glorie → glori (glory → glori)
  s = s.replace(/ee/g, "e"); // seede/seed, beleeue
  s = s.replace(/([b-df-hj-np-tv-z])\1+/g, "$1"); // fullfiled/fulfilled, sinne/sin — consonants only
  if (s.length >= 3) s = s.replace(/e\b/, ""); // campe/camp, againe/again, eare/ear
  s = s.replace(/([b-df-hj-np-tv-z])\1+/g, "$1");
  return s;
}

/** Light suffix stripping, applied AFTER spelling normalisation and BEFORE vowel reduction. */
export function stem(t: string): string {
  if (t.length <= 3) return t;
  const s = t
    .replace(/(eth|est)$/, "") // believeth, thinkest
    .replace(/(ing|ings)$/, "")
    .replace(/(?<=.{3})(nes|ness)$/, "") // darknesse; guarded so "sones" keeps its n
    .replace(/(ies)$/, "i")
    .replace(/(ed|es|s)$/, "");
  return s.length >= 4 ? s.replace(/e$/, "") : s; // darke(nesse) → dark
}

/**
 * Drop an "e" that sits between two consonants. The 1611 and modern spelling differ
 * most often by such an unstressed e: iudgement/judgment, wisedome/wisdom, knowen/known,
 * commandement/commandment, onely/only, entred/entered. Guarded by consonants on both
 * sides so "bread", "seven", "believe" keep their shape. Runs last so the stemmer still
 * sees its -ed/-es/-eth endings.
 */
export function reduceVowels(t: string): string {
  return t.replace(/(?<=[b-df-hj-np-tv-z])e(?=[b-df-hj-np-tv-z])/g, "");
}

/** Full pipeline for one token. */
export function canon(t: string): string {
  return reduceVowels(stem(normalizeSpelling(t)));
}

/** Tokens of a text as canonical stems, stop words removed, positions preserved. */
export function canonTokens(text: string): { stem: string; surface: string; pos: number }[] {
  const out: { stem: string; surface: string; pos: number }[] = [];
  tokenize(text).forEach((surface, pos) => {
    if (STOP.has(surface)) return;
    out.push({ stem: canon(surface), surface, pos });
  });
  return out;
}
