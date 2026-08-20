const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_WINDOWS_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const KNOWN_FILE_EXTENSION =
  /\.(?:mp3|wav|m4a|ogg|aac|flac|webm|mpeg|mp4|mov|avi|mkv|m4r|pdf|json|zip)$/i;

export interface DownloadFilenameOptions {
  extension: string;
  fallbackBaseName: string;
}

function normalizeExtension(extension: string): string {
  const normalized = extension.trim().replace(/^\.+/, "").toLowerCase();
  return normalized || "bin";
}

function removeKnownExtension(value: string, extension: string): string {
  const outputExtensionPattern = new RegExp(`(?:\\.${extension})+$`, "i");
  return value
    .replace(outputExtensionPattern, "")
    .replace(KNOWN_FILE_EXTENSION, "");
}

export function normalizeDownloadFilename(
  value: string,
  options: DownloadFilenameOptions
): string {
  const extension = normalizeExtension(options.extension);
  const fallbackBaseName = options.fallbackBaseName
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/[. ]+$/g, "")
    .trim() || "download";

  let baseName = removeKnownExtension(value.trim(), extension)
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!baseName) {
    baseName = fallbackBaseName;
  }

  if (RESERVED_WINDOWS_NAME.test(baseName)) {
    baseName = `_${baseName}`;
  }

  return `${baseName}.${extension}`;
}

export function extensionFromFilename(filename: string): string {
  const match = filename.trim().match(/\.([^.]+)$/);
  return match?.[1]?.toLowerCase() || "bin";
}

export function baseNameFromFilename(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "");
}
