#!/usr/bin/env node
/**
 * Build the documentation search index: data/docs-index.json.
 *
 * This is a SEPARATE layer from the Scripture index. It holds OUR words — the doc
 * pages, the tool manifest (which also generates openapi.json and llms.txt), and the
 * corpus build reports. It never mixes with the verse text. Sections are extracted
 * from page source deterministically, so the index needs no running server.
 *
 * Run: node --no-warnings --experimental-strip-types scripts/build-docs-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { TOOLS, ERROR_CODES } from "../lib/agents/tools.ts";

const ROOT = process.cwd();
const REPO = "https://github.com/THookz/Immutable";

/* ---------- JSX source → plain text ---------- */

const ENTITIES = {
  "&apos;": "\u2019", "&rsquo;": "\u2019", "&lsquo;": "\u2018", "&ldquo;": "\u201c", "&rdquo;": "\u201d",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&hellip;": "\u2026", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&nbsp;": " ", "&quot;": '"', "&trade;": "\u2122", "&middot;": "\u00b7",
};
const decode = (s) => s.replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? " ");

const BLOCK_TAG = /^\/?(p|li|h[1-6]|tr|section|div|ol|ul|table|pre|blockquote|dd|dt)\b/;
// Component props that carry prose (Layer body="…", cards, notes). Read as text.
const PROSE_PROPS = ["title", "body", "description", "note", "summary", "cta", "label", "lede"];
const PROSE_PROP_RE = new RegExp(`\\b(${PROSE_PROPS.join("|")})=(?:"([^"]*)"|\\{\\s*(["'\`])([\\s\\S]*?)\\3\\s*\\})`, "g");

function propsText(tag) {
  if (!/^[A-Z]/.test(tag.trim())) return ""; // only components; HTML title="" is a tooltip
  const parts = [];
  let m;
  while ((m = PROSE_PROP_RE.exec(tag))) parts.push((m[2] ?? m[4]).replace(/\$\{[^}]*\}/g, ""));
  return parts.length ? "\n" + parts.join(". ") + "\n" : "";
}

/** Walk a JSX fragment; keep text and string-literal expressions, drop tags and code. */
function jsxToText(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") {
      // Balance braces only: JSX text inside an expression (a .map body) may hold
      // apostrophes, so quote-tracking here would derail on "it's".
      let depth = 0, j = i;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) break; }
      }
      const inner = src.slice(i + 1, j).trim();
      const m = inner.match(/^(["'`])([\s\S]*)\1$/);
      out += m ? m[2].replace(/\$\{[^}]*\}/g, "") : " ";
      i = j + 1;
      continue;
    }
    if (ch === "<") {
      let j = i + 1, depth = 0, q = null;
      for (; j < src.length; j++) {
        const c = src[j];
        if (q) { if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) break;
      }
      const tag = src.slice(i + 1, j);
      if (BLOCK_TAG.test(tag)) out += "\n";
      out += propsText(tag);
      i = j + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return decode(out).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/** Read a JSX attribute given as name="..." or name={"..."} / {'...'} / {`...`}. */
function attr(src, name) {
  const m = src.match(new RegExp(`\\b${name}=(?:"([^"]*)"|\\{\\s*(["'\`])([\\s\\S]*?)\\2\\s*\\})`));
  return m ? decode((m[1] ?? m[3]).replace(/\s+/g, " ").trim()) : "";
}

function firstHeading(src) {
  const m = src.match(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/);
  return m ? jsxToText(m[2]).replace(/\n/g, " ").trim() : "";
}

/* ---------- data arrays: `const NEEDS: Need[] = [{ id, need, why, provides: [...] }]` ---------- */

const HEADING_KEYS = ["need", "title", "label", "name", "heading"];

function balancedSlice(src, open, close, from) {
  let depth = 0;
  for (let j = from; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close && --depth === 0) return src.slice(from + 1, j);
  }
  return "";
}

function splitObjects(arrayBody) {
  const objs = [];
  for (let i = 0; i < arrayBody.length; i++) {
    if (arrayBody[i] === "{") {
      const body = balancedSlice(arrayBody, "{", "}", i);
      objs.push(body);
      i += body.length + 1;
    }
  }
  return objs;
}

/** Objects in top-level arrays that carry an `id` and prose strings become sections. */
function dataSections(src, url, title, kicker) {
  const docs = [];
  const arrRe = /^const\s+[A-Z][A-Z0-9_]*\s*(?::[^=]+)?=\s*\[/gm;
  let m;
  while ((m = arrRe.exec(src))) {
    const body = balancedSlice(src, "[", "]", m.index + m[0].length - 1);
    for (const obj of splitObjects(body)) {
      const id = obj.match(/\bid:\s*"([^"]+)"/)?.[1];
      if (!id) continue;
      const strings = {};
      const strRe = /\b([a-zA-Z]+):\s*(?:"([^"]*)"|`([^`]*)`)/g;
      let s;
      while ((s = strRe.exec(obj))) if (s[1] !== "id") strings[s[1]] = decode((s[2] ?? s[3]).replace(/\$\{[^}]*\}/g, ""));
      const lists = [...obj.matchAll(/\b([a-zA-Z]+):\s*\[([\s\S]*?)\]/g)].flatMap((l) => [...l[2].matchAll(/"([^"]*)"/g)].map((x) => decode(x[1])));
      const headingKey = HEADING_KEYS.find((k) => strings[k]);
      const heading = headingKey ? strings[headingKey] : id;
      const text = [...Object.entries(strings).filter(([k]) => k !== headingKey).map(([, v]) => v), ...lists].join(" ").replace(/\s+/g, " ").trim();
      if (text.length < 20) continue;
      docs.push({ id: `page:${url}#${id}`, kind: "page", url: `${url}#${id}`, page: title, kicker, heading, text });
    }
  }
  return docs;
}

