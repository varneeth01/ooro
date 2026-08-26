# Display control

Screen Player authenticates with a display token, reports heartbeats, uploads playback, and consumes commands. Admin/ride orchestration queues commands as `QUEUED`; delivery, acknowledgement, success, failure, and expiry are separate lifecycle states. The backend never treats a queued command as a completed action.
