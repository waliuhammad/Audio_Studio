import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import ffmpegPath from "ffmpeg-static";

export const runtime = "nodejs";

// Must stay in sync with FORMAT_OPTIONS in the page component.
const ALLOWED_OUTPUT_FORMATS = ["mp3", "wav", "m4a", "aac", "flac", "ogg"] as const;
type OutputFormat = (typeof ALLOWED_OUTPUT_FORMATS)[number];

const CONTENT_TYPES: Record<OutputFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

// Codec/container flags per output format. m4a and aac both encode with the
// AAC codec; aac additionally needs an explicit ADTS bitstream since it has
// no container of its own.
const CODEC_ARGS: Record<OutputFormat, string[]> = {
  mp3: ["-c:a", "libmp3lame", "-q:a", "2"],
  wav: ["-c:a", "pcm_s16le"],
  m4a: ["-c:a", "aac", "-b:a", "192k"],
  aac: ["-c:a", "aac", "-b:a", "192k", "-f", "adts"],
  flac: ["-c:a", "flac"],
  ogg: ["-c:a", "libvorbis", "-q:a", "5"],
};

function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (ALLOWED_OUTPUT_FORMATS as readonly string[]).includes(value);
}

function clampVolume(raw: FormDataEntryValue | null, fallback: number): number {
  const parsed = typeof raw === "string" ? parseFloat(raw) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(3, Math.max(0, parsed));
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary was not found on this server."));
      return;
    }

    const proc = spawn(ffmpegPath as string, args);
    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => reject(err));

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.slice(-2000) || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  let workDir: string | null = null;

  try {
    const formData = await request.formData();

    const voiceFile = formData.get("voiceFile");
    const musicFile = formData.get("musicFile");

    if (!(voiceFile instanceof File) || !(musicFile instanceof File)) {
      return NextResponse.json(
        { error: "Both a voice track and a music track are required." },
        { status: 400 }
      );
    }

    const formatRaw = formData.get("format");
    const format: OutputFormat = isOutputFormat(formatRaw) ? formatRaw : "mp3";

    const voiceVolume = clampVolume(formData.get("voiceVolume"), 1);
    const musicVolume = clampVolume(formData.get("musicVolume"), 0.6);
    const syncMode = formData.get("syncMode") === "trim" ? "trim" : "loop";

    workDir = await mkdtemp(path.join(tmpdir(), "audio-merger-"));

    const voiceExt = path.extname(voiceFile.name) || ".tmp";
    const musicExt = path.extname(musicFile.name) || ".tmp";
    const voicePath = path.join(workDir, `voice${voiceExt}`);
    const musicPath = path.join(workDir, `music${musicExt}`);
    const outputPath = path.join(workDir, `merged.${format}`);

    await writeFile(voicePath, Buffer.from(await voiceFile.arrayBuffer()));
    await writeFile(musicPath, Buffer.from(await musicFile.arrayBuffer()));

    // amix duration=first + an infinite loop on the music input means the
    // mix runs exactly as long as the voice track, repeating the music to
    // fill it. duration=shortest (no loop) stops at whichever track is
    // shorter instead.
    const filterGraph =
      `[0:a]volume=${voiceVolume}[voice];` +
      `[1:a]volume=${musicVolume}[music];` +
      `[voice][music]amix=inputs=2:duration=${syncMode === "loop" ? "first" : "shortest"}:dropout_transition=2[aout]`;

    const args = ["-y", "-i", voicePath];

    if (syncMode === "loop") {
      args.push("-stream_loop", "-1");
    }

    args.push(
      "-i",
      musicPath,
      "-filter_complex",
      filterGraph,
      "-map",
      "[aout]",
      ...CODEC_ARGS[format],
      outputPath
    );

    await runFfmpeg(args);

    const outputBuffer = await readFile(outputPath);

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `attachment; filename="merged.${format}"`,
      },
    });
  } catch (error) {
    console.error("Error merging audio:", error);
    const message = error instanceof Error ? error.message : "Failed to merge audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}