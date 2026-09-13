"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard unavailable — nothing to do */
        }
      }}
      className={`running-head border-b border-transparent py-1 hover:border-gilt hover:text-foreground ${className}`}
      aria-live="polite"
    >
      {done ? copiedLabel : label}
    </button>
  );
}
