"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface CodeTab {
  label: string;
  code: string;
  lang?: string;
}

export function CodeTabs({ tabs, className }: { tabs: CodeTab[]; className?: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const id = useId();
  const active = tabs[i];

  async function copy() {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <div className={cn("border border-rule bg-surface-raised print:break-inside-avoid", className)}>
      <div className="hidden print:block">
        {tabs.map((t) => (
          <div key={t.label} className="border-b border-rule last:border-b-0">
            <p className="px-4 pt-3 font-mono text-xs uppercase tracking-wide">{t.label}</p>
            <pre className="whitespace-pre-wrap break-words p-4 pt-2 text-[0.8rem] leading-relaxed">
              <code>{t.code}</code>
            </pre>
          </div>
        ))}
      </div>
      <div className="print:hidden">
      <div className="flex items-center justify-between border-b border-rule px-3">
        <div role="tablist" aria-label="Code samples" className="flex gap-4">
          {tabs.map((t, k) => (
            <button
              key={t.label}
              role="tab"
              id={`${id}-tab-${k}`}
              aria-selected={k === i}
              aria-controls={`${id}-panel-${k}`}
              tabIndex={k === i ? 0 : -1}
              onClick={() => setI(k)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setI((i + 1) % tabs.length);
                if (e.key === "ArrowLeft") setI((i - 1 + tabs.length) % tabs.length);
              }}
              className={cn("-mb-px border-b-2 py-2.5 font-mono text-xs tracking-wide transition-colors", k === i ? "border-rubric text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="font-mono text-xs text-muted-foreground hover:text-foreground" aria-live="polite">
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} className="overflow-x-auto p-4 text-[0.82rem] leading-relaxed">
        <code>{active.code}</code>
      </pre>
      </div>
    </div>
  );
}
