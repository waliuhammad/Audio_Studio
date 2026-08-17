/**
 * In-memory rate limiter for auth endpoints.
 *
 * LIMITATION: state lives in this process only. It resets on restart and is
 * not shared between instances, so with multiple replicas an attacker gets
 * N× the attempts. That is acceptable for a single container; move to Redis
 * (or Upstash) before scaling horizontally.
 */

interface Attempt {
    count: number;
    firstAttemptAt: number;
    blockedUntil: number | null;
}

const attempts = new Map<string, Attempt>();

/** Drop stale entries so the map cannot grow without bound. */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number): void {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;

    lastSweep = now;

    for (const [key, attempt] of attempts) {
        const expired =
            now - attempt.firstAttemptAt > windowMs &&
            (attempt.blockedUntil === null || now > attempt.blockedUntil);

        if (expired) attempts.delete(key);
    }
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

export function checkRateLimit(
    key: string,
    options: { limit: number; windowMs: number; blockMs: number }
): RateLimitResult {
    const now = Date.now();
    sweep(now, options.windowMs);

    const existing = attempts.get(key);

    if (existing?.blockedUntil && now < existing.blockedUntil) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil((existing.blockedUntil - now) / 1000),
        };
    }

    // No record, or the window has rolled over.
    if (!existing || now - existing.firstAttemptAt > options.windowMs) {
        attempts.set(key, {
            count: 1,
            firstAttemptAt: now,
            blockedUntil: null,
        });

        return {
            allowed: true,
            remaining: options.limit - 1,
            retryAfterSeconds: 0,
        };
    }

    existing.count += 1;

    if (existing.count > options.limit) {
        existing.blockedUntil = now + options.blockMs;

        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil(options.blockMs / 1000),
        };
    }

    return {
        allowed: true,
        remaining: options.limit - existing.count,
        retryAfterSeconds: 0,
    };
}

/** Called after a successful sign-in so one good login clears the counter. */
export function resetRateLimit(key: string): void {
    attempts.delete(key);
}

/**
 * Best-effort client identity.
 *
 * Trusting x-forwarded-for is only safe behind a proxy that overwrites it
 * (Railway, Fly, Render, Cloudflare all do). Direct-to-internet Node would
 * let a client spoof this header freely.
 */
export function getClientKey(request: Request, suffix = ""): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    const ip =
        forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";

    return suffix ? `${ip}:${suffix}` : ip;
}

/* Presets ------------------------------------------- */

export const SIGN_IN_LIMIT = {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
    blockMs: 15 * 60 * 1000, // then blocked for 15 minutes
};

export const SIGN_UP_LIMIT = {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 3 accounts per hour per IP
    blockMs: 60 * 60 * 1000,
};