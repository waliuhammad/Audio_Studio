"use client";

import {
    GithubAuthProvider,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    updateProfile,
    type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/**
 * Browser-side auth.
 *
 * Flow for every method:
 *   1. Authenticate with Firebase in the browser
 *   2. Get the resulting ID token
 *   3. POST it to /api/auth/session, which sets an httpOnly cookie
 *
 * Step 3 is what makes server-rendered protected pages work. Without it the
 * server has no idea who the user is.
 */

/** Turn Firebase's error codes into something a person can act on. */
export function describeAuthError(error: unknown): string {
    const code =
        typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";

    // Errors raised by establishServerSession() are plain Errors carrying the
    // server's own explanation — rate limiting, an expired token, a session
    // that could not be minted. Those messages are already user-facing and far
    // more useful than the generic fallback below, which otherwise hides them.
    if (!code && error instanceof Error && error.message) {
        return error.message;
    }

    switch (code) {
        // Not a credential problem at all — the app itself is misconfigured.
        // Say so plainly instead of blaming the user's email/password.
        case "app/not-configured":
        case "auth/invalid-api-key":
        case "auth/api-key-not-valid":
            return "This site isn't configured for sign-in yet (missing or invalid Firebase keys). Contact the site owner.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Email or password is incorrect.";
        case "auth/email-already-in-use":
            return "An account with this email already exists.";
        case "auth/weak-password":
            return "That password is too weak. Use at least 8 characters.";
        case "auth/invalid-email":
            return "That doesn't look like a valid email address.";
        case "auth/user-disabled":
            return "This account has been disabled. Contact support.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a few minutes and try again.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "Sign-in window was closed before finishing.";
        case "auth/popup-blocked":
            return "Your browser blocked the sign-in window. Allow pop-ups and retry.";
        case "auth/account-exists-with-different-credential":
            return "This email is already registered with a different sign-in method.";
        case "auth/operation-not-allowed":
            return "That sign-in method isn't enabled for this project yet.";
        case "auth/network-request-failed":
            return "Network error. Check your connection and try again.";
        default:
            return "Something went wrong signing you in. Please try again.";
    }
}

/** Exchange the Firebase ID token for the server session cookie. */
async function establishServerSession(
    credential: UserCredential,
    rememberMe: boolean
): Promise<void> {
    const idToken = await credential.user.getIdToken();

    const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, rememberMe }),
    });

    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
            error?: string;
        };

        // Don't leave a half-signed-in state: client says yes, server says no.
        await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);

        throw new Error(data.error ?? "Could not start your session.");
    }
}

/* ===================================================== */
/* EMAIL + PASSWORD                                      */
/* ===================================================== */

export async function signInWithEmail(
    email: string,
    password: string,
    rememberMe = false
): Promise<void> {
    const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
    );

    await establishServerSession(credential, rememberMe);
}

export async function signUpWithEmail(
    name: string,
    email: string,
    password: string
): Promise<void> {
    const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password
    );

    // Set the display name BEFORE minting the session, so the name is present
    // in the token claims the server reads.
    await updateProfile(credential.user, { displayName: name });

    // Force-refresh so the new displayName is in the token.
    await credential.user.getIdToken(true);

    await establishServerSession(credential, false);
}

/* ===================================================== */
/* SOCIAL                                                */
/* ===================================================== */

export async function signInWithGoogle(rememberMe = false): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Always show the account chooser rather than silently reusing one.
    provider.setCustomParameters({ prompt: "select_account" });

    const credential = await signInWithPopup(getFirebaseAuth(), provider);

    await establishServerSession(credential, rememberMe);
}

export async function signInWithGithub(rememberMe = false): Promise<void> {
    const provider = new GithubAuthProvider();
    provider.addScope("read:user");

    const credential = await signInWithPopup(getFirebaseAuth(), provider);

    await establishServerSession(credential, rememberMe);
}

/* ===================================================== */
/* PASSWORD RESET + SIGN OUT                             */
/* ===================================================== */

export async function sendResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOut(): Promise<void> {
    // Clear the server cookie first — if the page reloads mid-way, the user
    // is signed out server-side rather than stuck in a mismatched state.
    await fetch("/api/auth/session", { method: "DELETE" }).catch(
        () => undefined
    );

    await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
}