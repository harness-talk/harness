import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/api/respond";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // AI crawlers are welcome — this site exists to be read by machines.
      { userAgent: ["GPTBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Google-Extended", "CCBot", "Applebot-Extended", "Bytespider", "cohere-ai"], allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
