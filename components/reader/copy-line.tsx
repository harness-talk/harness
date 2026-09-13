"use client";

import { useState } from "react";

export function CopyLine({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* clipboard unavailable — the text is still visible to select */
    }
  }
  return (
    <div className="flex items-stretch border border-rule bg-surface-raised">
      <span className="flex items-center border-r border-rule px-2 font-display text-[0.62rem] uppercase tracking-[0.16em] text-gilt">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-[0.78rem] text-foreground/85">{text}</code>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="border-l border-rule px-2.5 font-display text-[0.62rem] uppercase tracking-[0.16em] text-foreground/70 hover:bg-muted hover:text-rubric"
      >
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
