import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api/respond";
import { books } from "@/lib/bible/store";

const STATIC = ["", "/foundation", "/architecture", "/api-docs", "/translations", "/geneva-notes", "/printers", "/storage", "/community", "/search", "/agents", "/agents/needs", "/agents/harness", "/agents/protocol", "/agents/covenant", "/agents/mcp", "/agents/examples"];

/** One sitemap: 16 static pages + 66 books + 1,189 chapters = 1,271 URLs (under the 50k limit). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const out: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: p === "" ? "weekly" : "monthly", priority: p === "" ? 1 : 0.8 }));
  for (const b of books()) {
    out.push({ url: `${SITE_URL}/foundation/${b.id}`, lastModified: now, changeFrequency: "yearly", priority: 0.6 });
    for (let c = 1; c <= b.chapters; c++) out.push({ url: `${SITE_URL}/foundation/${b.id}/${c}`, lastModified: now, changeFrequency: "yearly", priority: 0.5 });
  }
  return out;
}
