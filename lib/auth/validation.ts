/**
 * Shared validation for the auth forms.
 *
 * These rules run in the browser for instant feedback only — they are NOT a
 * security boundary. Every rule here must be re-checked on the server once
 * the auth backend exists, because anyone can bypass client-side validation.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordStrength = "weak" | "fair" | "strong";

export interface PasswordCheck {
    label: string;
    passed: boolean;
}

/** Returns an error message, or null when the value is acceptable. */
export function validateEmail(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return "Enter your email address.";
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
        return "That doesn't look like a valid email address.";
    }

    return null;
}

export function validateRequiredPassword(value: string): string | null {
    if (!value) {
        return "Enter your password.";
    }

    return null;
}

export function validateNewPassword(value: string): string | null {
    if (!value) {
        return "Choose a password.";
    }

    if (value.length < MIN_PASSWORD_LENGTH) {
        return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    return null;
}

export function validateName(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return "Enter your name.";
    }

    if (trimmed.length < 2) {
        return "That name looks too short.";
    }

    return null;
}

export function validateConfirmation(
    password: string,
    confirmation: string
): string | null {
    if (!confirmation) {
        return "Repeat your password.";
    }

    if (password !== confirmation) {
        return "Those passwords don't match.";
    }

    return null;
}

/** The checklist shown under the password field on sign-up. */
export function getPasswordChecks(value: string): PasswordCheck[] {
    return [
        {
            label: `${MIN_PASSWORD_LENGTH}+ characters`,
            passed: value.length >= MIN_PASSWORD_LENGTH,
        },
        {
            label: "Upper & lowercase",
            passed: /[a-z]/.test(value) && /[A-Z]/.test(value),
        },
        {
            label: "A number or symbol",
            passed: /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value),
        },
    ];
}

export function getPasswordStrength(value: string): PasswordStrength {
    const passed = getPasswordChecks(value).filter((check) => check.passed).length;

    if (!value || passed <= 1) return "weak";
    if (passed === 2) return "fair";
    return "strong";
}

export const STRENGTH_META: Record<
    PasswordStrength,
    { label: string; barClass: string; textClass: string; width: string }
> = {
    weak: {
        label: "Weak",
        barClass: "bg-coral",
        textClass: "text-coral",
        width: "33%",
    },
    fair: {
        label: "Fair",
        barClass: "bg-amber",
        textClass: "text-amber",
        width: "66%",
    },
    strong: {
        label: "Strong",
        barClass: "bg-teal",
        textClass: "text-teal",
        width: "100%",
    },
};