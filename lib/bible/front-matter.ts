import "server-only";
import geneva from "@/data/facsimile/geneva-1560.json";
import kjv from "@/data/facsimile/kjv-1611.json";

/**
 * Front-matter plates for the two English Bibles compared on /printers. Real page
 * photographs from the Internet Archive IIIF endpoint (Geneva 1560, CC0; King James 1611,
 * public domain in the US). Leaf indices are hand-verified against each scan. No verse text
 * is served here — only the opening leaves (title pages and dedications), which is the whole
 * point: behind two very different covers sits nearly the same English Bible.
 */

const DISPLAY_WIDTH = 760;

function iiif(base: string, leaf: number, width = DISPLAY_WIDTH): string {
  return `${base}$${leaf}/full/${Math.round(width)},/0/default.jpg`;
}

function readerLeaf(reader: string, leaf: number): string {
  return `${reader}/page/n${leaf}/mode/1up`;
}

export interface FrontMatterPlate {
  leaf: number;
  heading: string;
  alt: string;
  transcription: string;
  image: string;
  archiveUrl: string;
}

export interface FrontMatterEdition {
  key: string;
  edition: string;
  year: string;
  place: string;
  printer: string;
  identifier: string;
  archiveReader: string;
  license: string;
  plates: FrontMatterPlate[];
}

