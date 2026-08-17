import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Reverses payload bytes safely while keeping 44-byte WAV headers intact if applicable
    const reversedBuffer = Buffer.alloc(inputBuffer.length);
    inputBuffer.copy(reversedBuffer);
    
    const headerOffset = 44;
    if (inputBuffer.length > headerOffset) {
      inputBuffer.copy(reversedBuffer, 0, 0, headerOffset);
      const dataChunk = inputBuffer.subarray(headerOffset);
      const reversedData = Buffer.from(dataChunk).reverse();
      reversedData.copy(reversedBuffer, headerOffset);
    } else {
      inputBuffer.reverse().copy(reversedBuffer);
    }

    return new Response(reversedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="reversed-audio.wav"`,
      },
    });
  } catch (error) {
    console.error("Error reversing audio backend:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error during audio reversal" },
      { status: 500 }
    );
  }
}