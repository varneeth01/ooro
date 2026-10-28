import assert from 'node:assert/strict'
import net from 'node:net'
import test from 'node:test'
import { createClamAvScanner } from './document-scanner.js'

const withScanner = async (response: string | null, testCase: (port: number) => Promise<void>, delayMs = 0) => {
  const server = net.createServer((socket) => {
    socket.on('data', (data) => {
      if (!response) return
      if (delayMs) setTimeout(() => socket.write(`${response}\0`), delayMs)
      else socket.write(`${response}\0`)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as net.AddressInfo).port
  try { await testCase(port) } finally { await new Promise<void>((resolve) => server.close(() => resolve())) }
}

test('ClamAV INSTREAM returns clean for a safe synthetic document', async () => {
  await withScanner('stream: OK', async (port) => {
    assert.equal(await createClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 500, retries: 0 }).scan(Buffer.from('%PDF-1.7 synthetic test document')), 'CLEAN')
  })
})

test('ClamAV INSTREAM returns infected for the EICAR test signature', async () => {
  await withScanner('stream: Eicar-Test-Signature FOUND', async (port) => {
    const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
    assert.equal(await createClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 500, retries: 0 }).scan(eicar), 'INFECTED')
  })
})

test('scanner timeout fails closed as unavailable', async () => {
  await withScanner('stream: OK', async (port) => {
    assert.equal(await createClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 20, retries: 0 }).scan(Buffer.from('safe')), 'SCANNER_UNAVAILABLE')
  }, 100)
})

test('scanner connection failure is distinct from a scan failure', async () => {
  const server = net.createServer(); await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as net.AddressInfo).port; await new Promise<void>((resolve) => server.close(() => resolve()))
  assert.equal(await createClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 100, retries: 0 }).scan(Buffer.from('safe')), 'SCANNER_UNAVAILABLE')
})

test('malformed scanner response is a scan failure', async () => {
  await withScanner('stream: UNKNOWN', async (port) => {
    assert.equal(await createClamAvScanner({ host: '127.0.0.1', port, timeoutMs: 500, retries: 0 }).scan(Buffer.from('safe')), 'SCAN_FAILED')
  })
})
