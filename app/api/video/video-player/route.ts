import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided." },
        { status: 400 }
      );
    }

    // Server-side video handling simulation
    console.log(`Loading video stream for file: ${file.name}`);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully initialized playback for ${file.name}!`,
        fileName: file.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Video processing error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during video loading." },
      { status: 500 }
    );
  }
}