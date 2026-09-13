import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Share-card renderer for verse and chapter links. Ink background, vellum text, gilt rule,
 * rubric reference — the same palette and faces as the site so a pasted link reads as Scripture.
 * Fonts are shipped in lib/og/fonts (Google Fonts TTFs; OFL) because next/og cannot use next/font.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#0b0a08";
const VELLUM = "#ece3cf";
const GILT = "#b8925a";
const RUBRIC = "#c2472b";
const RULE = "#2a261f";

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 500; style: "normal" | "italic" }[]> | null = null;
function fonts() {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "lib", "og", "fonts");
    const load = async (file: string) => {
      const b = await readFile(join(dir, file));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    };
    fontsPromise = Promise.all([
      load("fraunces-500.ttf").then((data) => ({ name: "Fraunces", data, weight: 500 as const, style: "normal" as const })),
      load("garamond-400.ttf").then((data) => ({ name: "EB Garamond", data, weight: 400 as const, style: "normal" as const })),
      load("garamond-italic.ttf").then((data) => ({ name: "EB Garamond", data, weight: 400 as const, style: "italic" as const })),
      load("jetbrains-400.ttf").then((data) => ({ name: "JetBrains Mono", data, weight: 400 as const, style: "normal" as const })),
    ]);
  }
  return fontsPromise;
}

/** Pick a body size that lets the whole passage fit; long passages are clipped with an ellipsis. */
function fit(text: string): { size: number; text: string } {
  const n = text.length;
  if (n <= 90) return { size: 60, text };
  if (n <= 160) return { size: 50, text };
  if (n <= 260) return { size: 42, text };
  if (n <= 380) return { size: 36, text };
  if (n <= 520) return { size: 31, text };
  return { size: 31, text: text.slice(0, 500).replace(/\s+\S*$/, "") + " …" };
}

export async function verseCard(opts: { display: string; text: string; quartet: string; sha256?: string; footer?: string }) {
  const { size, text } = fit(opts.text);
  const f = await fonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          color: VELLUM,
          padding: "64px 72px 56px",
          fontFamily: "EB Garamond",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 14, height: 14, background: GILT, transform: "rotate(45deg)" }} />
            <div style={{ fontFamily: "Fraunces", fontSize: 26, letterSpacing: 0.5, color: VELLUM }}>harness.talk</div>
          </div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, color: GILT, letterSpacing: 2 }}>KING JAMES VERSION</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, justifyContent: "center", padding: "24px 0" }}>
          <div
            style={{
              fontStyle: "italic",
              fontSize: size,
              lineHeight: 1.32,
              color: VELLUM,
              display: "block",
              textWrap: "balance",
            }}
          >
            {text}
          </div>
          <div style={{ fontFamily: "Fraunces", fontSize: 34, color: RUBRIC }}>{opts.display}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ height: 1, background: RULE, width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 18, color: "#8f866f" }}>
            <div style={{ display: "flex" }}>{opts.footer ?? `${opts.quartet}:1611`}</div>
            {opts.sha256 ? <div style={{ display: "flex" }}>{`sha256 ${opts.sha256.slice(0, 24)}…`}</div> : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: f },
  );
}
