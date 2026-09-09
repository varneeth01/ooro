export type CampaignContinuationInput = {
  status: string
  hasCreative: boolean
  activeDisplayCount: number
  startDate?: string
  endDate?: string
  budget?: unknown
  today?: Date
}

function validateScheduledDates(input: CampaignContinuationInput): string | null {
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null
  const end = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : null
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return "Enter valid campaign dates"
  if (!start || !end) return "Start and end dates are required"
  if (end < start) return "End date must be on or after start date"
  const today = input.today ?? new Date()
  if (start < new Date(today.toISOString().slice(0, 10) + "T00:00:00.000Z")) return "A scheduled campaign cannot start in the past"
  return null
}

export function validateCampaignContinuation(input: CampaignContinuationInput): string | null {
  // A retry after the transition is intentionally a successful no-op.
  if (input.status === "SCHEDULED" || input.status === "ACTIVE") return null
  if (!["DRAFT", "CREATIVE_REQUIRED", "READY"].includes(input.status)) return "Campaign is not in a state that can continue"
  if (!input.hasCreative) return "Persist a creative before continuing setup"
  if (input.activeDisplayCount < 1) return "Assign at least one display before continuing setup"
  const dateError = validateScheduledDates(input)
  if (dateError) return dateError
  if (typeof input.budget !== "number" || !Number.isFinite(input.budget) || input.budget <= 0) return "Budget must be greater than zero"
  return null
}
