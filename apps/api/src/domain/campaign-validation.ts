export type CampaignDateInput = { startDate?: string; endDate?: string; status?: string }

export function validateCampaignDates(input: CampaignDateInput, today = new Date()): string | null {
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null;
  const end = input.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return "Enter valid campaign dates";
  if (start && end && end < start) return "End date must be on or after start date";
  if (input.status === "SCHEDULED" && start && start < new Date(today.toISOString().slice(0, 10) + "T00:00:00.000Z")) return "A scheduled campaign cannot start in the past";
  return null;
}
