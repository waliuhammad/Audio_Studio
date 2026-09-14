import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Audio Mixture — not built yet.
 *
 * This file was committed empty, which is worse than absent: a route with no
 * handlers answers 405 Method Not Allowed, which reads as "you asked wrongly"
 * rather than "this does not exist yet". 501 says the latter, which is the
 * truth, and the JSON body matches the shape every other tool route returns
 * so a caller can read the error the same way.
 *
 * Replace this with the real implementation when the tool lands; the page at
 * /audiotools/audio-mixture is a placeholder for the same reason.
 */
export async function POST() {
    return NextResponse.json(
        { error: "The Audio Mixture tool is not available yet." },
        { status: 501 }
    );
}
