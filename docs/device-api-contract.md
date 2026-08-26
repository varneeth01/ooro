# OORO device and admin control-plane contract

This document is the shared boundary between the Android Screen Player and the future OORO API. The admin web UI consumes server-owned screen and health records; it must never receive device tokens.

## Pairing

`POST /api/device/pair` accepts a one-time, short-lived, server-generated `pairingCode` plus device identity. The response binds `Workspace → Screen → Device` and returns device credentials to the Android player only. Admin users see the pairing code and connection state, never the device token.

## Heartbeat

`POST /api/device/heartbeat` uses `Authorization: Bearer <device-token>` and accepts:

```json
{
  "screenId": "screen-014",
  "deviceId": "ooro-8c17a2",
  "timestamp": "2026-08-22T19:44:21Z",
  "appVersion": "1.0.4",
  "appVersionCode": 104,
  "androidVersion": "12",
  "manufacturer": "T95",
  "model": "Android Box",
  "networkType": "WIFI",
  "networkConnected": true,
  "signalStrength": -54,
  "freeStorageBytes": 19713965568,
  "totalStorageBytes": 34359738368,
  "currentCampaignId": "campaign-summer",
  "currentCreativeId": "creative-summer",
  "manifestVersion": 42,
  "kioskActive": true,
  "deviceOwner": true,
  "playerState": "PLAYING",
  "syncState": "CURRENT"
}
```

Unsupported hardware values are omitted, not fabricated. Connectivity is derived by the admin control plane: ONLINE ≤ 90 seconds, STALE ≤ 300 seconds, OFFLINE after that, and NEVER_CONNECTED when no heartbeat exists. These values live in `lib/admin/health.ts`.

## Manifest and proof-of-play

`GET /api/device/manifest` returns the versioned creative schedule consumed by the Android cache. Proof-of-play is written locally first and uploaded with idempotent event IDs. Admin pages display reported manifest/player state only; they do not infer campaign delivery from a heartbeat alone.

## Commands

Future commands (`SYNC_NOW`, `REFRESH_MANIFEST`, `RESTART_PLAYER`, `REBOOT_DEVICE`, `UNPAIR`) require an authenticated admin, server authorization, screen validation, audit log, and a lifecycle of `QUEUED → DELIVERED → ACKNOWLEDGED → SUCCESS/FAILED/EXPIRED`. The current UI creates no remote success illusion; commands are disabled or explicitly marked not connected.

## Admin security boundary

`AdminGuard` and `canAccessAdmin()` are local/mock seams only. Production must enforce `SUPER_ADMIN`/`ADMIN` authorization in middleware/server components and every API route. Client-side hiding and route redirects are not sufficient. Device secrets must never be returned by screen-list or health endpoints and must never be stored in browser localStorage.
