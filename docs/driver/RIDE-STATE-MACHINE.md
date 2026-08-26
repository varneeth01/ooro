# Ride state machine

```text
IDLE → RIDE_ACCEPTED → TO_PICKUP → VERIFYING → ACTIVE_VERIFIED → ARRIVING → COMPLETED → PAYMENT_PENDING → PAYABLE → PAID
```

Cancellation before pickup ends in `CANCELLED` with no advertising session or payout. Manual declarations are separate candidates and receive stricter verification. `RIDE_ACCEPTED` is never equivalent to passenger pickup; `ACTIVE_VERIFIED` requires the verification engine to accept normalized mobility events, movement/GPS evidence, and display evidence.
