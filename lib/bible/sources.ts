/**
 * Source registry — every text or annotation served by harness.talk declares its
 * provenance here. Nothing is served without a source, and nothing is claimed
 * that is not ingested (see `status`).
 */
export type SourceStatus = "ingested" | "partial" | "declared";
export type SourceKind = "text" | "annotations" | "original-language";

export interface Source {
  id: string;
  label: string; // site-wide display label
  shortLabel: string;
  kind: SourceKind;
  language: string; // BCP-47
  status: SourceStatus;
  publisher?: string;
  year?: number;
  edition?: string;
  license: string;
  url?: string;
  notes: string[]; // honest caveats, shown in the provenance panel and /api/v1/sources
}

export const KJV_SOURCE_ID = "kjv-1611";
export const GENEVA_SOURCE_ID = "geneva-1599";
export const GENEVA_NOTES_SOURCE_ID = "geneva-notes";

/** Text sources with a full verse corpus on disk (data/{dir}); the first is the body text. */
export const TEXT_SOURCES = [
  { id: KJV_SOURCE_ID, dir: "kjv" },
  { id: GENEVA_SOURCE_ID, dir: "geneva" },
] as const;
export type TextSourceId = (typeof TEXT_SOURCES)[number]["id"];

export const SOURCES: Source[] = [
  {
    id: KJV_SOURCE_ID,
    label: "King James Bible, 1611 first edition",
    shortLabel: "KJV 1611",
    kind: "text",
    language: "en",
    status: "ingested",
    year: 1611,
    edition: "The Holy Bible, Conteyning the Old Testament, and the New — Robert Barker, London, 1611 (the 'He' Bible), original spelling",
    license: "Public domain. Body transcription and all witnesses are public-domain texts; no publisher's edition, notes or typesetting are reproduced.",
    url: "https://github.com/aruljohn/Bible-kjv-1611",
    notes: [
      "Body text of the reader and default for every API response. Spelling, punctuation, I/J and U/V usage, þ (thorn) and macron abbreviations are as printed in 1611, e.g. Gen 1:1 'In the beginning God created the Heauen, and the Earth.'",
      "One transcriber-caused defect in the source was repaired with witnesses, never by hand: the transcription typed the divine name as 'Lord' where the folio prints it in capitals. LORD/GOD casing was restored by majority vote of three independent public-domain KJV witnesses — the CrossWire KJV module (casing derived from the Hebrew Strong's number behind each word: YHWH → LORD, Adonai → Lord), the eBible.org OSIS KJV and Project Gutenberg #10. A verse changed only when two witnesses agreed and their divine-name tokens matched the 1611 verse token-for-token. 104 verses with no such agreement (mostly 'my Lord' addressed to a man) were left exactly as transcribed and are listed in data/kjv/BUILD-REPORT.md.",
      "Psalm superscriptions are stored as chapter titles (taken from the eBible OSIS witness; the transcription folded them into verse 1) and Psalm 119's Hebrew letter headings as headings. The translators' italics are not marked in the source.",
      "The 1611 printing included the Apocrypha between the Testaments; it is not ingested. 66 books, 1,189 chapters, 31,102 verses, all gated in scripts/build-kjv.mjs; every input is SHA-256 locked in data/raw/SOURCES.lock.json.",
    ],
  },
  {
    id: GENEVA_SOURCE_ID,
    label: "Geneva Bible, 1599 edition — verse text",
    shortLabel: "Geneva 1599",
    kind: "text",
    language: "en",
    status: "ingested",
    year: 1599,
    edition: "The Bible, that is, the Holy Scriptures conteined in the Olde and Newe Testament — Geneva Bible, 1599 printing, original spelling",
    license: "Public domain (eBible.org distribution)",
    url: "https://ebible.org/Scriptures/details.php?id=enggnv",
    notes: [
      "The Reformers' English Bible, translated in Geneva 1557–1560 by Whittingham, Gilby, Sampson and others in Calvin's and Knox's circle; the Bible of Shakespeare, the Pilgrims and the 1611 translators' own study. Served beside the 1611 as a second text via ?source=geneva-1599 and the reader's Geneva line.",
      "Verse text only. This source carries NO marginal notes, chapter arguments or cross-references — the reformers' commentary is a separate source (geneva-notes) and is not yet ingested. Nothing is substituted in its place.",
      "The 1599 edition is served because it is the edition with a clean public-domain transcription; the 1560 first edition's verse text is nearly identical (the 1599 revised the notes, not the text). Psalm superscriptions are part of verse 1, as the Geneva printed them.",
      "Versification differs from the KJV in 66 places (e.g. Job 41 is split differently, Numbers 12:16 falls in 13:1); the API returns not_found for KJV references with no Geneva counterpart rather than remapping. See data/geneva/BUILD-REPORT.md.",
    ],
  },
  {
    id: GENEVA_NOTES_SOURCE_ID,
    label: "Geneva Bible marginal notes and chapter arguments",
    shortLabel: "Geneva notes",
    kind: "annotations",
    language: "en",
    status: "declared",
    year: 1560,
    edition: "Geneva Bible, 1560 first edition (Rowland Hall, Geneva), with the 1599 revisions noted where they differ",
    license: "Public domain",
    notes: [
      "The reformers' own commentary in the margins: the chapter arguments, the doctrinal and explanatory notes, and the cross-references. This is the layer that made the Geneva Bible the people's study Bible and the one King James disliked.",
      "Not yet ingested. No clean public-domain transcription exists; the Internet Archive facsimile's OCR is unreliable in the margins, and the sites that host a transcription forbid automated copying. Ingestion will be note-by-note from a verified transcription; status becomes 'partial' per book as notes are verified.",
      "Where not ingested, the API returns source_not_ingested and the reader's margin stays empty rather than showing anything unverified.",
    ],
  },
  {
    id: "textus-receptus",
    label: "Textus Receptus (Greek NT)",
    shortLabel: "TR",
    kind: "original-language",
    language: "grc",
    status: "declared",
    license: "Public domain",
    notes: [
      "The Greek textual tradition underlying the KJV New Testament (Erasmus 1516 → Stephanus 1550 → Beza 1598 → the 1611 translators).",
      "Not yet ingested. The Greek text currently served (sblgnt-morphgnt) is a critical text and differs from the TR at known places (e.g. 1 John 5:7).",
      "Ingestion spec: Scrivener 1894 or Stephanus 1550 plain-text with verse ids; verify against KJV verse boundaries.",
    ],
  },
  {
    id: "wlc-oshb",
    label: "Hebrew Old Testament — Westminster Leningrad Codex (OSHB morphology)",
    shortLabel: "Hebrew (WLC)",
    kind: "original-language",
    language: "hbo",
    status: "ingested",
    license: "CC BY 4.0 (Open Scriptures Hebrew Bible)",
    url: "https://github.com/openscriptures/morphhb",
    notes: [
      "23,215 verses, word-level with Strong's number and OSHB morphology code; 200 verses tagged Aramaic (Daniel, Ezra, Jer 10:11, Gen 31:47) are kept in place with a per-verse language flag.",
      "Ingested via the owner's Immutable/BibleOS data (scripts/build-originals.mjs); served at /api/v1/verses/{ref}?source=wlc-oshb and /api/v1/words/{ref}.",
      "Verse boundaries follow the Hebrew numbering, which differs from the KJV in 100+ chapters (Psalm titles counted as verse 1, Joel/Malachi/1 Kings chapter splits). The API returns the Hebrew verse at the same chapter:verse number without remapping; the reader labels it. See data/originals/BUILD-REPORT.md for every difference.",
    ],
  },
  {
    id: "sblgnt-morphgnt",
    label: "Greek New Testament — SBLGNT with MorphGNT tagging",
    shortLabel: "Greek (SBLGNT)",
    kind: "original-language",
    language: "grc",
    status: "ingested",
    license: "SBLGNT: CC BY 4.0; MorphGNT: CC BY-SA 3.0",
    url: "https://github.com/morphgnt/sblgnt",
    notes: [
      "7,928 verses, word-level with lemma, MorphGNT parsing code and part of speech. Ingested via the owner's Immutable/BibleOS data (scripts/build-originals.mjs).",
      "A critical (eclectic) Greek text, NOT the Textus Receptus behind the KJV. Verified difference: 1 John 5:7 reads only '���τι τρεῖς εἰσιν οἱ μαρτυροῦντες,' — the Comma Johanneum is absent. 21 chapters have fewer verses than the KJV (e.g. Mk 9, Jn 8, Ac 8) because the KJV verses rest on TR readings the critical text omits.",
      "Served for word study beside the KJV, always labeled 'Greek (SBLGNT)'. Requests for the TR return source_not_ingested until that text is ingested.",
      "SBLGNT's inline apparatus sigla (⸀ ⸂ ⸃ … U+2E00–U+2E0D, pointers into its textual notes) are stripped from the served text; the apparatus itself is not ingested.",
    ],
  },
];

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function isTextSource(id: string): id is TextSourceId {
  return TEXT_SOURCES.some((s) => s.id === id);
}

