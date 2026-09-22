export const MIN_SELF_SERVE_BUDGET_RUPEES = 500;
export const MIN_SELF_SERVE_BUDGET_PAISE = MIN_SELF_SERVE_BUDGET_RUPEES * 100;

export const selfServeDisplayAssignmentAllowed = (requestedDisplayCount: number) => requestedDisplayCount === 0;
