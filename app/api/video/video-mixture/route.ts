import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Video Mixture — not built yet. See the note in the audio-mixture route. */
export async function POST() {
    return NextResponse.json(
        { error: "The Video Mixture tool is not available yet." },
        { status: 501 }
    );
}
