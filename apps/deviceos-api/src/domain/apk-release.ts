import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { config } from '../config.js'
import { ApiError } from '../errors.js'

const execFileAsync = promisify(execFile)

export type ApkMetadata = {
  packageName: string
  versionCode: bigint
  versionName: string
  minSdk: number
  targetSdk: number
  certificateSha256: string
  sha256: string
  sizeBytes: bigint
  label?: string
}

export function assertSigningCertificateContinuity(previousCertificateSha256: string | null | undefined, nextCertificateSha256: string): void {
  if (previousCertificateSha256 && previousCertificateSha256.toLowerCase() !== nextCertificateSha256.toLowerCase()) throw new ApiError('APK_SIGNING_CERTIFICATE_CHANGED', 'APK signing certificate differs from the application release lineage', 422)
}

export function assertApkMetadataCompatibility(metadata: Pick<ApkMetadata, 'versionCode' | 'minSdk' | 'targetSdk'>): void {
  if (metadata.versionCode < 1n) throw new ApiError('INVALID_APK_METADATA', 'APK version code must be positive', 422)
  if (!Number.isInteger(metadata.minSdk) || metadata.minSdk < 1 || !Number.isInteger(metadata.targetSdk) || metadata.targetSdk < metadata.minSdk) throw new ApiError('INVALID_APK_METADATA', 'APK SDK metadata is inconsistent', 422)
}

export function decodeApkBase64(value: string): Buffer {
  const encoded = value.replace(/^data:application\/vnd\.android\.package-archive;base64,/, '')
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new ApiError('APK_ENCODING_INVALID', 'APK payload is not valid base64', 422)
  const content = Buffer.from(encoded, 'base64')
  const normalizedInput = encoded.replace(/=+$/, '')
  const normalizedOutput = content.toString('base64').replace(/=+$/, '')
  if (!content.length || normalizedInput !== normalizedOutput) throw new ApiError('APK_ENCODING_INVALID', 'APK payload is not valid base64', 422)
  return content
}

function outputValue(output: string, pattern: RegExp, field: string): string {
  const match = output.match(pattern)
  if (!match?.[1]) throw new ApiError('INVALID_APK_METADATA', `APK metadata is missing ${field}`, 422)
  return match[1]
}

export async function inspectApk(content: Buffer): Promise<ApkMetadata> {
  if (!content.length || content.length > config.deviceOsMaxApkBytes) throw new ApiError('APK_SIZE_INVALID', 'APK is empty or exceeds the configured maximum size', 422)
  if (content.subarray(0, 2).toString() !== 'PK') throw new ApiError('INVALID_APK', 'Uploaded file is not a ZIP/APK', 422)
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ooro-deviceos-'))
  const file = path.join(tempDir, `${randomUUID()}.apk`)
  await writeFile(file, content, { flag: 'wx', mode: 0o600 })
  try {
    const [{ stdout: badging }, { stdout: certs }] = await Promise.all([
      execFileAsync(config.deviceOsAapt2Path, ['dump', 'badging', file], { maxBuffer: 2 * 1024 * 1024 }),
      execFileAsync(config.deviceOsApksignerPath, ['verify', '--print-certs', file], { maxBuffer: 2 * 1024 * 1024 }),
    ]).catch(() => { throw new ApiError('APK_METADATA_UNAVAILABLE', 'APK metadata or signing certificate could not be verified', 422) })
    const packageName = outputValue(badging, /package: name='([^']+)'/, 'package name')
    const versionCode = BigInt(outputValue(badging, /versionCode='(\d+)'/, 'version code'))
    const versionName = outputValue(badging, /versionName='([^']*)'/, 'version name')
    const minSdk = Number(outputValue(badging, /sdkVersion:'(\d+)'/, 'min SDK'))
    const targetSdk = Number(outputValue(badging, /targetSdkVersion:'(\d+)'/, 'target SDK'))
    const certificateSha256 = outputValue(certs, /certificate SHA-256 digest:\s*([a-f0-9:]+)/i, 'signing certificate').replaceAll(':', '').toLowerCase()
    if (!/^([a-f0-9]{64})$/.test(certificateSha256)) throw new ApiError('APK_CERTIFICATE_INVALID', 'APK signing certificate digest is invalid', 422)
    const metadata = { packageName, versionCode, versionName, minSdk, targetSdk, certificateSha256, sha256: createHash('sha256').update(content).digest('hex'), sizeBytes: BigInt(content.length), label: badging.match(/application-label:'([^']*)'/)?.[1] }
    assertApkMetadataCompatibility(metadata)
    return metadata
  } finally { await rm(tempDir, { recursive: true, force: true }) }
}
