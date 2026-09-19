const signature = (bytes: Buffer, offset: number, expected: number[]) => bytes.subarray(offset, offset + expected.length).equals(Buffer.from(expected));

export function hasExpectedCreativeSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return signature(bytes, 0, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return signature(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "video/mp4") return bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp";
  if (mimeType === "video/webm") return signature(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3]);
  return false;
}