export const KJV_SOURCE = sourceById(KJV_SOURCE_ID)!;
export const GENEVA_SOURCE = sourceById(GENEVA_SOURCE_ID)!;
export const GENEVA_NOTES_SOURCE = sourceById(GENEVA_NOTES_SOURCE_ID)!;

/** Canonical public origin — used for JSON-LD, sitemaps, llms.txt and problem+json `type` URIs. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harness.talk";
export const SITE_NAME = "harness.talk";

/**
 * Identity copy — the same rule as the mark. State what the thing IS, in terms a person or an
 * agent can check against the running site in a minute. No adjective that cannot be verified,
 * no source named here that /api/v1/sources does not list as ingested.
 */
export const SITE_TAGLINE = "Every verse has an address.";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE.replace(/\.$/, "").toLowerCase()}`;
export const SITE_DESCRIPTION =
  "The King James Bible of 1611, exact to the letter: 66 books, 1,189 chapters, 31,102 verses, each at one address — 127.book.chapter.verse — with its SHA-256. Read it as a book or call it as a read-only API. No key, no account; nothing to trust but the hash.";
/** Short form for share cards (the image carries no words, so these must). */
export const SITE_SHARE_DESCRIPTION =
  "31,102 verses of the 1611 King James Bible, each at 127.book.chapter.verse with its SHA-256. Read it as a book, call it as an API. No key. Nothing to trust but the hash.";
