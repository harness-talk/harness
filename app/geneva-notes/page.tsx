import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS } from "@/components/docs/doc-shell";
import { StatusBadge } from "@/components/site/status-badge";
import { SITE_URL } from "@/lib/bible/sources";
import { iiifImage, facsimileInfo } from "@/lib/bible/facsimile";

export const metadata: Metadata = {
  title: "The Geneva notes — who wrote them, and why they mattered",
  description:
    "The Geneva Bible of 1560 was the first English study Bible: verse numbers, plain roman type, and thousands of marginal notes written by Protestant exiles in Calvin's Geneva. It was the Bible of Shakespeare and the Pilgrims, and its notes so provoked King James that he set out to replace it. A history, with the real 1560 pages.",
  alternates: { canonical: `${SITE_URL}/geneva-notes` },
  openGraph: {
    title: "The Geneva notes, after four centuries",
    description: "Who wrote the Geneva Bible's marginal notes, why they were revolutionary, and their impact — beside the real 1560 first-edition pages.",
    type: "article",
  },
};

const TOC = [
  { id: "exiles", label: "The exiles who wrote it" },
  { id: "revolutionary", label: "Why it was revolutionary" },
  { id: "notes", label: "The notes, and their bite" },
  { id: "impact", label: "Its impact on the world" },
  { id: "editions", label: "1560 and 1599 notes" },
  { id: "see", label: "See them for yourself" },
  { id: "references", label: "References" },
];

/** A superscript citation marker linking to the References list. */
function Cite({ n }: { n: number }) {
  return (
    <sup>
      <a href={`#ref-${n}`} className="text-rubric no-underline hover:underline" aria-label={`Reference ${n}`}>
        [{n}]
      </a>
    </sup>
  );
}

