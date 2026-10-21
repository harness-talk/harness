export type ThreadKind = "Typology" | "Prophecy" | "Shadow";

export interface StudyThread {
  kind: ThreadKind;
  title: string;
  from: string;
  to: string[];
}

/**
 * Well-known passage pairings, shown as "Threads to follow". The groupings and
 * titles are editorial; OpenBible reader votes are shown when they link the pair.
 */
export const THREADS: StudyThread[] = [
  { kind: "Typology", title: "The Passover lamb", from: "ex.12.5", to: ["1co.5.7", "jn.1.29", "1pe.1.19"] },
  { kind: "Typology", title: "The serpent lifted up", from: "nm.21.9", to: ["jn.3.14"] },
  { kind: "Typology", title: "Three days in the deep", from: "jnh.1.17", to: ["mt.12.40"] },
  { kind: "Typology", title: "Melchizedek, priest and king", from: "gn.14.18", to: ["ps.110.4", "hb.7.1"] },
  { kind: "Typology", title: "Bread from heaven", from: "ex.16.15", to: ["jn.6.32", "jn.6.35"] },
  { kind: "Typology", title: "The first and last Adam", from: "gn.2.7", to: ["1co.15.45", "rm.5.14"] },
  { kind: "Prophecy", title: "The seed of the woman", from: "gn.3.15", to: ["gl.4.4", "rm.16.20"] },
  { kind: "Prophecy", title: "A virgin shall conceive", from: "is.7.14", to: ["mt.1.23"] },
  { kind: "Prophecy", title: "Out of Bethlehem", from: "mi.5.2", to: ["mt.2.6"] },
  { kind: "Prophecy", title: "Wounded for our transgressions", from: "is.53.5", to: ["1pe.2.24"] },
  { kind: "Prophecy", title: "They parted my garments", from: "ps.22.18", to: ["jn.19.24"] },
  { kind: "Prophecy", title: "Him whom they pierced", from: "zc.12.10", to: ["jn.19.37"] },
  { kind: "Shadow", title: "The pattern on the mount", from: "ex.25.40", to: ["hb.8.5"] },
  { kind: "Shadow", title: "The veil of the temple", from: "ex.26.33", to: ["mt.27.51", "hb.10.20"] },
  { kind: "Shadow", title: "A rest that remains", from: "gn.2.2", to: ["hb.4.9"] },
  { kind: "Shadow", title: "The law, a shadow of good things to come", from: "hb.10.1", to: ["cl.2.17"] },
];
