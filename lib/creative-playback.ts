import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { probeCreative } from "@/lib/creative-probe";

const execute = promisify(execFile);
const MAX_CREATIVE_BYTES = 100 * 1024 * 1024;

export type PlaybackCreative = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds?: number;
  normalized: boolean;
};

/**
 * Normalize uploaded video to the playback profile supported by current web
 * browsers and the low-power Android screens: H.264, 8-bit 4:2:0, <=1080p,
 * 30fps, MP4 with its index at the front. Strip audio because OORO displays
 * run muted. Image bytes are preserved exactly.
 */
export async function prepareCreativeForPlayback(
  input: Buffer,
  fileName: string,
  mimeType: string,
): Promise<PlaybackCreative> {
  const source = await probeCreative(input, mimeType);
  if (!mimeType.startsWith("video/")) {
    return { bytes: input, fileName, mimeType, width: source.width, height: source.height, normalized: false };
  }

  const directory = await mkdtemp(path.join(tmpdir(), "ooro-video-"));
  const inputPath = path.join(directory, `input${mimeType === "video/webm" ? ".webm" : ".mp4"}`);
  const outputPath = path.join(directory, "playback.mp4");
  try {
    await writeFile(inputPath, input);
    await execute("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", inputPath,
      "-map", "0:v:0", "-an", "-sn", "-dn",
      "-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
      "-c:v", "libx264", "-profile:v", "baseline", "-level", "4.1", "-pix_fmt", "yuv420p",
      "-preset", "veryfast", "-crf", "23", "-maxrate", "4M", "-bufsize", "8M",
      "-movflags", "+faststart", "-f", "mp4", outputPath,
    ], { timeout: 120_000, maxBuffer: 64 * 1024 });
    const bytes = await readFile(outputPath);
    if (!bytes.length || bytes.length > MAX_CREATIVE_BYTES) throw new Error("CREATIVE_NORMALIZED_SIZE_INVALID");
    const metadata = await probeCreative(bytes, "video/mp4");
    return {
      bytes,
      fileName: `${fileName.replace(/\.[^.]+$/, "") || "creative"}.mp4`,
      mimeType: "video/mp4",
      width: metadata.width,
      height: metadata.height,
      durationSeconds: metadata.durationSeconds,
      normalized: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "CREATIVE_NORMALIZED_SIZE_INVALID") throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      throw new Error("CREATIVE_TRANSCODER_UNAVAILABLE");
    }
    throw new Error("CREATIVE_TRANSCODE_FAILED");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
