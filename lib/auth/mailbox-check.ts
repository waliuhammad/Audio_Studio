import "server-only";

/**
 * Does this specific MAILBOX exist?
 *
 * Not the domain — the address. ali1234@gmail.com and a real Gmail user are
 * indistinguishable by DNS, because both sit behind the same MX records. The
 * only thing that separates them is asking Gmail's mail server whether it
 * would accept a message for that recipient (the SMTP RCPT TO handshake).
 *
 * WHY THIS CALLS OUT TO A SERVICE
 *
 * We cannot make that handshake ourselves. Railway, and effectively every
 * other cloud host, blocks outbound port 25 to stop their address space being
 * used for spam — so a direct check would time out in production no matter how
 * it was written. Providers that do this professionally run their own mail
 * infrastructure, keep the reputation needed for Gmail to answer honestly, and
 * handle greylisting.
 *
 * So this integrates one. Without a key configured it returns "unknown" and
 * the caller falls back to the DNS-level checks, which still catch invented
 * domains — it degrades, it does not break.
 *
 * ACCURACY, HONESTLY
 *
 * Gmail, Outlook and most large providers reject unknown recipients, so those
 * are detected reliably. Domains configured as catch-all accept every address
 * by design and can never be resolved by anyone — they come back "unknown" and
 * are allowed through to the verification email.
 */

export type MailboxVerdict = "deliverable" | "undeliverable" | "unknown";

export interface MailboxCheck {
    verdict: MailboxVerdict;
    /** Which provider answered, for logging. */
    provider: string;
}

const TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) return null;

        return (await response.json()) as Record<string, unknown>;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** ZeroBounce — status is one of valid | invalid | catch-all | unknown | ... */
async function checkZeroBounce(
    email: string,
    apiKey: string
): Promise<MailboxVerdict> {
    const data = await fetchJson(
        `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(
            apiKey
        )}&email=${encodeURIComponent(email)}`
    );

    const status = typeof data?.status === "string" ? data.status : "";

    if (status === "invalid") return "undeliverable";
    if (status === "valid") return "deliverable";

    // catch-all, unknown, spamtrap, abuse, do_not_mail — not a clear "no".
    return "unknown";
}

/** Abstract API — deliverability is DELIVERABLE | UNDELIVERABLE | UNKNOWN. */
async function checkAbstract(
    email: string,
    apiKey: string
): Promise<MailboxVerdict> {
    const data = await fetchJson(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(
            apiKey
        )}&email=${encodeURIComponent(email)}`
    );

    const deliverability =
        typeof data?.deliverability === "string" ? data.deliverability : "";

    if (deliverability === "UNDELIVERABLE") return "undeliverable";
    if (deliverability === "DELIVERABLE") return "deliverable";

    return "unknown";
}

/** Hunter — result is deliverable | undeliverable | risky. */
async function checkHunter(
    email: string,
    apiKey: string
): Promise<MailboxVerdict> {
    const data = await fetchJson(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
            email
        )}&api_key=${encodeURIComponent(apiKey)}`
    );

    const result =
        data && typeof data.data === "object" && data.data !== null
            ? (data.data as Record<string, unknown>).result
            : undefined;

    if (result === "undeliverable") return "undeliverable";
    if (result === "deliverable") return "deliverable";

    return "unknown";
}

/**
 * Ask whichever provider is configured.
 *
 * Only one runs. Checking several would multiply cost and latency for an
 * answer that is already only as good as its most confident source.
 */
export async function checkMailboxExists(email: string): Promise<MailboxCheck> {
    const zeroBounce = process.env.ZEROBOUNCE_API_KEY?.trim();

    if (zeroBounce) {
        return {
            verdict: await checkZeroBounce(email, zeroBounce),
            provider: "zerobounce",
        };
    }

    const abstract = process.env.ABSTRACT_EMAIL_API_KEY?.trim();

    if (abstract) {
        return {
            verdict: await checkAbstract(email, abstract),
            provider: "abstract",
        };
    }

    const hunter = process.env.HUNTER_API_KEY?.trim();

    if (hunter) {
        return { verdict: await checkHunter(email, hunter), provider: "hunter" };
    }

    return { verdict: "unknown", provider: "none" };
}

/** Is mailbox-level checking switched on at all? */
export function isMailboxCheckConfigured(): boolean {
    return Boolean(
        process.env.ZEROBOUNCE_API_KEY?.trim() ||
        process.env.ABSTRACT_EMAIL_API_KEY?.trim() ||
        process.env.HUNTER_API_KEY?.trim()
    );
}