/* ---------- pages ---------- */

function findPages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...findPages(p));
    else if (name === "page.tsx") out.push(p);
  }
  return out;
}

function pageUrl(file) {
  const rel = relative(join(ROOT, "app"), file).replace(/(^|[\\/])page\.tsx$/, "");
  if (!rel) return "/";
  if (rel.includes("[")) return null; // dynamic routes carry no fixed prose
  return "/" + rel.split(/[\\/]/).join("/");
}

function extractPage(file) {
  const url = pageUrl(file);
  if (!url) return [];
  let src = readFileSync(file, "utf8");
  // The landing page composes components; fold their source in so its prose is searchable.
  if (url === "/") {
    const homeDir = join(ROOT, "components/home");
    for (const f of readdirSync(homeDir)) if (f.endsWith(".tsx")) src += "\n" + readFileSync(join(homeDir, f), "utf8");
  }
  const title = attr(src, "title") || (src.match(/title:\s*"([^"]+)"/)?.[1] ?? url);
  const kicker = attr(src, "kicker");
  const lede = attr(src, "lede");
  const metaDesc = src.match(/description:\s*\n?\s*"([^"]+)"/)?.[1] ?? "";

  const docs = [];
  if (lede || metaDesc) {
    docs.push({ id: `page:${url}`, kind: "page", url, page: title, kicker, heading: title.replace(/\.$/, ""), text: lede || metaDesc });
  }

  const sectionRe = /<section\b([^>]*)>/g;
  const starts = [];
  let m;
  while ((m = sectionRe.exec(src))) starts.push({ at: m.index, attrs: m[1] });
  for (let k = 0; k < starts.length; k++) {
    const { at, attrs } = starts[k];
    const nextStart = k + 1 < starts.length ? starts[k + 1].at : src.length;
    const close = src.indexOf("</section>", at);
    const end = close !== -1 && close < nextStart ? close : nextStart;
    const body = src.slice(at, end);
    const id = attrs.match(/\bid="([^"]+)"/)?.[1] ?? body.match(/<h2\b[^>]*\bid="([^"]+)"/)?.[1] ?? null;
    const heading = firstHeading(body);
    let text = jsxToText(body).replace(/\n+/g, " ").trim();
    if (heading && text.startsWith(heading)) text = text.slice(heading.length).trim();
    if (!heading && text.length < 40) continue;
    docs.push({
      id: `page:${url}#${id ?? k}`,
      kind: "page",
      url: id ? `${url}#${id}` : url,
      page: title,
      kicker,
      heading: heading || title,
      text,
    });
  }
  const seen = new Set(docs.map((d) => d.id));
  for (const d of dataSections(src, url, title, kicker)) if (!seen.has(d.id)) docs.push(d);
  return docs;
}

/* ---------- machine artifacts ---------- */

function toolDocs() {
  const docs = TOOLS.map((t) => ({
    id: `tool:${t.name}`,
    kind: "tool",
    url: `/agents/tools.json#${t.name}`,
    page: "Tool manifest",
    kicker: `${t.method} ${t.path}`,
    heading: t.name,
    text: `${t.description} Returns ${t.returns} Example: ${t.example.curl}`,
  }));
  docs.push({
    id: "tool:errors",
    kind: "tool",
    url: "/agents/protocol#errors",
    page: "Protocol",
    kicker: "RFC 9457 problem codes",
    heading: "Error codes",
    text: ERROR_CODES.map((e) => `${e.code} (${e.status}): ${e.meaning}`).join(" · "),
  });
  return docs;
}

function reportDocs() {
  const docs = [];
  for (const dir of ["kjv", "geneva", "originals"]) {
    const file = join(ROOT, "data", dir, "BUILD-REPORT.md");
    let md;
    try { md = readFileSync(file, "utf8"); } catch { continue; }
    const title = md.match(/^#\s+(.+)$/m)?.[1] ?? `${dir} build report`;
    const parts = md.split(/^##\s+/m);
    parts.forEach((part, i) => {
      const heading = i === 0 ? "Summary" : part.slice(0, part.indexOf("\n")).trim();
      const text = (i === 0 ? part.replace(/^#\s+.+$/m, "") : part.slice(part.indexOf("\n")))
        .replace(/[`*_>#-]+/g, " ").replace(/\s+/g, " ").trim();
      if (text.length < 20) return;
      docs.push({
        id: `report:${dir}#${i}`,
        kind: "report",
        url: `${REPO}/blob/main/data/${dir}/BUILD-REPORT.md`,
        page: title,
        kicker: "Build report",
        heading,
        text,
      });
    });
  }
  return docs;
}

/* ---------- assemble ---------- */

const pages = findPages(join(ROOT, "app")).flatMap(extractPage);
const docs = [...pages, ...toolDocs(), ...reportDocs()];
const index = { built: new Date().toISOString(), count: docs.length, docs };
writeFileSync(join(ROOT, "data/docs-index.json"), JSON.stringify(index));

const byKind = docs.reduce((a, d) => ((a[d.kind] = (a[d.kind] ?? 0) + 1), a), {});
console.log(`docs-index: ${docs.length} entries`, byKind);
for (const d of docs.filter((d) => d.kind === "page").slice(0, 6)) console.log(" ", d.url.padEnd(34), "|", d.heading.slice(0, 40).padEnd(40), "|", d.text.slice(0, 60));
