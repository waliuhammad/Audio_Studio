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
 * Disify — free, no API key, no sign-up.
 *
 * Worth being precise about what this buys, because it is NOT a mailbox
 * check: it answers format, DNS and disposable, and for ali1234@gmail.com it
 * reports dns true and nothing more. The same question we already answer.
 *
 * What it adds is a maintained disposable list. The hardcoded set in the route
 * covers a dozen well-known throwaway domains; new ones appear constantly and
 * a static list in this repository will always be behind. So this runs when no
 * paid provider is configured, upgrading the free path without pretending to
 * do more than it does.
 *
 * It can never return "undeliverable" for a real domain — only a provider that
 * actually talks SMTP can do that.
 */
async function checkDisify(email: string): Promise<MailboxVerdict> {
    const data = await fetchJson(
        `https://disify.com/api/email/${encodeURIComponent(email)}`
    );

    if (!data) return "unknown";

    if (data.format === false) return "undeliverable";
    if (data.disposable === true) return "undeliverable";
    if (data.dns === false) return "undeliverable";

    // dns true says the domain accepts mail. It says nothing about the
    // mailbox, so this is deliberately NOT reported as deliverable.
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

    /*
     * No paid provider configured — fall back to the free, keyless one.
     *
     * It cannot detect a missing mailbox, so ali1234@gmail.com still gets
     * through here. That gap closes only with a provider that talks SMTP; the
     * verification email is what catches it in the meantime.
     */
    return { verdict: await checkDisify(email), provider: "disify" };
}

/** Is a real mailbox-level provider configured, as opposed to the free fallback? */
export function isMailboxCheckConfigured(): boolean {
    return Boolean(
        process.env.ZEROBOUNCE_API_KEY?.trim() ||
        process.env.ABSTRACT_EMAIL_API_KEY?.trim() ||
        process.env.HUNTER_API_KEY?.trim()
    );
}
