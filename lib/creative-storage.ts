import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Storage } from "@google-cloud/storage";
import { hasExpectedCreativeSignature } from "@/lib/creative-validation";

export type StoredCreative = { storageKey: string; url: string; checksum: string; size: number };

export async function storeCreative(bytes: Buffer, fileName: string, mimeType: string): Promise<StoredCreative> {
  if (!hasExpectedCreativeSignature(bytes, mimeType)) throw new Error("CREATIVE_CONTENT_TYPE_MISMATCH");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "creative";
  const storageKey = `${checksum}-${safeName}`;
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();
  const configuredBase = (process.env.PUBLIC_ASSET_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && configuredBase && !/^https:\/\//i.test(configuredBase)) throw new Error("PUBLIC_ASSET_BASE_URL_MUST_BE_HTTPS");

  if (bucketName) {
    const objectName = `uploads/${storageKey}`;
    await new Storage().bucket(bucketName).file(objectName).save(bytes, {
      resumable: false,
      metadata: { contentType: mimeType },
    });
    const url = configuredBase
      ? `${configuredBase}/${objectName.split("/").map(encodeURIComponent).join("/")}`
      : `https://storage.googleapis.com/${encodeURIComponent(bucketName)}/${objectName.split("/").map(encodeURIComponent).join("/")}`;
    return { storageKey, url, checksum, size: bytes.byteLength };
  }

  // Netlify/serverless filesystems are ephemeral and are not safe for a
  // multi-instance deployment. Production uploads must use durable storage.
  if (process.env.NODE_ENV === "production") throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const root = process.env.OBJECT_STORAGE_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  return { storageKey, url: `${configuredBase}/uploads/${encodeURIComponent(storageKey)}`, checksum, size: bytes.byteLength };
}
