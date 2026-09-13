import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, EB_Garamond, JetBrains_Mono, Noto_Serif_Hebrew } from "next/font/google";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ThemeScript } from "@/components/site/theme-toggle";
import { SITE_URL } from "@/lib/api/respond";
import { SITE_TITLE, SITE_TAGLINE, SITE_DESCRIPTION, SITE_SHARE_DESCRIPTION } from "@/lib/bible/sources";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], display: "swap" });
const garamond = EB_Garamond({ subsets: ["latin", "greek", "greek-ext"], variable: "--font-garamond", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
// Pointed Hebrew with cantillation needs a font that actually ships those marks; the sandbox/CI
// browsers have none, and many desktops only have unpointed Hebrew. Loaded once, used only for
// the original-language line. Greek (polytonic) is covered by EB Garamond's greek subset.
const hebrew = Noto_Serif_Hebrew({ subsets: ["hebrew"], weight: ["400"], variable: "--font-hebrew", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · harness.talk" },
  description: SITE_DESCRIPTION,
  applicationName: "harness.talk",
  keywords: ["King James Bible", "KJV 1611", "original spelling", "Geneva Bible 1599", "Bible API", "content-addressed", "SHA-256", "Merkle root", "MCP server", "llms.txt", "OpenAPI", "127.0.0.0/8"],
  openGraph: {
    type: "website",
    siteName: "harness.talk",
    title: SITE_TAGLINE,
    description: SITE_SHARE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: SITE_TAGLINE, description: SITE_SHARE_DESCRIPTION },
  alternates: { canonical: "/", types: { "text/plain": `${SITE_URL}/llms.txt`, "application/json": `${SITE_URL}/openapi.json` } },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  // The image carries no words; these do. What an agent needs to raise its own capability:
  // the address scheme, the tool manifest, the machine spec, and the immutability guarantee.
  other: {
    "ai-tools": `${SITE_URL}/agents/tools.json`,
    "ai-llms": `${SITE_URL}/llms.txt`,
    "ai-openapi": `${SITE_URL}/openapi.json`,
    "ai-address-scheme": "127.{book}.{chapter}.{verse} — 66 books, 31,102 verses, one address each",
    "ai-integrity": "sha256(`${book}.${chapter}.${verse}\\n${text}`) per verse; corpus Merkle root at /api/v1/sources",
    "ai-mcp": "npx -y harness-talk mcp — stdio MCP server over the same read-only API",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0a08" },
    { media: "(prefers-color-scheme: light)", color: "#f3ecdc" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`bg-background ${fraunces.variable} ${garamond.variable} ${jetbrains.variable} ${hebrew.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-foreground">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
