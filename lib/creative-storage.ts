import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { hasExpectedCreativeSignature } from "@/lib/creative-validation";

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const r2Config = () => ({
  account: process.env.R2_ACCOUNT_ID?.trim() || "",
  bucket: process.env.R2_BUCKET_NAME?.trim() || "",
  accessKey: process.env.R2_ACCESS_KEY_ID?.trim() || "",
  secretKey: process.env.R2_SECRET_ACCESS_KEY?.trim() || "",
  publicBase: process.env.PUBLIC_ASSET_BASE_URL?.trim().replace(/\/$/, "") || "",
});
const publicMediaOrigin = (base: string) => {
  try {
    const url = new URL(base);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch { return false; }
};

export function creativeStorageReadiness(): { ready: boolean; provider: "r2" | "local" | "unconfigured"; reason?: string; missing?: string[] } {
  const config = r2Config();
  const missing = [
    !config.account && "R2_ACCOUNT_ID",
    !config.bucket && "R2_BUCKET_NAME",
    !config.accessKey && "R2_ACCESS_KEY_ID",
    !config.secretKey && "R2_SECRET_ACCESS_KEY",
    !publicMediaOrigin(config.publicBase) && "PUBLIC_ASSET_BASE_URL (valid HTTPS origin)",
  ].filter((value): value is string => typeof value === "string");
  if (!missing.length) return { ready: true, provider: "r2" };
  if (process.env.NODE_ENV !== "production" && ![config.account, config.bucket, config.accessKey, config.secretKey, config.publicBase].some(Boolean)) return { ready: true, provider: "local" };
  return { ready: false, provider: "unconfigured", reason: "R2_STORAGE_OR_MEDIA_ORIGIN_NOT_CONFIGURED", missing };
}

export type StoredCreative = { storageKey: string; url: string; checksum: string; size: number };

// Use the S3 SDK signer so canonical URI encoding, signed headers, and R2's
// region handling follow the SigV4 implementation maintained by AWS.
async function putR2(config: ReturnType<typeof r2Config>, objectPath: string, bytes: Buffer, mimeType: string) {
  const host = `${config.account}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${host}`,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectPath,
      Body: bytes,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { sha256: digest(bytes) },
    }));
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const name = (error as { name?: unknown })?.name;
    const safeName = typeof name === "string" && /^[A-Za-z0-9_]{1,48}$/.test(name) ? name : "NETWORK";
    throw new Error(status ? `R2_UPLOAD_FAILED_${status}` : `R2_UPLOAD_FAILED_${safeName}`);
  } finally {
    client.destroy();
  }
}

export async function storeCreative(bytes: Buffer, fileName: string, mimeType: string): Promise<StoredCreative> {
  if (!hasExpectedCreativeSignature(bytes, mimeType)) throw new Error("CREATIVE_CONTENT_TYPE_MISMATCH");
  const checksum = digest(bytes);
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "creative";
  const storageKey = `${checksum}-${safeName}`;
  const config = r2Config();
  const state = creativeStorageReadiness();
  if (!state.ready) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");

  if (state.provider === "r2") {
    const objectName = `uploads/${storageKey}`;
    await putR2(config, objectName, bytes, mimeType);
    // Only an explicitly configured, HTTPS media domain that actually serves uploads/*.
    const url = `${config.publicBase}/${objectName.split("/").map(encodeURIComponent).join("/")}`;
    return { storageKey, url, checksum, size: bytes.byteLength };
  }

  if (process.env.NODE_ENV === "production") throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const root = process.env.OBJECT_STORAGE_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  return { storageKey, url: `/uploads/${encodeURIComponent(storageKey)}`, checksum, size: bytes.byteLength };
}
