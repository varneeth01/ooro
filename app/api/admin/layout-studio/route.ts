import { NextResponse } from 'next/server'
import { AdminAuthError, proxyAdminRequest } from '@/lib/auth/backend-session'

export async function GET() {
  try {
    const response = await proxyAdminRequest('/api/admin/layout-studio')
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? 'Admin authorization is required' : 'Layout Studio API is unavailable' } }, { status: error instanceof AdminAuthError ? error.status : 502 })
  }
}

export async function POST(request: Request) {
  try {
    const response = await proxyAdminRequest('/api/admin/layout-studio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: await request.text() })
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? 'Admin authorization is required' : 'Layout Studio API is unavailable' } }, { status: error instanceof AdminAuthError ? error.status : 502 })
  }
}
