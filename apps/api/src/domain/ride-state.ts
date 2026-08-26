import { ApiError } from '../errors.js'

export const RIDE_STATES = ['IDLE','RIDE_ACCEPTED','TO_PICKUP','PICKUP_DETECTED','VERIFYING','ACTIVE_VERIFIED','ARRIVING','ENDING','COMPLETED','PAYMENT_PENDING','PAYABLE','PAID','REVERSED','CANCELLED','SUSPICIOUS','MANUAL_REVIEW','REJECTED','FAILED'] as const
export type RideState = typeof RIDE_STATES[number]

const transitions: Record<string, RideState[]> = {
  IDLE: ['RIDE_ACCEPTED'],
  RIDE_ACCEPTED: ['TO_PICKUP', 'PICKUP_DETECTED', 'CANCELLED'],
  TO_PICKUP: ['PICKUP_DETECTED', 'VERIFYING', 'CANCELLED'],
  PICKUP_DETECTED: ['VERIFYING', 'CANCELLED'],
  VERIFYING: ['ACTIVE_VERIFIED', 'MANUAL_REVIEW', 'REJECTED', 'CANCELLED'],
  ACTIVE_VERIFIED: ['ARRIVING', 'ENDING', 'CANCELLED', 'SUSPICIOUS'],
  ARRIVING: ['ENDING', 'COMPLETED'],
  ENDING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PAYABLE', 'MANUAL_REVIEW', 'REJECTED'],
  PAYABLE: ['PAID', 'REVERSED'],
}

export function assertRideTransition(from: string, to: RideState) {
  if (!transitions[from]?.includes(to)) throw new ApiError('INVALID_RIDE_TRANSITION', `Ride cannot transition from ${from} to ${to}`, 409)
}

export function stateForEvent(current: string, eventType: string): RideState | null {
  if (eventType === 'RIDE_ACCEPTED' || eventType === 'RIDE_REQUESTED') return current === 'IDLE' ? 'RIDE_ACCEPTED' : null
  if (eventType === 'DRIVER_TO_PICKUP') return current === 'RIDE_ACCEPTED' ? 'TO_PICKUP' : null
  if (['ARRIVED_PICKUP', 'PICKUP_DETECTED', 'PASSENGER_PICKED_UP'].includes(eventType)) return ['RIDE_ACCEPTED','TO_PICKUP'].includes(current) ? 'VERIFYING' : null
  if (eventType === 'RIDE_ACTIVE') return current === 'VERIFYING' ? 'ACTIVE_VERIFIED' : null
  if (eventType === 'RIDE_COMPLETED') return ['ACTIVE_VERIFIED','ARRIVING','ENDING'].includes(current) ? 'ENDING' : null
  if (eventType === 'RIDE_CANCELLED') return ['RIDE_ACCEPTED','TO_PICKUP','PICKUP_DETECTED','VERIFYING'].includes(current) ? 'CANCELLED' : ['ACTIVE_VERIFIED','ARRIVING'].includes(current) ? 'ENDING' : null
  return null
}
