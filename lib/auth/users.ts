import { randomUUID } from "crypto";
import { hashPassword, verifyPassword, fakeVerify } from "./password";

/**
 * User store.
 *
 * TEMPORARY: this keeps users in memory, so everything is lost on restart
 * and nothing is shared between instances. It exists so the auth routes can
 * be built and tested now; Phase 5 replaces the four functions at the bottom
 * with database queries. Nothing outside this file needs to change — the
 * exported signatures are the contract.
 */

export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    plan: "free" | "pro" | "studio";
    createdAt: string;
}

/** Safe to send to the client — never includes the hash. */
export interface PublicUser {
    id: string;
    email: string;
    name: string;
    plan: User["plan"];
    initials: string;
    createdAt: string;
}

const users = new Map<string, User>();

/** Emails are matched case-insensitively; stored lowercase. */
function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function toPublicUser(user: User): PublicUser {
    const initials = user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        initials: initials || user.email[0]?.toUpperCase() || "?",
        createdAt: user.createdAt,
    };
}

/* ===================================================== */
/* DATA ACCESS — replace these bodies in Phase 5          */
/* ===================================================== */

export async function findUserByEmail(email: string): Promise<User | null> {
    const key = normalizeEmail(email);

    for (const user of users.values()) {
        if (user.email === key) return user;
    }

    return null;
}

export async function findUserById(id: string): Promise<User | null> {
    return users.get(id) ?? null;
}

export async function createUser(input: {
    email: string;
    name: string;
    password: string;
}): Promise<User> {
    const email = normalizeEmail(input.email);

    const existing = await findUserByEmail(email);

    if (existing) {
        throw new Error("EMAIL_TAKEN");
    }

    const user: User = {
        id: randomUUID(),
        email,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        plan: "free",
        createdAt: new Date().toISOString(),
    };

    users.set(user.id, user);

    return user;
}

export async function updateUser(
    id: string,
    changes: { name?: string; email?: string }
): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    if (changes.email) {
        const email = normalizeEmail(changes.email);
        const clash = await findUserByEmail(email);

        if (clash && clash.id !== id) {
            throw new Error("EMAIL_TAKEN");
        }

        user.email = email;
    }

    if (changes.name) {
        user.name = changes.name.trim();
    }

    users.set(id, user);

    return user;
}

/* ===================================================== */
/* AUTHENTICATION                                        */
/* ===================================================== */

/**
 * Verify credentials.
 *
 * Always runs a bcrypt comparison — real or dummy — so the response time
 * does not reveal whether the email exists.
 */
export async function authenticate(
    email: string,
    password: string
): Promise<User | null> {
    const user = await findUserByEmail(email);

    if (!user) {
        await fakeVerify();
        return null;
    }

    const valid = await verifyPassword(password, user.passwordHash);

    return valid ? user : null;
}

/** Dev convenience: seed a demo account so the dashboard has something. */
export async function seedDemoUser(): Promise<void> {
    if (process.env.NODE_ENV === "production") return;
    if (users.size > 0) return;

    try {
        await createUser({
            email: "demo@audiostudio.app",
            name: "Ada Lovelace",
            password: "Demo1234",
        });
        console.log("Seeded demo user: demo@audiostudio.app / Demo1234");
    } catch {
        /* already seeded */
    }
}