"use client";

import { createContext, useContext } from "react";
import type { AccountSummary } from "@/lib/dashboard/account";

/**
 * Makes the signed-in account available to the dashboard's client components.
 *
 * The value is read on the SERVER by ProtectedShell and passed down as a prop,
 * so the first paint already shows the right name — no loading spinner in the
 * topbar, and no flash of someone else's initials.
 */

const AccountContext = createContext<AccountSummary | null>(null);

export function SessionProvider({
    account,
    children,
}: {
    account: AccountSummary;
    children: React.ReactNode;
}) {
    return (
        <AccountContext.Provider value={account}>
            {children}
        </AccountContext.Provider>
    );
}

/**
 * Throws outside the provider rather than returning null.
 *
 * Every caller lives under a protected layout, so a missing account means the
 * component was moved somewhere it cannot work — a bug worth failing loudly
 * for, not one to paper over with placeholder initials.
 */
export function useAccount(): AccountSummary {
    const account = useContext(AccountContext);

    if (!account) {
        throw new Error(
            "useAccount() must be used inside a route wrapped by ProtectedShell."
        );
    }

    return account;
}
