# Screen Player architecture

The APK is an outbound client. It never accepts inbound device connections and never streams normal ads directly from the API. The intended flow is heartbeat → manifest → verified local downloads → atomic activation → offline playback → queued proof-of-play upload.

`Workspace`, `Campaign`, `Creative`, `Screen`, `Device`, `Schedule`, and `ProofOfPlay` remain separate concepts. Campaign assignments target screens; the Android device is only the physical runtime attached to a screen.

The current app has the Phase A/contract foundation, Room manifest/proof schema, WorkManager heartbeat, deterministic scheduler, checksum-verified temporary-file downloads, Media3 boundary, encrypted device-token storage, parsed HTTP manifests, and branded fallback. Full download orchestration and proof-of-play upload wiring should be completed as the backend implementation lands; the API contract in `docs/api/device-api.yaml` is the cross-language source of truth.
