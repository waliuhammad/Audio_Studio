import { NextRequest } from "next/server";
import path from "path";
import {
  MAX_VIDEO_BYTES,
  MediaError,
  VIDEO_EXTENSIONS,
  cleanupTempDir,
  createTempDir,
  errorResponse,
  fileResponse,
  probeMedia,
  runFFmpeg,
  validateUpload,
  writeUpload,
} from "@/lib/server/media";
import { recordUsage } from "@/lib/server/usage";
import { guardToolRun, isRefused } from "@/lib/server/tool-guard";
import { parseQuality } from "@/lib/server/quality";
import {
  MIXTURE_FORMATS,
  MIXTURE_LIMITS,
  MixtureInputError,
  buildMixtureArgs,
  fitSegments,
  isMixtureFormat,
  parseSegments,
  readProbe,
  type MixSegment,
  type MixSource,
} from "@/lib/server/video-mixture";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Video Mixture: cut segments out of up to ten videos and join them in any
 * order, a source as many times as wanted.
 *
 * multipart/form-data
 *   files     repeated — each SOURCE video once
 *   segments  JSON, in sequence order: [{ "source": <index into files>,
 *             "start": <seconds>, "end": <seconds> }, ...]
 *   format    mp4 (default) | webm | mov | mkv
 *   quality   high | medium | standard | low
 *
 * The argument building lives in lib/server/video-mixture.ts.
 */
export async function POST(request: NextRequest) {
  // Signed-in users only, within today's allowance — claimed before any work.
  const access = await guardToolRun();
  if (isRefused(access)) return access;

  const startedAt = Date.now();
  let workDir: string | null = null;

  try {
    const formData = await request.formData();
    const entries = formData.getAll("files");

    if (entries.length === 0) {
      throw new MediaError("Please upload at least one video.");
    }

    if (entries.length > MIXTURE_LIMITS.maxSources) {
      throw new MediaError(
        `You can mix at most ${MIXTURE_LIMITS.maxSources} videos at once.`
      );
    }

    const uploads = entries.map((entry) =>
      validateUpload(entry, {
        allowed: VIDEO_EXTENSIONS,
        maxBytes: MAX_VIDEO_BYTES,
        label: "video file",
      })
    );

    const requestedFormat = String(formData.get("format") || "mp4")
      .trim()
      .toLowerCase();

    if (!isMixtureFormat(requestedFormat)) {
      throw new MediaError("Unsupported output format. Choose MP4, WebM, MOV or MKV.");
    }

    const format = requestedFormat;
    const quality = parseQuality(formData.get("quality"));

    let segments: MixSegment[];

    try {
      segments = parseSegments(formData.get("segments"), uploads.length);
    } catch (error) {
      if (error instanceof MixtureInputError) throw new MediaError(error.message);
      throw error;
    }

    workDir = await createTempDir("video-mixture");

    const sources: MixSource[] = [];

    for (const [index, upload] of uploads.entries()) {
      const inputPath = await writeUpload(workDir, upload, `source-${index}`);
      const source = readProbe(await probeMedia(inputPath), inputPath);

      if (!source) {
        throw new MediaError(`"${upload.file.name}" has no video track.`);
      }

      sources.push(source);
    }

    try {
      segments = fitSegments(segments, sources);
    } catch (error) {
      if (error instanceof MixtureInputError) throw new MediaError(error.message);
      throw error;
    }

    const spec = MIXTURE_FORMATS[format];
    const outputPath = path.join(workDir, `mixture.${spec.ext}`);

    await runFFmpeg(
      buildMixtureArgs({
        sources,
        segments,
        format,
        quality,
        // Unknown values fall back to the first clip's own size.
        resolution: String(formData.get("resolution") ?? "").toLowerCase(),
        outputPath,
      })
    );

    await recordUsage(startedAt, {
      fileName:
        uploads.length === 1 && uploads[0]
          ? uploads[0].file.name
          : `${uploads.length} video files`,
      sizeBytes: uploads.reduce((total, upload) => total + upload.file.size, 0),
      kind: "video",
      tool: "Video mixture",
      durationSeconds: segments.reduce(
        (total, segment) => total + (segment.end - segment.start),
        0
      ),
    });

    return await fileResponse(outputPath, {
      contentType: spec.contentType,
      downloadName: `video-mixture.${spec.ext}`,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await cleanupTempDir(workDir);
  }
}
