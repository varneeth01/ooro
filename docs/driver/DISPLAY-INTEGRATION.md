# Display integration

Driver → Vehicle → Display binding is created by `POST /api/displays/pair` with a one-time, server-verified code. Normal communication remains Driver App → API → Screen Player. The display stays awake for heartbeat/network/manifest sync while advertising is off in `IDLE_SLEEP`; a verified passenger ride may queue `WAKE` and `START_SESSION`, and completion queues `STOP_SESSION` followed by sleep.

Screen Player playback is authoritative for proof-of-play. A driver action can request a command but cannot claim that ads played or create earnings locally.
