import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, SITE } from "@/lib/seo";

/**
 * Served at /robots.txt
 *
 * The disallow list comes from PRIVATE_ROUTES so it cannot drift from the
 * routes the app actually protects. Note this only asks crawlers to stay out —
 * the real access control is middleware plus getSessionUser().
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: PRIVATE_ROUTES.map((route) => `${route}/`),
        },
        sitemap: `${SITE.url}/sitemap.xml`,
        host: SITE.url,
    };
}
