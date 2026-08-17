import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided in request" },
        { status: 400 }
      );
    }

    const metadata = {
      originalName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      lastModifiedTimestamp: file.lastModified,
      processedByServerAt: new Date().toISOString(),
      serverNote: "Metadata successfully validated and inspected by Audio Studio backend service."
    };

    return NextResponse.json({
      success: true,
      message: "File information retrieved successfully",
      metadata,
    });
  } catch (error) {
    console.error("Error in file-information API route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error during file inspection" },
      { status: 500 }
    );
  }
}