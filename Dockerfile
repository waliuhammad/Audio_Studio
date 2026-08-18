# =====================================================
# Audio Studio — production image
#
# FFmpeg is a system binary, not an npm package. Vercel's serverless
# runtime does not include it, which is why this project needs a
# container host (Railway, Fly.io, Render, or any VPS).
# =====================================================

# ---- Stage 1: install dependencies -------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


# ---- Stage 2: build ---------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js reads NEXT_PUBLIC_* at build time.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
RUN npm run build


# ---- Stage 3: runtime -------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# The whole reason for this Dockerfile.
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Run as a non-root user — FFmpeg parses untrusted input, so if it is ever
# exploited the process should have as little privilege as possible.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Temp files are written here by every media route.
RUN mkdir -p /tmp/audio-studio && chown nextjs:nodejs /tmp/audio-studio

USER nextjs

EXPOSE 3000

# Confirms both the app AND ffmpeg are alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]