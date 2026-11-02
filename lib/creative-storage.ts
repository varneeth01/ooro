import { createHash, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasExpectedCreativeSignature } from "@/lib/creative-validation";

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();
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

// R2 supports S3 SigV4; use native crypto to avoid changing OORO's frozen pnpm lockfile.
async function putR2(config: ReturnType<typeof r2Config>, objectPath: string, bytes: Buffer, mimeType: string) {
  const host = `${config.account}.r2.cloudflarestorage.com`;
  const keyPath = `/${encodeURIComponent(config.bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = date.slice(0, 8);
  const payloadHash = digest(bytes);
  const headers = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${date}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonical = ["PUT", keyPath, "", headers, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", date, scope, digest(canonical)].join("\n");
  const dateKey = hmac("AWS4" + config.secretKey, day);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const response = await fetch(`https://${host}${keyPath}`, {
    method: "PUT",
    headers: {
      "content-type": mimeType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": date,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`,
    },
    body: new Uint8Array(bytes),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`R2_UPLOAD_FAILED_${response.status}`);
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