export const FRONT_MATTER: FrontMatterEdition[] = [
  {
    key: "geneva-1560",
    edition: "Geneva Bible",
    year: "1560",
    place: "Geneva",
    printer: "Rowland Hall",
    identifier: geneva.identifier,
    archiveReader: geneva.archiveReader,
    license: geneva.license,
    plates: [
      {
        leaf: 0,
        heading: "Title page",
        alt: "The 1560 Geneva Bible title page: type-set title over a woodcut of the Israelites at the Red Sea, with the imprint AT GENEVA, PRINTED BY ROWLAND HALL, M.D.LX.",
        transcription:
          "THE BIBLE AND HOLY SCRIPTVRES CONTEYNED IN THE OLDE AND NEWE Testament. TRANSLATED ACCORding to the Ebrue and Greke, and conferred with the best translations in diuers langages. WITH MOSTE PROFITABLE ANNOTAtions vpon all the hard places... AT GENEVA. PRINTED BY ROWLAND HALL. M.D.LX.",
        image: iiif(geneva.iiifBase, 0),
        archiveUrl: readerLeaf(geneva.archiveReader, 0),
      },
      {
        leaf: 2,
        heading: "Dedication, page 1",
        alt: "The 1560 Geneva Bible dedication, page 1, addressed to Queen Elizabeth by the English Church at Geneva.",
        transcription:
          "TO THE MOSTE VERTVOVS AND NOBLE QVENE ELISABET, Quene of England, France, and Ireland, &c. Your humble subiects of the English Churche at Geneua, wish grace and peace from God the Father through Christ Iesus our Lord. How hard a thing it is, and what great impedimentes let, to enterprise any worthie act, not only dailie experience sufficiently sheweth (moste noble and vertuous Quene) but also that notable prouerbe doeth confirme the same, which admonisheth vs, that all thin\u0261s are hard which are faire and excellent.",
        image: iiif(geneva.iiifBase, 2),
        archiveUrl: readerLeaf(geneva.archiveReader, 2),
      },
      {
        leaf: 3,
        heading: "Dedication, page 2",
        alt: "The 1560 Geneva Bible dedication, page 2, on presenting the Scriptures faithfully translated and the ground of true religion.",
        transcription:
          "\u2026 the other, as to present vnto your Maiestie the holy Scriptures faithfully and playnely translated according to the langages wherein thei were first written by the holy Gost. For the worde of God is an euident token of Gods loue and our assurance of his defence, wheresoeuer it is obediently receyued: it is the trial of the spirits: and as the Prophet saith, It is as a fyre and hammer to breake the stonie heartes of them that resist Gods mercies offred by the preaching of the same.",
        image: iiif(geneva.iiifBase, 3),
        archiveUrl: readerLeaf(geneva.archiveReader, 3),
      },
      {
        leaf: 4,
        heading: "Dedication, page 3",
        alt: "The 1560 Geneva Bible dedication, page 3, on Josiah, Hezekiah and godly rulers who reformed their countries by the word of God.",
        transcription:
          "\u2026 seruing (as it was enacted that whosoeuer wolde not seke the Lord God of Israel, shulde be slayne, whether he were smale or great, man or woman.) \u2026 Moreouer the maruelous diligence and zeale of Iehoshaphat, Iosiah, and Hezekiah are set by the singular prouidence of God as an example to all godly rulers to reforme their countreys and to establish the worde of God with all spede, lest the wrath of the Lord fall vpon them for the negle\u0261ting thereof.",
        image: iiif(geneva.iiifBase, 4),
        archiveUrl: readerLeaf(geneva.archiveReader, 4),
      },
      {
        leaf: 5,
        heading: "Dedication, page 4",
        alt: "The 1560 Geneva Bible dedication, page 4, closing with an exhortation to Queen Elizabeth, dated from Geneva, 10 April 1560.",
        transcription:
          "\u2026 For considering Gods wonderful mercies toward you at all seasons, who hath pulled you out of the mouthe of the lyons, and how that from your youth you haue bene broght vp in the holy Scriptures, the hope of all men is so increased, that thei can not but looke that God shulde bring to passe some wonderful worke by your grace to the vniuersal comfort of his Church. \u2026 This Lord of lordes & King of kings who hath euer defended his, strengthe, comfort and preserue your maiestie, that you may be able to builde vp the ruines of Gods house to his glorie, the discharge of your conscience, and to the comfort of all them that loue the comming of Christ Iesus our Lord. From Geneua. 10. April. 1560.",
        // archive.org's IIIF server hangs on this one leaf; same scan, saved from its page-image route.
        image: "/facsimile/geneva-1560-leaf-5.jpg",
        archiveUrl: readerLeaf(geneva.archiveReader, 5),
      },
    ],
  },
  {
    key: "kjv-1611",
    edition: "King James Version",
    year: "1611",
    place: "London",
    printer: "Robert Barker",
    identifier: kjv.identifier,
    archiveReader: kjv.archiveReader,
    license: kjv.license,
    plates: [
      {
        leaf: kjv.titleLeaf,
        heading: "Title page",
        alt: "The engraved title page of the 1611 King James Bible by Cornelis Boel, an architectural frame of apostles and prophets, with the imprint Imprinted at London by Robert Barker, ANNO DOM. 1611.",
        transcription:
          "THE HOLY BIBLE, Conteyning the Old Testament, AND THE NEW: Newly Translated out of the Originall tongues: & with the former Translations diligently compared and reuised, by his Maiesties speciall Comandement. Appointed to be read in Churches. Imprinted at London by Robert Barker, Printer to the Kings most Excellent Maiestie. ANNO DOM. 1611.",
        image: iiif(kjv.iiifBase, kjv.titleLeaf),
        archiveUrl: readerLeaf(kjv.archiveReader, kjv.titleLeaf),
      },
      {
        leaf: kjv.dedicationLeaf,
        heading: "Dedication",
        alt: "The 1611 King James Bible dedication to King James, which also recalls that bright Occidentall Starre, Queene Elizabeth of most happy memory.",
        transcription:
          "TO THE MOST HIGH AND MIGHTIE Prince, IAMES by the grace of God King of Great Britaine, France and Ireland, Defender of the Faith, &c. ... recalling \u201Cthat bright Occidentall Starre, Queene ELIZABETH of most happy memory.\u201D",
        image: iiif(kjv.iiifBase, kjv.dedicationLeaf),
        archiveUrl: readerLeaf(kjv.archiveReader, kjv.dedicationLeaf),
      },
    ],
  },
];