export default function GenevaNotesPage() {
  const fax = facsimileInfo();
  // A verified, visually rich leaf: Genesis 2-3 with the map of Eden (leaf 8).
  const heroLeaf = 8;
  const hero = iiifImage(heroLeaf, 900);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "The Geneva notes — who wrote them, and why they mattered",
          about: "The marginal notes of the Geneva Bible (1560)",
          inLanguage: "en",
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
          url: `${SITE_URL}/geneva-notes`,
          image: hero,
          citation: [
            "The Bible and Holy Scriptures conteyned in the Olde and Newe Testament, Geneva, 1560 (Internet Archive, CC0)",
            "Encyclopædia Britannica, 'Geneva Bible'",
          ],
        }}
      />
      <DocShell
        kicker="The Geneva notes"
        title="The notes, after four centuries"
        lede="The Geneva Bible was the first English study Bible — verse-numbered, plainly printed, and ringed with thousands of marginal notes written by exiles in Calvin's Geneva. It was the Bible people actually read for a century, and the notes were sharp enough that a king set out to replace it. Here is who wrote them, why they mattered, and the real 1560 pages themselves."
        status="live"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        {/* Hero facsimile plate */}
        <figure className="not-prose mb-10 flex flex-col gap-3">
          <div className="overflow-hidden rounded-sm border border-rule bg-foreground/[0.02]">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote IIIF facsimile tile, not a local asset */}
            <img
              src={hero || "/placeholder.svg"}
              alt="A page of the 1560 Geneva Bible: Genesis 2–3, with the woodcut map of the Garden of Eden and marginal notes down both sides."
              className="mx-auto w-full max-w-xl"
              loading="eager"
            />
          </div>
          <figcaption className="text-[0.8rem] leading-relaxed text-foreground/60">
            Genesis 2–3 in the 1560 first edition — the map of Eden, verse numbers, and the reformers&apos; notes running down
            the margins. Page image: Internet Archive, public domain (CC0).{" "}
            <a href={`${fax.archiveReader}/page/n${heroLeaf}/mode/1up`} className="text-rubric underline underline-offset-[3px]" target="_blank" rel="noreferrer noopener">
              See it on archive.org
            </a>
          </figcaption>
        </figure>

        <section id="exiles" className="doc-prose">
          <h2>The exiles who wrote it</h2>
          <p>
            When the Catholic Mary I took the English throne in 1553, hundreds of Protestants fled the country. A group of
            them settled in Geneva, the city of John Calvin and, for a time, the Scottish reformer John Knox.
            <Cite n={1} /> There, between roughly 1557 and 1560, a small team of scholars set out to make an English Bible
            for ordinary readers. The chief translator was <strong>William Whittingham</strong>, Knox&apos;s successor in
            the English congregation at Geneva; he worked with <strong>Anthony Gilby</strong> and{" "}
            <strong>Thomas Sampson</strong>, among others.<Cite n={1} />
          </p>
          <p>
            They had time, quiet, and access to the best biblical scholarship in Europe — Calvin&apos;s Geneva was its
            hub. The New Testament appeared first in 1557; the complete Bible followed in 1560, printed in Geneva by{" "}
            <strong>Rowland Hall</strong> and dedicated to the newly crowned Protestant queen, Elizabeth I.<Cite n={2} />
          </p>
        </section>

        <section id="revolutionary" className="doc-prose">
          <h2>Why it was revolutionary</h2>
          <p>Several firsts came together in one affordable book:</p>
          <ul>
            <li>
              <strong>The first English study Bible.</strong> It surrounded the text with introductions, chapter
              &ldquo;arguments,&rdquo; explanatory notes, cross-references and maps — a whole apparatus for reading, not
              just the bare text.<Cite n={1} />
            </li>
            <li>
              <strong>The first English Bible with numbered verses.</strong> Every verse got its own number, so a reader
              could find and cite an exact place — the same idea as this site&apos;s addresses, four centuries early.
              <Cite n={1} />
            </li>
            <li>
              <strong>Readable roman type instead of heavy black-letter.</strong> Words were set in the clear roman face
              we still read today, and italics marked words the translators had supplied.<Cite n={2} />
            </li>
            <li>
              <strong>Small and affordable.</strong> It was printed in compact quarto and octavo sizes a household could
              own and carry, not a lectern folio — so for the first time the study Bible was personal.<Cite n={1} />
            </li>
          </ul>
        </section>

        <section id="notes" className="doc-prose">
          <h2>The notes, and their bite</h2>
          <p>
            The margins were the point. Thousands of notes explained hard words, drew doctrinal conclusions, and pressed
            the text&apos;s meaning on daily life. Many were straightforwardly Calvinist; some were pointedly political.
            Where the text described kings and tyrants, the notes did not hedge — and that is what made them dangerous.
            <Cite n={3} />
          </p>
          <p>
            When King James I of England reviewed the Bible at the Hampton Court Conference in 1604, he singled the Geneva
            notes out as &ldquo;partial, untrue, seditious,&rdquo; objecting especially to notes he read as licensing
            disobedience to a monarch. His remedy was a new translation with <em>no</em> marginal notes at all — the
            Authorized, or King James, Version of 1611.<Cite n={3} /> In other words, the King James Bible exists in part
            because the Geneva notes cut too close.
          </p>
        </section>

        <section id="impact" className="doc-prose">
          <h2>Its impact on the world</h2>
          <p>
            For a full century the Geneva Bible, not the King James, was the Bible the English-speaking world actually
            read. It went through around 150 editions and outsold the new Authorized Version for decades after 1611.
            <Cite n={2} />
          </p>
          <ul>
            <li>
              It was the Bible of <strong>Shakespeare</strong>, whose plays echo its wording, and of the writers of the
              age.<Cite n={2} />
            </li>
            <li>
              It was the Bible the <strong>Pilgrims and Puritans carried to America</strong> — the text they read on the
              Mayflower and in the first New England colonies.<Cite n={2} />
            </li>
            <li>
              Its study apparatus set the pattern for every annotated Bible that followed, down to the study Bibles on
              shelves today.
            </li>
          </ul>
        </section>

        <section id="editions" className="doc-prose">
          <h2>1560 and 1599 notes — which notes are &ldquo;the&rdquo; notes</h2>
          <p>
            The Geneva Bible was revised over its long life. The original 1560 notes are Whittingham&apos;s team&apos;s.
            Later, the New Testament notes were substantially expanded using material from{" "}
            <strong>Laurence Tomson</strong> (1576) and, for Revelation, <strong>Franciscus Junius</strong> — and the
            widely reprinted <strong>1599</strong> editions carry that fuller, more strongly Reformed set of notes.
            <Cite n={1} /> So &ldquo;the Geneva notes&rdquo; is really two overlapping layers, and it matters which
            edition you are reading.
          </p>
          <p className="not-prose rounded-sm border border-rule bg-foreground/[0.02] p-4 text-[0.9rem] leading-relaxed text-foreground/80">
            On harness.talk the verse text is served from a clean transcription of the <strong>1599</strong> edition, and
            the facsimile pages are the <strong>1560</strong> first edition. The note <em>text</em> is transcribed by hand
            from those 1560 pages, book by book, in the reformers&apos; own spelling — see below.
          </p>
          <p>
            For the books themselves &mdash; the two title pages set side by side, the dedications, and the story of the
            Bible patent that put a printer&apos;s name on the King James &mdash; see{" "}
            <Link href="/printers" className="text-rubric underline underline-offset-[3px]">
              the title pages and the patent
            </Link>
            .
          </p>
        </section>

        <section id="see" className="doc-prose">
          <h2>See them for yourself</h2>
          <p>
            The surest way to meet the notes is to look at the page they live on. Every chapter in the reader now has a{" "}
            <strong>&ldquo;Compare the 1560 page&rdquo;</strong> button that opens the actual first-edition leaf from the
            Internet Archive — the true marginalia, on the true page, in the public domain.
          </p>
          <div className="not-prose flex flex-wrap items-center gap-3">
            <Link
              href="/foundation/gn/1"
              className="inline-flex min-h-11 items-center rounded-sm border border-rule px-4 py-2 font-display text-[0.66rem] uppercase tracking-[0.16em] text-gilt hover:border-rubric hover:text-rubric"
            >
              Open Genesis 1 in the reader
            </Link>
            <a
              href={fax.archiveReader}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center rounded-sm px-4 py-2 font-display text-[0.66rem] uppercase tracking-[0.16em] text-foreground/70 underline underline-offset-4 hover:text-rubric"
            >
              Browse the whole 1560 on archive.org
            </a>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge status="partial">Note text · transcribed book by book</StatusBadge>
          </p>
          <p>
            The notes are also coming back as clean, searchable <em>text</em> — transcribed by hand from the 1560
            facsimile pages, in the reformers&apos; own spelling, one book at a time. No usable public-domain transcription
            of the 1560 notes existed, and the only machine text on the facsimile is an OCR of the old type too garbled to
            publish, so we read the pages ourselves rather than invent the words. Each note is checkable against the page
            it came from. Where a book has not been transcribed yet, the margin stands on the facsimile and the API
            answers <code>source_not_ingested</code> for its note text. See{" "}
            <Link href="/translations#registry" className="text-rubric underline underline-offset-[3px]">
              the source registry
            </Link>{" "}
            for exactly which books are done.
          </p>
        </section>

        <section id="references" className="doc-prose">
          <h2>References</h2>
          <ol className="text-[0.9rem] leading-relaxed text-foreground/75">
            <li id="ref-1">
              Encyclopædia Britannica, &ldquo;Geneva Bible.&rdquo;{" "}
              <a href="https://www.britannica.com/topic/Geneva-Bible" className="text-rubric underline underline-offset-[3px]" target="_blank" rel="noreferrer noopener">
                britannica.com/topic/Geneva-Bible
              </a>
            </li>
            <li id="ref-2">
              <em>The Bible and Holy Scriptures conteyned in the Olde and Newe Testament</em>, Geneva: Rowland Hall, 1560 —
              first-edition facsimile, Internet Archive (public domain, CC0).{" "}
              <a href={fax.archiveReader} className="text-rubric underline underline-offset-[3px]" target="_blank" rel="noreferrer noopener">
                archive.org/details/{fax.identifier}
              </a>
            </li>
            <li id="ref-3">
              On King James&apos;s objections at the Hampton Court Conference (1604) and the decision to omit marginal
              notes from the 1611 Authorized Version. See Britannica, &ldquo;King James Version,&rdquo;{" "}
              <a href="https://www.britannica.com/topic/King-James-Version" className="text-rubric underline underline-offset-[3px]" target="_blank" rel="noreferrer noopener">
                britannica.com/topic/King-James-Version
              </a>
              .
            </li>
          </ol>
        </section>
      </DocShell>
    </>
  );
}
