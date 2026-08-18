import "server-only";

import {
    cert,
    getApp,
    getApps,
    initializeApp,
    type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — server only.
 *
 * The service account key bypasses ALL Firestore security rules, so it must
 * never reach the browser. The "server-only" import above turns an accidental
 * client import into a build error rather than a silent credential leak.
 *
 * Note: this cannot run in Next.js middleware (Edge runtime has no Node APIs).
 */

const ADMIN_APP_NAME = "audio-studio-admin";

function buildCredential() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
        );
    }

    return cert({
        projectId,
        clientEmail,
        // Env vars store the key with literal "\n" sequences; restore real newlines.
        privateKey: privateKey.replace(/\\n/g, "\n"),
    });
}

export function getAdminApp(): App {
    const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);

    if (existing) return existing;

    return initializeApp({ credential: buildCredential() }, ADMIN_APP_NAME);
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}