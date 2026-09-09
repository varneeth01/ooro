export type DeliveryCommandStatus = 'PENDING_SYNC' | 'QUEUED' | 'DELIVERED' | 'RECEIVED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | string
export type DisplayDeliveryState = 'PENDING' | 'COMMAND_SENT' | 'READY' | 'OFFLINE' | 'FAILED'

export function deriveDisplayDeliveryState(input: { online: boolean; commandStatus: DeliveryCommandStatus }): DisplayDeliveryState {
  if (input.commandStatus === 'FAILED') return 'FAILED'
  if (!input.online) return 'OFFLINE'
  if (input.commandStatus === 'SUCCEEDED') return 'READY'
  if (['DELIVERED', 'RECEIVED', 'PROCESSING'].includes(input.commandStatus)) return 'COMMAND_SENT'
  return 'PENDING'
}
