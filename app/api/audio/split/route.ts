import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import {
  AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MediaError,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  runFFmpeg,
  safeBaseName,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_SEGMENTS = 50;

interface SegmentInput {
  start: number;
  end: number;
  name?: string;
}

/**
 * Split one audio file into multiple segments and return them as a ZIP.
 *
 * Segments arrive as a JSON array in the `segments` field:
 *   [{ "start": 0, "end": 30 }, { "start": 30, "end": 62, "name": "verse" }]
 */
function parseSegments(raw: FormDataEntryValue | null): SegmentInput[] {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new MediaError("No split points were provided.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new MediaError("Split points were not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new MediaError("Provide at least one segment.");
  }

  if (parsed.length > MAX_SEGMENTS) {
    throw new MediaError(`Too many segments. The limit is ${MAX_SEGMENTS}.`);
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new MediaError(`Segment ${index + 1} is malformed.`);
    }

    const record = entry as Record<string, unknown>;
    const start = Number(record.start);
    const end = Number(record.end);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new MediaError(`Segment ${index + 1} has invalid times.`);
    }

    if (start < 0) {
      throw new MediaError(`Segment ${index + 1} starts before zero.`);
    }

    if (end - start < 0.1) {
      throw new MediaError(
        `Segment ${index + 1} is too short — use at least 0.1 seconds.`
      );
    }

    const name =
      typeof record.name === "string" && record.name.trim()
        ? safeBaseName(record.name, `part-${index + 1}`)
        : `part-${index + 1}`;

    return { start, end, name };
  });
}

export async function POST(request: NextRequest) {
  // Signed-in users only, and only within today's plan allowance.
  // Claimed BEFORE any work starts — checking afterwards would mean
  // the processing was already done and paid for.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();

  let tempDir: string | null = null;

  try {
    const formData = await request.formData();

    const upload = validateUpload(formData.get("file"), {
      allowed: AUDIO_EXTENSIONS,
      maxBytes: MAX_AUDIO_BYTES,
      label: "audio file",
    });

    const segments = parseSegments(formData.get("segments"));

    tempDir = await createTempDir("audio-split");

    const inputPath = await writeUpload(tempDir, upload);
    const zip = new JSZip();

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (!segment) continue;

      const outputPath = path.join(tempDir, `segment-${index}.mp3`);

      await runFFmpeg([
        "-y",
        "-ss",
        String(segment.start),
        "-i",
        inputPath,
        "-t",
        String(segment.end - segment.start),
        "-vn",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        outputPath,
      ]);

      const data = await fs.readFile(outputPath);

      zip.file(
        `${String(index + 1).padStart(2, "0")}-${segment.name}.mp3`,
        data
      );
    }

    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      // MP3 is already compressed — level 1 saves CPU for ~no size gain.
      compressionOptions: { level: 1 },
    });

    // Count this job against the signed-in user's stats.
    await recordUsage(startedAt);

    return new NextResponse(new Uint8Array(archive), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${upload.baseName}-segments.zip`
        )}"`,
        "Content-Length": String(archive.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(tempDir);
  }
}