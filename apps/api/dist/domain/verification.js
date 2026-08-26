export function verifyRide(input) {
    let score = 0;
    let riskScore = 0;
    const reasons = [];
    if (input.eventTypes.includes('PASSENGER_PICKED_UP') || input.eventTypes.includes('RIDE_ACTIVE')) {
        score += input.eventTypes.includes('RIDE_ACTIVE') ? 40 : 30;
        reasons.push('VALID_PICKUP_TRANSITION');
    }
    if (input.locationCount > 0) {
        score += 20;
        reasons.push('VALID_GPS_MOVEMENT');
    }
    else {
        riskScore += 30;
        reasons.push('NO_MOVEMENT');
    }
    if (input.displayOnline) {
        score += 15;
        reasons.push('DISPLAY_ONLINE');
    }
    else {
        riskScore += 20;
        reasons.push('DISPLAY_OFFLINE');
    }
    if (input.playbackConfirmed) {
        score += 25;
        reasons.push('PLAYBACK_CONFIRMED');
    }
    else if (input.eventTypes.includes('RIDE_ACTIVE'))
        riskScore += 10;
    if (input.cancellationConflict) {
        riskScore += 40;
        reasons.push('CANCELLATION_CONFLICT');
    }
    if (input.mockLocationSuspected) {
        riskScore += 30;
        reasons.push('MOCK_LOCATION_SUSPECTED');
    }
    if (input.noMovement) {
        riskScore += 30;
        reasons.push('NO_MOVEMENT');
    }
    const threshold = input.source === 'MANUAL' ? 85 : 70;
    const status = riskScore >= 60 ? 'REVIEW' : score >= threshold ? 'VERIFIED' : 'PENDING';
    return { score: Math.min(100, score), status, reasons: [...new Set(reasons)], riskScore: Math.min(100, riskScore) };
}
