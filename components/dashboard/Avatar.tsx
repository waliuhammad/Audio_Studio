"use client";

import { useAccount } from "@/components/providers/SessionProvider";

/**
 * The signed-in user's photo, falling back to their initials.
 *
 * Every place that showed an avatar had its own copy of the initials markup,
 * so adding photo support meant changing all of them — and missing one would
 * leave a stale set of initials next to the photo everywhere else.
 *
 * A plain <img> rather than next/image: the URL points at a Google Storage
 * host that would have to be whitelisted in next.config, and the file is
 * already cropped and resized to roughly what is displayed.
 */
export function Avatar({
    size = 36,
    className = "",
}: {
    /** Rendered width and height in pixels. */
    size?: number;
    className?: string;
}) {
    const account = useAccount();

    return (
        <span
            style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
            className={`
                relative
                flex
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-full
                bg-amber/15
                font-semibold
                text-amber
                ${className}
            `}
        >
            {account.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={account.picture}
                    alt=""
                    className="h-full w-full object-cover"
                />
            ) : (
                account.initials
            )}
        </span>
    );
}
