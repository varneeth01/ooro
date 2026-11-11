export type DeviceOsProxyFailure = { status?: number; code?: string }

export async function readDeviceOsJson(response: Response, requestId: string) {
  const payload: unknown = await response.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      status: 502,
      body: {
        data: null,
        error: { code: 'DEVICEOS_INVALID_RESPONSE', message: 'DeviceOS service returned an invalid response' },
        requestId,
      },
    }
  }
  return { status: response.status, body: payload }
}

export function deviceOsProxyFailure(failure: DeviceOsProxyFailure | undefined, requestId: string) {
  const status = failure?.status === 401 || failure?.status === 403 ? failure.status : 502
  const code = failure?.code ?? (status === 502 ? 'DEVICEOS_BACKEND_UNAVAILABLE' : 'ADMIN_AUTH_REQUIRED')
  return {
    status,
    body: {
      data: null,
      error: { code, message: code },
      requestId,
    },
  }
}
