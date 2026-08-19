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

    // Env vars can't hold real newlines, so the key arrives with literal "\n".
    // Strip any wrapping quotes too — a common copy/paste artefact.
    const privateKey = rawKey
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n");

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