"use client";

/**
 * Last-resort boundary for errors thrown by the ROOT layout itself.
 *
 * app/error.tsx renders inside the root layout, so it cannot catch a failure
 * in that layout — by then there is no layout to render into. This file
 * replaces the entire document instead, which is why it has to supply its own
 * <html> and <body>.
 *
 * That also means none of the app's providers, fonts or Tailwind theme are
 * guaranteed to be available here, so the styling is deliberately inline and
 * self-contained rather than depending on anything that may itself be broken.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#faf9f7",
                    color: "#1c1b1a",
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                    padding: "24px",
                }}
            >
                <div style={{ maxWidth: "26rem", textAlign: "center" }}>
                    <h1
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 600,
                            letterSpacing: "-0.03em",
                            margin: 0,
                        }}
                    >
                        Audio Studio couldn&apos;t start
                    </h1>

                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.85rem",
                            lineHeight: 1.6,
                            color: "#6b6763",
                        }}
                    >
                        Something failed before the page could render. Reloading
                        usually fixes it.
                    </p>

                    {error.digest && (
                        <p
                            style={{
                                marginTop: "0.75rem",
                                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                                fontSize: "0.65rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.14em",
                                color: "#9a948e",
                            }}
                        >
                            Ref {error.digest}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            marginTop: "1.5rem",
                            height: "2.5rem",
                            padding: "0 1.25rem",
                            borderRadius: "9999px",
                            border: "none",
                            background: "#f59e0b",
                            color: "#1c1b1a",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
