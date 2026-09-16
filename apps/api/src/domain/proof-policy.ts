export function canonicalProofId(proofId?: string, eventId?: string) {
  return proofId ?? eventId ?? null
}

export function canonicalProofStatus(completed: boolean, actualDuration: number | undefined, expectedDuration: number) {
  if (!completed) return 'FAILED'
  return (actualDuration ?? 0) >= Math.floor(expectedDuration * 0.9) ? 'VALID' : 'PARTIAL'
}
