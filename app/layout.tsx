import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
// Next.js declares CSS side-effect imports in next-env.d.ts, so this needs no
// suppression — a @ts-expect-error here is itself an error (TS2578).
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SITE } from "@/lib/seo";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
  adjustFontFallback: false,
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  // Makes every relative canonical/OG URL in child pages resolve correctly.
  metadataBase: new URL(SITE.url),

  title: {
    default: "Audio Studio — Create, edit and transform your sound",
    // Child pages set only their own title; this appends the brand.
    template: `%s | ${SITE.name}`,
  },

  description: SITE.description,

  applicationName: SITE.name,

  keywords: [
    "audio editor",
    "trim mp3",
    "merge audio",
    "convert audio",
    "video to audio",
    "ringtone maker",
    "online audio tools",
  ],

  authors: [{ name: SITE.name }],
  creator: SITE.name,

  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: "Audio Studio — Create, edit and transform your sound",
    description: SITE.description,
  },

  twitter: {
    card: "summary_large_image",
    title: "Audio Studio — Create, edit and transform your sound",
    description: SITE.description,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches the paper / ink page backgrounds so mobile browser chrome blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}