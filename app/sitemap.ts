import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE } from "@/lib/seo";

/**
 * Generated at build time from PUBLIC_ROUTES in lib/seo.ts, which in turn
 * derives tool routes from tool-data.ts. Adding a tool adds a sitemap
 * entry automatically — nothing to maintain here.
 *
 * Served at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return PUBLIC_ROUTES.map((route) => ({
        url: `${SITE.url}${route.path === "/" ? "" : route.path}`,
        lastModified,
        changeFrequency: route.priority >= 0.8 ? "weekly" : "monthly",
        priority: route.priority,
    }));
}