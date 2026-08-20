/** @type {import('next').NextConfig} */

// `output: "standalone"` is what the Dockerfile needs, but it also makes
// `next start` refuse to serve (Next tells you to run .next/standalone/server.js).
// Gate it so local `npm run build && npm start` keeps working; CI/Docker sets
// BUILD_STANDALONE=1.
const isStandalone = process.env.BUILD_STANDALONE === "1";

const nextConfig = {
  reactStrictMode: true,

  ...(isStandalone ? {} : {}),

  experimental: {
    serverActions: {
      // Media uploads are large; the default limit is 1 MB.
      bodySizeLimit: "500mb",
    },

    // Rewrites barrel imports to deep paths so webpack doesn't walk the whole
    // package on every compile. Next already does this for lucide-react by
    // default; framer-motion and the firebase SDKs are the other big ones here.
    optimizePackageImports: ["framer-motion", "firebase", "firebase/auth"],
  },

  // Keeps recently-visited routes compiled in dev instead of evicting them
  // after 15s, which is what makes navigating back to a page recompile.
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 8,
  },

  // Never ship source maps of server code to production clients.
  productionBrowserSourceMaps: false,

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
