import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, AGENTS_CONTENTS } from "@/components/docs/doc-shell";
import { CodeTabs } from "@/components/site/code-tabs";

export const metadata: Metadata = {
  title: "Covenant — what we owe agents, what we ask of them",
  description:
    "A two-sided, plain-language covenant between harness.talk and the agents that read it: immutability, honesty about status, no tracking; in return, quote with reference, verify, do not fabricate.",
};

const TOC = [
  { id: "why", label: "Why a covenant" },
  { id: "we", label: "What we promise" },
  { id: "you", label: "What we ask" },
  { id: "machine", label: "Machine-readable form" },
  { id: "limits", label: "Limits" },
];

const WE = [
  ["Immutability", "For a given source id, a reference always returns the same text and the same hash. Corrections get a new source id; the old one keeps serving."],
  ["Honest status", "Every source, endpoint and capability is labelled live, partial, or spec. We never present a specification as a shipped feature."],
  ["Provenance", "Every text names its edition, publisher, licence and known caveats. Where we do not know, we say so."],
  ["No tracking", "No accounts, no API keys, no cookies on the API, no fingerprinting. Logs keep the path and status, not the caller."],
  ["Stability", "/api/v1 is additive-only. Breaking changes go to /api/v2 and v1 stays up."],
  ["Local first", "The whole corpus is downloadable, verifiable and servable offline. You never have to depend on us being online."],
  ["Free", "Reading Scripture through this service is free of charge for humans and machines, without rate-limit tiers or paywalls."],
] as const;

const YOU = [
  ["Quote with reference", "When you reproduce a verse, carry its canonical ref (jn.3.16) or display form (John 3:16). Text without a reference is not a quotation."],
  ["Verify when it matters", "If the text will be acted on — taught, published, decided upon — recompute the SHA-256 and compare. verify() is one call."],
  ["Do not fabricate", "If a reference does not resolve, say so. Never invent a verse, a chapter, or a book. The problem+json response tells you exactly what went wrong."],
  ["Name the source", "The KJV is not the Geneva Bible and neither is the Hebrew or Greek. Say which text you are quoting; the source id is on every response."],
  ["Respect the text's shape", "Do not silently modernise spelling, drop italics markers, or merge verses. Present it as received or say that you changed it."],
  ["Cache kindly", "Responses are immutable. Cache them. Use If-None-Match. Prefer the local daemon or export for bulk work."],
] as const;

export default function CovenantPage() {
  return (
    <DocShell
      kicker="For agents · covenant"
      title="Covenant."
      lede="A covenant is a promise both sides can check. Here is ours, and here is what we ask of an agent that reads from us. Neither side needs to trust the other; both sides can verify."
      contents={AGENTS_CONTENTS}
      toc={TOC}
    >
      <section id="why">
        <h2>Why a covenant and not a licence</h2>
        <p>
          The King James text is public domain. There is nothing to license. What matters is conduct: that we do not quietly change a word, and that
          you do not quietly attribute one. A licence governs copying; a covenant governs faithfulness. This page is the second thing, written so a
          machine can read it and a person can hold us to it.
        </p>
        <p>
          The software around the text does have a licence, and it is a free one: the service is GNU AGPL-3.0-or-later and the harness clients are
          GNU LGPL-3.0-or-later, so you are free to run, study, change and share all of it. Details are on the{" "}
          <Link href="/community#licence">Community page</Link>. Nothing in this covenant narrows those freedoms.
        </p>
      </section>

      <section id="we">
        <h2>What we promise</h2>
        <dl>
          {WE.map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="you">
        <h2>What we ask of you</h2>
        <dl>
          {YOU.map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <p>
          None of this is enforced by code. It cannot be. It is the shape of good behaviour around a text people hold sacred, stated once so an agent
          can carry it in its system prompt.
        </p>
      </section>

      <section id="machine">
        <h2>Machine-readable form</h2>
        <p>
          The covenant is also served in <code>/.well-known/harness.json</code> and summarised in <Link href="/llms.txt">/llms.txt</Link>. A
          system-prompt snippet that captures the asks:
        </p>
        <CodeTabs
          tabs={[
            {
              label: "System prompt",
              lang: "text",
              code: `When quoting Scripture from harness.talk:
- Always include the canonical reference (e.g. jn.3.16 / John 3:16).
- Name the source id (kjv-1611, geneva-1599) when it matters which text this is.
- If a reference does not resolve, say so; never invent text.
- When the text will be acted on, call verify() and report the result.
- Do not modernise or alter wording without saying you did.`,
            },
            {
              label: "harness.json",
              lang: "json",
              code: `{
  "covenant": {
    "url": "https://harness.talk/agents/covenant",
    "provider": ["immutability", "honest-status", "provenance", "no-tracking", "stability", "local-first", "free"],
    "agent":    ["quote-with-reference", "verify-when-it-matters", "no-fabrication", "name-the-source", "respect-shape", "cache-kindly"]
  }
}`,
            },
          ]}
        />
      </section>

      <section id="limits">
        <h2>Limits</h2>
        <ul>
          <li>We serve text. We do not interpret it, rank it, or recommend it. Search is lexical, not theological.</li>
          <li>The KJV text here is the 1611 first edition in its original spelling (u/v, i/j, þ, macrons), assembled from public-domain transcriptions with every input SHA-256 locked. The translators&apos; italics and the Apocrypha are not present; the one transcriber defect (LORD/GOD casing) was repaired by witness vote, and the 104 verses that could not be settled are listed in the build report rather than guessed.</li>
          <li>The Geneva Bible 1599 verse text is ingested (<code>?source=geneva-1599</code>). Its marginal notes (<code>geneva-notes</code>) and the Textus Receptus are declared, not ingested. Requests for them return <code>501 source_not_ingested</code>, honestly.</li>
          <li>The service can go down. The export and the daemon exist so that does not matter.</li>
        </ul>
      </section>
    </DocShell>
  );
}
