# Fraud and verification

`RideVerificationEngine` produces a score, status, and typed reasons. Production verification must combine normalized provider sequence, GPS accuracy/continuity, movement, display heartbeat/playback, cancellation conflicts, mock-location/device-integrity signals, and server-side history. Client output is evidence only; the backend decides `VERIFIED`, `SUSPICIOUS`, `REJECTED`, payment, and review.

The core guardrail is invariant across client and server: travel to pickup does not create an advertising session. Manual rides and cancellation conflicts must not automatically become payable.
