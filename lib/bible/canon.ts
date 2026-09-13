/**
 * The 66-book Protestant canon in KJV order.
 * `ordinal` is the second octet of the 127.{book}.{chapter}.{verse} scheme.
 * `chapters` / `verses` are the standard KJV counts and are used as hard
 * verification gates by scripts/build-kjv.mjs (31,102 verses total).
 *
 * This file is plain data and is imported by both server code and the
 * build scripts (via a generated JSON mirror), so keep it dependency-free.
 */
export type Testament = "OT" | "NT";

export interface CanonBook {
  id: string; // canonical short id used in refs and URLs
  ordinal: number; // 1..66
  name: string; // display name
  testament: Testament;
  chapters: number;
  verses: number;
  /** Lowercase aliases accepted by the reference parser. */
  aliases: string[];
  /** Title as printed as a running head in the reader (uppercase). */
  runningHead: string;
}

export const CANON: CanonBook[] = [
  { id: "gn", ordinal: 1, name: "Genesis", testament: "OT", chapters: 50, verses: 1533, aliases: ["gen", "ge", "genesis"], runningHead: "GENESIS" },
  { id: "ex", ordinal: 2, name: "Exodus", testament: "OT", chapters: 40, verses: 1213, aliases: ["exo", "exod", "exodus"], runningHead: "EXODUS" },
  { id: "lv", ordinal: 3, name: "Leviticus", testament: "OT", chapters: 27, verses: 859, aliases: ["lev", "le", "leviticus"], runningHead: "LEVITICUS" },
  { id: "nm", ordinal: 4, name: "Numbers", testament: "OT", chapters: 36, verses: 1288, aliases: ["num", "nu", "numbers"], runningHead: "NUMBERS" },
  { id: "dt", ordinal: 5, name: "Deuteronomy", testament: "OT", chapters: 34, verses: 959, aliases: ["deu", "deut", "de", "deuteronomy"], runningHead: "DEUTERONOMY" },
  { id: "js", ordinal: 6, name: "Joshua", testament: "OT", chapters: 24, verses: 658, aliases: ["jos", "josh", "joshua"], runningHead: "JOSHUA" },
  { id: "jg", ordinal: 7, name: "Judges", testament: "OT", chapters: 21, verses: 618, aliases: ["jdg", "judg", "judges"], runningHead: "JUDGES" },
  { id: "rt", ordinal: 8, name: "Ruth", testament: "OT", chapters: 4, verses: 85, aliases: ["rut", "ru", "ruth"], runningHead: "RUTH" },
  { id: "1sm", ordinal: 9, name: "1 Samuel", testament: "OT", chapters: 31, verses: 810, aliases: ["1sa", "1sam", "1samuel", "isamuel"], runningHead: "1 SAMUEL" },
  { id: "2sm", ordinal: 10, name: "2 Samuel", testament: "OT", chapters: 24, verses: 695, aliases: ["2sa", "2sam", "2samuel", "iisamuel"], runningHead: "2 SAMUEL" },
  { id: "1kg", ordinal: 11, name: "1 Kings", testament: "OT", chapters: 22, verses: 816, aliases: ["1ki", "1kgs", "1kings"], runningHead: "1 KINGS" },
  { id: "2kg", ordinal: 12, name: "2 Kings", testament: "OT", chapters: 25, verses: 719, aliases: ["2ki", "2kgs", "2kings"], runningHead: "2 KINGS" },
  { id: "1ch", ordinal: 13, name: "1 Chronicles", testament: "OT", chapters: 29, verses: 942, aliases: ["1chr", "1chron", "1chronicles"], runningHead: "1 CHRONICLES" },
  { id: "2ch", ordinal: 14, name: "2 Chronicles", testament: "OT", chapters: 36, verses: 822, aliases: ["2chr", "2chron", "2chronicles"], runningHead: "2 CHRONICLES" },
  { id: "ezr", ordinal: 15, name: "Ezra", testament: "OT", chapters: 10, verses: 280, aliases: ["ezra"], runningHead: "EZRA" },
  { id: "ne", ordinal: 16, name: "Nehemiah", testament: "OT", chapters: 13, verses: 406, aliases: ["neh", "nehemiah"], runningHead: "NEHEMIAH" },
  { id: "et", ordinal: 17, name: "Esther", testament: "OT", chapters: 10, verses: 167, aliases: ["est", "esth", "esther"], runningHead: "ESTHER" },
  { id: "jb", ordinal: 18, name: "Job", testament: "OT", chapters: 42, verses: 1070, aliases: ["job"], runningHead: "JOB" },
  { id: "ps", ordinal: 19, name: "Psalms", testament: "OT", chapters: 150, verses: 2461, aliases: ["psa", "psalm", "psalms", "pss"], runningHead: "PSALMS" },
  { id: "pr", ordinal: 20, name: "Proverbs", testament: "OT", chapters: 31, verses: 915, aliases: ["pro", "prov", "proverbs"], runningHead: "PROVERBS" },
  { id: "ec", ordinal: 21, name: "Ecclesiastes", testament: "OT", chapters: 12, verses: 222, aliases: ["ecc", "eccl", "ecclesiastes"], runningHead: "ECCLESIASTES" },
  { id: "so", ordinal: 22, name: "Song of Solomon", testament: "OT", chapters: 8, verses: 117, aliases: ["sos", "song", "songofsolomon", "songofsongs", "canticles"], runningHead: "SONG OF SOLOMON" },
  { id: "is", ordinal: 23, name: "Isaiah", testament: "OT", chapters: 66, verses: 1292, aliases: ["isa", "isaiah"], runningHead: "ISAIAH" },
  { id: "jr", ordinal: 24, name: "Jeremiah", testament: "OT", chapters: 52, verses: 1364, aliases: ["jer", "jeremiah"], runningHead: "JEREMIAH" },
  { id: "lm", ordinal: 25, name: "Lamentations", testament: "OT", chapters: 5, verses: 154, aliases: ["lam", "lamentations"], runningHead: "LAMENTATIONS" },
  { id: "ez", ordinal: 26, name: "Ezekiel", testament: "OT", chapters: 48, verses: 1273, aliases: ["eze", "ezek", "ezekiel"], runningHead: "EZEKIEL" },
  { id: "dn", ordinal: 27, name: "Daniel", testament: "OT", chapters: 12, verses: 357, aliases: ["dan", "da", "daniel"], runningHead: "DANIEL" },
  { id: "ho", ordinal: 28, name: "Hosea", testament: "OT", chapters: 14, verses: 197, aliases: ["hos", "hosea"], runningHead: "HOSEA" },
  { id: "jl", ordinal: 29, name: "Joel", testament: "OT", chapters: 3, verses: 73, aliases: ["joe", "joel"], runningHead: "JOEL" },
  { id: "am", ordinal: 30, name: "Amos", testament: "OT", chapters: 9, verses: 146, aliases: ["amo", "amos"], runningHead: "AMOS" },
  { id: "ob", ordinal: 31, name: "Obadiah", testament: "OT", chapters: 1, verses: 21, aliases: ["oba", "obad", "obadiah"], runningHead: "OBADIAH" },
  { id: "jnh", ordinal: 32, name: "Jonah", testament: "OT", chapters: 4, verses: 48, aliases: ["jon", "jonah"], runningHead: "JONAH" },
  { id: "mi", ordinal: 33, name: "Micah", testament: "OT", chapters: 7, verses: 105, aliases: ["mic", "micah"], runningHead: "MICAH" },
  { id: "na", ordinal: 34, name: "Nahum", testament: "OT", chapters: 3, verses: 47, aliases: ["nah", "nahum"], runningHead: "NAHUM" },
  { id: "hk", ordinal: 35, name: "Habakkuk", testament: "OT", chapters: 3, verses: 56, aliases: ["hab", "habakkuk"], runningHead: "HABAKKUK" },
  { id: "zp", ordinal: 36, name: "Zephaniah", testament: "OT", chapters: 3, verses: 53, aliases: ["zep", "zeph", "zephaniah"], runningHead: "ZEPHANIAH" },
  { id: "hg", ordinal: 37, name: "Haggai", testament: "OT", chapters: 2, verses: 38, aliases: ["hag", "haggai"], runningHead: "HAGGAI" },
  { id: "zc", ordinal: 38, name: "Zechariah", testament: "OT", chapters: 14, verses: 211, aliases: ["zec", "zech", "zechariah"], runningHead: "ZECHARIAH" },
  { id: "ml", ordinal: 39, name: "Malachi", testament: "OT", chapters: 4, verses: 55, aliases: ["mal", "malachi"], runningHead: "MALACHI" },
  { id: "mt", ordinal: 40, name: "Matthew", testament: "NT", chapters: 28, verses: 1071, aliases: ["mat", "matt", "matthew"], runningHead: "MATTHEW" },
  { id: "mk", ordinal: 41, name: "Mark", testament: "NT", chapters: 16, verses: 678, aliases: ["mar", "mrk", "mark"], runningHead: "MARK" },
  { id: "lk", ordinal: 42, name: "Luke", testament: "NT", chapters: 24, verses: 1151, aliases: ["luk", "lu", "luke"], runningHead: "LUKE" },
  { id: "jn", ordinal: 43, name: "John", testament: "NT", chapters: 21, verses: 879, aliases: ["joh", "jhn", "john"], runningHead: "JOHN" },
  { id: "ac", ordinal: 44, name: "Acts", testament: "NT", chapters: 28, verses: 1007, aliases: ["act", "acts"], runningHead: "ACTS" },
  { id: "rm", ordinal: 45, name: "Romans", testament: "NT", chapters: 16, verses: 433, aliases: ["rom", "ro", "romans"], runningHead: "ROMANS" },
  { id: "1co", ordinal: 46, name: "1 Corinthians", testament: "NT", chapters: 16, verses: 437, aliases: ["1cor", "1corinthians"], runningHead: "1 CORINTHIANS" },
  { id: "2co", ordinal: 47, name: "2 Corinthians", testament: "NT", chapters: 13, verses: 257, aliases: ["2cor", "2corinthians"], runningHead: "2 CORINTHIANS" },
  { id: "gl", ordinal: 48, name: "Galatians", testament: "NT", chapters: 6, verses: 149, aliases: ["gal", "galatians"], runningHead: "GALATIANS" },
  { id: "ep", ordinal: 49, name: "Ephesians", testament: "NT", chapters: 6, verses: 155, aliases: ["eph", "ephesians"], runningHead: "EPHESIANS" },
  { id: "ph", ordinal: 50, name: "Philippians", testament: "NT", chapters: 4, verses: 104, aliases: ["phi", "phil", "php", "philippians"], runningHead: "PHILIPPIANS" },
  { id: "cl", ordinal: 51, name: "Colossians", testament: "NT", chapters: 4, verses: 95, aliases: ["col", "colossians"], runningHead: "COLOSSIANS" },
  { id: "1th", ordinal: 52, name: "1 Thessalonians", testament: "NT", chapters: 5, verses: 89, aliases: ["1thes", "1thess", "1thessalonians"], runningHead: "1 THESSALONIANS" },
  { id: "2th", ordinal: 53, name: "2 Thessalonians", testament: "NT", chapters: 3, verses: 47, aliases: ["2thes", "2thess", "2thessalonians"], runningHead: "2 THESSALONIANS" },
  { id: "1tm", ordinal: 54, name: "1 Timothy", testament: "NT", chapters: 6, verses: 113, aliases: ["1ti", "1tim", "1timothy"], runningHead: "1 TIMOTHY" },
  { id: "2tm", ordinal: 55, name: "2 Timothy", testament: "NT", chapters: 4, verses: 83, aliases: ["2ti", "2tim", "2timothy"], runningHead: "2 TIMOTHY" },
  { id: "tt", ordinal: 56, name: "Titus", testament: "NT", chapters: 3, verses: 46, aliases: ["tit", "titus"], runningHead: "TITUS" },
  { id: "phm", ordinal: 57, name: "Philemon", testament: "NT", chapters: 1, verses: 25, aliases: ["phile", "philem", "philemon"], runningHead: "PHILEMON" },
  { id: "hb", ordinal: 58, name: "Hebrews", testament: "NT", chapters: 13, verses: 303, aliases: ["heb", "hebrews"], runningHead: "HEBREWS" },
  { id: "jm", ordinal: 59, name: "James", testament: "NT", chapters: 5, verses: 108, aliases: ["jas", "james"], runningHead: "JAMES" },
  { id: "1pe", ordinal: 60, name: "1 Peter", testament: "NT", chapters: 5, verses: 105, aliases: ["1pet", "1pt", "1peter"], runningHead: "1 PETER" },
  { id: "2pe", ordinal: 61, name: "2 Peter", testament: "NT", chapters: 3, verses: 61, aliases: ["2pet", "2pt", "2peter"], runningHead: "2 PETER" },
  { id: "1jn", ordinal: 62, name: "1 John", testament: "NT", chapters: 5, verses: 105, aliases: ["1jo", "1joh", "1john"], runningHead: "1 JOHN" },
  { id: "2jn", ordinal: 63, name: "2 John", testament: "NT", chapters: 1, verses: 13, aliases: ["2jo", "2joh", "2john"], runningHead: "2 JOHN" },
  { id: "3jn", ordinal: 64, name: "3 John", testament: "NT", chapters: 1, verses: 14, aliases: ["3jo", "3joh", "3john"], runningHead: "3 JOHN" },
  { id: "jd", ordinal: 65, name: "Jude", testament: "NT", chapters: 1, verses: 25, aliases: ["jud", "jude"], runningHead: "JUDE" },
  { id: "re", ordinal: 66, name: "Revelation", testament: "NT", chapters: 22, verses: 404, aliases: ["rev", "revelation", "revelations", "apocalypse"], runningHead: "REVELATION" },
];

export const TOTAL_CHAPTERS = CANON.reduce((n, b) => n + b.chapters, 0); // 1189
export const TOTAL_VERSES = CANON.reduce((n, b) => n + b.verses, 0); // 31102

const byId = new Map<string, CanonBook>();
const byOrdinal = new Map<number, CanonBook>();
const byAlias = new Map<string, CanonBook>();
for (const b of CANON) {
  byId.set(b.id, b);
  byOrdinal.set(b.ordinal, b);
  byAlias.set(b.id, b);
  byAlias.set(b.name.toLowerCase().replace(/\s+/g, ""), b);
  for (const a of b.aliases) byAlias.set(a, b);
}

export function bookById(id: string): CanonBook | undefined {
  return byId.get(id);
}
export function bookByOrdinal(n: number): CanonBook | undefined {
  return byOrdinal.get(n);
}
/** Resolve a loose book token ("John", "jn", "1 Sam", "song of songs"). */
export function bookByAlias(token: string): CanonBook | undefined {
  const key = token.toLowerCase().replace(/[\s._-]+/g, "").replace(/^(i{1,3})(?=[a-z])/, (m) => String(m.length));
  return byAlias.get(key);
}
