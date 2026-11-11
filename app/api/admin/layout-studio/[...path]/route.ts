import { NextResponse } from 'next/server'
import { AdminAuthError, proxyAdminRequest } from '@/lib/auth/backend-session'

const allowed = /^(content|[0-9a-f-]{36})(\/(draft|validate|publish|assign|rollback|archive))?$/i
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/')
  if (!allowed.test(path)) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 })
  try {
    const response = await proxyAdminRequest(`/api/admin/layout-studio/${path}`, { method: request.method, headers: { 'content-type': 'application/json' }, ...(request.method === 'GET' ? {} : { body: await request.text() }) })
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? 'Admin authorization is required' : 'Layout Studio API is unavailable' } }, { status: error instanceof AdminAuthError ? error.status : 502 })
  }
}
export { handle as GET, handle as PUT, handle as POST }
