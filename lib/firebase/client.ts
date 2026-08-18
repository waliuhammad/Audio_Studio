"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase browser SDK.
 *
 * These NEXT_PUBLIC_* values are NOT secrets — they ship in the JS bundle by
 * design and every Firebase web app exposes them. Your data is protected by
 * Firestore security rules and Firebase Auth, not by hiding this config.
 */

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Thrown when the browser Firebase config is missing.
 *
 * It carries a `code` so describeAuthError() can tell it apart from a real
 * Firebase auth failure — otherwise a blank .env.local surfaces to the user
 * as the generic "something went wrong signing you in", which points at the
 * password rather than at the actual cause.
 */
export class FirebaseConfigError extends Error {
    readonly code = "app/not-configured";

    constructor(missing: string[]) {
        super(
            `Firebase is not configured. Missing NEXT_PUBLIC_FIREBASE_* values in .env.local: ${missing.join(", ")}.`
        );
        this.name = "FirebaseConfigError";
    }
}

function assertConfigured(): void {
    const missing = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        throw new FirebaseConfigError(missing);
    }
}

/** getApps() guard prevents re-initialising during Fast Refresh. */
export function getFirebaseApp(): FirebaseApp {
    assertConfigured();

    return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseApp());
}