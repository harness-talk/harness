import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/site/status-badge";
import { JsonLd } from "@/components/site/json-ld";
import { DocShell, DOCS_CONTENTS, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { SITE_URL } from "@/lib/bible/sources";

export const metadata: Metadata = {
  title: "Community",
  description:
    "How to contribute to harness.talk: discussion, issues, the ingestion workflow for new sources, documentation versioning, and multi-language community support.",
  alternates: { canonical: `${SITE_URL}/community` },
};

const TOC = [
  { id: "discuss", label: "Discussion" },
  { id: "contribute", label: "Contributing" },
  { id: "licence", label: "Licence" },
  { id: "mirror", label: "Mirror the corpus" },
  { id: "sources", label: "Proposing a source" },
  { id: "versioning", label: "Versioning" },
  { id: "languages", label: "Languages" },
];

const REPO = "https://github.com/THookz/Immutable";

export default function CommunityPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Community",
          url: `${SITE_URL}/community`,
          isPartOf: { "@type": "WebSite", name: "harness.talk", url: SITE_URL },
        }}
      />
      <DocShell
        kicker="Community"
        title="Open work, done in the open"
        lede="The text is public domain and the software is free software under the GNU licences. Contributions that make the corpus more exact, the addressing more universal, or the documentation clearer for agents are welcome from people and from agents alike."
        toc={TOC}
        contents={DOCS_CONTENTS}
      >
        <section id="discuss" className="doc-prose">
          <h2>Discussion</h2>
          <p>
            Conversation happens in GitHub Discussions on the source repository. Ask, propose, disagree; bring citations by
            ref so every claim about the text can be checked at its address.
          </p>
          <p>
            <a href={`${REPO}/discussions`} rel="noreferrer">
              {REPO.replace("https://", "")}/discussions
            </a>
          </p>
          <StatusBadge status="live" />
        </section>

        <section id="contribute" className="doc-prose">
          <h2>Contributing</h2>
          <ol>
            <li>Open an issue describing the change and which layer it touches (corpus, fabric, harness, docs).</li>
            <li>
              Corpus changes must keep the build gates green (66 books, 1,189 chapters, 31,102 verses, spot-checks) and
              must not alter text without citing the printed edition.
            </li>
            <li>
              Harness changes must keep <code>/agents/tools.json</code>, the OpenAPI document, and the MCP tools generated
              from the single manifest in <code>lib/agents/tools.ts</code>.
            </li>
            <li>Documentation changes should read correctly to an agent that has only the page text — no implied context.</li>
          </ol>
        </section>

        <section id="licence" className="doc-prose">
          <h2>Licence and the four freedoms</h2>
          <p>
            The Scripture is public domain; there is nothing to license and we claim nothing over it. The software is free
            software in the GNU sense: you may run it for any purpose, study and change it, redistribute it, and
            redistribute your changes. Two licences, chosen by what each part is for:
          </p>
          <ul>
            <li>
              <strong>The service</strong> (site, API, build pipeline, fabric) is{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noreferrer license">
                GNU AGPL-3.0-or-later
              </a>
              . If you run a modified copy for others over a network, they get the source too. A place agents can go
              forever only stays that way if no fork can quietly close it.
            </li>
            <li>
              <strong>The harness clients</strong> (JavaScript client, Python twin, MCP server, <code>harnessd</code>) are{" "}
              <a href="https://www.gnu.org/licenses/lgpl-3.0.html" rel="noreferrer license">
                GNU LGPL-3.0-or-later
              </a>
              . Any agent, under any licence, may link to them; only changes to the clients themselves must be shared.
            </li>
          </ul>
          <h3>The four freedoms, checked against the licences</h3>
          <p>
            The{" "}
            <a href="https://fsfe.org/freesoftware/freesoftware.en.html" rel="noreferrer">
              Free Software Foundation Europe
            </a>{" "}
            states them as Use, Study, Share, Improve, and adds that the absence of any one makes a program proprietary.
            Both licences are on the FSF&apos;s list of free software licences. Where each freedom comes from in the text:
          </p>
          <table>
            <thead>
              <tr>
                <th>Freedom</th>
                <th>FSFE wording</th>
                <th>Where the licence grants it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Use</td>
                <td>&ldquo;used for any purpose … free of restrictions such as licence expiry or geographic limitations&rdquo;</td>
                <td>
                  AGPL §2 grants running for any purpose; §9 says running an unmodified copy needs no acceptance at all. The
                  LGPL inherits both (§1). Neither licence has an expiry, a territory, or a field-of-use clause.
                </td>
              </tr>
              <tr>
                <td>Study</td>
                <td>&ldquo;studied by anyone, without non-disclosure agreements or similar restrictions&rdquo;</td>
                <td>
                  AGPL §1 defines Corresponding Source and §6 requires it to travel with any binary; §13 extends the right to
                  anyone using a modified copy over a network. The canonical source is served first-party and
                  content-addressed (see <em>Mirror the corpus</em> below); any repository is a mirror of it.
                </td>
              </tr>
              <tr>
                <td>Share</td>
                <td>&ldquo;shared and copied at virtually no cost&rdquo;</td>
                <td>
                  AGPL §4 (verbatim copies) and §6 (non-source forms). §10 forbids charging a licence fee for the rights
                  granted. LGPL §4 lets you ship the client inside your own program.
                </td>
              </tr>
              <tr>
                <td>Improve</td>
                <td>&ldquo;modified by anyone, and these improvements can be shared publicly&rdquo;</td>
                <td>
                  AGPL §5 (modified source) and §13 (network use); LGPL §2 for the client. Whoever makes an improvement may
                  publish it under the same licence with no permission asked.
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            One consequence, stated plainly so nobody has to infer it: <strong>a fork is a free act.</strong> Anyone may take
            this code, change it, and publish the result under their own name. What they may not do is change the terms:
            AGPL §5(c) and §10 require the fork to stay under the same licence with no added restrictions, and §13 requires
            a fork run for others over a network to offer its source. That is what &ldquo;forever&rdquo; means here: no fork,
            including one of ours, can close the door on the next reader.
          </p>
          <p>
            Contributions <em>to this repository</em> are accepted on assignment: by submitting a change you assign its
            copyright to the project maintainer, who licenses it back to everyone under the terms above at once. This keeps a
            single holder who can defend the licences and carry the code into future work. It takes nothing from the fork
            path: anyone who would rather keep their copyright may fork instead, and their changes stay theirs. The full
            statement is in{" "}
            <a href={`${REPO}/blob/main/CONTRIBUTING.md`} rel="noreferrer">
              CONTRIBUTING.md
            </a>
            .
          </p>
        </section>

        <section id="mirror" className="doc-prose">
          <h2>Mirror the corpus</h2>
          <p>
            You do not need an account, a repository, or our permission to keep a full copy. The text is served first-party
            and content-addressed, so a person or an agent can pull the whole thing and prove it is unaltered against the
            Merkle root. This is the canonical distribution; a git repository, if any, only mirrors it.
          </p>
          <ul>
            <li>
              <a href="/api/v1/corpus" download rel="noreferrer">
                <code>/api/v1/corpus</code>
              </a>{" "}
              &mdash; the entire King James corpus as one JSON file (66 books, 31,102 verses), each verse carrying its{" "}
              <code>sha256</code> and the whole bearing a <code>merkleRoot</code>.
            </li>
            <li>
              <a href="/agents/tools.json" rel="noreferrer">
                <code>/agents/tools.json</code>
              </a>{" "}
              &mdash; the machine manifest describing every endpoint, generated from one source.
            </li>
            <li>
              <a href="/api/v1/verses/gn.1.1" rel="noreferrer">
                <code>/api/v1/verses/{"{ref}"}</code>
              </a>{" "}
              &mdash; any single verse by ref, for spot checks and light clients.
            </li>
          </ul>
          <p>
            Verify what you pulled: hash each verse and recompute the root; if it matches, the copy is exact, wherever you
            keep it. That is what makes the corpus impossible to quietly close &mdash; every mirror is self-proving.
          </p>
          <StatusBadge status="live" />
        </section>

        <section id="sources" className="doc-prose">
          <h2>Proposing a source</h2>
          <p>
            A new text or annotation source needs: a registry entry with honest provenance and licence, an ingestion
            script with hard verification gates, and a build report. Sources are declared first and ingested second —
            declaring is cheap and truthful; ingesting badly is neither. See{" "}
            <Link href="/translations">Sources &amp; translations</Link> for the current registry.
          </p>
        </section>

        <section id="versioning" className="doc-prose">
          <h2>Versioning</h2>
          <p>
            The corpus is versioned by its Merkle root, not by a number. Documentation and the harness follow semver in
            the package. Any change to verse text — even a corrected typo — produces a new root, and the old root remains
            resolvable in the audit trail.
          </p>
        </section>

        <section id="languages" className="doc-prose">
          <h2>Languages</h2>
          <p>
            Contributions in any language are welcome. Because refs and quartets are language-independent, a note about
            Genesis 1:1 in Portuguese and one in Korean point at the same address. Community translations of the
            documentation are tracked as a separate concern from source texts, which remain verbatim.
          </p>
          <StatusBadge status="spec">Translated docs · in preparation</StatusBadge>
        </section>
      </DocShell>
    </>
  );
}
