import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const execute = promisify(execFile);

function imageDimensions(bytes: Buffer, mimeType: string) {
 if (mimeType === 'image/png') {
  const signature = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0,8).equals(signature) || bytes.toString('ascii',12,16) !== 'IHDR') throw new Error('CREATIVE_PROBE_FAILED');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
 }

 if (mimeType === 'image/jpeg') {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('CREATIVE_PROBE_FAILED');
  const startOfFrame = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
   if (bytes[offset] !== 0xff) { offset++; continue; }
   while (offset < bytes.length && bytes[offset] === 0xff) offset++;
   const marker = bytes[offset++];
   if (marker === 0xd9 || marker === 0xda) break;
   if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
   if (offset + 1 >= bytes.length) break;
   const length = bytes.readUInt16BE(offset);
   if (length < 2 || offset + length > bytes.length) break;
   if (startOfFrame.has(marker)) {
    if (length < 7) break;
    return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
   }
   offset += length;
  }
  throw new Error('CREATIVE_PROBE_FAILED');
 }

 if (mimeType === 'image/webp') {
  if (bytes.length < 20 || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') throw new Error('CREATIVE_PROBE_FAILED');
  let offset = 12;
  while (offset + 8 <= bytes.length) {
   const chunk = bytes.toString('ascii',offset,offset + 4);
   const size = bytes.readUInt32LE(offset + 4);
   const data = offset + 8;
   if (size > bytes.length - data) break;
   if (chunk === 'VP8X' && size >= 10) {
    return { width: 1 + bytes.readUIntLE(data + 4,3), height: 1 + bytes.readUIntLE(data + 7,3) };
   }
   if (chunk === 'VP8 ' && size >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
    return { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
   }
   if (chunk === 'VP8L' && size >= 5 && bytes[data] === 0x2f) {
    const b1 = bytes[data + 1], b2 = bytes[data + 2], b3 = bytes[data + 3], b4 = bytes[data + 4];
    return { width: 1 + ((b2 & 0x3f) << 8) + b1, height: 1 + ((b4 & 0x0f) << 10) + (b3 << 2) + ((b2 & 0xc0) >> 6) };
   }
   offset = data + size + (size & 1);
  }
  throw new Error('CREATIVE_PROBE_FAILED');
 }

 throw new Error('CREATIVE_PROBE_FAILED');
}

/** Probe uploaded bytes; browser-supplied video duration is never authoritative. */
export async function probeCreative(bytes: Buffer, mimeType: string) {
 if (mimeType.startsWith('image/')) {
  const dimensions = imageDimensions(bytes, mimeType);
  if (!Number.isSafeInteger(dimensions.width) || !Number.isSafeInteger(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) throw new Error('CREATIVE_PROBE_FAILED');
  return { ...dimensions, durationSeconds: undefined };
 }
 const dir = await mkdtemp(path.join(tmpdir(), 'ooro-media-'));
 try {
  const file = path.join(dir, 'asset'); await writeFile(file, bytes);
  const { stdout } = await execute('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration:format=duration','-of','json',file], { timeout:15000, maxBuffer:65536 });
  const result = JSON.parse(stdout) as { streams?: {width?:number;height?:number;duration?:string}[]; format?:{duration?:string} };
  const stream = result.streams?.[0];
  if (!stream?.width || !stream.height) throw new Error('CREATIVE_PROBE_FAILED');
  const duration = Number(result.format?.duration ?? stream.duration);
  if (mimeType.startsWith('video/') && (!Number.isFinite(duration) || duration<=0 || duration>3600)) throw new Error('CREATIVE_PROBE_FAILED');
  return { width:stream.width,height:stream.height,durationSeconds:mimeType.startsWith('video/')?Math.ceil(duration):undefined };
 } catch { throw new Error('CREATIVE_PROBE_FAILED'); }
 finally { await rm(dir,{recursive:true,force:true}); }
}
