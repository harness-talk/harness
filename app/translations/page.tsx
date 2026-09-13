import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { SOURCES, SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Sources & translations",
  description:
    "Every text source harness.talk serves or has declared: the King James Bible 1611 (original spelling), the Geneva Bible 1599 text, the Geneva marginal notes, Hebrew and Greek originals, and the transliteration framework for multi-language agents. Status stated plainly for each.",
  alternates: { canonical: `${SITE_URL}/translations` },
};

const TOC = [
  { id: "registry", label: "Source registry" },
  { id: "lineage", label: "Textus Receptus lineage" },
  { id: "transliteration", label: "Transliteration framework" },
  { id: "mapping", label: "Semantic mapping" },
  { id: "compare", label: "Comparison" },
];

const STATUS_MAP: Record<string, "live" | "spec" | "partial"> = { ingested: "live", partial: "partial", declared: "spec" };

export default function TranslationsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "harness.talk scripture sources",
          url: `${SITE_URL}/translations`,
          distribution: SOURCES.filter((s) => s.status === "ingested").map((s) => ({
            "@type": "DataDownload",
            encodingFormat: "application/x-ndjson+gzip",
            contentUrl: `${SITE_URL}/exports/kjv.jsonl.gz`,
            name: s.label,
          })),
        }}
      />
      <DocShell
        kicker="Sources & translations"
        title="What is served, what is declared"
        lede="A source is either ingested with verification gates, declared with a spec for how it will be ingested, or planned. Nothing is paraphrased into a gap. The registry below is the same data /api/v1/sources returns."
        status="partial"
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="registry" className="doc-prose">
          <h2>Source registry</h2>
          <ul className="not-prose flex flex-col">
            {SOURCES.map((s) => (
              <li key={s.id} id={s.id} className="grid grid-cols-1 gap-3 border-t border-rule py-5 md:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="font-display text-xl text-foreground">{s.label}</h3>
                    <code className="font-mono text-xs text-foreground/60">{s.id}</code>
                  </div>
                  <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono text-xs text-foreground/70">
                    <dt>kind</dt>
                    <dd>{s.kind}</dd>
                    <dt>language</dt>
                    <dd>{s.language}</dd>
                    {s.edition && (
                      <>
                        <dt>edition</dt>
                        <dd>{s.edition}</dd>
                      </>
                    )}
                    {s.publisher && (
                      <>
                        <dt>publisher</dt>
                        <dd>
                          {s.publisher}
                          {s.year ? ` · ${s.year}` : ""}
                        </dd>
                      </>
                    )}
                    <dt>licence</dt>
                    <dd>{s.license}</dd>
                    {s.url && (
                      <>
                        <dt>url</dt>
                        <dd>
                          <a href={s.url} className="text-rubric underline underline-offset-[3px]" rel="noreferrer">
                            {s.url.replace(/^https?:\/\//, "")}
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                  {s.notes.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-1 text-[0.9rem] leading-relaxed text-foreground/80">
                      {s.notes.map((n) => (
                        <li key={n} className="border-l border-gilt/50 pl-3">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <StatusBadge status={STATUS_MAP[s.status]}>
                    {s.status === "ingested" ? "Ingested · verified" : s.status === "partial" ? "Partially ingested" : "Declared · not ingested"}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="lineage" className="doc-prose">
          <h2>Textus Receptus lineage</h2>
          <p>
            The 1611 translators worked the New Testament from the printed Greek of Erasmus (1516–1535), Stephanus
            (1546–1551) and Beza (1565–1604) — the line later called the Textus Receptus. The Old Testament came from the
            Hebrew Masoretic text of the Bomberg rabbinic Bibles. harness.talk names this lineage because it is the
            historical basis of the text we serve; it does not claim to serve the Greek itself until a verified TR
            edition is ingested (registry entry <Link href="#textus-receptus">textus-receptus</Link>).
          </p>
        </section>

        <section id="transliteration" className="doc-prose">
          <h2>Transliteration framework</h2>
          <p>
            For multi-language agents the useful unit is not a translation but a stable <em>address</em> plus an exact
            source text. The framework is therefore: (1) every verse addressed by quartet and canonical ref, (2) each
            source text stored verbatim with its own id, (3) alignment tables between sources keyed by ref, and (4)
            transliteration performed by the agent, not by us, with the source id carried in the output. Alignment tables
            ship with the originals ingestion.
          </p>
          <StatusBadge status="spec" />
        </section>

        <section id="mapping" className="doc-prose">
          <h2>Semantic mapping</h2>
          <p>
            Cross-source mapping (KJV ↔ Geneva ↔ Hebrew/Greek) is keyed by ref and, where morphology is available, by
            word index. It is data, not inference: an agent reading <code>/api/v1/words/jn.3.16</code> will get the
            aligned Greek tokens with lemma and parsing, never a machine gloss presented as text.
          </p>
          <StatusBadge status="spec" />
        </section>

        <section id="compare" className="doc-prose">
          <h2>Comparison</h2>
          <p>
            Side-by-side comparison arrives with the second ingested text source. The reader is already structured for
            it — the marginalia column takes Geneva notes now and a parallel text toggle later. Until then, the honest
            state is one text, exactly.
          </p>
        </section>
      </DocShell>
    </>
  );
}
