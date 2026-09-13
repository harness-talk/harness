"use client";

import { useEffect, useState } from "react";

const KEY = "harness-theme";

/** Inline script: apply stored theme before paint. Dark is the default. */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem("${KEY}");if(t==="light")document.documentElement.classList.add("light");}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(KEY, next ? "light" : "dark");
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={light}
      aria-label={light ? "Switch to ink (dark) page" : "Switch to parchment (light) page"}
      className="running-head flex items-center gap-2 border-b border-transparent py-1 hover:border-gilt"
    >
      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full border border-gilt" style={{ background: light ? "var(--gilt)" : "transparent" }} />
      {light ? "Parchment" : "Ink"}
    </button>
  );
}
