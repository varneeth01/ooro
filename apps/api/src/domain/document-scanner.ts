import net from 'node:net'
import { config } from '../config.js'

export type DocumentScanOutcome = 'CLEAN' | 'INFECTED' | 'SCANNER_UNAVAILABLE' | 'SCAN_FAILED'

export type DocumentScanner = {
  scan(content: Buffer): Promise<DocumentScanOutcome>
}

const clamChunkSize = 64 * 1024

type ClamAvOptions = { host: string; port: number; timeoutMs: number; retries: number }

export class ClamAvScanner implements DocumentScanner {
  constructor(private readonly options: ClamAvOptions) {}
  async scan(content: Buffer): Promise<DocumentScanOutcome> {
    if (!this.options.host || !Number.isInteger(this.options.port) || this.options.port < 1 || this.options.port > 65535) return 'SCANNER_UNAVAILABLE'
    let last: DocumentScanOutcome = 'SCANNER_UNAVAILABLE'
    for (let attempt = 0; attempt <= this.options.retries; attempt += 1) {
      const outcome = await this.scanOnce(content)
      if (outcome === 'CLEAN' || outcome === 'INFECTED') return outcome
      last = outcome
    }
    return last
  }

  private scanOnce(content: Buffer): Promise<DocumentScanOutcome> {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: this.options.host, port: this.options.port })
      let response = ''
      let settled = false
      const finish = (outcome: DocumentScanOutcome) => { if (!settled) { settled = true; socket.destroy(); resolve(outcome) } }
      const timer = setTimeout(() => finish('SCANNER_UNAVAILABLE'), this.options.timeoutMs)
      socket.once('connect', () => {
        socket.write(Buffer.from('zINSTREAM\0'))
        for (let offset = 0; offset < content.length; offset += clamChunkSize) {
          const chunk = content.subarray(offset, Math.min(offset + clamChunkSize, content.length))
          const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length)
          socket.write(size); socket.write(chunk)
        }
        const end = Buffer.alloc(4); end.writeUInt32BE(0); socket.write(end)
      })
      socket.on('data', (part) => {
        response += part.toString('utf8')
        if (!response.includes('\0') && !response.includes('\n')) return
        clearTimeout(timer)
        const normalized = response.replaceAll('\0', '').trim()
        if (/FOUND\s*$/i.test(normalized)) finish('INFECTED')
        else if (/OK\s*$/i.test(normalized)) finish('CLEAN')
        else finish('SCAN_FAILED')
      })
      socket.once('timeout', () => { clearTimeout(timer); finish('SCANNER_UNAVAILABLE') })
      socket.once('error', () => { clearTimeout(timer); finish('SCANNER_UNAVAILABLE') })
      socket.once('close', () => { clearTimeout(timer); if (!settled) finish('SCAN_FAILED') })
      socket.setTimeout(this.options.timeoutMs)
    })
  }
}

class LocalDevelopmentScanner implements DocumentScanner {
  async scan(_content: Buffer): Promise<DocumentScanOutcome> { return 'CLEAN' }
}

export const createClamAvScanner = (options: ClamAvOptions) => new ClamAvScanner(options)

export const documentScanner: DocumentScanner = config.documentScanMode === 'remote'
  ? new ClamAvScanner({ host: config.documentScannerHost, port: config.documentScannerPort, timeoutMs: config.documentScannerTimeoutMs, retries: config.documentScannerRetries })
  : new LocalDevelopmentScanner()
