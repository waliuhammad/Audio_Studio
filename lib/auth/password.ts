import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * bcryptjs is pure JavaScript — no native compilation — so it works in the
 * Alpine container without build tools. Slightly slower than the native
 * `bcrypt` package, which for password hashing is a feature, not a problem.
 */

/**
 * Cost factor. Each +1 doubles the work.
 * 12 ≈ 250ms on typical server hardware: slow enough to make offline
 * brute-forcing expensive, fast enough that sign-in feels instant.
 */
const SALT_ROUNDS = 12;

/** Bcrypt silently truncates at 72 bytes — reject rather than mislead. */
export const MAX_PASSWORD_BYTES = 72;

export async function hashPassword(plain: string): Promise<string> {
    if (Buffer.byteLength(plain, "utf8") > MAX_PASSWORD_BYTES) {
        throw new Error("Password is too long.");
    }

    return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
    plain: string,
    hash: string
): Promise<boolean> {
    try {
        return await bcrypt.compare(plain, hash);
    } catch {
        return false;
    }
}

/**
 * Burn roughly the same time as a real comparison when the user does not
 * exist. Without this, "no such account" returns much faster than "wrong
 * password", and an attacker can enumerate valid emails by timing alone.
 */
const DUMMY_HASH =
    "$2a$12$C6UzMDM.H6dfI/f/IKcEe.wCLPGzKN1QpO8kZ7yhXTuVEqQz4C7Aq";

export async function fakeVerify(): Promise<void> {
    await bcrypt.compare("dummy-password-value", DUMMY_HASH);
}