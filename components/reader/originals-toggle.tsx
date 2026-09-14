"use client";

import { useEffect, useState } from "react";

export type ReaderLayer = "original" | "geneva" | "geneva-1560" | "geneva-notes" | "compare";

/**
 * A single switch that reveals an extra line under every verse — the original-language
 * text (`original`), the Geneva Bible reading (`geneva`), or the Geneva 1560 marginal
 * notes inline (`geneva-notes`). State is a `data-{layer}` attribute on the reader root
 * so the (server-rendered) verse rows can show/hide with CSS — no per-verse client
 * components. Each layer remembers its own setting.
 */
export function OriginalsToggle({
  label,
  sourceLabel,
  readerId,
  layer = "original",
}: {
  label: string;
  sourceLabel: string;
  readerId: string;
  layer?: ReaderLayer;
}) {
  const key = `harness-show-${layer}`;
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(window.localStorage.getItem(key) === "1");
  }, [key]);

  useEffect(() => {
    const el = document.getElementById(readerId);
    if (el) el.setAttribute(`data-${layer}`, on ? "on" : "off");
  }, [on, readerId, layer]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setOn(next);
        window.localStorage.setItem(key, next ? "1" : "0");
      }}
      aria-pressed={on}
      className="running-head flex items-center gap-2 border border-rule px-3 py-1.5 transition-colors hover:border-gilt hover:text-foreground aria-pressed:border-gilt aria-pressed:bg-gilt/10 aria-pressed:text-foreground"
      title={sourceLabel}
    >
      <span aria-hidden className={`h-1.5 w-1.5 ${on ? "bg-gilt" : "bg-foreground/30"}`} />
      {label}
    </button>
  );
}
