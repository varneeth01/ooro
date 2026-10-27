import { ApiError } from '../errors.js'

export const DRIVER_ONBOARDING_STATUSES = ['PROFILE', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const
export type DriverOnboardingStatus = typeof DRIVER_ONBOARDING_STATUSES[number]

const transitions: Record<DriverOnboardingStatus, readonly DriverOnboardingStatus[]> = {
  PROFILE: ['DRAFT', 'SUBMITTED'], DRAFT: ['SUBMITTED'], SUBMITTED: ['UNDER_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED'], UNDER_REVIEW: ['CHANGES_REQUESTED', 'REJECTED', 'APPROVED'], CHANGES_REQUESTED: ['SUBMITTED'], REJECTED: ['DRAFT', 'SUBMITTED'], APPROVED: ['SUSPENDED'], SUSPENDED: ['APPROVED'],
}

export function transitionDriverOnboarding(from: string, to: DriverOnboardingStatus) {
  if (!(DRIVER_ONBOARDING_STATUSES as readonly string[]).includes(from) || !transitions[from as DriverOnboardingStatus].includes(to)) throw new ApiError('INVALID_ONBOARDING_TRANSITION', `Cannot move driver application from ${from} to ${to}`, 409)
  return to
}
