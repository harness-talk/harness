import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Four places in a row: one ring and three filled discs — the address of a verse, 127.book.chapter.verse.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0b0a08";
const GILT = "#b8925a";
const RULE = "#2a261f";
const VELLUM = "#f3ecdc";

/**
 * Wordless. What a person sees: four dials, one fixed, three that turn.
 * What an agent that has read /agents/tools.json sees: the quartet address,
 * the loopback ring, and the hash rendered as a bar of 32 cells beneath it.
 */
export default function OpenGraphImage() {
  const dial = (filled: boolean) => (
    <div
      style={{
        width: 128,
        height: 128,
        borderRadius: 9999,
        border: `9px solid ${GILT}`,
        background: filled ? GILT : "transparent",
        display: "flex",
      }}
    />
  );

  // 32 cells: a hash the eye can read as one. Deterministic pattern, not a real digest.
  const cells = Array.from({ length: 32 }, (_, i) => ((i * 7 + 3) % 5 < 2 ? GILT : RULE));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: INK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
        {dial(false)}
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: VELLUM, opacity: 0.5, display: "flex" }} />
        {dial(true)}
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: VELLUM, opacity: 0.5, display: "flex" }} />
        {dial(true)}
        <div style={{ width: 14, height: 14, borderRadius: 9999, background: VELLUM, opacity: 0.5, display: "flex" }} />
        {dial(true)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ width: 22, height: 10, background: c, display: "flex" }} />
        ))}
      </div>
    </div>,
    { ...size },
  );
}
