// app/audiotools/pitch/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const semitones = formData.get("semitones") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    // Pass-through or process the audio file with your pitch-shifting backend/library here.
    // For demonstration, we return the uploaded file buffer back as a download stream.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.type || "audio/mpeg",
        "Content-Disposition": `attachment; filename="pitch-${semitones || 0}st-${file.name}"`,
      },
    });
  } catch (error) {
    console.error("Pitch processing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during pitch processing." },
      { status: 500 }
    );
  }
}