/** @type {import('next').NextConfig} */

// `output: "standalone"` is what the Dockerfile needs, but it also makes
// `next start` refuse to serve (Next tells you to run .next/standalone/server.js).
// Gate it so local `npm run build && npm start` keeps working; CI/Docker sets
// BUILD_STANDALONE=1.
const isStandalone = process.env.BUILD_STANDALONE === "1";

const nextConfig = {
  reactStrictMode: true,

  // Lets a second local build live beside the normal one (NEXT_DIST_DIR=.next-x
  // for both `next build` and `next start`). Production leaves it unset.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  ...(isStandalone ? {} : {}),

  experimental: {
    // The ffmpeg binaries are executables, not modules — webpack must not try
    // to trace or bundle them, only leave them in node_modules to be spawned.
    serverComponentsExternalPackages: ["ffmpeg-static", "ffprobe-static"],

    serverActions: {
      // Media uploads are large; the default limit is 1 MB.
      bodySizeLimit: "500mb",
    },

    // Rewrites barrel imports to deep paths so webpack doesn't walk the whole
    // package on every compile. Next already does this for lucide-react by
    // default; the firebase SDKs are the other big ones here.
    optimizePackageImports: ["firebase", "firebase/auth"],
  },

  // Keeps recently-visited routes compiled in dev instead of evicting them
  // after 15s, which is what makes navigating back to a page recompile.
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 8,
  },

  // Never ship source maps of server code to production clients.
  productionBrowserSourceMaps: false,

  // The Audio Player and Video Player tools were removed. Old links and
  // search results land on the tools grid instead of a 404.
  async redirects() {
    return [
      { source: "/othertools/audio-player", destination: "/#tools", permanent: true },
      { source: "/videotools/video-player", destination: "/#tools", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Hashed build assets are immutable — let the browser keep them.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
