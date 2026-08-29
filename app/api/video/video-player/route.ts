import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs"; // fs access requires the Node runtime, not edge

const UPLOAD_DIR = path.join(process.cwd(), ".tmp-video-uploads");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const id = randomUUID();
    const ext = path.extname(file.name) || ".mp4";
    const storedPath = path.join(UPLOAD_DIR, `${id}${ext}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storedPath, buffer);

    return NextResponse.json(
      {
        success: true,
        message: `${file.name} is ready to stream.`,
        fileName: file.name,
        id,
        // Client swaps its blob URL for this — a real server-backed stream
        streamUrl: `/api/video/stream/${id}${ext}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: "Internal Server Error during upload." }, { status: 500 });
  }
}