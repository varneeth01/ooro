import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredCreative = { storageKey: string; url: string; checksum: string; size: number };

export async function storeCreative(bytes: Buffer, fileName: string, mimeType: string): Promise<StoredCreative> {
  void mimeType;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "creative";
  const storageKey = `${checksum}-${safeName}`;
  if (process.env.NODE_ENV === "production" && !process.env.OBJECT_STORAGE_DIR) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const root = process.env.OBJECT_STORAGE_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  const base = process.env.PUBLIC_ASSET_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  return { storageKey, url: `${base}/uploads/${encodeURIComponent(storageKey)}`, checksum, size: bytes.byteLength };
}
