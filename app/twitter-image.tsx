
/**
 * next/og renders on the EDGE runtime.
 *
 * Without this it is built for Node, where its font loader resolves an asset
 * path that does not exist and throws "TypeError: Invalid URL" — which fails
 * the whole production export, not just this route.
 */
export const runtime = "edge";
/**
 * X / Twitter card image.
 *
 * Next only emits a twitter:image tag when this file convention exists — with
 * just opengraph-image.tsx present, clients that do not fall back to og:image
 * still show a bare link. Re-exporting keeps one design in one place.
 */
export { alt, size, contentType, default } from "./opengraph-image";