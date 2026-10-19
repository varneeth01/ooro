import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const execute = promisify(execFile);
/** Probe uploaded bytes; browser-supplied video duration is never authoritative. */
export async function probeCreative(bytes: Buffer, mimeType: string) {
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
