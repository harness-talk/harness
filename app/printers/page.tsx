import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS } from "@/components/docs/doc-shell";
import { FacsimilePlates } from "@/components/history/facsimile-plates";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Two title pages and the Bible patent — the making of the 1560 and 1611 Bibles",
  description:
    "Set the opening leaves of the 1560 Geneva Bible and the 1611 King James side by side and the text is nearly one book — what changed was the cover, the crown it was dedicated to, and who held the right to print it. The real front leaves of both, and the quieter story of the exiles who wrote the Geneva Bible and the patent-holder whose name sits on the King James.",
  alternates: { canonical: `${SITE_URL}/printers` },
  openGraph: {
    title: "Two title pages, one patent, and the people behind the Book",
    description:
      "The real front leaves of the 1560 Geneva and 1611 King James Bibles, beside a cited, neutral history of the translators and the Bible patent.",
    type: "article",
  },
};

const TOC = [
  { id: "plates", label: "The front leaves" },
  { id: "dedications", label: "For whom it was printed" },
  { id: "crown", label: "The queen they wrote to" },
  { id: "translators", label: "Not a company under one man" },
  { id: "patent", label: "The Bible patent" },
  { id: "voices", label: "Business and its critics" },
  { id: "judgment", label: "A note on judgment" },
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

export default function PrintersPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Two title pages and the Bible patent — the making of the 1560 and 1611 Bibles",
          about: "The front matter of the Geneva Bible (1560) and the King James Version (1611), and the Bible patent",
          inLanguage: "en",
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
          url: `${SITE_URL}/printers`,
          citation: [
            "Colin Clair, A History of European Printing (Academic Press, 1976)",
            "P. M. Handover, Printing in London from 1476 to Modern Times (Harvard University Press, 1960)",
          ],
        }}
      />
      <DocShell
        kicker="The making"
        title="Two title pages, one patent, and the people behind the Book"
        lede="Set the opening leaves of the 1560 Geneva Bible and the 1611 King James beside each other and the Scripture is very nearly one book. What changed was the cover, the crown it was dedicated to, and who held the right to print it. Here are the real front leaves of both — and the quieter story of the exiles who made the Geneva Bible and the patent-holder whose name sits on the King James."
        status="live"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="plates" className="doc-prose">
          <h2>The front leaves, side by side</h2>
          <p>
            The first pages of an old Bible are not Scripture — they are the cover, the printer&apos;s imprint, and the
            dedication that says for whom the book was made. That is exactly what makes them worth comparing. Behind the
            plain type of Geneva and the engraved architecture of London stands nearly the same English text; scholars
            have long noted how much of the wording the 1611 kept from the English versions before it, the Geneva chief
            among them.<Cite n={4} /> Read the two openings together and you can see the difference for what it mostly
            was: presentation, patronage, and the right to print.
          </p>
        </section>

        <FacsimilePlates />

        <section className="doc-prose">
          <p className="not-prose mt-8 rounded-sm border border-rule bg-foreground/[0.02] p-4 text-[0.8rem] leading-relaxed text-foreground/60">
            One honest note about the scans: the Internet Archive&apos;s Geneva copy carries a modern page, added by the
            digitiser in 2004, that summarises the book in present-day English. It is helpful, but it is not 1560 matter,
            so it is left out of the plates above — only the original leaves are shown here.
          </p>
        </section>

        <section id="dedications" className="doc-prose">
          <h2>For whom it was printed</h2>
          <p>
            Both books open by naming a sovereign. The Geneva Bible is dedicated{" "}
            <em>&ldquo;TO THE MOSTE VERTVOVS AND NOBLE QVENE ELISABET, Quene of England, France, and Ireland, &amp;c.&rdquo;</em>{" "}
            &mdash; and the dedicators sign themselves plainly as <em>&ldquo;Your humble subiects of the English Churche at
            Geneua.&rdquo;</em> Fifty-one years later the King James opens{" "}
            <em>&ldquo;TO THE MOST HIGH AND MIGHTIE Prince, IAMES&hellip; King of Great Britaine, France and Ireland,
            Defender of the Faith, &amp;c.&rdquo;</em> and, a few lines in, looks back to{" "}
            <em>&ldquo;that bright Occidentall Starre, Queene Elizabeth of most happy memory.&rdquo;</em>
          </p>
          <p>
            The shared phrase <em>&ldquo;France, &amp;c.&rdquo;</em> is not a claim to have ruled France in any real sense;
            it is the formal style the English crown kept from the Hundred Years&apos; War, carried in the royal title until
            1801. Worth naming plainly, so the wording is not over-read. What the two dedications do share in substance is a
            single queen: Elizabeth is the living dedicatee of the one and the honoured memory of the other &mdash; though,
            as below, she commissioned neither translation herself.
          </p>
        </section>

        <section id="crown" className="doc-prose">
          <h2>The queen they wrote to</h2>
          <p>
            By the time the Geneva Bible was finished, England had run through three reigns in a decade. The boy king
            Edward VI died in 1553; the Catholic Mary I reigned from 1553 to 1558 &mdash; the very years the translators
            spent in exile abroad; and in 1558 the Protestant Elizabeth I came to the throne, to whom the completed Bible
            was dedicated in 1560.<Cite n={6} />
          </p>
          <p>
            It was an age unusually full of reigning and regent women across Europe &mdash; Mary I and then Elizabeth I in
            England, Mary of Guise as regent in Scotland until 1560, Catherine de&apos; Medici as regent in France from
            1560, and Mary, Queen of Scots. How much any of them shaped this particular Bible is not something the record
            settles. The exiles addressed Elizabeth as their sovereign and their hope, not as a patron who had ordered or
            paid for the work; the labour was already largely done before she reigned. Where the sources are silent, it is
            better to leave the question open than to fill it with supposition &mdash; a caution the rest of this page tries
            to keep.
          </p>
        </section>

        <section id="translators" className="doc-prose">
          <h2>Not a company under one man</h2>
          <p>
            The 1560 Bible was not the output of a firm working under a single proprietor. It was made by a circle of
            English exiles who had settled in Geneva during Mary&apos;s reign &mdash; <strong>William Whittingham</strong>,
            and with him men such as <strong>Anthony Gilby</strong> and <strong>Thomas Sampson</strong> &mdash; who had the
            leisure, the presses, and the company of the best Continental scholarship of the day around Calvin and
            Beza.<Cite n={6} /> They worked from the Hebrew of the Old Testament and the Greek of the New; the title page
            says as much, <em>&ldquo;translated according to the Ebrue and Greke,&rdquo;</em> and the marginal notes draw
            openly on that language work, Hebrew included.
          </p>
          <p>
            So &ldquo;the authors&rdquo; of the Geneva Bible were a company of Reformed scholars &mdash; Calvinists, yes,
            but a collaboration of many hands and several disciplines, not employees carrying out one man&apos;s
            commission. That distinction matters, because a generation later the story of this book passes to a very
            different kind of figure: not a translator at all, but the man who owned the right to print.
          </p>
        </section>

        <section id="patent" className="doc-prose">
          <h2>The Bible patent, and the name on the 1611 imprint</h2>
          <p>
            The name at the foot of the 1611 title page is <strong>Robert Barker</strong>, &ldquo;Printer to the Kings most
            Excellent Maiestie.&rdquo; The patent he printed under had been built by his father,{" "}
            <strong>Christopher Barker</strong> &mdash; a wealthy member of the Drapers&apos; Company and, in one
            historian&apos;s words, &ldquo;a shrewd business man who managed to acquire the most lucrative of all patents
            &hellip; namely the Bible patent.&rdquo;<Cite n={1} /> He became a publisher around 1569, taking as his device
            the tiger&apos;s head, the badge of the Walsingham family to whom he was closely connected.<Cite n={1} /> A
            genealogical account has him rising from a notable family to the office of Queen&apos;s Printer by the middle of
            the 1570s.<Cite n={3} />
          </p>
          <p>
            He had already secured a privilege for printing the Geneva Bible, and &mdash; the detail that gives this page
            its shape &mdash; for roughly twenty-five years, between 1576 and 1600, Barker and his assigns and deputies
            brought out more than fifty editions of it.<Cite n={1} /> Then, by a patent of 1577, the crown formally gathered
            into his hands the office of royal printer of &ldquo;all statutes, books, bills, Acts of Parliament,
            proclamations, injunctions, Bibles, and New Testaments &hellip; and all service books to be used in
            churches.&rdquo;<Cite n={1} /> It was not until Barker&apos;s patent, one study notes, that all these properties
            were first drawn together into a single exclusive right.<Cite n={2} />
          </p>
          <p>
            Two things are worth holding together here. First, the patent governed <em>printing</em>, not authorship: it was
            a commercial and legal right granted more than fifteen years after the exiles had done the translating, and it
            says nothing about the original intent of the men who wrote the book. Second, it is doubtful Christopher Barker
            was ever a working printer himself; like others who held such grants, he &ldquo;held their patents by purchase
            and were employers of labour to exploit that patent.&rdquo;<Cite n={2} /> When he died in 1599, the patent
            passed to his son Robert &mdash; whose press, a decade on, produced the King James Version whose title page
            opens this section.
          </p>
        </section>

        <section id="voices" className="doc-prose">
          <h2>Business, and its critics</h2>
          <p>
            The contemporaries did not speak with one voice about all this, and it is fairer to let both be heard than to
            settle the man. On one side is the plain language of trade: Barker himself called a small printing right{" "}
            <em>&ldquo;a pretty commodity to an honest man&apos;s living&rdquo;</em> in a report of 1582.<Cite n={2} /> On the
            other is unease at the concentration of it. In August 1577 Barker was among the stationers who signed a petition
            <em> against</em> privileges &mdash; and it did not stop him obtaining one of the greatest.<Cite n={1} /> A later
            historian sums up the effect without heat: the Queen&apos;s Printer held the Bible, the Book of Common Prayer,
            the statutes and proclamations, so that &ldquo;nearly all the books likely to be in everyday use throughout the
            kingdom were the monopolies of a few men.&rdquo;<Cite n={2} />
          </p>
          <p>
            Rivalry and complaint ran alongside genuine service; men wanted to outpace the patent-holder, and some thought
            the whole system of privileges wrong. Through all of it &mdash; the business, the monopoly, the competition
            &mdash; the Word itself went on being printed and read, in more editions and more hands than any earlier
            century had seen.
          </p>
        </section>

        <section id="judgment" className="doc-prose">
          <h2>A note on judgment</h2>
          <p>
            It is tempting, four centuries on, to connect the dots backward and read a single motive into it all &mdash; to
            make the patent-holder either a villain or a servant of providence. The record does not really allow either
            verdict. It shows commerce, privilege, rivalry, and the spread of Scripture happening at once, in the same men,
            and it does not lay bare their hearts. This history has not been examined nearly enough, and where it is thin we
            would rather say so than guess.
          </p>
          <p className="not-prose rounded-sm border border-rule bg-foreground/[0.02] p-4 text-[0.9rem] leading-relaxed text-foreground/80">
            The posture this site tries to keep is the one the Book itself asks for: to <em>&ldquo;judge not according to
            the appearance, but judge righteous judgment&rdquo;</em> (John 7:24). Outward appearances are the easiest thing
            to read and the least reliable. So here we set down what the sources actually record, mark supposition as
            supposition, and leave the weighing of motives where it belongs &mdash; not with us.
          </p>
        </section>

        <section id="references" className="doc-prose">
          <h2>References</h2>
          <ol className="text-[0.9rem] leading-relaxed text-foreground/75">
            <li id="ref-1">
              Colin Clair, <em>A History of European Printing</em> (New York: Academic Press, 1976), pp. 268&ndash;278
              &mdash; on Christopher Barker, the tiger&apos;s-head device, the Geneva Bible privilege, the fifty-plus
              editions of 1576&ndash;1600, and the 1577 patent.
            </li>
            <li id="ref-2">
              P. M. Handover, <em>Printing in London from 1476 to Modern Times</em> (Cambridge, MA: Harvard University
              Press, 1960), pp. 34&ndash;97 &mdash; on the Queen&apos;s Printer&apos;s properties, the monopoly of &ldquo;a
              few men,&rdquo; Barker&apos;s 1582 report, and patent-holders as employers of labour rather than working
              printers.
            </li>
            <li id="ref-3">
              &ldquo;Christopher Barker,&rdquo; genealogical account, freepages.rootsweb.com.{" "}
              <a
                href="https://freepages.rootsweb.com/~genealogyquest/genealogy/barker_christopher.htm"
                className="text-rubric underline underline-offset-[3px]"
                target="_blank"
                rel="noreferrer noopener"
              >
                rootsweb: barker_christopher
              </a>{" "}
              &mdash; a secondary, genealogical source; dates given here are treated as approximate.
            </li>
            <li id="ref-4">
              <em>The Bible and Holy Scriptures Conteyned in the Olde and Newe Testament</em>, Geneva: Rowland Hall, 1560 —
              first-edition facsimile, Internet Archive (public domain, CC0).{" "}
              <a
                href="https://archive.org/details/1560-the-geneva-bible"
                className="text-rubric underline underline-offset-[3px]"
                target="_blank"
                rel="noreferrer noopener"
              >
                archive.org/details/1560-the-geneva-bible
              </a>
            </li>
            <li id="ref-5">
              <em>The Holy Bible</em>, London: Robert Barker, 1611 — first-edition facsimile, Internet Archive (public
              domain in the United States).{" "}
              <a
                href="https://archive.org/details/the-holy-bible-1611"
                className="text-rubric underline underline-offset-[3px]"
                target="_blank"
                rel="noreferrer noopener"
              >
                archive.org/details/the-holy-bible-1611
              </a>
            </li>
            <li id="ref-6">
              Encyclop&aelig;dia Britannica, &ldquo;Geneva Bible&rdquo; and &ldquo;King James Version,&rdquo; for the
              exiles, the dateline of the reigns, and the dedication to Elizabeth.
            </li>
          </ol>
        </section>

        <section className="doc-prose">
          <p className="text-[0.9rem]">
            See also{" "}
            <Link href="/geneva-notes" className="text-rubric underline underline-offset-[3px]">
              the Geneva notes and who wrote them
            </Link>
            , and{" "}
            <Link href="/foundation/gn/1" className="text-rubric underline underline-offset-[3px]">
              the reader itself
            </Link>
            , where the 1560 pages sit beside the text.
          </p>
        </section>
      </DocShell>
    </>
  );
}
