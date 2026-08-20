import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import {
    getFirestore,
    initializeFirestore,
    type Firestore,
} from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — server only.
 *
 * The service account key bypasses ALL Firestore security rules, so it must
 * never reach the browser. The "server-only" import turns an accidental client
 * import into a build error rather than a silent credential leak.
 *
 * HOT-RELOAD NOTE: Next.js re-evaluates modules on every edit in dev. Plain
 * module-level caching therefore resets, producing a fresh Admin app each time
 * while the previous Firestore client is torn down — which surfaces as
 * "Database is closing" or "The client has already been closed".
 * Caching on globalThis survives module re-evaluation and fixes it.
 *
 * This cannot run in middleware (Edge runtime has no Node APIs).
 */

const ADMIN_APP_NAME = "audio-studio-admin";

interface AdminCache {
    app?: App;
    auth?: Auth;
    db?: Firestore;
}

const globalForAdmin = globalThis as typeof globalThis & {
    __audioStudioAdmin?: AdminCache;
};

const cache: AdminCache = (globalForAdmin.__audioStudioAdmin ??= {});

function buildCredential() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawKey) {
        throw new Error(
            "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local."
        );
    }

    /**
     * Normalise the PEM, whatever shape it arrives in.
     *
     * A service-account key has to survive being pasted through .env files and
     * hosting dashboards, and they mangle the line breaks differently:
     *
     *   real newlines   already correct
     *   \n              the usual single-escaped form
     *   \  + newline    a backslash stranded at the end of every line
     *
     * That last one is the subtle one. If the .env value is double-quoted and
     * written as \\n, dotenv unescapes the \n half into a real newline and
     * leaves the first backslash behind — so the key arrives looking almost
     * right, with one stray character welded to the end of all 28 lines:
     *
     *   "-----BEGIN PRIVATE KEY-----\"
     *
     * OpenSSL rejects that with "DECODER routines::unsupported", which reads
     * like an unsupported key format and sends you looking at the wrong thing
     * entirely. Stripping the backslash is all it needs.
     */
    const privateKey =
        rawKey
            .replace(/^\s*["']|["']\s*$/g, "")
            .replace(/\\n/g, "\n")
            // Anchored on "followed by a newline OR the end of the string" —
            // trimming first would eat the final newline and strand the very
            // last backslash where a \n-only pattern can never reach it.
            .replace(/\\(?=\r?\n|$)/g, "")
            .trim() + "\n";

    return cert({ projectId, clientEmail, privateKey });
}

export function getAdminApp(): App {
    if (cache.app) return cache.app;

    const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);

    cache.app =
        existing ?? initializeApp({ credential: buildCredential() }, ADMIN_APP_NAME);

    return cache.app;
}

export function getAdminAuth(): Auth {
    cache.auth ??= getAuth(getAdminApp());

    return cache.auth;
}

export function getAdminDb(): Firestore {
    if (cache.db) return cache.db;

    let db: Firestore;

    try {
        /**
         * preferRest is the important flag here.
         *
         * By default firebase-admin talks to Firestore over gRPC, which Windows
         * Firewall, corporate proxies and some ISPs silently block. The symptom
         * is not an error — the request simply HANGS until a long internal
         * timeout, which looks like the app freezing after compilation.
         *
         * REST uses ordinary HTTPS and gets through anywhere. Slightly slower
         * per call; vastly more reliable.
         */
        db = initializeFirestore(getAdminApp(), { preferRest: true });

        // Writing `undefined` throws by default; treating it as "leave unset"
        // keeps optional fields (durationSeconds, storagePath...) from
        // breaking writes.
        db.settings({ ignoreUndefinedProperties: true });
    } catch {
        // Already initialised (hot reload) — reuse the existing instance.
        db = getFirestore(getAdminApp());
    }

    cache.db = db;

    return db;
}