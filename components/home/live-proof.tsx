"use client";

import { useEffect, useState } from "react";

type Verse = { ref: string; display: string; text: string; source: string; sha256: string; quartet: string };
type State =
  | { phase: "idle" }
  | { phase: "fetching" }
  | { phase: "done"; verse: Verse; local: string; match: boolean; ms: number }
  | { phase: "error"; message: string };

const REFS = ["jn.3.16", "ps.23.1", "gn.1.1", "is.53.5", "re.22.21", "ro.8.28", "pr.3.5"];

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fetches a verse from the live API and recomputes its SHA-256 in the browser with WebCrypto.
 * Shows the actual comparison. No mock data, no fallback text.
 */
export function LiveProof() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [i, setI] = useState(0);

  async function run(ref: string) {
    setState({ phase: "fetching" });
    const t0 = performance.now();
    try {
      const r = await fetch(`/api/v1/verses/${ref}`);
      if (!r.ok) {
        const p = await r.json().catch(() => ({}));
        setState({ phase: "error", message: p.detail ?? `HTTP ${r.status}` });
        return;
      }
      const verse = (await r.json()) as Verse;
      const local = await sha256Hex(`${verse.source}|${verse.ref}|${verse.text}`);
      setState({ phase: "done", verse, local, match: local === verse.sha256, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
  }

  useEffect(() => {
    run(REFS[i]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <div className="border border-rule">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <code className="font-mono text-xs text-foreground/70">GET /api/v1/verses/{REFS[i]}</code>
        <button
          type="button"
          onClick={() => setI((n) => (n + 1) % REFS.length)}
          className="font-mono text-xs uppercase tracking-[0.16em] text-rubric hover:text-foreground"
        >
          Another verse
        </button>
      </div>

      <div className="px-5 py-6" aria-live="polite">
        {state.phase === "fetching" || state.phase === "idle" ? (
          <p className="font-mono text-sm text-foreground/60">Fetching…</p>
        ) : state.phase === "error" ? (
          <p className="font-mono text-sm text-rubric">Could not fetch: {state.message}</p>
        ) : (
          <div className="flex flex-col gap-5">
            <blockquote className="text-pretty text-[1.2rem] leading-[1.6]">
              {state.verse.text}
              <footer className="mt-2 font-mono text-xs not-italic text-foreground/60">
                {state.verse.display} · {state.verse.quartet} · {state.verse.source}
              </footer>
            </blockquote>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 font-mono text-[11px] leading-relaxed md:grid-cols-[8rem_minmax(0,1fr)]">
              <dt className="text-foreground/55">server sha256</dt>
              <dd className="break-all text-foreground/85">{state.verse.sha256}</dd>
              <dt className="text-foreground/55">browser sha256</dt>
              <dd className="break-all text-foreground/85">{state.local}</dd>
              <dt className="text-foreground/55">result</dt>
              <dd className={state.match ? "text-gilt" : "text-rubric"}>
                {state.match ? "match" : "MISMATCH — do not trust this text"} · {state.ms} ms
              </dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
