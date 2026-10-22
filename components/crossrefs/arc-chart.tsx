"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type BookRow = [id: string, name: string, testament: "OT" | "NT", start: number, chapters: number];
interface ArcData {
  books: BookRow[];
  verseCounts: number[];
  arcs: number[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ArcChart({ selected }: { selected?: string }) {
  const router = useRouter();
  const { data } = useSWR<ArcData>("/crossrefs/arcs.json", fetcher, { revalidateOnFocus: false });
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const pointerType = useRef<string>("mouse");

  const stats = useMemo(() => {
    if (!data) return null;
    const refs = new Array<number>(data.verseCounts.length).fill(0);
    const links = new Array<number>(data.verseCounts.length).fill(0);
    for (let i = 0; i < data.arcs.length; i += 3) {
      const a = data.arcs[i];
      const b = data.arcs[i + 1];
      const w = data.arcs[i + 2];
      refs[a] += w;
      refs[b] += w;
      links[a]++;
      links[b]++;
    }
    return { refs, links };
  }, [data]);

  const chapterBook = useMemo(() => {
    if (!data) return [] as BookRow[];
    const out: BookRow[] = [];
    for (const b of data.books) for (let c = 0; c < b[4]; c++) out.push(b);
    return out;
  }, [data]);

  const selectedIndex = useMemo(() => {
    if (!data || !selected) return null;
    const [id, ch] = selected.split(".");
    const b = data.books.find((row) => row[0] === id);
    return b && ch ? b[3] + Number(ch) - 1 : null;
  }, [data, selected]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = Math.max(220, Math.round(width * 0.52));
  const baseline = height - 36;
  const focus = hover ?? selectedIndex;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const total = data.verseCounts.length;
    const step = width / total;
    const x = (i: number) => (i + 0.5) * step;
    const gilt = hexToRgb(cssVar("--gilt") || "#b8925a");
    const rubric = hexToRgb(cssVar("--rubric") || "#c2472b");
    const fg = cssVar("--foreground") || "#e8e0cf";
    const maxSpan = total;

    ctx.globalCompositeOperation = document.documentElement.classList.contains("light") ? "source-over" : "lighter";
    const { arcs } = data;
    for (let i = 0; i < arcs.length; i += 3) {
      const a = arcs[i];
      const b = arcs[i + 1];
      const w = arcs[i + 2];
      const touches = focus !== null && (a === focus || b === focus);
      if (focus !== null && !touches) continue;
      const t = Math.min(1, (b - a) / (maxSpan * 0.6));
      const r = Math.round(gilt[0] + (rubric[0] - gilt[0]) * t);
      const g = Math.round(gilt[1] + (rubric[1] - gilt[1]) * t);
      const bl = Math.round(gilt[2] + (rubric[2] - gilt[2]) * t);
      const alpha = focus !== null ? Math.min(0.9, 0.25 + w * 0.08) : Math.min(0.35, 0.03 + w * 0.012);
      ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
      ctx.lineWidth = focus !== null ? 1 : 0.6;
      const x1 = x(a);
      const x2 = x(b);
      const radius = (x2 - x1) / 2;
      ctx.beginPath();
      ctx.ellipse(x1 + radius, baseline, radius, Math.min(radius, baseline - 8), 0, Math.PI, 0);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = fg;
    const maxV = Math.max(...data.verseCounts);
    data.verseCounts.forEach((v, i) => {
      const h = 2 + (v / maxV) * 18;
      ctx.globalAlpha = focus === i ? 1 : 0.55;
      ctx.fillRect(i * step, baseline + 2, Math.max(step - 0.2, 0.4), h);
    });
    ctx.globalAlpha = 1;
  }, [data, width, height, baseline, focus]);

  function indexAt(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas || !data) return null;
    const rect = canvas.getBoundingClientRect();
    const i = Math.floor(((clientX - rect.left) / rect.width) * data.verseCounts.length);
    return i >= 0 && i < data.verseCounts.length ? i : null;
  }

  const label = (i: number | null) => {
    if (i === null || !chapterBook[i]) return null;
    const b = chapterBook[i];
    return { id: b[0], name: b[1], chapter: i - b[3] + 1 };
  };
  const focusLabel = label(focus);
  const ntStart = data?.books.find((b) => b[2] === "NT")?.[3];
  const focusRefs = focus !== null && stats ? stats.refs[focus] : 0;
  const focusLinks = focus !== null && stats ? stats.links[focus] : 0;
  const focusPct = focus !== null && data ? ((focus + 0.5) / data.verseCounts.length) * 100 : 0;
  const openHref = focusLabel ? `/cross-references?ref=${focusLabel.id}.${focusLabel.chapter}#explore` : null;

  return (
    <figure className="flex flex-col gap-3">
      <div ref={wrapRef} className="relative w-full border border-rule bg-muted/40">
        {!data && (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
            Drawing 25,739 connections…
          </div>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Arc diagram of cross references between every chapter of the Bible, Genesis on the left to Revelation on the right."
          className={data ? "block w-full cursor-crosshair touch-pan-y select-none" : "hidden"}
          style={{ height }}
          onPointerDown={(e) => {
            pointerType.current = e.pointerType;
            if (e.pointerType !== "mouse") {
              e.currentTarget.setPointerCapture(e.pointerId);
              setHover(indexAt(e.clientX));
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType === "mouse" || e.buttons > 0 || e.pressure > 0) setHover(indexAt(e.clientX));
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setHover(null);
          }}
          onClick={(e) => {
            if (pointerType.current !== "mouse") return;
            const l = label(indexAt(e.clientX));
            if (l) router.push(`/cross-references?ref=${l.id}.${l.chapter}#explore`, { scroll: false });
          }}
        />
        {data && focusLabel && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-2 -translate-x-1/2 whitespace-nowrap border border-rule bg-background/90 px-2 py-1 font-mono text-[11px] text-foreground"
            style={{ left: `clamp(4.5rem, ${focusPct}%, calc(100% - 4.5rem))` }}
          >
            {focusLabel.name} {focusLabel.chapter} · {focusRefs.toLocaleString()}
          </div>
        )}
        {data && ntStart !== undefined && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Genesis</span>
            <span className="hidden md:inline" style={{ position: "absolute", left: `${(ntStart / data.verseCounts.length) * 100}%` }}>Matthew</span>
            <span>Revelation</span>
          </div>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span aria-live="polite" className="flex flex-col">
          <span className="font-display text-base text-foreground">
            {focusLabel ? `${focusLabel.name} ${focusLabel.chapter}` : "Every chapter, Genesis to Revelation"}
          </span>
          <span>
            {focusLabel
              ? `${focusRefs.toLocaleString()} cross references to ${focusLinks.toLocaleString()} other chapters`
              : "Slide your finger or mouse along the chart to trace each chapter's threads"}
          </span>
        </span>
        {openHref && (
          <button
            type="button"
            onClick={() => router.push(openHref, { scroll: false })}
            className="border border-rubric px-3 py-2 text-sm text-rubric transition-colors hover:bg-rubric hover:text-background"
          >
            Open {focusLabel!.name} {focusLabel!.chapter}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
