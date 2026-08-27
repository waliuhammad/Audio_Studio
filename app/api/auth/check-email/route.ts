import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { checkRateLimit, getClientKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Can this address actually receive mail?
 *
 * WHAT THIS CAN AND CANNOT DO
 *
 * There is no way to ask the internet "does this mailbox exist". The old
 * trick — opening an SMTP session and issuing RCPT TO — is unreliable and not
 * worth doing: the large providers refuse it outright, catch-all domains
 * accept every address regardless, and the connections get the sending IP
 * blocked. Anything promising a definite answer is guessing.
 *
 * What IS knowable is whether the DOMAIN can receive mail at all, which is a
 * DNS question with a real answer. That catches the common cases: an invented
 * domain, a typo like gmial.com, or a placeholder like example.com. It cannot
 * tell nosuchperson@gmail.com from a real Gmail user — Gmail has MX records
 * either way. Proving a specific mailbox exists takes sending to it and
 * waiting for the recipient to click, which is what the verification email
 * after sign-up is for.
 *
 * So: this rejects addresses that CANNOT possibly work, and the verification
 * link proves the rest.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** DNS is fast, but a hostile domain can stall — do not hang the form. */
const LOOKUP_TIMEOUT_MS = 4000;

/**
 * Domains that resolve but exist to throw mail away.
 *
 * Not exhaustive by design — a blocklist is a losing race. These are the ones
 * common enough to be worth refusing outright.
 */
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "temp-mail.org",
    "throwawaymail.com",
    "yopmail.com",
    "trashmail.com",
    "sharklasers.com",
    "getnada.com",
    "dispostable.com",
    "fakeinbox.com",
]);

/** Reserved by RFC 2606 for documentation — these can never receive mail. */
const RESERVED_DOMAINS = new Set([
    "example.com",
    "example.org",
    "example.net",
    "test",
    "invalid",
    "localhost",
]);

interface CheckResult {
    deliverable: boolean;
    reason?: string;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("dns-timeout")), ms);
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        clearTimeout(timer!);
    }
}

async function checkDomain(domain: string): Promise<CheckResult> {
    if (RESERVED_DOMAINS.has(domain)) {
        return {
            deliverable: false,
            reason: "That domain can't receive email. Use a real address.",
        };
    }

    if (DISPOSABLE_DOMAINS.has(domain)) {
        return {
            deliverable: false,
            reason: "Temporary email addresses aren't accepted. Use a permanent one.",
        };
    }

    /*
     * Only a DEFINITIVE answer may reject an address.
     *
     * The first version treated every lookup failure as "domain does not
     * exist", which rejected gmail.com, outlook.com and every real address the
     * moment DNS was unreachable — a network problem on our side turning into
     * "your email is invalid" for every visitor trying to sign up.
     *
     * ENOTFOUND / NXDOMAIN is the resolver saying the domain genuinely is not
     * registered. Everything else — refused, timed out, SERVFAIL — says only
     * that we could not find out, and the address gets the benefit of the
     * doubt. The verification email is the real check regardless.
     */
    const definitelyMissing = (error: unknown): boolean => {
        const code =
            typeof error === "object" && error !== null && "code" in error
                ? String((error as { code: unknown }).code)
                : "";

        return code === "ENOTFOUND" || code === "NXDOMAIN";
    };

    try {
        const records = await withTimeout(dns.resolveMx(domain), LOOKUP_TIMEOUT_MS);

        if (records.length > 0) return { deliverable: true };
    } catch (error) {
        if (!definitelyMissing(error)) return { deliverable: true };
    }

    /*
     * No MX, but a domain may still accept mail at its A record. Rare, and
     * worth one more lookup: refusing a real address is a far worse failure
     * than accepting a doubtful one.
     */
    try {
        await withTimeout(dns.resolve(domain), LOOKUP_TIMEOUT_MS);

        return { deliverable: true };
    } catch (error) {
        if (!definitelyMissing(error)) return { deliverable: true };

        return {
            deliverable: false,
            reason: "That email domain doesn't exist. Check the spelling.",
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        // Cheap for us, but it is an unauthenticated DNS trigger — worth a cap.
        const limit = checkRateLimit(getClientKey(request, "check-email"), {
            limit: 30,
            windowMs: 60 * 1000,
            blockMs: 5 * 60 * 1000,
        });

        if (!limit.allowed) {
            return NextResponse.json(
                { deliverable: true, reason: "skipped" },
                { status: 200 }
            );
        }

        const body = (await request.json().catch(() => null)) as {
            email?: unknown;
        } | null;

        const email =
            typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

        if (!email || !EMAIL_PATTERN.test(email)) {
            return NextResponse.json({
                deliverable: false,
                reason: "That doesn't look like a valid email address.",
            });
        }

        const domain = email.split("@")[1] ?? "";

        return NextResponse.json(await checkDomain(domain));
    } catch (error) {
        console.error("Email check failed:", error);

        /*
         * Fail OPEN.
         *
         * If our DNS is unhappy that is our problem, not the visitor's — and
         * blocking sign-ups because a lookup timed out is a far worse outcome
         * than letting a doubtful address through to the verification email.
         */
        return NextResponse.json({ deliverable: true, reason: "skipped" });
    }
}
