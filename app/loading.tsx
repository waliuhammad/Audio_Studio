/**
 * Shown while a route segment streams in.
 *
 * The protected pages resolve a session and read Firestore on the server, so
 * a navigation can sit for a moment with nothing on screen. A quiet pulse is
 * enough to say "this is working" without pretending to be the page that is
 * about to arrive.
 */
export default function Loading() {
    return (
        <div
            role="status"
            aria-label="Loading"
            className="flex min-h-screen items-center justify-center bg-paper dark:bg-ink"
        >
            <span className="flex items-center gap-2">
                {[0, 1, 2].map((index) => (
                    <span
                        key={index}
                        className="h-2 w-2 animate-pulse rounded-full bg-amber/70"
                        style={{ animationDelay: `${index * 150}ms` }}
                    />
                ))}
            </span>
        </div>
    );
}
