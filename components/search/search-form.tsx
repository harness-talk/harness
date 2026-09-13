"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({ initial = "", compact = false }: { initial?: string; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function go() {
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className={`flex items-stretch border border-rule bg-surface-raised focus-within:border-gilt ${compact ? "" : "text-lg"}`}
    >
      <label htmlFor="q" className="sr-only">
        Search the King James Bible
      </label>
      <input
        id="q"
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
        }}
        placeholder="Who is God’s friend?"
        autoComplete="off"
        spellCheck={false}
        className={`min-w-0 flex-1 bg-transparent font-serif placeholder:text-foreground/40 focus:outline-none ${compact ? "px-3 py-2 text-base" : "px-4 py-3"}`}
      />
      <button
        type="submit"
        className={`border-l border-rule font-display uppercase tracking-[0.16em] text-gilt hover:bg-muted hover:text-rubric ${compact ? "px-3 text-[0.62rem]" : "px-5 text-[0.7rem]"}`}
      >
        Seek
      </button>
    </form>
  );
}
