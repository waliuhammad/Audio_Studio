import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Audio splitter API is working.",
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Audio splitter POST API is working.",
  });
}