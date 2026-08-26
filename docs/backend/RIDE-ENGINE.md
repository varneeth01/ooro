# Ride engine

Android sends normalized provider events. The backend validates legal transitions and persists both the raw normalized event and a ride event. `RIDE_ACCEPTED` creates a candidate in `TO_PICKUP`; that state never creates a campaign session or earnings.

Only the backend can transition a ride to `ACTIVE_VERIFIED`. Pickup, GPS continuity, display health, cancellation conflicts, and playback evidence are correlated before a verification result is persisted.
